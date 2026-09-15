import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "derive_admin";
const SESSION_MS = 12 * 60 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCKOUT_MS = 10 * 60 * 1000;

/** Failed sign-in attempts per user, so the password can't be guessed quickly. */
const failures = new Map<string, { count: number; lockedUntil: number }>();

function credentials(): { username: string; password: string } | null {
  const username = process.env.ADMIN_USERNAME ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  return username && password ? { username, password } : null;
}

function sign(userId: string, expiresAt: number, password: string): string {
  // Changing the password (or the Clerk secret) signs every admin out.
  const key = `${password}:${process.env.CLERK_SECRET_KEY ?? ""}`;
  return createHmac("sha256", key).update(`${userId}.${expiresAt}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Whether this admin has entered the admin username and password recently. When no admin
 * password is configured, the admin email check alone applies.
 */
export async function hasAdminSession(userId: string): Promise<boolean> {
  const expected = credentials();
  if (!expected) return true;

  const [expires, signature] = ((await cookies()).get(ADMIN_COOKIE)?.value ?? "").split(".");
  const expiresAt = Number(expires);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  return safeEqual(signature, sign(userId, expiresAt, expected.password));
}

export type AdminSignInResult = "ok" | "wrong" | "locked";

/** Checks the admin username and password and starts a 12-hour admin session. */
export async function startAdminSession(
  userId: string,
  username: string,
  password: string,
): Promise<AdminSignInResult> {
  const expected = credentials();
  if (!expected) return "ok";

  const record = failures.get(userId);
  if (record && record.lockedUntil > Date.now()) return "locked";

  const usernameMatches = safeEqual(username, expected.username);
  const passwordMatches = safeEqual(password, expected.password);
  if (!usernameMatches || !passwordMatches) {
    const count = (record?.count ?? 0) + 1;
    const locked = count >= MAX_FAILURES;
    failures.set(userId, {
      count: locked ? 0 : count,
      lockedUntil: locked ? Date.now() + LOCKOUT_MS : 0,
    });
    return locked ? "locked" : "wrong";
  }

  failures.delete(userId);
  const expiresAt = Date.now() + SESSION_MS;
  (await cookies()).set(
    ADMIN_COOKIE,
    `${expiresAt}.${sign(userId, expiresAt, expected.password)}`,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_MS / 1000,
    },
  );
  return "ok";
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
