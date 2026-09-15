"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { GeneratedDocument } from "@/components/generated/GeneratedDocument";
import { buttonStyles } from "@/components/ui/button";
import {
  Checkbox,
  FieldLabel,
  inputStyles,
  LANGUAGE_OPTIONS,
  Segmented,
} from "@/components/ui/form-controls";
import { findCourse, SYLLABUS, type SyllabusCourse } from "@/data/syllabus";
import type { AnswerLanguage } from "@/lib/ai/schema";
import {
  VIVA_MAX_QUESTIONS,
  VIVA_MIN_QUESTIONS,
  type VivaDifficulty,
  type VivaRequest,
} from "@/lib/ai/viva-schema";
import { vivaKey } from "@/lib/client/saved-text";
import { streamViva } from "@/lib/client/solve-client";
import { useGeneratedText } from "@/lib/client/use-generated-text";

const DIFFICULTIES: { value: VivaDifficulty; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "mixed", label: "Mixed" },
  { value: "advanced", label: "Advanced" },
];

const DEFAULT_COURSE =
  SYLLABUS.courses.find((course) => course.kind === "lab") ?? SYLLABUS.courses[0];

/** Gives every "**Answer:**" its own paragraph inside the question's list item. */
function placeAnswersOnOwnLine(text: string): string {
  return text.replace(/[ \t]*\n?[ \t]*(\*\*Answer:\*\*)/g, "\n\n    $1");
}

/** Each topic is sent with its unit name so the model has context. */
function topicLabels(course: SyllabusCourse): string[] {
  return course.units.flatMap((unit) => unit.topics.map((topic) => `${unit.title}: ${topic}`));
}

export function VivaGenerator({ userId }: { userId: string }) {
  const { text, streaming, error, generate } = useGeneratedText(vivaKey(userId));

  const [courseCode, setCourseCode] = useState(DEFAULT_COURSE.code);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(topicLabels(DEFAULT_COURSE)));
  const [customTopics, setCustomTopics] = useState("");
  const [count, setCount] = useState(15);
  const [difficulty, setDifficulty] = useState<VivaDifficulty>("mixed");
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [includeFormulae, setIncludeFormulae] = useState(true);
  const [language, setLanguage] = useState<AnswerLanguage>("english");

  const course = findCourse(courseCode) ?? DEFAULT_COURSE;
  const canGenerate = selected.size > 0 || customTopics.trim().length > 0;

  function chooseCourse(code: string) {
    const next = findCourse(code);
    if (!next) return;
    setCourseCode(code);
    setSelected(new Set(topicLabels(next)));
  }

  function toggleTopic(label: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(label);
      else next.delete(label);
      return next;
    });
  }

  function createQuestions() {
    if (!canGenerate) return;
    const request: VivaRequest = {
      courseCode,
      topics: topicLabels(course).filter((label) => selected.has(label)),
      customTopics,
      count,
      difficulty,
      includeAnswers,
      includeFormulae,
      language,
    };
    void generate((onEvent, signal) => streamViva(request, onEvent, signal));
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[400px_minmax(0,1fr)]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          createQuestions();
        }}
        className="space-y-6 rounded-2xl border border-line bg-surface p-5 sm:p-6 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto print:hidden"
      >
        <label className="block">
          <FieldLabel>Course</FieldLabel>
          <select
            value={courseCode}
            onChange={(event) => chooseCourse(event.target.value)}
            className={inputStyles}
          >
            {SYLLABUS.courses.map((option) => (
              <option key={option.code} value={option.code}>
                {option.title} ({option.code})
              </option>
            ))}
          </select>
        </label>

        <div>
          <div className="mb-2 flex items-center gap-3">
            <p className="text-sm font-semibold text-ink">
              {course.kind === "lab" ? "Experiments" : "Chapters and topics"}
            </p>
            <button
              type="button"
              onClick={() => setSelected(new Set(topicLabels(course)))}
              className="ml-auto text-xs font-medium text-accent hover:underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs font-medium text-ink-muted hover:text-ink"
            >
              Clear
            </button>
          </div>
          <div className="max-h-80 space-y-4 overflow-y-auto rounded-xl border border-line p-3">
            {course.units.map((unit) => (
              <fieldset key={unit.title} className="space-y-2">
                <legend className="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                  {unit.title}
                </legend>
                {unit.topics.map((topic) => {
                  const label = `${unit.title}: ${topic}`;
                  return (
                    <Checkbox
                      key={label}
                      checked={selected.has(label)}
                      onChange={(checked) => toggleTopic(label, checked)}
                    >
                      {topic}
                    </Checkbox>
                  );
                })}
              </fieldset>
            ))}
          </div>
        </div>

        <label className="block">
          <FieldLabel>Other topics (optional)</FieldLabel>
          <textarea
            value={customTopics}
            onChange={(event) => setCustomTopics(event.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="For example: radius of curvature in Newton's rings"
            className={`${inputStyles} resize-none`}
          />
        </label>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-semibold text-ink">Number of questions</p>
            <span className="font-serif text-lg font-semibold text-accent">{count}</span>
          </div>
          <input
            type="range"
            min={VIVA_MIN_QUESTIONS}
            max={VIVA_MAX_QUESTIONS}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            aria-label="Number of questions"
            className="w-full accent-[var(--accent)]"
          />
        </div>

        <div>
          <FieldLabel>Difficulty</FieldLabel>
          <Segmented
            label="Difficulty"
            value={difficulty}
            options={DIFFICULTIES}
            onChange={setDifficulty}
          />
        </div>

        <div className="space-y-3">
          <Checkbox checked={includeFormulae} onChange={setIncludeFormulae}>
            Include a key formulae sheet
          </Checkbox>
          <Checkbox checked={includeAnswers} onChange={setIncludeAnswers}>
            Include model answers
          </Checkbox>
        </div>

        <div>
          <FieldLabel>Language</FieldLabel>
          <Segmented
            label="Language"
            value={language}
            options={LANGUAGE_OPTIONS}
            onChange={setLanguage}
          />
        </div>

        <button
          type="submit"
          disabled={streaming || !canGenerate}
          className={buttonStyles({ size: "lg", className: "w-full" })}
        >
          {streaming && <Loader2 className="size-4 animate-spin" />}
          {streaming ? "Preparing questions…" : `Generate ${count} questions`}
        </button>
      </form>

      <GeneratedDocument
        title="Viva questions"
        text={text && placeAnswersOnOwnLine(text)}
        streaming={streaming}
        error={error}
        progressLabel="Preparing your viva questions…"
        onRegenerate={createQuestions}
        empty={
          <div className="py-16 text-center">
            <p className="font-serif text-2xl font-semibold text-ink">Prepare for your viva</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
              Pick a course and the experiments or topics you want to revise. You will get the key
              formulae and viva questions with short model answers, ordered from basic to advanced.
            </p>
          </div>
        }
      />
    </div>
  );
}
