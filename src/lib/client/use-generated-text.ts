import { useSyncExternalStore } from "react";
import type { StreamEvent } from "@/lib/ai/events";
import { saveText, useSavedText } from "./saved-text";

type Streamer = (onEvent: (event: StreamEvent) => void, signal: AbortSignal) => Promise<void>;

interface Generation {
  draft: string | null;
  streaming: boolean;
  error: string | null;
}

const IDLE: Generation = { draft: null, streaming: false, error: null };

/**
 * Generations in progress, kept outside React so a study plan or viva set keeps generating
 * (and stays visible) while the student visits other pages.
 */
const generations = new Map<string, Generation>();
const listeners = new Set<() => void>();

const read = (storageKey: string): Generation => generations.get(storageKey) ?? IDLE;

function write(storageKey: string, change: Partial<Generation>): void {
  generations.set(storageKey, { ...read(storageKey), ...change });
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function generate(storageKey: string, stream: Streamer): Promise<void> {
  if (read(storageKey).streaming) return;
  write(storageKey, { streaming: true, error: null, draft: "" });

  let text = "";
  let failure: string | null = null;
  const onEvent = (event: StreamEvent) => {
    if (event.type === "text") {
      text += event.text;
      write(storageKey, { draft: text });
    } else if (event.type === "reset") {
      text = "";
      write(storageKey, { draft: "" });
    } else if (event.type === "error") {
      failure = event.message;
    }
  };

  try {
    await stream(onEvent, new AbortController().signal);
  } catch (reason) {
    failure = reason instanceof Error ? reason.message : "Something went wrong.";
  }

  if (failure || !text.trim()) {
    write(storageKey, {
      streaming: false,
      draft: null,
      error: failure ?? "Nothing was generated. Please try again.",
    });
    return;
  }
  saveText(storageKey, text);
  write(storageKey, { streaming: false, draft: null });
}

/** Streams generated Markdown and keeps the latest finished result in this browser. */
export function useGeneratedText(storageKey: string) {
  const saved = useSavedText(storageKey);
  const generation = useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    () => IDLE,
  );

  return {
    text: generation.draft ?? saved,
    streaming: generation.streaming,
    error: generation.error,
    generate: (stream: Streamer) => generate(storageKey, stream),
  };
}
