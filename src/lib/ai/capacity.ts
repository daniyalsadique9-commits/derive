import { aiConfig } from "./config";
import type { CapacityReport, ProviderHealth, ProviderId, ProviderStatus } from "./events";
import { quota, type Slot } from "./quota";

function health(
  role: string,
  provider: ProviderId,
  models: readonly string[],
  keyCount: number,
  estimatedTokens: number,
): ProviderHealth {
  // Gemini doesn't report quota, so its numbers are our own count.
  const estimated = provider === "gemini";
  if (keyCount === 0) {
    return { role, model: models[0], status: "unconfigured", requestsLeft: null, estimated };
  }

  const slots: Slot[] = models.flatMap((model) =>
    Array.from({ length: keyCount }, (_, keyIndex) => ({ provider, model, keyIndex })),
  );

  let status: ProviderStatus;
  if (slots.some((slot) => quota.hasCapacity(slot, estimatedTokens))) status = "ready";
  else if (slots.some((slot) => quota.isCoolingDown(slot))) status = "busy";
  else status = "exhausted";

  const known = slots
    .map((slot) => quota.requestsLeft(slot))
    .filter((n): n is number => n !== null);
  const requestsLeft = known.length > 0 ? known.reduce((sum, n) => sum + n, 0) : null;

  return { role, model: models[0], status, requestsLeft, estimated };
}

/** Live view of how much free quota is left, so limits are visible before they're hit. */
export function capacityReport(): CapacityReport {
  const { groq, gemini } = aiConfig;
  return {
    checkedAt: Date.now(),
    providers: [
      health("Solver", "groq", [groq.solverModel], groq.keys.length, groq.estimatedAnswerTokens),
      health("Verifier", "groq", groq.checkerModels, groq.keys.length, 3000),
      health("Vision & graphs", "gemini", gemini.models, gemini.keys.length, 0),
    ],
  };
}
