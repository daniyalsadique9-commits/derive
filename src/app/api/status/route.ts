import { auth } from "@clerk/nextjs/server";
import { capacityReport } from "@/lib/ai/capacity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(capacityReport());
}
