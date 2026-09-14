"use client";

import { Check, Copy, Loader2, Printer, RotateCcw, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { Markdown } from "@/components/markdown/Markdown";
import { buttonStyles } from "@/components/ui/button";
import { SYLLABUS } from "@/data/syllabus";
import type { StreamEvent } from "@/lib/ai/events";
import {
  SELF_RATINGS,
  type PlanRequest,
  type SelfRating,
  type StudyGoal,
} from "@/lib/ai/plan-schema";
import type { AnswerLanguage } from "@/lib/ai/schema";
import { toRenderableMarkdown } from "@/lib/client/answer-text";
import { useConversationHistory } from "@/lib/client/history-store";
import { planStore, useSavedPlan } from "@/lib/client/plan-store";
import { streamPlan } from "@/lib/client/solve-client";
import { cn } from "@/lib/utils/cn";

const GOALS: { value: StudyGoal; label: string }[] = [
  { value: "pass", label: "Pass comfortably" },
  { value: "good", label: "Score well" },
  { value: "top", label: "Top marks" },
];

const RATING_LABELS: Record<SelfRating, string> = {
  weak: "Weak",
  average: "Average",
  strong: "Strong",
};

const LANGUAGES: { value: AnswerLanguage; label: string }[] = [
  { value: "english", label: "English" },
  { value: "hinglish", label: "Hinglish" },
];

type Status = "idle" | "streaming" | "error";

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-subtle p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 rounded-md font-medium whitespace-nowrap transition-colors",
            size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
            value === option.value
              ? "bg-surface text-ink shadow-sm"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-sm font-semibold text-ink">{children}</p>;
}

interface StudyPlannerProps {
  userId: string;
  firstName: string;
}

export function StudyPlanner({ userId, firstName }: StudyPlannerProps) {
  const history = useConversationHistory(userId);
  const savedPlan = useSavedPlan(userId);

  const [ratings, setRatings] = useState<Record<string, SelfRating | null>>(() =>
    Object.fromEntries(
      SYLLABUS.courses.map((course) => [course.code, course.kind === "theory" ? "average" : null]),
    ),
  );
  const [weeks, setWeeks] = useState(8);
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [goal, setGoal] = useState<StudyGoal>("good");
  const [difficultTopics, setDifficultTopics] = useState("");
  const [useHistory, setUseHistory] = useState(true);
  const [language, setLanguage] = useState<AnswerLanguage>("english");
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const recentTopics = [
    ...new Set(
      history.flatMap((conversation) =>
        conversation.subject
          ? [`${conversation.subject}${conversation.topic ? `: ${conversation.topic}` : ""}`]
          : [],
      ),
    ),
  ].slice(0, 12);

  const selectedCourses = Object.entries(ratings).flatMap(([code, rating]) =>
    rating ? [{ code, rating }] : [],
  );
  const streaming = status === "streaming";
  const plan = draft ?? savedPlan;

  function toggleCourse(code: string) {
    setRatings((current) => ({ ...current, [code]: current[code] ? null : "average" }));
  }

  async function generate() {
    if (streaming || selectedCourses.length === 0) return;
    const request: PlanRequest = {
      courses: selectedCourses,
      weeks,
      hoursPerDay,
      goal,
      difficultTopics,
      recentTopics: useHistory ? recentTopics : [],
      language,
    };

    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("streaming");
    setError(null);
    setDraft("");
    let text = "";
    let failure: string | null = null;

    const onEvent = (event: StreamEvent) => {
      if (event.type === "text") {
        text += event.text;
        setDraft(text);
      } else if (event.type === "reset") {
        text = "";
        setDraft("");
      } else if (event.type === "error") {
        failure = event.message;
      }
    };

    try {
      await streamPlan(request, onEvent, controller.signal);
    } catch (reason) {
      if (!controller.signal.aborted) {
        failure = reason instanceof Error ? reason.message : "Something went wrong.";
      }
    }

    abortRef.current = null;
    if (failure || !text.trim()) {
      setError(failure ?? "The plan could not be created. Please try again.");
      setStatus("error");
      setDraft(null);
      return;
    }
    planStore.save(userId, text);
    setDraft(null);
    setStatus("idle");
  }

  async function copyPlan() {
    if (!plan) return;
    await navigator.clipboard.writeText(plan);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[400px_1fr]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void generate();
        }}
        className="space-y-6 rounded-2xl border border-line bg-surface p-5 sm:p-6 print:hidden"
      >
        <div>
          <FieldLabel>Courses and how confident you feel</FieldLabel>
          <ul className="space-y-2">
            {SYLLABUS.courses.map((course) => {
              const rating = ratings[course.code];
              return (
                <li key={course.code} className="rounded-xl border border-line p-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(rating)}
                      onChange={() => toggleCourse(course.code)}
                      className="mt-1 size-4 accent-[var(--accent)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{course.title}</span>
                      <span className="font-mono text-xs text-ink-muted">{course.code}</span>
                    </span>
                  </label>
                  {rating && (
                    <div className="mt-2.5 pl-7">
                      <Segmented
                        label={`Confidence in ${course.title}`}
                        value={rating}
                        size="sm"
                        options={SELF_RATINGS.map((value) => ({
                          value,
                          label: RATING_LABELS[value],
                        }))}
                        onChange={(value) =>
                          setRatings((current) => ({ ...current, [course.code]: value }))
                        }
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label>
            <FieldLabel>Weeks until exams</FieldLabel>
            <input
              type="number"
              min={1}
              max={20}
              value={weeks}
              onChange={(event) =>
                setWeeks(Math.min(20, Math.max(1, Number(event.target.value) || 1)))
              }
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent/50"
            />
          </label>
          <label>
            <FieldLabel>Hours per day</FieldLabel>
            <select
              value={hoursPerDay}
              onChange={(event) => setHoursPerDay(Number(event.target.value))}
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent/50"
            >
              {[1, 2, 3, 4, 5, 6, 8].map((hours) => (
                <option key={hours} value={hours}>
                  {hours} {hours === 1 ? "hour" : "hours"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <FieldLabel>Goal</FieldLabel>
          <Segmented label="Goal" value={goal} options={GOALS} onChange={setGoal} />
        </div>

        <label className="block">
          <FieldLabel>Topics you find difficult (optional)</FieldLabel>
          <textarea
            value={difficultTopics}
            onChange={(event) => setDifficultTopics(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="For example: eigenvalues, Maxwell's equations, pointers"
            className="w-full resize-none rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none placeholder:text-ink-muted/70 focus:border-accent/50"
          />
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={useHistory}
            onChange={(event) => setUseHistory(event.target.checked)}
            className="mt-1 size-4 accent-[var(--accent)]"
          />
          <span className="text-sm text-ink">
            Use my recent questions
            <span className="block text-xs text-ink-muted">
              {recentTopics.length > 0
                ? recentTopics.slice(0, 4).join(", ") + (recentTopics.length > 4 ? "…" : "")
                : "No recent questions yet."}
            </span>
          </span>
        </label>

        <div>
          <FieldLabel>Language</FieldLabel>
          <Segmented label="Language" value={language} options={LANGUAGES} onChange={setLanguage} />
        </div>

        <button
          type="submit"
          disabled={streaming || selectedCourses.length === 0}
          className={buttonStyles({ size: "lg", className: "w-full" })}
        >
          {streaming ? <Loader2 className="size-4 animate-spin" /> : null}
          {streaming ? "Creating your plan…" : plan ? "Create a new plan" : "Create my study plan"}
        </button>
      </form>

      <section className="min-w-0 rounded-2xl border border-line bg-surface p-5 sm:p-8 print:border-0 print:p-0">
        {error && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm text-warning">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}
        {plan ? (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
              <p className="mr-auto font-serif text-2xl font-semibold text-ink">
                {firstName}&apos;s study plan
              </p>
              {!streaming && (
                <>
                  <button
                    type="button"
                    onClick={copyPlan}
                    className={buttonStyles({ variant: "ghost", size: "sm" })}
                  >
                    {copied ? (
                      <Check className="size-4 text-success" />
                    ) : (
                      <Copy className="size-4" />
                    )}
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
                    onClick={() => void generate()}
                    className={buttonStyles({ variant: "ghost", size: "sm" })}
                  >
                    <RotateCcw className="size-4" />
                    Regenerate
                  </button>
                </>
              )}
            </div>
            {streaming && !plan.trim() ? (
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <Loader2 className="size-4 animate-spin" />
                Reading the syllabus and building your plan…
              </p>
            ) : (
              <Markdown text={toRenderableMarkdown(plan)} streaming={streaming} />
            )}
          </>
        ) : (
          <div className="py-16 text-center">
            <p className="font-serif text-2xl font-semibold text-ink">Your semester, planned</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
              Choose your courses, rate your confidence and set your time. You will get a
              week-by-week plan built from the {SYLLABUS.group} Semester {SYLLABUS.semester}{" "}
              syllabus, with a daily routine and advice for each course.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
