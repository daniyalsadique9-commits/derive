"use client";

import Link from "next/link";
import {
  ArrowRight,
  Atom,
  BookOpen,
  Brain,
  ChevronDown,
  Clock,
  Code,
  Download,
  FileText,
  FlaskConical,
  GraduationCap,
  HeartHandshake,
  Landmark,
  Layers,
  ListChecks,
  Monitor,
  Search,
  Sigma,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { buttonStyles } from "@/components/ui/button";
import type { Syllabus, SyllabusCourse } from "@/data/syllabus";
import { cn } from "@/lib/utils/cn";

type KindFilter = "all" | SyllabusCourse["kind"];

interface Subject {
  icon: LucideIcon;
  /** Icon tile and unit markers. */
  tile: string;
  /** Hours bar. */
  bar: string;
}

const TONES = {
  indigo: {
    tile: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
    bar: "bg-indigo-500",
  },
  sky: {
    tile: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
    bar: "bg-sky-500",
  },
  violet: {
    tile: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    bar: "bg-violet-500",
  },
  teal: {
    tile: "bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300",
    bar: "bg-teal-500",
  },
  rose: {
    tile: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    bar: "bg-rose-500",
  },
  amber: {
    tile: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  orange: {
    tile: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
    bar: "bg-orange-500",
  },
  emerald: {
    tile: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
} as const;

/** An icon and colour for each course, so subjects are easy to tell apart at a glance. */
const SUBJECTS: Record<string, Subject> = {
  "100102": { icon: Sigma, ...TONES.indigo },
  "100104": { icon: Atom, ...TONES.sky },
  "100105": { icon: Brain, ...TONES.violet },
  "100108": { icon: Monitor, ...TONES.teal },
  "100109": { icon: HeartHandshake, ...TONES.rose },
  "100110": { icon: Landmark, ...TONES.amber },
  "100111": { icon: Zap, ...TONES.orange },
  "100104P": { icon: FlaskConical, ...TONES.sky },
  "100111P": { icon: Zap, ...TONES.orange },
  "100112P": { icon: Code, ...TONES.emerald },
};

const FALLBACK_SUBJECT: Subject = { icon: BookOpen, ...TONES.indigo };

function courseHours(course: SyllabusCourse): number {
  return course.units.reduce((sum, unit) => sum + unit.hours, 0);
}

function matches(course: SyllabusCourse, needle: string): boolean {
  if (!needle) return true;
  return [
    course.code,
    course.title,
    ...course.units.flatMap((unit) => [unit.title, ...unit.topics]),
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <Icon className="size-5 text-accent" />
      <p className="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-sm text-ink-muted">{label}</p>
    </div>
  );
}

function CourseCard({
  course,
  file,
  needle,
}: {
  course: SyllabusCourse;
  file: string;
  needle: string;
}) {
  const { icon: Icon, tile, bar } = SUBJECTS[course.code] ?? FALLBACK_SUBJECT;
  const [lecture, tutorial, practical] = course.ltp;
  const theory = course.kind === "theory";
  const hours = courseHours(course);
  const isHit = (text: string) => needle.length > 0 && text.toLowerCase().includes(needle);
  // A search that matches a unit or topic opens the list so the match is visible.
  const matchesTopic = course.units.some((unit) => isHit(unit.title) || unit.topics.some(isHit));

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-shadow hover:shadow-[0_12px_32px_-16px_rgb(0_0_0/0.25)]">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl", tile)}>
            <Icon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono text-ink-muted">{course.code}</span>
              <span className="rounded-full bg-subtle px-2 py-0.5 font-medium text-ink-muted">
                {theory ? "Theory" : "Lab"}
              </span>
            </div>
            <h3 className="mt-1 font-serif text-lg leading-snug font-semibold text-ink">
              {course.title}
            </h3>
          </div>
          <div className="shrink-0 rounded-xl border border-line px-3 py-1.5 text-center">
            <p className="font-serif text-xl leading-none font-semibold text-ink">
              {course.credits}
            </p>
            <p className="mt-1 text-[0.65rem] tracking-wide text-ink-muted uppercase">
              {course.credits === 1 ? "credit" : "credits"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
          <span>
            L-T-P {lecture}-{tutorial}-{practical}
          </span>
          <span>
            {course.units.length} {theory ? "units" : "experiment groups"}
          </span>
          {theory && hours > 0 && <span>{hours} teaching hours</span>}
        </div>

        {theory && hours > 0 && (
          <div
            className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full"
            aria-label="Hours per unit"
          >
            {course.units.map((unit, index) => (
              <span
                key={unit.title}
                title={`Unit ${index + 1}: ${unit.title}, ${unit.hours} hours`}
                className={cn("h-full", bar)}
                style={{ width: `${(unit.hours / hours) * 100}%`, opacity: 1 - index * 0.14 }}
              />
            ))}
          </div>
        )}
      </div>

      <details open={matchesTopic} className="group border-t border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-medium text-ink-muted select-none hover:text-ink">
          {theory ? "Units and topics" : "Experiments"}
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <ol className="space-y-5 px-5 pb-5">
          {course.units.map((unit, index) => (
            <li key={unit.title} className="relative pl-10">
              <span
                className={cn(
                  "absolute top-0 left-0 grid size-7 place-items-center rounded-full text-xs font-semibold",
                  tile,
                )}
              >
                {index + 1}
              </span>
              {index < course.units.length - 1 && (
                <span aria-hidden className="absolute top-8 -bottom-5 left-3.5 w-px bg-line" />
              )}
              <p className="pt-1 text-sm font-semibold text-ink">
                {unit.title}
                {theory && <span className="ml-2 font-normal text-ink-muted">{unit.hours} h</span>}
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {unit.topics.map((topic) => (
                  <li
                    key={topic}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs leading-snug",
                      isHit(topic)
                        ? "border-accent/40 bg-accent-soft font-medium text-accent"
                        : "border-line bg-canvas text-ink-muted",
                    )}
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        {course.books.length > 0 && (
          <div className="border-t border-line px-5 py-4 text-xs text-ink-muted">
            <p className="mb-1.5 font-semibold text-ink">Reference books</p>
            <ul className="list-disc space-y-1 pl-4">
              {course.books.map((book) => (
                <li key={book}>{book}</li>
              ))}
            </ul>
          </div>
        )}
      </details>

      <div className="mt-auto flex items-center gap-4 border-t border-line px-5 py-3 text-sm">
        <a
          href={`${file}#page=${course.page}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-accent underline-offset-4 hover:underline"
        >
          <FileText className="size-4" />
          Open in PDF
        </a>
        <Link
          href="/viva"
          className="ml-auto inline-flex items-center gap-1.5 text-ink-muted transition-colors hover:text-ink"
        >
          <ListChecks className="size-4" />
          Practise viva
        </Link>
      </div>
    </li>
  );
}

export function SyllabusBrowser({ syllabus }: { syllabus: Syllabus }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");

  const needle = query.trim().toLowerCase();
  const courses = syllabus.courses.filter(
    (course) => (kind === "all" || course.kind === kind) && matches(course, needle),
  );

  const totalCredits = syllabus.courses.reduce((sum, course) => sum + course.credits, 0);
  const teachingHours = syllabus.courses
    .filter((course) => course.kind === "theory")
    .reduce((sum, course) => sum + courseHours(course), 0);
  const unitCount = syllabus.courses.reduce((sum, course) => sum + course.units.length, 0);
  const counts: Record<KindFilter, number> = {
    all: syllabus.courses.length,
    theory: syllabus.courses.filter((course) => course.kind === "theory").length,
    lab: syllabus.courses.filter((course) => course.kind === "lab").length,
  };
  const filters: { value: KindFilter; label: string }[] = [
    { value: "all", label: "All courses" },
    { value: "theory", label: "Theory" },
    { value: "lab", label: "Labs" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={BookOpen} value={String(syllabus.courses.length)} label="courses" />
        <Stat icon={GraduationCap} value={String(totalCredits)} label="credits" />
        <Stat icon={Clock} value={String(teachingHours)} label="teaching hours" />
        <Stat icon={Layers} value={String(unitCount)} label="units and experiment groups" />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-ink-muted select-none hover:text-ink">
            Applies to {syllabus.branches.length} branches
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="absolute top-full left-0 z-20 mt-2 flex w-[min(90vw,32rem)] flex-wrap gap-2 rounded-2xl border border-line bg-surface p-4 shadow-lg">
            {syllabus.branches.map((branch) => (
              <li key={branch} className="rounded-full bg-subtle px-3 py-1 text-xs text-ink">
                {branch}
              </li>
            ))}
          </ul>
        </details>
        <a
          href={syllabus.file}
          target="_blank"
          rel="noreferrer"
          className={buttonStyles({ variant: "secondary", size: "sm", className: "ml-auto" })}
        >
          <Download className="size-4" />
          Full syllabus PDF
        </a>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Search courses and topics</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a topic, like Newton's rings or eigenvalues"
            className="w-full rounded-xl border border-line bg-surface py-2.5 pr-4 pl-10 text-sm outline-none placeholder:text-ink-muted/70 focus:border-accent/50"
          />
        </label>
        <div className="flex gap-2" role="group" aria-label="Course type">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setKind(filter.value)}
              aria-pressed={kind === filter.value}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors",
                kind === filter.value
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface text-ink-muted hover:text-ink",
              )}
            >
              {filter.label}
              <span className="text-xs opacity-70">{counts[filter.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {courses.length > 0 ? (
        <ul className="grid items-start gap-4 lg:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.code} course={course} file={syllabus.file} needle={needle} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-ink-muted">
          No course or topic matches “{query.trim()}”.
        </p>
      )}

      <div className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-accent-soft/60 p-6 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="font-serif text-lg font-semibold text-ink">Plan your semester</p>
          <p className="mt-1 text-sm text-ink-muted">
            Get a week-by-week study plan built from this syllabus and your strengths.
          </p>
        </div>
        <Link href="/plan" className={buttonStyles()}>
          Create a study plan
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
