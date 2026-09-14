import { findCourse, type SyllabusCourse } from "@/data/syllabus";
import type { StreamEvent } from "./events";
import { geminiAttempts, groqAttempts, streamFirstAvailable } from "./fallback";
import { languageInstruction } from "./prompts";
import type { VivaDifficulty, VivaRequest } from "./viva-schema";

const VIVA_SYSTEM_PROMPT = `You are a senior lab instructor preparing first-year B.Tech students in India for their viva voce (oral) examination. Use only the course and topics provided.

Use these Markdown sections in this order:

## Key formulae
Only if a formulae section is requested. Every important formula for the selected topics as display maths ($$...$$), each followed by one line naming its symbols and units.

## Viva questions
A numbered list with exactly the requested number of questions, ordered from basic to advanced. These are oral questions an examiner asks across the table: each question is one short line of at most 20 words, answerable in a sentence or two without writing anything down. Never ask long numerical problems, multi-part questions or "derive" questions. Cover: definitions and principles, the aim and working of each experiment or apparatus, what a formula or symbol means, units, sources of error and precautions, and quick "what happens if" questions. If model answers are requested, put each answer in its own paragraph under the question, indented by four spaces, in one or two short sentences, exactly like this:

1. Why do we use monochromatic light in Newton's rings?

    **Answer:** Each wavelength forms rings of a different size, so white light would blur the pattern.

## Quick revision tips
Three to five bullets on what examiners usually ask about these topics.

Rules:
- Exactly the requested number of questions. Do not number anything else.
- Every question must sound like a real viva question: short, direct and spoken, for example "Why do we use monochromatic light in Newton's rings?"
- Use simple English: short sentences and everyday words.
- Math: inline $...$ and display $$...$$ only.
- No emojis and no filler.`;

const DIFFICULTY_TEXT: Record<VivaDifficulty, string> = {
  basic: "basic: definitions, aims, principles and simple use of formulae",
  mixed: "mixed: about 40% basic, 40% moderate and 20% challenging",
  advanced:
    "advanced: deeper reasoning, derivation steps, error analysis, limiting cases and applications",
};

function buildVivaPrompt(course: SyllabusCourse, request: VivaRequest): string {
  return [
    `Course: ${course.code} ${course.title} (${course.kind === "lab" ? "laboratory course" : "theory course"})`,
    `Number of questions: exactly ${request.count}`,
    `Difficulty: ${DIFFICULTY_TEXT[request.difficulty]}`,
    `Model answers: ${request.includeAnswers ? "yes" : "no"}`,
    `Key formulae section: ${request.includeFormulae ? "yes" : "no"}`,
    request.topics.length > 0 && "Topics:",
    ...request.topics.map((topic) => `- ${topic}`),
    request.customTopics.trim() && `Additional topics: ${request.customTopics.trim()}`,
  ]
    .filter((line) => line !== false && line !== "")
    .join("\n");
}

/** Streams a viva question set for chosen experiments or topics of one course. */
export async function* generateViva(
  request: VivaRequest,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const course = findCourse(request.courseCode);
  if (!course) {
    yield { type: "error", message: "That course is not in the syllabus." };
    return;
  }

  const system = `${VIVA_SYSTEM_PROMPT}\n\n${languageInstruction(request.language)}`;
  const turns = [{ role: "user" as const, content: buildVivaPrompt(course, request) }];
  const attempts = [
    ...groqAttempts({ system, turns, runCode: false, reasoningEffort: "medium" }),
    ...geminiAttempts({ system, turns }),
  ];
  const questions = yield* streamFirstAvailable(attempts, signal);
  if (questions !== null) yield { type: "done" };
}
