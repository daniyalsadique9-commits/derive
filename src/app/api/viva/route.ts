import { auth } from "@clerk/nextjs/server";
import { generateViva } from "@/lib/ai/viva";
import { vivaRequestSchema } from "@/lib/ai/viva-schema";
import { checkAccess } from "@/lib/server/access";
import { ndjsonResponse } from "@/lib/server/ndjson";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = vivaRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Choose a course and at least one topic." }, { status: 400 });
  }

  const access = await checkAccess({ userId, feature: "viva" });
  if (!access.ok) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  return ndjsonResponse(generateViva(parsed.data, request.signal), "api/viva");
}
