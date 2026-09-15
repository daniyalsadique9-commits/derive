import { auth } from "@clerk/nextjs/server";
import { capacityReport } from "@/lib/ai/capacity";
import type { CapacityReport } from "@/lib/ai/events";
import { adminStore } from "@/lib/server/admin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report: CapacityReport = {
    ...capacityReport(),
    allowance: {
      usedToday: adminStore.requestsToday(userId),
      dailyLimit: adminStore.settings.perUserDaily,
    },
  };
  return Response.json(report);
}
