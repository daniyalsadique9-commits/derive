/** Server-only AI configuration, read from environment variables. */

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function listOr(value: string | undefined, fallback: string[]): string[] {
  const items = list(value);
  return items.length > 0 ? items : fallback;
}

export const aiConfig = {
  groq: {
    keys: list(process.env.GROQ_API_KEYS),
    solverModel: process.env.GROQ_SOLVER_MODEL ?? "openai/gpt-oss-120b",
    /** Tried in order. Different model families from the solver keep the check independent. */
    checkerModels: listOr(process.env.GROQ_CHECKER_MODELS, [
      "qwen/qwen3.8-27b",
      "qwen/qwen3.6-27b",
      "openai/gpt-oss-20b",
    ]),
    maxCompletionTokens: 7000,
    /** Free-tier tokens per minute for the solver model, counting prompt and answer together. */
    tokensPerMinute: 8000,
    /** Typical tokens for one deep answer; used to avoid starting a request we know will be rejected. */
    estimatedAnswerTokens: 2500,
  },
  gemini: {
    keys: list(process.env.GEMINI_API_KEYS),
    models: listOr(process.env.GEMINI_MODELS, [
      "gemini-3.6-flash",
      "gemini-3.8-flash",
      "gemini-3.5-flash",
    ]),
    requestsPerMinute: positiveInt(process.env.GEMINI_RPM, 10),
    requestsPerDay: positiveInt(process.env.GEMINI_RPD, 250),
  },
  /** Give up on a provider that hasn't started answering within this time and try the next one. */
  firstTokenTimeoutMs: 20_000,
  /** Only the most recent turns are sent, which keeps long chats from drifting. */
  maxHistoryTurns: 8,
  /** Per-user limit so one visitor can't drain the shared free quota. */
  userRequestsPerMinute: 6,
} as const;
