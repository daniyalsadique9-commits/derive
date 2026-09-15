import { useSyncExternalStore } from "react";
import type { Block, Conversation, Message } from "./conversation";
import { deleteFigures, figureIds, saveFigures } from "./figure-store";

const MAX_CONVERSATIONS = 50;
const EMPTY: Conversation[] = [];

const listeners = new Set<() => void>();
const cache = new Map<string, Conversation[]>();

const storageKey = (userId: string) => `derive:conversations:v1:${userId}`;

function read(userId: string): Conversation[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]");
    return Array.isArray(parsed) ? (parsed as Conversation[]) : [];
  } catch {
    return [];
  }
}

function write(userId: string, conversations: Conversation[]): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(conversations));
  } catch {
    // Storage full or blocked: history still works for this session, in memory.
  }
}

/**
 * Images are too large for localStorage: graphs are kept in IndexedDB and referenced here by
 * id, and attachments keep only their previews. Unfinished answers can't resume after a reload.
 */
function toStored(message: Message): Message {
  if (message.role === "user") return { ...message, images: undefined };
  const blocks = message.blocks.flatMap((block): Block[] => {
    if (block.kind !== "image") return [block];
    return block.id ? [{ kind: "image", mimeType: block.mimeType, data: "", id: block.id }] : [];
  });
  if (message.phase === "done" || message.phase === "error") return { ...message, blocks };
  return { ...message, blocks, phase: "error", error: "This answer was interrupted." };
}

function getSnapshot(userId: string): Conversation[] {
  let conversations = cache.get(userId);
  if (!conversations) {
    conversations = read(userId);
    cache.set(userId, conversations);
  }
  return conversations;
}

function update(userId: string, change: (conversations: Conversation[]) => Conversation[]): void {
  const next = change(getSnapshot(userId));
  cache.set(userId, next);
  write(userId, next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Per-user question history, kept in this browser's localStorage. */
export const historyStore = {
  save(userId: string, conversation: Conversation): void {
    void saveFigures(conversation);
    const stored = { ...conversation, messages: conversation.messages.map(toStored) };
    const previous = getSnapshot(userId);
    const next = [stored, ...previous.filter((item) => item.id !== conversation.id)].slice(
      0,
      MAX_CONVERSATIONS,
    );
    // Conversations that fall off the end of the history take their graphs with them.
    const kept = new Set(next.map((item) => item.id));
    void deleteFigures(previous.filter((item) => !kept.has(item.id)).flatMap(figureIds));
    update(userId, () => next);
  },
  remove(userId: string, id: string): void {
    const removed = getSnapshot(userId).find((item) => item.id === id);
    if (removed) void deleteFigures(figureIds(removed));
    update(userId, (all) => all.filter((item) => item.id !== id));
  },
  setBookmarked(userId: string, id: string, bookmarked: boolean): void {
    update(userId, (all) => all.map((item) => (item.id === id ? { ...item, bookmarked } : item)));
  },
};

export function useConversationHistory(userId: string): Conversation[] {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(userId),
    () => EMPTY,
  );
}
