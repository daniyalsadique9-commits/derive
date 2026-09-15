import { singleton } from "@/lib/server/singleton";
import { aiConfig } from "./config";
import type { ProviderId } from "./events";

/** One API key used with one model. Providers rate-limit each combination separately. */
export interface Slot {
  provider: ProviderId;
  model: string;
  keyIndex: number;
}

interface Window {
  limit: number;
  remaining: number;
  resetAt: number;
}

interface SlotState {
  /** Daily request window, as reported by the provider's response headers. */
  requests?: Window;
  /** Per-minute token window, as reported by the provider's response headers. */
  tokens?: Window;
  /** Timestamps of requests we sent, for providers that don't report their limits. */
  sent: number[];
  coolDownUntil: number;
}

interface SelfCountedLimits {
  perMinute: number;
  perDay: number;
}

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/**
 * Tracks remaining quota for every slot so requests go to a key that still has room,
 * instead of discovering the limit through a failed request.
 *
 * Groq reports exact remaining quota in response headers. Gemini reports nothing, so
 * requests are counted here against the configured limits. State is in-memory: exact on a
 * single server (a laptop demo), best-effort on multi-instance hosting.
 */
class QuotaTracker {
  private readonly states = new Map<string, SlotState>();

  constructor(private readonly selfCounted: Partial<Record<ProviderId, SelfCountedLimits>>) {}

  hasCapacity(slot: Slot, estimatedTokens: number, now = Date.now()): boolean {
    const state = this.states.get(slotKey(slot));
    if (!state) return true;
    if (now < state.coolDownUntil) return false;
    if (isActive(state.requests, now) && state.requests.remaining < 1) return false;
    if (isActive(state.tokens, now) && state.tokens.remaining < estimatedTokens) return false;

    const limits = this.selfCounted[slot.provider];
    if (limits) {
      if (countSince(state.sent, now - MINUTE_MS) >= limits.perMinute) return false;
      if (countSince(state.sent, now - DAY_MS) >= limits.perDay) return false;
    }
    return true;
  }

  /** Fraction of the daily quota still unused (1 when unknown), used to spread load across keys. */
  headroom(slot: Slot, now = Date.now()): number {
    const state = this.states.get(slotKey(slot));
    if (!state) return 1;
    if (isActive(state.requests, now)) {
      return state.requests.remaining / Math.max(state.requests.limit, 1);
    }
    const limits = this.selfCounted[slot.provider];
    if (limits) {
      return 1 - countSince(state.sent, now - DAY_MS) / limits.perDay;
    }
    return 1;
  }

  /** Requests left today for this slot, or null if the provider hasn't told us yet. */
  requestsLeft(slot: Slot, now = Date.now()): number | null {
    const state = this.states.get(slotKey(slot));
    const limits = this.selfCounted[slot.provider];
    if (limits) {
      return limits.perDay - countSince(state?.sent ?? [], now - DAY_MS);
    }
    const requests = state?.requests;
    if (!requests) return null;
    // After the reset time passes, the full daily limit is available again.
    return now < requests.resetAt ? requests.remaining : requests.limit;
  }

  isCoolingDown(slot: Slot, now = Date.now()): boolean {
    return now < (this.states.get(slotKey(slot))?.coolDownUntil ?? 0);
  }

  recordRequest(slot: Slot, now = Date.now()): void {
    const state = this.stateFor(slot);
    state.sent.push(now);
    state.sent = state.sent.filter((time) => time > now - DAY_MS);
  }

  /** Reads Groq-style `x-ratelimit-*` headers. Requests are per day, tokens per minute. */
  recordHeaders(slot: Slot, headers: Headers, now = Date.now()): void {
    const state = this.stateFor(slot);
    state.requests = readWindow(headers, "requests", now) ?? state.requests;
    state.tokens = readWindow(headers, "tokens", now) ?? state.tokens;
  }

  coolDown(slot: Slot, durationMs: number, now = Date.now()): void {
    const state = this.stateFor(slot);
    state.coolDownUntil = Math.max(state.coolDownUntil, now + durationMs);
  }

  private stateFor(slot: Slot): SlotState {
    const key = slotKey(slot);
    let state = this.states.get(key);
    if (!state) {
      state = { sent: [], coolDownUntil: 0 };
      this.states.set(key, state);
    }
    return state;
  }
}

function slotKey({ provider, model, keyIndex }: Slot): string {
  return `${provider}:${model}:${keyIndex}`;
}

function isActive(window: Window | undefined, now: number): window is Window {
  return window !== undefined && now < window.resetAt;
}

function countSince(timestamps: number[], since: number): number {
  return timestamps.filter((time) => time > since).length;
}

function readWindow(
  headers: Headers,
  kind: "requests" | "tokens",
  now: number,
): Window | undefined {
  const limit = Number(headers.get(`x-ratelimit-limit-${kind}`));
  const remaining = Number(headers.get(`x-ratelimit-remaining-${kind}`));
  const reset = headers.get(`x-ratelimit-reset-${kind}`);
  if (!Number.isFinite(limit) || !Number.isFinite(remaining) || !reset) return undefined;
  return { limit, remaining, resetAt: now + parseDuration(reset) };
}

/** Parses Groq durations such as "1m26.4s", "5.46s", "2h3m" or "120ms" into milliseconds. */
function parseDuration(value: string): number {
  const unitMs: Record<string, number> = { h: 3_600_000, m: MINUTE_MS, s: 1000, ms: 1 };
  let total = 0;
  for (const [, amount, unit] of value.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) {
    total += Number(amount) * unitMs[unit];
  }
  return total;
}

export const quota = singleton(
  "quota-tracker",
  () =>
    new QuotaTracker({
      gemini: {
        perMinute: aiConfig.gemini.requestsPerMinute,
        perDay: aiConfig.gemini.requestsPerDay,
      },
    }),
);
