import { z } from "zod";
import type { CapacityReport } from "@/lib/ai/events";

export const adminSettingsSchema = z.object({
  /** Pause the app for everyone except administrators. */
  maintenance: z.boolean(),
  /** Cross-check answers with a second model (uses one extra request per question). */
  verification: z.boolean(),
  uploads: z.boolean(),
  studyPlans: z.boolean(),
  perUserDaily: z.number().int().min(1).max(1000),
  perUserPerMinute: z.number().int().min(1).max(60),
  dailyCap: z.number().int().min(1).max(100_000),
});

export type AdminSettings = z.infer<typeof adminSettingsSchema>;

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  maintenance: false,
  verification: true,
  uploads: true,
  studyPlans: true,
  perUserDaily: 15,
  perUserPerMinute: 4,
  dailyCap: 200,
};

export const userActionSchema = z.object({
  userId: z.string().min(1).max(100),
  blocked: z.boolean(),
});

export interface UserUsage {
  userId: string;
  name: string;
  email: string | null;
  requestsToday: number;
  lastActiveAt: number | null;
  blocked: boolean;
}

export interface AdminState {
  settings: AdminSettings;
  requestsToday: number;
  activeUsersToday: number;
  users: UserUsage[];
  capacity: CapacityReport;
}
