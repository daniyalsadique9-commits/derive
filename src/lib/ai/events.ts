/** Events streamed from /api/solve to the browser, one JSON object per line (NDJSON). */

export type ProviderId = "groq" | "gemini";

export type Verification =
  | { status: "agree"; checker: string; independentAnswer: string }
  | { status: "disagree"; checker: string; independentAnswer: string; note: string }
  | { status: "skipped"; reason: string };

export type StreamEvent =
  | { type: "start"; provider: ProviderId; model: string }
  /** The model is reasoning before it writes; sent once so the UI can show progress. */
  | { type: "thinking" }
  /** The model wrote nothing or failed partway; discard its output while the next one tries. */
  | { type: "reset" }
  | { type: "text"; text: string }
  | { type: "code"; code: string }
  | { type: "codeResult"; output: string; ok: boolean }
  | { type: "image"; mimeType: string; data: string }
  | { type: "usage"; totalTokens: number }
  | { type: "verifying" }
  | { type: "verification"; result: Verification }
  | { type: "error"; message: string }
  | { type: "done" };

export type ProviderStatus = "ready" | "busy" | "exhausted" | "unconfigured";

export interface ProviderHealth {
  role: string;
  model: string;
  status: ProviderStatus;
  /** Requests left today across all keys; null when the provider hasn't told us yet. */
  requestsLeft: number | null;
  /** True when requestsLeft is our own count rather than reported by the provider. */
  estimated: boolean;
}

export interface CapacityReport {
  providers: ProviderHealth[];
  checkedAt: number;
  /** The signed-in student's own requests today and daily limit. */
  allowance?: { usedToday: number; dailyLimit: number };
}
