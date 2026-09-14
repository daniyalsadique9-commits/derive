import { singleton } from "./singleton";

const WINDOW_MS = 60_000;

/** Sliding one-minute window per user; the limit comes from the admin settings. */
export class UserRateLimiter {
  private readonly hits = new Map<string, number[]>();

  tryAcquire(userId: string, limitPerMinute: number, now = Date.now()): boolean {
    const recent = (this.hits.get(userId) ?? []).filter((time) => time > now - WINDOW_MS);
    if (recent.length >= limitPerMinute) {
      this.hits.set(userId, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(userId, recent);
    return true;
  }
}

export const userRateLimiter = singleton("user-rate-limiter", () => new UserRateLimiter());
