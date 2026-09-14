import { clerkClient } from "@clerk/nextjs/server";
import type { AdminState, UserUsage } from "@/lib/admin/types";
import { capacityReport } from "@/lib/ai/capacity";
import { adminStore } from "./admin-store";

async function profiles(
  userIds: string[],
): Promise<Map<string, { name: string; email: string | null }>> {
  const found = new Map<string, { name: string; email: string | null }>();
  if (userIds.length === 0) return found;
  try {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({ userId: userIds, limit: 100 });
    for (const user of data) {
      found.set(user.id, {
        name:
          [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Unnamed",
        email: user.primaryEmailAddress?.emailAddress ?? null,
      });
    }
  } catch (error) {
    console.warn("[admin] could not load user profiles", error);
  }
  return found;
}

export async function adminState(): Promise<AdminState> {
  const activity = adminStore.activity();
  const known = await profiles(activity.map((entry) => entry.userId));
  const users: UserUsage[] = activity
    .map((entry) => ({
      userId: entry.userId,
      name: known.get(entry.userId)?.name ?? "Unknown user",
      email: known.get(entry.userId)?.email ?? null,
      requestsToday: entry.requestsToday,
      lastActiveAt: entry.lastAt,
      blocked: entry.blocked,
    }))
    .sort((a, b) => b.requestsToday - a.requestsToday);

  return {
    settings: adminStore.settings,
    requestsToday: adminStore.totalToday(),
    activeUsersToday: users.filter((user) => user.requestsToday > 0).length,
    users,
    capacity: capacityReport(),
  };
}
