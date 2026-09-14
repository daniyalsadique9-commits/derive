import {
  Dumbbell,
  Feather,
  GitCompare,
  Layers,
  MessageSquareQuote,
  type LucideIcon,
} from "lucide-react";
import type { Intent } from "@/lib/ai/schema";

export type AnswerAction = Exclude<Intent, "ask">;

interface IntentDetails {
  /** Label on the button under an answer. */
  action: string;
  /** How the request appears in the student's message. */
  request: string;
  icon: LucideIcon;
}

export const INTENT_DETAILS: Record<AnswerAction, IntentDetails> = {
  deeper: { action: "Go deeper", request: "Go deeper", icon: Layers },
  simpler: { action: "Simplify", request: "Explain this more simply", icon: Feather },
  practice: { action: "Practice", request: "Practice questions", icon: Dumbbell },
  methods: { action: "Other methods", request: "Show other methods", icon: GitCompare },
  explainBack: { action: "Explain back", request: "My explanation", icon: MessageSquareQuote },
};

export const ANSWER_ACTIONS = Object.keys(INTENT_DETAILS) as AnswerAction[];
