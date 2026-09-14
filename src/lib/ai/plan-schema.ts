import { z } from "zod";
import { ANSWER_LANGUAGES } from "./schema";

export const STUDY_GOALS = ["pass", "good", "top"] as const;
export type StudyGoal = (typeof STUDY_GOALS)[number];

export const SELF_RATINGS = ["weak", "average", "strong"] as const;
export type SelfRating = (typeof SELF_RATINGS)[number];

export const planRequestSchema = z.object({
  courses: z
    .array(z.object({ code: z.string().max(20), rating: z.enum(SELF_RATINGS) }))
    .min(1)
    .max(12),
  weeks: z.number().int().min(1).max(20),
  hoursPerDay: z.number().int().min(1).max(10),
  goal: z.enum(STUDY_GOALS),
  difficultTopics: z.string().max(1000).default(""),
  recentTopics: z.array(z.string().max(120)).max(20).default([]),
  language: z.enum(ANSWER_LANGUAGES).default("english"),
});

export type PlanRequest = z.infer<typeof planRequestSchema>;
