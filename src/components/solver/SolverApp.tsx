"use client";

import { Menu, SquarePen } from "lucide-react";
import { useEffect, useRef, useState, type UIEvent } from "react";
import { Logo } from "@/components/brand/Logo";
import type { AnswerLanguage, ExplanationStyle } from "@/lib/ai/schema";
import type { Conversation } from "@/lib/client/conversation";
import { historyStore, useConversationHistory } from "@/lib/client/history-store";
import { solverSession, useSolverSession, type Submission } from "@/lib/client/solver-session";
import { AnswerView } from "./AnswerView";
import { Composer, type ComposerMode } from "./Composer";
import { EmptyState } from "./EmptyState";
import type { AnswerAction } from "./intents";
import { QuestionView } from "./QuestionView";
import { Sidebar } from "./Sidebar";

/** Keep following the stream only while the reader is near the bottom. */
const STICK_TO_BOTTOM_PX = 120;

interface SolverAppProps {
  userId: string;
  firstName: string;
  isAdmin: boolean;
}

export function SolverApp({ userId, firstName, isAdmin }: SolverAppProps) {
  const history = useConversationHistory(userId);
  // The open conversation lives outside this component, so answers survive page changes.
  const { conversation, isStreaming } = useSolverSession(userId);
  const [style, setStyle] = useState<ExplanationStyle>("intuitive");
  const [language, setLanguage] = useState<AnswerLanguage>("english");
  const [mode, setMode] = useState<ComposerMode>("ask");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [capacityRefreshKey, setCapacityRefreshKey] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  function ask(submission: Submission) {
    setMode("ask");
    stickToBottom.current = true;
    void solverSession.ask(userId, submission, {
      style,
      language,
      onFinish: () => setCapacityRefreshKey((key) => key + 1),
    });
  }

  function retry(answerId: string) {
    if (!conversation) return;
    const answerIndex = conversation.messages.findIndex((message) => message.id === answerId);
    const question = conversation.messages[answerIndex - 1];
    if (question?.role !== "user") return;
    solverSession.open(userId, {
      ...conversation,
      messages: conversation.messages.slice(0, answerIndex - 1),
    });
    ask({ content: question.content, intent: question.intent, images: question.images });
  }

  function handleAction(action: AnswerAction) {
    if (action === "explainBack") setMode("explainBack");
    else ask({ content: "", intent: action });
  }

  function startNew() {
    solverSession.open(userId, null);
    setMode("ask");
    setSidebarOpen(false);
  }

  function openConversation(selected: Conversation) {
    solverSession.open(userId, selected);
    setMode("ask");
    setSidebarOpen(false);
    stickToBottom.current = true;
  }

  function toggleBookmark(target: Conversation) {
    historyStore.setBookmarked(userId, target.id, !target.bookmarked);
    if (conversation?.id === target.id) {
      solverSession.open(userId, { ...conversation, bookmarked: !target.bookmarked });
    }
  }

  function deleteConversation(target: Conversation) {
    historyStore.remove(userId, target.id);
    if (conversation?.id === target.id) solverSession.open(userId, null);
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
        ask({ content, images, intent: mode === "explainBack" ? "explainBack" : "ask" })
      }
      onStop={() => solverSession.stop(userId)}
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
                      showModel={isAdmin}
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
            onPick={(question) => ask({ content: question, intent: "ask" })}
          />
        )}
      </main>
    </div>
  );
}
