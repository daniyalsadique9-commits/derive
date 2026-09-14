import { Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { InlineMarkdown } from "@/components/markdown/InlineMarkdown";
import type { Verification } from "@/lib/ai/events";
import { shortModelName } from "./model-name";

const MAX_ANSWER_CHARS = 240;

function truncate(text: string): string {
  return text.length > MAX_ANSWER_CHARS ? `${text.slice(0, MAX_ANSWER_CHARS).trimEnd()}…` : text;
}

export function VerificationPending() {
  return (
    <p className="flex items-center gap-2 text-sm text-ink-muted">
      <Loader2 className="size-3.5 animate-spin" />
      Verifying answer…
    </p>
  );
}

export function VerificationBadge({ result }: { result: Verification }) {
  if (result.status === "skipped") return null;

  if (result.status === "agree") {
    return (
      <p
        className="flex flex-wrap items-center gap-2 text-sm text-ink-muted"
        title={`Solved again independently by ${shortModelName(result.checker)}`}
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
          <ShieldCheck className="size-3.5" />
          Verified
        </span>
        Confirmed by an independent check
      </p>
    );
  }

  return (
    <div className="rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm text-ink">
      <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-warning">
        <TriangleAlert className="size-3.5" />
        Needs review
      </p>
      <p>
        Two independent checks reached a different result:{" "}
        <strong>
          <InlineMarkdown text={truncate(result.independentAnswer)} />
        </strong>
        . {result.note}
      </p>
    </div>
  );
}
