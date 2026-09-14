import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const cache = new Map<string, string | null>();

export const planKey = (userId: string) => `derive:plan:v1:${userId}`;
export const vivaKey = (userId: string) => `derive:viva:v1:${userId}`;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function snapshot(key: string): string | null {
  if (!cache.has(key)) cache.set(key, read(key));
  return cache.get(key) ?? null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Keeps generated text (a study plan, a viva set) in this browser. */
export function saveText(key: string, text: string): void {
  cache.set(key, text);
  try {
    localStorage.setItem(key, text);
  } catch {
    // Storage full or blocked: the text stays available for this session.
  }
  listeners.forEach((listener) => listener());
}

export function useSavedText(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => snapshot(key),
    () => null,
  );
}
