import type { ProviderId } from "@/lib/ai/events";

const PROVIDER_NAMES: Record<ProviderId, string> = { groq: "Groq", gemini: "Gemini" };

/** "openai/gpt-oss-120b" → "gpt-oss-120b" */
export function shortModelName(model: string): string {
  return model.split("/").pop() ?? model;
}

export function providerName(provider: ProviderId): string {
  return PROVIDER_NAMES[provider];
}
