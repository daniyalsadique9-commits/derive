import { auth } from "@clerk/nextjs/server";
import { solveRequestSchema } from "@/lib/ai/schema";
import { solve } from "@/lib/ai/solve";
import { checkAccess } from "@/lib/server/access";
import { adminStore } from "@/lib/server/admin-store";
import { ndjsonResponse } from "@/lib/server/ndjson";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = solveRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const hasUploads = parsed.data.messages.some((turn) => (turn.images?.length ?? 0) > 0);
  const access = await checkAccess({ userId, feature: "solve", hasUploads });
  if (!access.ok) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const options = { verify: adminStore.settings.verification };
  return ndjsonResponse(solve(parsed.data, request.signal, options), "api/solve");
}
