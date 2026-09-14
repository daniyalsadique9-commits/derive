import { findCourse, type SyllabusCourse } from "@/data/syllabus";
import type { StreamEvent } from "./events";
import { geminiAttempts, groqAttempts, streamFirstAvailable } from "./fallback";
import type { PlanRequest, SelfRating, StudyGoal } from "./plan-schema";
import { languageInstruction } from "./prompts";

const PLAN_SYSTEM_PROMPT = `You are an experienced academic mentor for first-year B.Tech students in India. Create a personalised, realistic study roadmap using only the syllabus provided.

Use these Markdown sections in this order:

## Overview
Two or three sentences: the time available, the weekly hours, and where the plan focuses based on the student's self-ratings.

## Week-by-week plan
A table with columns: Week | Course | Units and topics | Target. Cover every unit of every selected course. Give weaker courses more time and harder units more sessions. Keep the final week (or the last fifth of the time) for revision and previous-year papers.

## Daily routine
A realistic routine for the given hours per day, including short breaks.

## Course strategies
One short subsection per course (### Course title): how to study it, what to practise, common traps, and the most useful reference book from the syllabus.

## Personal advice
Specific, honest advice based on the student's self-ratings, difficult topics and recent questions. Address them directly.

## Revision checklist
A checklist (- [ ] item) of the key topics for each course.

Rules:
- Use only units and topics that appear in the syllabus provided, with the syllabus unit names.
- Be realistic about the hours available; never overload a day.
- Use simple English: short sentences and everyday words.
- No emojis and no filler.`;

const GOAL_DESCRIPTIONS: Record<StudyGoal, string> = {
  pass: "pass every course comfortably",
  good: "score well, around 8 CGPA",
  top: "aim for top marks",
};

function describeCourse(course: SyllabusCourse, rating: SelfRating): string {
  const units = course.units
    .map(
      (unit, index) =>
        `- Unit ${index + 1}: ${unit.title} (${unit.hours} h): ${unit.topics.join("; ")}`,
    )
    .join("\n");
  return [
    `### ${course.code} ${course.title} (${course.credits} credits). Self-rating: ${rating}`,
    units,
    `- Reference books: ${course.books.join("; ")}`,
  ].join("\n");
}

function buildPlanPrompt(request: PlanRequest): string {
  const selected = request.courses.flatMap(({ code, rating }) => {
    const course = findCourse(code);
    return course ? [describeCourse(course, rating)] : [];
  });
  return [
    `Time until exams: ${request.weeks} weeks`,
    `Study time: ${request.hoursPerDay} hours per day`,
    `Goal: ${GOAL_DESCRIPTIONS[request.goal]}`,
    request.difficultTopics.trim() && `Topics I find difficult: ${request.difficultTopics.trim()}`,
    request.recentTopics.length > 0 &&
      `Topics from my recent questions: ${request.recentTopics.join(", ")}`,
    "",
    "Syllabus for my selected courses:",
    ...selected,
  ]
    .filter((line) => line !== false && line !== "")
    .join("\n");
}

/** Streams a personalised study roadmap grounded in the semester syllabus. */
export async function* generatePlan(
  request: PlanRequest,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const system = `${PLAN_SYSTEM_PROMPT}\n\n${languageInstruction(request.language)}`;
  const turns = [{ role: "user" as const, content: buildPlanPrompt(request) }];
  const attempts = [
    ...groqAttempts({ system, turns, runCode: false, reasoningEffort: "medium" }),
    ...geminiAttempts({ system, turns }),
  ];
  const plan = yield* streamFirstAvailable(attempts, signal);
  if (plan !== null) yield { type: "done" };
}
