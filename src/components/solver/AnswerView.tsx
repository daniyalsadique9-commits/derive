"use client";

import Image from "next/image";
import { Check, ChevronRight, Copy, Loader2, RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { Markdown } from "@/components/markdown/Markdown";
import { stripComments, toRenderableMarkdown } from "@/lib/client/answer-text";
import {
  answerText,
  isAnswerStreaming,
  type AssistantMessage,
  type Block,
} from "@/lib/client/conversation";
import { toDataUrl } from "@/lib/client/image";
import { cn } from "@/lib/utils/cn";
import { ANSWER_ACTIONS, INTENT_DETAILS, type AnswerAction } from "./intents";
import { shortModelName } from "./model-name";
import { VerificationBadge, VerificationPending } from "./VerificationBadge";

type CodeBlock = Extract<Block, { kind: "code" }>;
type ContentBlock = Exclude<Block, CodeBlock>;

/** Progress text shown until the first words of the answer arrive. */
function progressLabel(message: AssistantMessage): string | null {
  if (message.blocks.some((block) => block.kind === "text")) return null;
  if (message.phase === "waiting") return "Analyzing question…";
  const calculating = message.blocks.some(
    (block) => block.kind === "code" && block.output === undefined,
  );
  return calculating ? "Calculating…" : "Working through the solution…";
}

function ContentView({ block, streaming }: { block: ContentBlock; streaming: boolean }) {
  if (block.kind === "text") {
    return <Markdown text={toRenderableMarkdown(block.text)} streaming={streaming} />;
  }
  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-white">
      <Image
        src={toDataUrl(block)}
        alt="Graph for this answer"
        width={1200}
        height={900}
        unoptimized
        className="h-auto w-full"
      />
    </figure>
  );
}

/** The code behind computed results, collapsed by default. */
function Calculations({ runs }: { runs: CodeBlock[] }) {
  const [open, setOpen] = useState(false);
  if (runs.length === 0) return null;

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-ink-muted transition-colors hover:text-ink"
      >
        <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        {open ? "Hide calculation" : "Show calculation"}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {runs.map((run, index) => (
            <div key={index} className="overflow-hidden rounded-xl border border-line">
              <pre className="overflow-x-auto bg-[var(--code-bg)] p-3 font-mono leading-relaxed text-[var(--code-ink)]">
                {run.code}
              </pre>
              {run.output !== undefined && (
                <pre className="overflow-x-auto border-t border-line bg-subtle p-3 font-mono leading-relaxed whitespace-pre-wrap text-ink">
                  {run.output.trim() || "(no output)"}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy answer"
      className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
    >
      {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
    </button>
  );
}

function ActionBar({ onAction }: { onAction: (action: AnswerAction) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ANSWER_ACTIONS.map((action) => {
        const { action: label, icon: Icon } = INTENT_DETAILS[action];
        return (
          <button
            key={action}
            type="button"
            onClick={() => onAction(action)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent/40 hover:text-ink"
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Seconds since `active` first became true, updated every second while it stays true. */
function useElapsedSeconds(active: boolean): number {
  const startedAt = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    startedAt.current ??= Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);

  return elapsed;
}

interface AnswerViewProps {
  message: AssistantMessage;
  isLatest: boolean;
  onAction: (action: AnswerAction) => void;
  onRetry: () => void;
}

export function AnswerView({ message, isLatest, onAction, onRetry }: AnswerViewProps) {
  const streaming = isAnswerStreaming(message);
  const elapsed = useElapsedSeconds(streaming);
  const progress = streaming ? progressLabel(message) : null;
  const finished = message.phase === "done";
  const content = message.blocks.filter((block): block is ContentBlock => block.kind !== "code");
  const calculations = message.blocks.filter((block): block is CodeBlock => block.kind === "code");

  return (
    <article className="flex gap-4">
      <LogoMark className="mt-0.5 hidden size-7 rounded-md sm:grid" />
      <div className="min-w-0 flex-1 space-y-4">
        {progress && (
          <div className="text-sm text-ink-muted">
            <p className="flex h-8 items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              {progress}
              {elapsed >= 3 && <span className="tabular-nums">{elapsed}s</span>}
            </p>
            {elapsed >= 30 && (
              <p className="pl-6 text-xs">Long, multi-part questions can take up to two minutes.</p>
            )}
          </div>
        )}

        {content.map((block, index) => (
          <ContentView key={index} block={block} streaming={streaming} />
        ))}

        {message.phase === "error" && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm text-warning">
            <TriangleAlert className="size-4 shrink-0" />
            <span className="flex-1">{message.error}</span>
            {isLatest && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
              >
                <RotateCcw className="size-3.5" />
                Try again
              </button>
            )}
          </div>
        )}

        {message.phase === "verifying" && <VerificationPending />}
        {message.verification && <VerificationBadge result={message.verification} />}
        {finished && <Calculations runs={calculations} />}

        {finished && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
            {isLatest && <ActionBar onAction={onAction} />}
            <div className="ml-auto flex items-center gap-2">
              {message.model && (
                <span className="text-xs text-ink-muted">
                  {shortModelName(message.model)}
                  {message.totalTokens
                    ? ` · ${message.totalTokens.toLocaleString("en-IN")} tokens`
                    : ""}
                </span>
              )}
              <CopyButton text={stripComments(answerText(message))} />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
