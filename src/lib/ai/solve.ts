import { aiConfig } from "./config";
import { diagramModeFor, withCheckedDiagram, type DiagramMode } from "./device-diagrams";
import type { StreamEvent } from "./events";
import { geminiAttempts, groqAttempts, streamFirstAvailable, type Attempt } from "./fallback";
import { buildSystemPrompt, languageReminder } from "./prompts";
import type { AnswerLanguage, ChatTurn, SolveRequest } from "./schema";
import { verifyAnswer } from "./verify";

/** Questions that need a plotted graph go to the model that can run matplotlib. */
const GRAPH_REQUEST = /\b(plot|graph|sketch|visuali[sz]e|curve|waveform)s?\b/i;
const PROOF_REQUEST = /\b(prove|derive|show that)\b/i;

/**
 * Groq's free tier allows about 8,000 tokens per request, answer included, so long
 * conversations go to Gemini first.
 */
const LONG_CONTEXT_CHARS = 12_000;

/** Reading a photo or PDF takes longer before the first word than a typed question. */
const ATTACHMENT_FIRST_TOKEN_MS = 45_000;

/** Long, multi-part questions and proofs: they need a larger output budget and aren't cross-checked. */
function isLongDerivation(content: string): boolean {
  return content.length > 500 || PROOF_REQUEST.test(content);
}

/** Keeps recent turns only, starting on a user turn, with attachments on the latest turn only. */
function recentTurns(messages: ChatTurn[]): ChatTurn[] {
  const recent = messages.slice(-aiConfig.maxHistoryTurns);
  const firstUser = recent.findIndex((turn) => turn.role === "user");
  return recent
    .slice(firstUser)
    .map((turn, index, all) => (index === all.length - 1 ? turn : { ...turn, images: undefined }));
}

const normalized = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * The same question asked again in a chat is answered afresh and in full. With the earlier
 * answer in view, models treat a repeat as a follow-up and reply with a short summary.
 */
function withoutRepeatedHistory(turns: ChatTurn[]): ChatTurn[] {
  const latest = turns[turns.length - 1];
  if (latest?.role !== "user" || (latest.intent ?? "ask") !== "ask" || !latest.content.trim()) {
    return turns;
  }
  const question = normalized(latest.content);
  const repeated = turns
    .slice(0, -1)
    .some((turn) => turn.role === "user" && normalized(turn.content) === question);
  return repeated ? [latest] : turns;
}

/** Adds the answer-language reminder to the latest turn, where models notice it most. */
function withLanguageReminder(turns: ChatTurn[], language: AnswerLanguage): ChatTurn[] {
  const reminder = languageReminder(language);
  const latest = turns[turns.length - 1];
  if (!reminder || !latest) return turns;
  const content = latest.content ? `${latest.content}\n\n${reminder}` : reminder;
  return [...turns.slice(0, -1), { ...latest, content }];
}

/**
 * Picks the order to try providers in. Groq is fastest and reports its quota, so it answers
 * most text questions. Gemini handles photos and PDFs, graphs (matplotlib) and long proofs,
 * where its larger output budget matters, and is the backup for everything else.
 */
function planAttempts(turns: ChatTurn[], request: SolveRequest, diagrams: DiagramMode): Attempt[] {
  const latest = turns[turns.length - 1];
  const gemini = geminiAttempts({
    system: buildSystemPrompt(request.style, request.language, {
      canRunCode: true,
      // A checked diagram replaces any drawing, so the model isn't offered plots for it.
      canPlot: diagrams.kind !== "checked",
      diagrams,
    }),
    turns,
  });
  if ((latest?.images?.length ?? 0) > 0) return gemini;

  const groq = groqAttempts({
    system: buildSystemPrompt(request.style, request.language, {
      canRunCode: true,
      canPlot: false,
      diagrams,
    }),
    turns,
    runCode: true,
    // Deep reasoning delays the first word by several seconds, so it is kept for long
    // derivations; numeric answers are still cross-checked by a second model.
    reasoningEffort: isLongDerivation(latest?.content ?? "") ? "high" : "medium",
  });
  const content = latest?.content ?? "";
  const contextChars = turns.reduce((sum, turn) => sum + turn.content.length, 0);
  const geminiFirst =
    GRAPH_REQUEST.test(content) || isLongDerivation(content) || contextChars > LONG_CONTEXT_CHARS;
  return geminiFirst ? [...gemini, ...groq] : [...groq, ...gemini];
}

/** Answers the latest turn, then (when enabled) has a second model cross-check the answer. */
export async function* solve(
  request: SolveRequest,
  signal: AbortSignal,
  options: { verify: boolean },
): AsyncGenerator<StreamEvent> {
  const turns = withLanguageReminder(
    withoutRepeatedHistory(recentTurns(request.messages)),
    request.language,
  );
  const latest = turns[turns.length - 1];
  const hasAttachments = (latest?.images?.length ?? 0) > 0;
  // Whole devices can't be drawn accurately as a one-loop circuit, and models draw them
  // unreliably, so well-known devices get a checked diagram added by the app.
  const diagrams = diagramModeFor(turns);
  const stream = streamFirstAvailable(
    planAttempts(turns, request, diagrams),
    signal,
    hasAttachments ? { firstTokenTimeoutMs: ATTACHMENT_FIRST_TOKEN_MS } : {},
  );
  const answer = yield* diagrams.kind === "checked"
    ? withCheckedDiagram(stream, diagrams.diagram)
    : stream;
  if (answer === null) return;

  // A short check can't reliably re-solve a long proof, and a false alarm is worse than none.
  // A device diagram has no single result to check.
  const checkable =
    (latest?.intent ?? "ask") === "ask" &&
    !isLongDerivation(latest?.content ?? "") &&
    diagrams.kind === "circuit";
  if (options.verify && checkable) {
    yield { type: "verifying" };
    yield { type: "verification", result: await verifyAnswer(answer, signal) };
  }
  yield { type: "done" };
}
