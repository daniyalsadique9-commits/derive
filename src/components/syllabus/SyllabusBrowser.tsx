"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, Download, FileText, Search } from "lucide-react";
import { useState } from "react";
import { buttonStyles } from "@/components/ui/button";
import type { Syllabus, SyllabusCourse } from "@/data/syllabus";
import { cn } from "@/lib/utils/cn";

type KindFilter = "all" | SyllabusCourse["kind"];

const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All courses" },
  { value: "theory", label: "Theory" },
  { value: "lab", label: "Labs" },
];

function matches(course: SyllabusCourse, needle: string): boolean {
  if (!needle) return true;
  const haystack = [
    course.code,
    course.title,
    ...course.units.flatMap((unit) => [unit.title, ...unit.topics]),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
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
  const [lecture, tutorial, practical] = course.ltp;
  const isHit = (text: string) => needle.length > 0 && text.toLowerCase().includes(needle);
  // A search that matches a unit or topic opens the list so the match is visible.
  const matchesTopic = course.units.some((unit) => isHit(unit.title) || unit.topics.some(isHit));

  return (
    <li className="rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <FileText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-ink-muted">{course.code}</p>
          <h3 className="font-serif text-lg font-semibold text-ink">{course.title}</h3>
          <p className="mt-1 text-sm text-ink-muted">
            {course.credits} {course.credits === 1 ? "credit" : "credits"} · L-T-P {lecture}-
            {tutorial}-{practical} · {course.units.length}{" "}
            {course.kind === "lab" ? "experiment groups" : "units"}
          </p>
        </div>
        <a
          href={`${file}#page=${course.page}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          Open in PDF
        </a>
      </div>
      <details open={matchesTopic} className="group border-t border-line">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-5 py-3 text-sm font-medium text-ink-muted select-none hover:text-ink">
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
          {course.kind === "lab" ? "Experiments" : "Units and topics"}
        </summary>
        <ol className="space-y-4 px-5 pb-5">
          {course.units.map((unit, index) => (
            <li key={unit.title}>
              <p className="text-sm font-semibold text-ink">
                {course.kind === "lab" ? "" : `Unit ${index + 1}: `}
                {unit.title}
                {course.kind === "theory" && (
                  <span className="font-normal text-ink-muted"> · {unit.hours} hours</span>
                )}
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                {unit.topics.map((topic) => (
                  <li key={topic} className={cn(isHit(topic) && "font-medium text-accent")}>
                    {topic}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </details>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {[
          syllabus.group,
          `Semester ${syllabus.semester}`,
          `Batch ${syllabus.batch}`,
          `${totalCredits} credits`,
        ].map((label) => (
          <span
            key={label}
            className="rounded-full border border-line bg-surface px-3 py-1 text-ink-muted"
          >
            {label}
          </span>
        ))}
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

      <details className="group rounded-2xl border border-line bg-surface">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-5 py-3 text-sm font-medium text-ink select-none">
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
          Applies to {syllabus.branches.length} branches
        </summary>
        <ul className="flex flex-wrap gap-2 px-5 pb-5">
          {syllabus.branches.map((branch) => (
            <li key={branch} className="rounded-full bg-subtle px-3 py-1 text-xs text-ink">
              {branch}
            </li>
          ))}
        </ul>
      </details>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Search courses and topics</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search courses or topics"
            className="w-full rounded-xl border border-line bg-surface py-2.5 pr-4 pl-10 text-sm outline-none placeholder:text-ink-muted/70 focus:border-accent/50"
          />
        </label>
        <div className="flex gap-2" role="group" aria-label="Course type">
          {KIND_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setKind(filter.value)}
              aria-pressed={kind === filter.value}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors",
                kind === filter.value
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface text-ink-muted hover:text-ink",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {courses.length > 0 ? (
        <ul className="space-y-3">
          {courses.map((course) => (
            <CourseCard key={course.code} course={course} file={syllabus.file} needle={needle} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-ink-muted">
          No courses match your search.
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
