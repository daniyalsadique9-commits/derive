import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { adminSettingsSchema, DEFAULT_ADMIN_SETTINGS, type AdminSettings } from "@/lib/admin/types";
import { singleton } from "./singleton";

const DATA_DIR = path.join(process.cwd(), ".data");
const SETTINGS_FILE = path.join(DATA_DIR, "admin.json");

interface DailyUsage {
  day: string;
  count: number;
  lastAt: number;
}

/** Calendar day in India, so limits reset at local midnight. */
function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Admin settings and blocked users are saved to disk so they survive restarts.
 * Usage counts are kept in memory and reset each day.
 */
class AdminStore {
  settings: AdminSettings;
  private readonly blocked: Set<string>;
  private readonly usage = new Map<string, DailyUsage>();
  private total = { day: today(), count: 0 };

  constructor() {
    const saved = this.load();
    this.settings = saved.settings;
    this.blocked = new Set(saved.blocked);
  }

  isBlocked(userId: string): boolean {
    return this.blocked.has(userId);
  }

  requestsToday(userId: string): number {
    const usage = this.usage.get(userId);
    return usage?.day === today() ? usage.count : 0;
  }

  totalToday(): number {
    return this.total.day === today() ? this.total.count : 0;
  }

  record(userId: string): void {
    const day = today();
    const usage = this.usage.get(userId);
    this.usage.set(userId, {
      day,
      count: (usage?.day === day ? usage.count : 0) + 1,
      lastAt: Date.now(),
    });
    if (this.total.day !== day) this.total = { day, count: 0 };
    this.total.count += 1;
  }

  /** Everyone seen since the server started, plus blocked users. */
  activity(): { userId: string; requestsToday: number; lastAt: number | null; blocked: boolean }[] {
    const ids = new Set([...this.usage.keys(), ...this.blocked]);
    return [...ids].map((userId) => ({
      userId,
      requestsToday: this.requestsToday(userId),
      lastAt: this.usage.get(userId)?.lastAt ?? null,
      blocked: this.blocked.has(userId),
    }));
  }

  updateSettings(settings: AdminSettings): void {
    this.settings = settings;
    this.persist();
  }

  setBlocked(userId: string, blocked: boolean): void {
    if (blocked) this.blocked.add(userId);
    else this.blocked.delete(userId);
    this.persist();
  }

  private load(): { settings: AdminSettings; blocked: string[] } {
    try {
      const raw = JSON.parse(readFileSync(SETTINGS_FILE, "utf8")) as {
        settings?: unknown;
        blocked?: unknown;
      };
      const settings = adminSettingsSchema.safeParse({
        ...DEFAULT_ADMIN_SETTINGS,
        ...(raw.settings as object),
      });
      return {
        settings: settings.success ? settings.data : DEFAULT_ADMIN_SETTINGS,
        blocked: Array.isArray(raw.blocked)
          ? raw.blocked.filter((id): id is string => typeof id === "string")
          : [],
      };
    } catch {
      return { settings: DEFAULT_ADMIN_SETTINGS, blocked: [] };
    }
  }

  private persist(): void {
    try {
      mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(
        SETTINGS_FILE,
        JSON.stringify({ settings: this.settings, blocked: [...this.blocked] }, null, 2),
      );
    } catch (error) {
      console.warn("[admin] could not save settings", error);
    }
  }
}

export const adminStore = singleton("admin-store", () => new AdminStore());
