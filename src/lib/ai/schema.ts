import { z } from "zod";

export const EXPLANATION_STYLES = ["intuitive", "formal", "analogy"] as const;
export type ExplanationStyle = (typeof EXPLANATION_STYLES)[number];

export const ANSWER_LANGUAGES = ["english", "hinglish"] as const;
export type AnswerLanguage = (typeof ANSWER_LANGUAGES)[number];

/** What the student wants from a turn. "ask" is a normal question; the rest are one-click actions. */
export const INTENTS = ["ask", "deeper", "simpler", "practice", "methods", "explainBack"] as const;
export type Intent = (typeof INTENTS)[number];

/** Photos, or PDF documents such as question papers. */
export const ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

const imageSchema = z.object({
  mimeType: z.enum(ATTACHMENT_MIME_TYPES),
  /** Base64 without the `data:` prefix. 6 MB of base64 ≈ a 4.4 MB file. */
  data: z.string().max(6_000_000),
  /** Original file name, shown for PDFs. */
  name: z.string().max(200).optional(),
});

const turnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(20_000),
  intent: z.enum(INTENTS).optional(),
  images: z.array(imageSchema).max(3).optional(),
});

export const solveRequestSchema = z.object({
  style: z.enum(EXPLANATION_STYLES),
  language: z.enum(ANSWER_LANGUAGES).default("english"),
  messages: z.array(turnSchema).min(1).max(40),
});

export type ImageInput = z.infer<typeof imageSchema>;
export type ChatTurn = z.infer<typeof turnSchema>;
export type SolveRequest = z.infer<typeof solveRequestSchema>;
