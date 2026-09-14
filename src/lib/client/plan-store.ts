import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const cache = new Map<string, string | null>();

const storageKey = (userId: string) => `derive:plan:v1:${userId}`;

function read(userId: string): string | null {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

function getSnapshot(userId: string): string | null {
  if (!cache.has(userId)) cache.set(userId, read(userId));
  return cache.get(userId) ?? null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The student's latest study plan, kept in this browser. */
export const planStore = {
  save(userId: string, plan: string): void {
    cache.set(userId, plan);
    try {
      localStorage.setItem(storageKey(userId), plan);
    } catch {
      // Storage full or blocked: the plan stays available for this session.
    }
    listeners.forEach((listener) => listener());
  },
};

export function useSavedPlan(userId: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(userId),
    () => null,
  );
}
