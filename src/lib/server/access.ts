import { currentUserIsAdmin } from "./admin-auth";
import { adminStore } from "./admin-store";
import { userRateLimiter } from "./rate-limit";

export type AccessDecision = { ok: true } | { ok: false; status: number; error: string };

interface AccessRequest {
  userId: string;
  feature: "solve" | "plan" | "viva";
  hasUploads?: boolean;
}

const deny = (status: number, error: string): AccessDecision => ({ ok: false, status, error });

/** Applies the admin controls to a request, and counts it when it is allowed. */
export async function checkAccess({
  userId,
  feature,
  hasUploads = false,
}: AccessRequest): Promise<AccessDecision> {
  const { settings } = adminStore;

  if (settings.maintenance && !(await currentUserIsAdmin())) {
    return deny(503, "Derive is paused for maintenance. Please try again shortly.");
  }
  if (adminStore.isBlocked(userId)) {
    return deny(403, "Your access has been paused by the administrator.");
  }
  if (feature === "plan" && !settings.studyPlans) {
    return deny(403, "Study plans are turned off right now.");
  }
  if (feature === "viva" && !settings.vivaQuestions) {
    return deny(403, "Viva question sets are turned off right now.");
  }
  if (hasUploads && !settings.uploads) {
    return deny(403, "Photo and PDF uploads are turned off right now.");
  }
  if (adminStore.totalToday() >= settings.dailyCap) {
    return deny(429, "Today's shared limit has been reached. Please try again tomorrow.");
  }
  if (adminStore.requestsToday(userId) >= settings.perUserDaily) {
    return deny(
      429,
      `You have reached today's limit of ${settings.perUserDaily} requests. It resets at midnight.`,
    );
  }
  if (!userRateLimiter.tryAcquire(userId, settings.perUserPerMinute)) {
    return deny(429, "Too many requests. Please wait a minute and try again.");
  }

  adminStore.record(userId);
  return { ok: true };
}
