"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonStyles } from "@/components/ui/button";
import type { AdminSettings, AdminState } from "@/lib/admin/types";
import type { ProviderStatus } from "@/lib/ai/events";
import { cn } from "@/lib/utils/cn";

const POLL_INTERVAL_MS = 15_000;

const STATUS_DOTS: Record<ProviderStatus, string> = {
  ready: "bg-success",
  busy: "bg-warning",
  exhausted: "bg-red-500",
  unconfigured: "bg-ink-muted",
};

const STATUS_LABELS: Record<ProviderStatus, string> = {
  ready: "Available",
  busy: "Busy",
  exhausted: "Limit reached",
  unconfigured: "Not configured",
};

const TOGGLES: {
  key: "maintenance" | "verification" | "uploads" | "studyPlans";
  label: string;
  hint: string;
}[] = [
  {
    key: "maintenance",
    label: "Maintenance mode",
    hint: "Pause the app for everyone except administrators.",
  },
  {
    key: "verification",
    label: "Answer verification",
    hint: "A second model checks each answer. Uses one extra request per question.",
  },
  { key: "uploads", label: "Photo and PDF uploads", hint: "Allow questions with attachments." },
  { key: "studyPlans", label: "Study plans", hint: "Allow students to create study plans." },
];

const LIMITS: {
  key: "perUserDaily" | "perUserPerMinute" | "dailyCap";
  label: string;
  max: number;
}[] = [
  { key: "perUserDaily", label: "Requests per student per day", max: 1000 },
  { key: "perUserPerMinute", label: "Requests per student per minute", max: 60 },
  { key: "dailyCap", label: "Total requests per day", max: 100_000 },
];

function timeAgo(timestamp: number | null): string {
  if (!timestamp) return "Not today";
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-accent" : "bg-line",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-surface shadow transition-transform",
          checked ? "translate-x-5.5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 font-serif text-3xl font-semibold text-ink">{value}</p>
      {detail && <p className="mt-1 text-xs text-ink-muted">{detail}</p>}
    </div>
  );
}

export function AdminPanel({ initialState }: { initialState: AdminState }) {
  const [state, setState] = useState(initialState);
  const [draft, setDraft] = useState<AdminSettings>(initialState.settings);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const response = await fetch("/api/admin", { cache: "no-store" });
        if (response.ok && !cancelled) setState((await response.json()) as AdminState);
      } catch {
        // Keep the last known state while offline.
      }
    }
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  function update<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setNotice(null);
  }

  async function send(method: "PATCH" | "POST", body: unknown): Promise<AdminState | null> {
    const response = await fetch("/api/admin", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      setNotice("The change could not be saved. Check the values and try again.");
      return null;
    }
    const next = (await response.json()) as AdminState;
    setState(next);
    return next;
  }

  async function save() {
    setSaving(true);
    const next = await send("PATCH", draft);
    setSaving(false);
    if (next) {
      setDraft(next.settings);
      setDirty(false);
      setNotice("Settings saved.");
    }
  }

  const capUsed = Math.min(100, Math.round((state.requestsToday / state.settings.dailyCap) * 100));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Requests today"
          value={state.requestsToday.toLocaleString("en-IN")}
          detail={`${capUsed}% of the daily cap of ${state.settings.dailyCap.toLocaleString("en-IN")}`}
        />
        <Stat
          label="Active students today"
          value={state.activeUsersToday.toLocaleString("en-IN")}
        />
        <Stat
          label="Status"
          value={state.settings.maintenance ? "Paused" : "Live"}
          detail={
            state.settings.maintenance ? "Maintenance mode is on" : "Open to all signed-in students"
          }
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-serif text-xl font-semibold">Controls</h2>
          <ul className="mt-5 divide-y divide-line">
            {TOGGLES.map((toggle) => (
              <li key={toggle.key} className="flex items-start gap-4 py-4 first:pt-0">
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{toggle.label}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{toggle.hint}</p>
                </div>
                <Switch
                  label={toggle.label}
                  checked={draft[toggle.key]}
                  onChange={(checked) => update(toggle.key, checked)}
                />
              </li>
            ))}
          </ul>
          <div className="mt-2 grid gap-4 sm:grid-cols-3">
            {LIMITS.map((limit) => (
              <label key={limit.key} className="block">
                <span className="text-xs font-medium text-ink-muted">{limit.label}</span>
                <input
                  type="number"
                  min={1}
                  max={limit.max}
                  value={draft[limit.key]}
                  onChange={(event) =>
                    update(
                      limit.key,
                      Math.min(limit.max, Math.max(1, Number(event.target.value) || 1)),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent/50"
                />
              </label>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={!dirty || saving}
              className={buttonStyles()}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </button>
            {notice && <p className="text-sm text-ink-muted">{notice}</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-serif text-xl font-semibold">Model capacity</h2>
          <ul className="mt-4 divide-y divide-line">
            {state.capacity.providers.map((provider) => (
              <li key={provider.role} className="flex items-center gap-3 py-3">
                <span
                  className={cn("size-2.5 shrink-0 rounded-full", STATUS_DOTS[provider.status])}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{provider.role}</p>
                  <p className="truncate font-mono text-xs text-ink-muted">{provider.model}</p>
                </div>
                <div className="text-right text-xs text-ink-muted">
                  <p>{STATUS_LABELS[provider.status]}</p>
                  {provider.requestsLeft !== null && (
                    <p>
                      {provider.estimated ? "~" : ""}
                      {provider.requestsLeft.toLocaleString("en-IN")} left today
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="font-serif text-xl font-semibold">Students</h2>
        {state.users.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">No activity since the server started.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-ink-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-4 font-medium">Student</th>
                  <th className="py-2 pr-4 font-medium">Requests today</th>
                  <th className="py-2 pr-4 font-medium">Last active</th>
                  <th className="py-2 font-medium">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {state.users.map((user) => (
                  <tr key={user.userId}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-ink">{user.name}</p>
                      <p className="text-xs text-ink-muted">{user.email ?? user.userId}</p>
                    </td>
                    <td className="py-3 pr-4 text-ink">{user.requestsToday}</td>
                    <td className="py-3 pr-4 text-ink-muted">{timeAgo(user.lastActiveAt)}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() =>
                          void send("POST", { userId: user.userId, blocked: !user.blocked })
                        }
                        className={buttonStyles({
                          variant: user.blocked ? "primary" : "secondary",
                          size: "sm",
                        })}
                      >
                        {user.blocked ? "Unblock" : "Block"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
