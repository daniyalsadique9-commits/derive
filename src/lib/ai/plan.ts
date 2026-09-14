import { findCourse, type SyllabusCourse } from "@/data/syllabus";
import type { StreamEvent } from "./events";
import { geminiAttempts, groqAttempts, streamFirstAvailable } from "./fallback";
import type { PlanRequest, SelfRating, StudyGoal } from "./plan-schema";
import { languageInstruction, languageReminder } from "./prompts";

const DAY_MS = 86_400_000;

/** Weaker courses get proportionally more of the student's time. */
const RATING_WEIGHT: Record<SelfRating, number> = { weak: 1.5, average: 1, strong: 0.7 };

/** Share of the total time kept for final revision and previous-year papers. */
const REVISION_SHARE = 0.15;

/** Courses × weeks above which a plan goes to the model with the larger output budget first. */
const LARGE_PLAN_CELLS = 60;

const PLAN_SYSTEM_PROMPT = `You are an experienced academic mentor for first-year B.Tech students in India. Create a personalised, realistic study plan using only the syllabus provided.

Use these Markdown sections in this order:

## How your time is split
Copy the time allocation table provided, unchanged. Below it, write one sentence explaining the split: time follows each course's syllabus hours, weaker courses get more, and part of the time is kept for final revision.

## Week-by-week plan
One table with exactly one row per week and columns: Week | Focus | Tasks | Checkpoint. Use the week labels provided and cover every unit of every selected course across the weeks. Focus names that week's courses and units with hours, for example "Maths U1 (4 h), Physics U2 (3 h)". Each course's total hours across the weeks should match the allocation. Schedule weaker courses and difficult topics earlier. Keep the final week (or the last 15% of the time) for revision and previous-year papers.
- Tasks: two or three concrete, measurable tasks, for example "Solve 15 rank and consistency problems (Grewal)". Never vague tasks such as "study unit 1" or "revise".
- Checkpoint: one short question the student should be able to answer at the end of that week.

## Course strategies
One subsection per course (### Course title) with at most three bullets: what to practise most, a common mistake to avoid, and the most useful reference book from the syllabus.

## Personal advice
Three to five specific points based on the student's goal, self-ratings, difficult topics and recent questions. Name those topics and say in which week the plan handles them.

## Revision checklist
A checklist (- [ ] item) with three to five key topics per course.

Rules:
- Keep the whole plan compact so it fits in one response.
- Use only units and topics from the syllabus provided, with the syllabus unit names.
- Do not include a daily timetable or an hour-by-hour routine.
- Use short sentences and everyday words, in the answer language given below.
- No emojis and no filler.`;

const GOAL_DESCRIPTIONS: Record<StudyGoal, string> = {
  pass: "pass every course comfortably: focus on core topics and standard problems",
  good: "score well (around 8 CGPA): cover everything with regular practice",
  top: "aim for top marks: cover everything in depth, with extra problems and previous-year papers",
};

interface Allocation {
  course: SyllabusCourse;
  rating: SelfRating;
  hours: number;
}

function syllabusHours(course: SyllabusCourse): number {
  return course.units.reduce((sum, unit) => sum + unit.hours, 0);
}

/**
 * Splits the available time in proportion to each course's syllabus hours, weighted by the
 * student's confidence, after keeping a share for final revision. Calculated here rather than
 * by the model so the numbers are exact and explainable.
 */
function allocateTime(request: PlanRequest) {
  const selected = request.courses.flatMap(({ code, rating }) => {
    const course = findCourse(code);
    return course ? [{ course, rating }] : [];
  });
  const totalHours = request.weeks * 7 * request.hoursPerDay;
  const revisionHours = Math.round(totalHours * REVISION_SHARE);
  const weights = selected.map(
    ({ course, rating }) => syllabusHours(course) * RATING_WEIGHT[rating],
  );
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const allocations: Allocation[] = selected.map((entry, index) => ({
    ...entry,
    hours: Math.round(((totalHours - revisionHours) * weights[index]) / weightSum),
  }));
  return { allocations, totalHours, revisionHours };
}

function allocationTable({
  allocations,
  totalHours,
  revisionHours,
}: ReturnType<typeof allocateTime>): string {
  const share = (hours: number) => `${Math.round((hours / totalHours) * 100)}%`;
  const rating = (value: SelfRating) => value.charAt(0).toUpperCase() + value.slice(1);
  return [
    "| Course | Syllabus hours | Your confidence | Study hours | Share |",
    "| --- | --- | --- | --- | --- |",
    ...allocations.map(
      ({ course, rating: value, hours }) =>
        `| ${course.title} | ${syllabusHours(course)} h | ${rating(value)} | ${hours} h | ${share(hours)} |`,
    ),
    `| Final revision | | | ${revisionHours} h | ${share(revisionHours)} |`,
  ].join("\n");
}

/** "Week 1 (15 Sep – 21 Sep)", starting today, in Indian time. */
function weekLabels(weeks: number, start = new Date()): string[] {
  const format = (date: Date) =>
    date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  return Array.from({ length: weeks }, (_, index) => {
    const first = new Date(start.getTime() + index * 7 * DAY_MS);
    const last = new Date(first.getTime() + 6 * DAY_MS);
    return `Week ${index + 1} (${format(first)} – ${format(last)})`;
  });
}

function describeCourse(course: SyllabusCourse): string {
  return [
    `### ${course.code} ${course.title} (${course.credits} credits)`,
    ...course.units.map(
      (unit, index) =>
        `- Unit ${index + 1}: ${unit.title} (${unit.hours} h): ${unit.topics.join("; ")}`,
    ),
    course.books.length > 0 && `- Reference books: ${course.books.join("; ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildPlanPrompt(request: PlanRequest): string {
  const time = allocateTime(request);
  return [
    `Time until exams: ${request.weeks} weeks at ${request.hoursPerDay} hours per day (${time.totalHours} hours in total)`,
    `Goal: ${GOAL_DESCRIPTIONS[request.goal]}`,
    `Week labels: ${weekLabels(request.weeks).join("; ")}`,
    request.difficultTopics.trim() && `Topics I find difficult: ${request.difficultTopics.trim()}`,
    request.recentTopics.length > 0 &&
      `Topics from my recent questions: ${request.recentTopics.join(", ")}`,
    "",
    "Time allocation (already calculated; copy it unchanged as the first section):",
    allocationTable(time),
    "",
    "Syllabus for my selected courses:",
    ...time.allocations.map(({ course }) => describeCourse(course)),
    languageReminder(request.language) ?? false,
  ]
    .filter((line) => line !== false)
    .join("\n");
}

/** Streams a personalised study plan grounded in the semester syllabus. */
export async function* generatePlan(
  request: PlanRequest,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const system = `${PLAN_SYSTEM_PROMPT}\n\n${languageInstruction(request.language)}`;
  const turns = [{ role: "user" as const, content: buildPlanPrompt(request) }];
  const groq = groqAttempts({ system, turns, runCode: false, reasoningEffort: "low" });
  const gemini = geminiAttempts({ system, turns });
  // Very large plans can exceed Groq's per-request output budget; Gemini's is much larger.
  const large = request.courses.length * request.weeks > LARGE_PLAN_CELLS;
  const plan = yield* streamFirstAvailable(
    large ? [...gemini, ...groq] : [...groq, ...gemini],
    signal,
  );
  if (plan !== null) yield { type: "done" };
}
