import { auth } from "@clerk/nextjs/server";
import { generatePlan } from "@/lib/ai/plan";
import { planRequestSchema } from "@/lib/ai/plan-schema";
import { checkAccess } from "@/lib/server/access";
import { ndjsonResponse } from "@/lib/server/ndjson";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = planRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const access = await checkAccess({ userId, feature: "plan" });
  if (!access.ok) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  return ndjsonResponse(generatePlan(parsed.data, request.signal), "api/plan");
}
