import type { Block, Conversation } from "./conversation";

type ImageBlock = Extract<Block, { kind: "image" }>;
type Figure = Pick<ImageBlock, "mimeType" | "data">;

/**
 * Graphs from answers, kept in this browser's IndexedDB. They are too large for the
 * localStorage history, which keeps only a reference to each one, so a reopened answer shows
 * its graphs again. Nothing leaves the browser.
 */
const DATABASE = "derive-figures";
const STORE = "figures";

let database: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  database ??= new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return database;
}

async function transact(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => void,
): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    work(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function imageBlocks(conversation: Conversation): ImageBlock[] {
  return conversation.messages.flatMap((message) =>
    message.role === "assistant"
      ? message.blocks.filter((block): block is ImageBlock => block.kind === "image")
      : [],
  );
}

/** Every graph a conversation refers to. */
export function figureIds(conversation: Conversation): string[] {
  return imageBlocks(conversation).flatMap((block) => (block.id ? [block.id] : []));
}

/** Saves the conversation's graphs that are in memory; storage errors only cost the copy. */
export async function saveFigures(conversation: Conversation): Promise<void> {
  const figures = imageBlocks(conversation).filter((block) => block.id && block.data);
  if (figures.length === 0) return;
  try {
    await transact("readwrite", (store) => {
      for (const { id, mimeType, data } of figures) store.put({ mimeType, data }, id);
    });
  } catch {
    // Storage full or blocked: the graphs stay visible for this session only.
  }
}

export async function loadFigures(ids: string[]): Promise<Map<string, Figure>> {
  const found = new Map<string, Figure>();
  if (ids.length === 0) return found;
  try {
    await transact("readonly", (store) => {
      for (const id of ids) {
        const request = store.get(id);
        request.onsuccess = () => {
          if (request.result) found.set(id, request.result as Figure);
        };
      }
    });
  } catch {
    // Unavailable storage reads as "not found".
  }
  return found;
}

export async function deleteFigures(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await transact("readwrite", (store) => {
      for (const id of ids) store.delete(id);
    });
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
