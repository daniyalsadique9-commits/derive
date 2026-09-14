"use client";

import { Menu, SquarePen } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type UIEvent } from "react";
import { Logo } from "@/components/brand/Logo";
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
} from "@/lib/client/conversation";
import { historyStore, useConversationHistory } from "@/lib/client/history-store";
import { streamSolve } from "@/lib/client/solve-client";
import { AnswerView } from "./AnswerView";
import { Composer, type ComposerMode } from "./Composer";
import { EmptyState } from "./EmptyState";
import type { AnswerAction } from "./intents";
import { QuestionView } from "./QuestionView";
import { Sidebar } from "./Sidebar";

/** Keep following the stream only while the reader is near the bottom. */
const STICK_TO_BOTTOM_PX = 120;

interface Submission {
  content: string;
  intent: Intent;
  images?: ImageInput[];
}

interface SolverAppProps {
  userId: string;
  firstName: string;
  isAdmin: boolean;
}

export function SolverApp({ userId, firstName, isAdmin }: SolverAppProps) {
  const history = useConversationHistory(userId);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [style, setStyle] = useState<ExplanationStyle>("intuitive");
  const [language, setLanguage] = useState<AnswerLanguage>("english");
  const [mode, setMode] = useState<ComposerMode>("ask");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [capacityRefreshKey, setCapacityRefreshKey] = useState(0);

  // The ref is the source of truth while streaming; state mirrors it for rendering.
  const conversationRef = useRef<Conversation | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const commit = useCallback((next: Conversation | null) => {
    conversationRef.current = next;
    setConversation(next);
  }, []);

  const updateAnswer = useCallback(
    (answerId: string, change: (answer: AssistantMessage) => AssistantMessage) => {
      const current = conversationRef.current;
      if (!current) return;
      commit({
        ...current,
        messages: current.messages.map((message) =>
          message.id === answerId && message.role === "assistant" ? change(message) : message,
        ),
      });
    },
    [commit],
  );

  const ask = useCallback(
    async (submission: Submission) => {
      if (abortRef.current) return;

      const base =
        conversationRef.current ??
        createConversation(submission.content, (submission.images?.length ?? 0) > 0);
      const question: UserMessage = { id: newId(), role: "user", ...submission };
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
      commit(started);
      historyStore.save(userId, started);
      setMode("ask");
      stickToBottom.current = true;

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      // Apply streamed events once per animation frame rather than once per token.
      let pending: StreamEvent[] = [];
      let frame = 0;
      const flush = () => {
        frame = 0;
        if (pending.length === 0) return;
        const events = pending;
        pending = [];
        updateAnswer(answer.id, (message) => events.reduce(applyEvent, message));
      };
      const onEvent = (event: StreamEvent) => {
        pending.push(event);
        frame ||= requestAnimationFrame(flush);
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
        cancelAnimationFrame(frame);
        flush();
        updateAnswer(answer.id, (message) =>
          isAnswerStreaming(message) ? { ...message, phase: "done" } : message,
        );
        abortRef.current = null;
        setIsStreaming(false);
        setCapacityRefreshKey((key) => key + 1);

        const finished = conversationRef.current;
        if (finished) {
          const tagged = withDetectedTopic(finished);
          commit(tagged);
          historyStore.save(userId, tagged);
        }
      }
    },
    [commit, language, style, updateAnswer, userId],
  );

  const retry = useCallback(
    (answerId: string) => {
      const current = conversationRef.current;
      if (!current) return;
      const answerIndex = current.messages.findIndex((message) => message.id === answerId);
      const question = current.messages[answerIndex - 1];
      if (question?.role !== "user") return;
      commit({ ...current, messages: current.messages.slice(0, answerIndex - 1) });
      void ask({ content: question.content, intent: question.intent, images: question.images });
    },
    [ask, commit],
  );

  const handleAction = useCallback(
    (action: AnswerAction) => {
      if (action === "explainBack") setMode("explainBack");
      else void ask({ content: "", intent: action });
    },
    [ask],
  );

  function startNew() {
    commit(null);
    setMode("ask");
    setSidebarOpen(false);
  }

  function openConversation(selected: Conversation) {
    commit(selected);
    setMode("ask");
    setSidebarOpen(false);
    stickToBottom.current = true;
  }

  function toggleBookmark(target: Conversation) {
    historyStore.setBookmarked(userId, target.id, !target.bookmarked);
    if (conversationRef.current?.id === target.id) {
      commit({ ...conversationRef.current, bookmarked: !target.bookmarked });
    }
  }

  function deleteConversation(target: Conversation) {
    historyStore.remove(userId, target.id);
    if (conversationRef.current?.id === target.id) commit(null);
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    stickToBottom.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < STICK_TO_BOTTOM_PX;
  }

  useEffect(() => {
    const element = scrollRef.current;
    if (element && stickToBottom.current) element.scrollTop = element.scrollHeight;
  }, [conversation]);

  const composer = (
    <Composer
      onSubmit={(content, images) =>
        void ask({ content, images, intent: mode === "explainBack" ? "explainBack" : "ask" })
      }
      onStop={() => abortRef.current?.abort()}
      isStreaming={isStreaming}
      style={style}
      onStyleChange={setStyle}
      language={language}
      onLanguageChange={setLanguage}
      mode={mode}
      onCancelMode={() => setMode("ask")}
    />
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        conversations={history}
        activeId={conversation?.id}
        open={sidebarOpen}
        disabled={isStreaming}
        capacityRefreshKey={capacityRefreshKey}
        isAdmin={isAdmin}
        onClose={() => setSidebarOpen(false)}
        onNew={startNew}
        onSelect={openConversation}
        onToggleBookmark={toggleBookmark}
        onDelete={deleteConversation}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-subtle"
          >
            <Menu className="size-5" />
          </button>
          <Logo />
          <button
            type="button"
            onClick={startNew}
            disabled={isStreaming}
            aria-label="New question"
            className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-subtle disabled:opacity-50"
          >
            <SquarePen className="size-5" />
          </button>
        </header>

        {conversation ? (
          <>
            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
              <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 pt-8 pb-10 sm:px-6">
                {conversation.messages.map((message, index) =>
                  message.role === "user" ? (
                    <QuestionView key={message.id} message={message} />
                  ) : (
                    <AnswerView
                      key={message.id}
                      message={message}
                      isLatest={index === conversation.messages.length - 1}
                      onAction={handleAction}
                      onRetry={() => retry(message.id)}
                    />
                  ),
                )}
              </div>
            </div>
            <div className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
              {composer}
              <p className="mt-2 text-center text-xs text-ink-muted">
                AI-generated answers can contain errors. Verify important results.
              </p>
            </div>
          </>
        ) : (
          <EmptyState
            firstName={firstName}
            composer={composer}
            onPick={(question) => void ask({ content: question, intent: "ask" })}
          />
        )}
      </main>
    </div>
  );
}
