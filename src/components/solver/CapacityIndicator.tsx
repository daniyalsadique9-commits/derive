"use client";

import { ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import type { CapacityReport, ProviderHealth, ProviderStatus } from "@/lib/ai/events";
import { cn } from "@/lib/utils/cn";
import { shortModelName } from "./model-name";

const POLL_INTERVAL_MS = 30_000;

const STATUS_STYLES: Record<ProviderStatus, { dot: string; label: string }> = {
  ready: { dot: "bg-success", label: "Available" },
  busy: { dot: "bg-warning", label: "Busy" },
  exhausted: { dot: "bg-red-500", label: "Limit reached" },
  unconfigured: { dot: "bg-ink-muted", label: "Not configured" },
};

/** One line for the sidebar: whether answers are available and how many the student has left. */
function summary(report: CapacityReport | null): { dot: string; text: string } {
  if (!report) return { dot: "bg-ink-muted", text: "Checking…" };
  const [solver, , vision] = report.providers;
  if (solver?.status !== "ready" && vision?.status !== "ready") {
    return { dot: "bg-red-500", text: "Busy right now · try again shortly" };
  }
  const dot = solver?.status === "ready" ? "bg-success" : "bg-warning";
  if (!report.allowance) return { dot, text: "Online" };

  const { usedToday, dailyLimit } = report.allowance;
  const left = Math.max(0, dailyLimit - usedToday);
  if (left === 0) return { dot: "bg-warning", text: "Daily limit reached · resets at midnight" };
  return { dot, text: `Online · ${left} of ${dailyLimit} left today` };
}

function ProviderRow({ provider }: { provider: ProviderHealth }) {
  const status = STATUS_STYLES[provider.status];
  return (
    <li className="flex items-start gap-2.5 py-2">
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", status.dot)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{provider.role}</p>
        <p className="truncate font-mono text-[0.7rem] text-ink-muted">
          {shortModelName(provider.model)}
        </p>
      </div>
      <div className="text-right text-xs text-ink-muted">
        <p>{status.label}</p>
        {provider.requestsLeft !== null && (
          <p>
            {provider.estimated ? "~" : ""}
            {provider.requestsLeft.toLocaleString("en-IN")} left
          </p>
        )}
      </div>
    </li>
  );
}

interface CapacityIndicatorProps {
  /** Refreshes the numbers when it changes, e.g. after each answer. */
  refreshKey: number;
  /** Admins can open the per-model capacity details. */
  detailed: boolean;
}

/** Shows whether answers are available and the student's remaining requests for today. */
export function CapacityIndicator({ refreshKey, detailed }: CapacityIndicatorProps) {
  const [report, setReport] = useState<CapacityReport | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/status", { cache: "no-store" });
        if (response.ok && !cancelled) setReport((await response.json()) as CapacityReport);
      } catch {
        // Offline: keep showing the last known report.
      }
    }
    void load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [refreshKey]);

  const { dot, text } = summary(report);
  const line = (
    <>
      <span className={cn("size-2 shrink-0 rounded-full", dot)} />
      <span className="flex-1 truncate">{text}</span>
    </>
  );

  if (!detailed) {
    return <p className="flex items-center gap-2 px-2 py-1.5 text-xs text-ink-muted">{line}</p>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
      >
        {line}
        <ChevronUp className={cn("size-3.5 transition-transform", !open && "rotate-180")} />
      </button>
      {open && report && (
        <div className="absolute right-0 bottom-full left-0 z-10 mb-2 rounded-xl border border-line bg-surface p-3 shadow-lg">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Model capacity
          </p>
          <ul className="mt-1 divide-y divide-line">
            {report.providers.map((provider) => (
              <ProviderRow key={provider.role} provider={provider} />
            ))}
          </ul>
          <p className="mt-2 text-[0.7rem] leading-snug text-ink-muted">
            Requests are routed automatically to models with capacity left.
          </p>
        </div>
      )}
    </div>
  );
}
