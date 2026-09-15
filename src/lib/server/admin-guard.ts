import type { User } from "@clerk/nextjs/server";
import { isAdminUser } from "./admin-auth";
import { hasAdminSession } from "./admin-session";
import { signedInUser } from "./user-profile";

/**
 * The signed-in administrator and whether they have entered the admin password recently;
 * null for everyone else.
 */
export async function adminAccess(): Promise<{ user: User; unlocked: boolean } | null> {
  const user = await signedInUser();
  if (!user || !isAdminUser(user)) return null;
  return { user, unlocked: await hasAdminSession(user.id) };
}

/**
 * For admin APIs: a 404 for non-admins, so the endpoint's existence isn't revealed, and a 401
 * for admins who haven't entered the admin password.
 */
export async function adminApiDenied(): Promise<Response | null> {
  const access = await adminAccess();
  if (!access) return Response.json({ error: "Not found." }, { status: 404 });
  if (!access.unlocked) {
    return Response.json({ error: "Admin sign-in required." }, { status: 401 });
  }
  return null;
}
