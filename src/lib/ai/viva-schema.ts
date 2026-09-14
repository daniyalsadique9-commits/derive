import { z } from "zod";
import { ANSWER_LANGUAGES } from "./schema";

export const VIVA_DIFFICULTIES = ["basic", "mixed", "advanced"] as const;
export type VivaDifficulty = (typeof VIVA_DIFFICULTIES)[number];

export const VIVA_MIN_QUESTIONS = 5;
export const VIVA_MAX_QUESTIONS = 40;

export const vivaRequestSchema = z
  .object({
    courseCode: z.string().max(20),
    topics: z.array(z.string().max(300)).max(60).default([]),
    customTopics: z.string().max(1000).default(""),
    count: z.number().int().min(VIVA_MIN_QUESTIONS).max(VIVA_MAX_QUESTIONS),
    difficulty: z.enum(VIVA_DIFFICULTIES),
    includeAnswers: z.boolean(),
    includeFormulae: z.boolean(),
    language: z.enum(ANSWER_LANGUAGES).default("english"),
  })
  .refine((request) => request.topics.length > 0 || request.customTopics.trim().length > 0, {
    message: "Choose at least one topic.",
  });

export type VivaRequest = z.infer<typeof vivaRequestSchema>;
