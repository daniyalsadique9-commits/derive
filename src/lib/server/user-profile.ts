import { auth, clerkClient, type User } from "@clerk/nextjs/server";

/** How long a signed-in user's profile is reused before it is fetched from Clerk again. */
const PROFILE_TTL_MS = 5 * 60_000;

const profiles = new Map<string, { user: User; expiresAt: number }>();

/**
 * The signed-in user, like Clerk's currentUser(), but reusing the profile for a few minutes.
 * The session itself is still verified on every request (without a network call); only the
 * profile lookup, a round trip to Clerk's servers on every page view, is saved.
 */
export async function signedInUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const cached = profiles.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.user;

  const user = await (await clerkClient()).users.getUser(userId);
  profiles.set(userId, { user, expiresAt: Date.now() + PROFILE_TTL_MS });
  return user;
}
