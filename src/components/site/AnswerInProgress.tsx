"use client";

import { useAnswerInProgress } from "@/lib/client/solver-session";

/** A small pulsing dot on the "Open app" button while an answer is still being written. */
export function AnswerInProgress() {
  if (!useAnswerInProgress()) return null;
  return (
    <span className="relative ml-1 inline-flex size-2">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-canvas/70" />
      <span className="relative inline-flex size-2 rounded-full bg-canvas" />
      <span className="sr-only">(an answer is being written)</span>
    </span>
  );
}
