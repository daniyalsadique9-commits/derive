import { ApiError as GeminiApiError } from "@google/genai";
import OpenAI from "openai";

export class ResponseTimeoutError extends Error {
  constructor(ms: number) {
    super(`No response within ${ms} ms`);
    this.name = "ResponseTimeoutError";
  }
}

/** HTTP status of a provider error, if there is one. */
export function statusOf(error: unknown): number | undefined {
  if (error instanceof OpenAI.APIError) return error.status;
  if (error instanceof GeminiApiError) return error.status;
  return undefined;
}

/**
 * How long to stop using a key after it fails, so the next request goes elsewhere
 * immediately instead of failing the same way.
 */
export function coolDownFor(error: unknown): number {
  if (error instanceof OpenAI.APIError) {
    const retryAfterSeconds = Number(error.headers?.get("retry-after"));
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      return retryAfterSeconds * 1000;
    }
  }
  switch (statusOf(error)) {
    case 400:
    case 413:
      return 0; // a problem with this request, not with the key
    case 429:
      return 60_000; // rate limited
    case 401:
    case 403:
    case 404:
      return 10 * 60_000; // bad key or retired model: don't retry soon
    case 500:
    case 502:
    case 503:
    case 504:
      return 30_000; // provider overloaded
    default:
      return error instanceof ResponseTimeoutError ? 30_000 : 15_000;
  }
}

export function describeError(error: unknown): string {
  const status = statusOf(error);
  const message = error instanceof Error ? error.message : String(error);
  return status ? `HTTP ${status}: ${message}` : message;
}
