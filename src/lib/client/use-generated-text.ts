import { useState } from "react";
import type { StreamEvent } from "@/lib/ai/events";
import { saveText, useSavedText } from "./saved-text";

type Streamer = (onEvent: (event: StreamEvent) => void, signal: AbortSignal) => Promise<void>;

/** Streams generated Markdown and keeps the latest finished result in this browser. */
export function useGeneratedText(storageKey: string) {
  const saved = useSavedText(storageKey);
  const [draft, setDraft] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(stream: Streamer) {
    if (streaming) return;
    setStreaming(true);
    setError(null);
    setDraft("");

    let text = "";
    let failure: string | null = null;
    const onEvent = (event: StreamEvent) => {
      if (event.type === "text") {
        text += event.text;
        setDraft(text);
      } else if (event.type === "reset") {
        text = "";
        setDraft("");
      } else if (event.type === "error") {
        failure = event.message;
      }
    };

    try {
      await stream(onEvent, new AbortController().signal);
    } catch (reason) {
      failure = reason instanceof Error ? reason.message : "Something went wrong.";
    }

    setStreaming(false);
    if (failure || !text.trim()) {
      setError(failure ?? "Nothing was generated. Please try again.");
      setDraft(null);
      return;
    }
    saveText(storageKey, text);
    setDraft(null);
  }

  return { text: draft ?? saved, streaming, error, generate };
}
