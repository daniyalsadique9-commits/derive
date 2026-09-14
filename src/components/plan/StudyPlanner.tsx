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
import { SYLLABUS } from "@/data/syllabus";
import {
  SELF_RATINGS,
  type PlanRequest,
  type SelfRating,
  type StudyGoal,
} from "@/lib/ai/plan-schema";
import type { AnswerLanguage } from "@/lib/ai/schema";
import { useConversationHistory } from "@/lib/client/history-store";
import { planKey } from "@/lib/client/saved-text";
import { streamPlan } from "@/lib/client/solve-client";
import { useGeneratedText } from "@/lib/client/use-generated-text";

const GOALS: { value: StudyGoal; label: string }[] = [
  { value: "pass", label: "Pass comfortably" },
  { value: "good", label: "Score well" },
  { value: "top", label: "Top marks" },
];

const RATING_OPTIONS = SELF_RATINGS.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

interface StudyPlannerProps {
  userId: string;
  firstName: string;
}

export function StudyPlanner({ userId, firstName }: StudyPlannerProps) {
  const history = useConversationHistory(userId);
  const { text, streaming, error, generate } = useGeneratedText(planKey(userId));

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

  function createPlan() {
    if (selectedCourses.length === 0) return;
    const request: PlanRequest = {
      courses: selectedCourses,
      weeks,
      hoursPerDay,
      goal,
      difficultTopics,
      recentTopics: useHistory ? recentTopics : [],
      language,
    };
    void generate((onEvent, signal) => streamPlan(request, onEvent, signal));
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[400px_minmax(0,1fr)]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          createPlan();
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
                  <Checkbox
                    checked={Boolean(rating)}
                    onChange={(checked) =>
                      setRatings((current) => ({
                        ...current,
                        [course.code]: checked ? "average" : null,
                      }))
                    }
                  >
                    <span className="block font-medium">{course.title}</span>
                    <span className="font-mono text-xs text-ink-muted">{course.code}</span>
                  </Checkbox>
                  {rating && (
                    <div className="mt-2.5 pl-7">
                      <Segmented
                        label={`Confidence in ${course.title}`}
                        value={rating}
                        size="sm"
                        options={RATING_OPTIONS}
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
              className={inputStyles}
            />
          </label>
          <label>
            <FieldLabel>Hours per day</FieldLabel>
            <select
              value={hoursPerDay}
              onChange={(event) => setHoursPerDay(Number(event.target.value))}
              className={inputStyles}
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
            className={`${inputStyles} resize-none`}
          />
        </label>

        <Checkbox checked={useHistory} onChange={setUseHistory}>
          Use my recent questions
          <span className="block text-xs text-ink-muted">
            {recentTopics.length > 0
              ? recentTopics.slice(0, 4).join(", ") + (recentTopics.length > 4 ? "…" : "")
              : "No recent questions yet."}
          </span>
        </Checkbox>

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
          disabled={streaming || selectedCourses.length === 0}
          className={buttonStyles({ size: "lg", className: "w-full" })}
        >
          {streaming && <Loader2 className="size-4 animate-spin" />}
          {streaming ? "Creating your plan…" : text ? "Create a new plan" : "Create my study plan"}
        </button>
      </form>

      <GeneratedDocument
        title={`${firstName}'s study plan`}
        text={text}
        streaming={streaming}
        error={error}
        progressLabel="Reading the syllabus and building your plan…"
        onRegenerate={createPlan}
        empty={
          <div className="py-16 text-center">
            <p className="font-serif text-2xl font-semibold text-ink">Your semester, planned</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
              Choose your courses, rate your confidence and set your time. You will get a
              week-by-week plan built from the {SYLLABUS.group} Semester {SYLLABUS.semester}{" "}
              syllabus, with a daily routine and advice for each course.
            </p>
          </div>
        }
      />
    </div>
  );
}
