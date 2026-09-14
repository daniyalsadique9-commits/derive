import type { StreamEvent } from "@/lib/ai/events";
import type { PlanRequest } from "@/lib/ai/plan-schema";
import type { SolveRequest } from "@/lib/ai/schema";
import type { VivaRequest } from "@/lib/ai/viva-schema";

interface ClerkBrowser {
  Clerk?: { session?: { getToken: (options: { skipCache: boolean }) => Promise<string | null> } };
}

/** Asks the Clerk browser SDK for a fresh session token; it updates the session cookie. */
async function refreshSession(): Promise<boolean> {
  try {
    const clerk = (window as unknown as ClerkBrowser).Clerk;
    return Boolean(await clerk?.session?.getToken({ skipCache: true }));
  } catch {
    return false;
  }
}

/** Posts JSON and calls `onEvent` for each NDJSON event as it streams in. */
async function postForEvents(
  url: string,
  body: unknown,
  onEvent: (event: StreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const send = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

  let response = await send();
  // Session tokens are short-lived; if one expired between refreshes, renew it and retry once.
  if (response.status === 401 && (await refreshSession())) response = await send();

  if (!response.ok || !response.body) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? `Request failed (${response.status}).`);
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line) as StreamEvent);
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as StreamEvent);
}

export function streamSolve(
  request: SolveRequest,
  onEvent: (event: StreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  return postForEvents("/api/solve", request, onEvent, signal);
}

export function streamPlan(
  request: PlanRequest,
  onEvent: (event: StreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  return postForEvents("/api/plan", request, onEvent, signal);
}

export function streamViva(
  request: VivaRequest,
  onEvent: (event: StreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  return postForEvents("/api/viva", request, onEvent, signal);
}
