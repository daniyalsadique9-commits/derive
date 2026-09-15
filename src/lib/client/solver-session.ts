import { useSyncExternalStore } from "react";
import type { StreamEvent } from "@/lib/ai/events";
import type { AnswerLanguage, ExplanationStyle, ImageInput, Intent } from "@/lib/ai/schema";
import {
  applyEvent,
  createConversation,
  isAnswerStreaming,
  newId,
  toTurns,
  withDetectedTopic,
  type AssistantMessage,
  type Conversation,
  type UserMessage,
} from "./conversation";
import { historyStore } from "./history-store";
import { makePreview } from "./image";
import { streamSolve } from "./solve-client";

export interface Submission {
  content: string;
  intent: Intent;
  images?: ImageInput[];
}

interface SessionState {
  conversation: Conversation | null;
  isStreaming: boolean;
}

interface AskOptions {
  style: ExplanationStyle;
  language: AnswerLanguage;
  onFinish?: () => void;
}

/** How often streamed events are applied. Timers keep running while another page is open. */
const FLUSH_MS = 40;
const IDLE: SessionState = { conversation: null, isStreaming: false };

/**
 * The solver's open conversation and the answer being written, kept outside React. An answer
 * keeps streaming while the student visits other pages, and the solver reopens where they left.
 */
const states = new Map<string, SessionState>();
const controllers = new Map<string, AbortController>();
const listeners = new Set<() => void>();

const read = (userId: string): SessionState => states.get(userId) ?? IDLE;

function write(userId: string, change: Partial<SessionState>): void {
  states.set(userId, { ...read(userId), ...change });
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function updateAnswer(
  userId: string,
  answerId: string,
  change: (answer: AssistantMessage) => AssistantMessage,
): void {
  const conversation = read(userId).conversation;
  if (!conversation) return;
  write(userId, {
    conversation: {
      ...conversation,
      messages: conversation.messages.map((message) =>
        message.id === answerId && message.role === "assistant" ? change(message) : message,
      ),
    },
  });
}

export const solverSession = {
  open(userId: string, conversation: Conversation | null): void {
    write(userId, { conversation });
  },

  stop(userId: string): void {
    controllers.get(userId)?.abort();
  },

  async ask(
    userId: string,
    submission: Submission,
    { style, language, onFinish }: AskOptions,
  ): Promise<void> {
    if (controllers.has(userId)) return;
    const controller = new AbortController();
    controllers.set(userId, controller);

    const previews = submission.images?.length
      ? await Promise.all(submission.images.map(makePreview))
      : undefined;
    const base =
      read(userId).conversation ??
      createConversation(submission.content, (submission.images?.length ?? 0) > 0);
    const question: UserMessage = { id: newId(), role: "user", ...submission, previews };
    const answer: AssistantMessage = {
      id: newId(),
      role: "assistant",
      phase: "waiting",
      blocks: [],
    };
    const turns = toTurns([...base.messages, question]);
    const started = {
      ...base,
      updatedAt: Date.now(),
      messages: [...base.messages, question, answer],
    };

    write(userId, { conversation: started, isStreaming: true });
    historyStore.save(userId, started);

    // Apply streamed events in small batches rather than once per token.
    let pending: StreamEvent[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      timer = undefined;
      if (pending.length === 0) return;
      const events = pending;
      pending = [];
      updateAnswer(userId, answer.id, (message) => events.reduce(applyEvent, message));
    };
    const onEvent = (event: StreamEvent) => {
      pending.push(event);
      timer ??= setTimeout(flush, FLUSH_MS);
    };

    try {
      await streamSolve({ style, language, messages: turns }, onEvent, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) {
        onEvent({
          type: "error",
          message: error instanceof Error ? error.message : "Something went wrong.",
        });
      }
    } finally {
      clearTimeout(timer);
      flush();
      updateAnswer(userId, answer.id, (message) =>
        isAnswerStreaming(message) ? { ...message, phase: "done" } : message,
      );
      controllers.delete(userId);

      const finished = read(userId).conversation;
      const tagged = finished ? withDetectedTopic(finished) : null;
      write(userId, { conversation: tagged, isStreaming: false });
      if (tagged) historyStore.save(userId, tagged);
      onFinish?.();
    }
  },
};

export function useSolverSession(userId: string): SessionState {
  return useSyncExternalStore(
    subscribe,
    () => read(userId),
    () => IDLE,
  );
}

/** Whether an answer is still being written, for a hint on other pages. */
export function useAnswerInProgress(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => controllers.size > 0,
    () => false,
  );
}
