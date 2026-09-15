import type { User } from "@clerk/nextjs/server";
import { signedInUser } from "./user-profile";

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

/** Administrators are listed by email in ADMIN_EMAILS; only verified addresses count. */
export function isAdminUser(user: User | null): boolean {
  if (!user || ADMIN_EMAILS.size === 0) return false;
  return user.emailAddresses.some(
    (address) =>
      address.verification?.status === "verified" &&
      ADMIN_EMAILS.has(address.emailAddress.toLowerCase()),
  );
}

export async function currentUserIsAdmin(): Promise<boolean> {
  return isAdminUser(await signedInUser());
}
