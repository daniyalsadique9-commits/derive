"use client";

import { Check, Copy, Loader2, Printer, RotateCcw, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Markdown } from "@/components/markdown/Markdown";
import { buttonStyles } from "@/components/ui/button";
import { toRenderableMarkdown } from "@/lib/client/answer-text";

interface GeneratedDocumentProps {
  title: string;
  text: string | null;
  streaming: boolean;
  error: string | null;
  progressLabel: string;
  onRegenerate: () => void;
  /** Shown before anything has been generated. */
  empty: ReactNode;
}

/** The result panel for generated documents: study plans, viva sets. */
export function GeneratedDocument({
  title,
  text,
  streaming,
  error,
  progressLabel,
  onRegenerate,
  empty,
}: GeneratedDocumentProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-surface p-5 sm:p-8 print:border-0 print:p-0">
      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm text-warning print:hidden">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}
      {text === null ? (
        empty
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <p className="mr-auto font-serif text-2xl font-semibold text-ink">{title}</p>
            {!streaming && (
              <div className="flex gap-1 print:hidden">
                <button
                  type="button"
                  onClick={copy}
                  className={buttonStyles({ variant: "ghost", size: "sm" })}
                >
                  {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={buttonStyles({ variant: "ghost", size: "sm" })}
                >
                  <Printer className="size-4" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={onRegenerate}
                  className={buttonStyles({ variant: "ghost", size: "sm" })}
                >
                  <RotateCcw className="size-4" />
                  Regenerate
                </button>
              </div>
            )}
          </div>
          {streaming && !text.trim() ? (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <Loader2 className="size-4 animate-spin" />
              {progressLabel}
            </p>
          ) : (
            <Markdown text={toRenderableMarkdown(text)} streaming={streaming} />
          )}
        </>
      )}
    </section>
  );
}
