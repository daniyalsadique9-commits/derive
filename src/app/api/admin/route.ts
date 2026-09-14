import { adminSettingsSchema, userActionSchema } from "@/lib/admin/types";
import { currentUserIsAdmin } from "@/lib/server/admin-auth";
import { adminState } from "@/lib/server/admin-state";
import { adminStore } from "@/lib/server/admin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Non-admins get a 404 so the endpoint's existence isn't revealed. */
async function forbidden(): Promise<Response | null> {
  return (await currentUserIsAdmin())
    ? null
    : Response.json({ error: "Not found." }, { status: 404 });
}

export async function GET() {
  const denied = await forbidden();
  if (denied) return denied;
  return Response.json(await adminState());
}

/** Replaces the admin settings. */
export async function PATCH(request: Request) {
  const denied = await forbidden();
  if (denied) return denied;
  const parsed = adminSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid settings." }, { status: 400 });
  adminStore.updateSettings(parsed.data);
  return Response.json(await adminState());
}

/** Blocks or unblocks a user. */
export async function POST(request: Request) {
  const denied = await forbidden();
  if (denied) return denied;
  const parsed = userActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  adminStore.setBlocked(parsed.data.userId, parsed.data.blocked);
  return Response.json(await adminState());
}
