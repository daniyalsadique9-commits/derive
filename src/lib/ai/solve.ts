import { aiConfig } from "./config";
import type { StreamEvent } from "./events";
import { geminiAttempts, groqAttempts, streamFirstAvailable, type Attempt } from "./fallback";
import { buildSystemPrompt } from "./prompts";
import type { ChatTurn, SolveRequest } from "./schema";
import { verifyAnswer } from "./verify";

const GRAPH_REQUEST = /\b(plot|graph|sketch|draw|visuali[sz]e|curve)\b/i;
const HEAVY_QUESTION = /\b(prove|derive|show that)\b/i;

/** Keeps recent turns only, starting on a user turn, with attachments on the latest turn only. */
function recentTurns(messages: ChatTurn[]): ChatTurn[] {
  const recent = messages.slice(-aiConfig.maxHistoryTurns);
  const firstUser = recent.findIndex((turn) => turn.role === "user");
  return recent
    .slice(firstUser)
    .map((turn, index, all) => (index === all.length - 1 ? turn : { ...turn, images: undefined }));
}

/**
 * Picks the order to try providers in. Groq is fastest and reports its quota, so it answers
 * most text questions. Gemini handles photos and PDFs, graphs (matplotlib) and long proofs,
 * where its larger output budget matters, and is the backup for everything else.
 */
function planAttempts(turns: ChatTurn[], request: SolveRequest): Attempt[] {
  const latest = turns[turns.length - 1];
  const gemini = geminiAttempts({
    system: buildSystemPrompt(request.style, request.language, { canRunCode: true, canPlot: true }),
    turns,
  });
  if ((latest?.images?.length ?? 0) > 0) return gemini;

  const groq = groqAttempts({
    system: buildSystemPrompt(request.style, request.language, {
      canRunCode: true,
      canPlot: false,
    }),
    turns,
    runCode: true,
    reasoningEffort: "high",
  });
  const content = latest?.content ?? "";
  const geminiFirst =
    GRAPH_REQUEST.test(content) || content.length > 500 || HEAVY_QUESTION.test(content);
  return geminiFirst ? [...gemini, ...groq] : [...groq, ...gemini];
}

/** Answers the latest turn, then (when enabled) has a second model cross-check the answer. */
export async function* solve(
  request: SolveRequest,
  signal: AbortSignal,
  options: { verify: boolean },
): AsyncGenerator<StreamEvent> {
  const turns = recentTurns(request.messages);
  const answer = yield* streamFirstAvailable(planAttempts(turns, request), signal);
  if (answer === null) return;

  const latestIntent = turns[turns.length - 1]?.intent ?? "ask";
  if (options.verify && latestIntent === "ask") {
    yield { type: "verifying" };
    yield { type: "verification", result: await verifyAnswer(answer, signal) };
  }
  yield { type: "done" };
}
