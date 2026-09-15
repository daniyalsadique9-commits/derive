import { z } from "zod";
import { isAdminUser } from "@/lib/server/admin-auth";
import { endAdminSession, startAdminSession } from "@/lib/server/admin-session";
import { signedInUser } from "@/lib/server/user-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const signInSchema = z.object({
  username: z.string().max(100),
  password: z.string().max(200),
});

const NOT_FOUND = () => Response.json({ error: "Not found." }, { status: 404 });

/** Signs an administrator in to the admin panel with the admin username and password. */
export async function POST(request: Request) {
  const user = await signedInUser();
  if (!user || !isAdminUser(user)) return NOT_FOUND();

  const parsed = signInSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Enter the username and password." }, { status: 400 });
  }

  const result = await startAdminSession(user.id, parsed.data.username, parsed.data.password);
  if (result === "locked") {
    return Response.json({ error: "Too many attempts. Try again in 10 minutes." }, { status: 429 });
  }
  if (result === "wrong") {
    return Response.json({ error: "Incorrect username or password." }, { status: 401 });
  }
  return Response.json({ ok: true });
}

/** Locks the admin panel again. */
export async function DELETE() {
  const user = await signedInUser();
  if (!user || !isAdminUser(user)) return NOT_FOUND();
  await endAdminSession();
  return Response.json({ ok: true });
}
