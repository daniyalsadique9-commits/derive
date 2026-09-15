import { z } from "zod";
import { aiConfig } from "./config";
import { coolDownFor, describeError } from "./errors";
import type { Verification } from "./events";
import { buildCheckerPrompt, CHECKER_SYSTEM_PROMPT } from "./prompts";
import { completeGroq } from "./providers/groq";
import { quota, type Slot } from "./quota";

const CHECK_TIMEOUT_MS = 30_000;
/** Groq's free tier caps some models at 1,000 output tokens per minute, so keep replies short. */
const CHECK_MAX_TOKENS = 800;
const CHECK_ESTIMATED_TOKENS = 1500;
const MAX_CHECK_ATTEMPTS = 3;
/** Longer final answers are multi-part results that one short check can't re-solve reliably. */
const MAX_CHECKABLE_ANSWER_CHARS = 200;

const verdictSchema = z.object({
  independent_answer: z.string(),
  verdict: z.enum(["agree", "disagree", "not_applicable"]),
  note: z.string().default(""),
});

type Verdict = z.infer<typeof verdictSchema>;

/** Returns the body of a `## Heading` section, or null if the answer has no such section. */
function extractSection(markdown: string, heading: string): string | null {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) =>
    new RegExp(`^##\\s+${heading}\\s*$`, "i").test(line.trim()),
  );
  if (start === -1) return null;

  const end = lines.findIndex((line, index) => index > start && /^##\s/.test(line.trim()));
  const body = lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join("\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
  return body || null;
}

function parseVerdict(reply: string): Verdict | null {
  const withoutThinking = reply.replace(/<think>[\s\S]*?<\/think>/g, "");
  const json = withoutThinking.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  try {
    const parsed = verdictSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Checker slots in model-preference order, least-used key first within each model. */
function checkerSlots(): Slot[] {
  const { checkerModels, keys } = aiConfig.groq;
  return checkerModels.flatMap((model) =>
    keys
      .map((_, keyIndex): Slot => ({ provider: "groq", model, keyIndex }))
      .filter((slot) => quota.hasCapacity(slot, CHECK_ESTIMATED_TOKENS))
      .sort((a, b) => quota.headroom(b) - quota.headroom(a)),
  );
}

function toVerification(verdict: Verdict, checker: string): Verification {
  switch (verdict.verdict) {
    case "agree":
      return { status: "agree", checker, independentAnswer: verdict.independent_answer };
    case "disagree":
      return {
        status: "disagree",
        checker,
        independentAnswer: verdict.independent_answer,
        note: verdict.note,
      };
    case "not_applicable":
      return { status: "skipped", reason: "The question asks for an explanation, not a result." };
  }
}

/**
 * Asks a different model to solve the question independently and compare final answers.
 * Two unrelated models agreeing is strong evidence. A disagreement is only flagged to the
 * student when a second checker model also disagrees, since one checker is often the one
 * that is wrong.
 */
export async function verifyAnswer(
  answerMarkdown: string,
  signal: AbortSignal,
): Promise<Verification> {
  const finalAnswer = extractSection(answerMarkdown, "Final answer");
  const question = extractSection(answerMarkdown, "Question");
  if (!finalAnswer || !question) {
    return { status: "skipped", reason: "No single final answer to cross-check." };
  }
  if (finalAnswer.length > MAX_CHECKABLE_ANSWER_CHARS) {
    return { status: "skipped", reason: "Multi-part answers are not cross-checked." };
  }
  // Only numeric results can be re-solved and compared reliably.
  if (!/\d/.test(finalAnswer)) {
    return { status: "skipped", reason: "No numeric result to cross-check." };
  }

  let attempts = 0;
  // Asserted rather than annotated so the type isn't narrowed to null inside the loop.
  let disagreement = null as { verdict: Verdict; checker: string } | null;
  for (const slot of checkerSlots()) {
    if (signal.aborted || attempts >= MAX_CHECK_ATTEMPTS) break;
    if (disagreement?.checker === slot.model) continue;
    attempts += 1;
    quota.recordRequest(slot);
    try {
      const reply = await completeGroq({
        apiKey: aiConfig.groq.keys[slot.keyIndex],
        model: slot.model,
        messages: [
          { role: "system", content: CHECKER_SYSTEM_PROMPT },
          { role: "user", content: buildCheckerPrompt(question, finalAnswer) },
        ],
        maxTokens: CHECK_MAX_TOKENS,
        signal: AbortSignal.any([signal, AbortSignal.timeout(CHECK_TIMEOUT_MS)]),
        onHeaders: (headers) => quota.recordHeaders(slot, headers),
      });
      const verdict = parseVerdict(reply);
      if (!verdict) {
        console.warn(`[verify] ${slot.model} gave an unreadable reply`);
      } else if (verdict.verdict !== "disagree" || disagreement) {
        return toVerification(verdict, slot.model);
      } else {
        disagreement = { verdict, checker: slot.model };
      }
    } catch (error) {
      quota.coolDown(slot, coolDownFor(error));
      console.warn(`[verify] ${slot.model} #${slot.keyIndex + 1}: ${describeError(error)}`);
    }
  }

  return disagreement
    ? { status: "skipped", reason: "The checkers could not confirm this result." }
    : { status: "skipped", reason: "The checker models are busy right now." };
}
