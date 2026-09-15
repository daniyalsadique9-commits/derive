"use client";

import { UserButton, useUser } from "@clerk/nextjs";

/** The signed-in student's name and email, with Clerk's account menu. */
export function AccountSummary() {
  const { user } = useUser();
  const name = user?.fullName || user?.username || "Your account";
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <div className="flex min-w-0 items-center gap-2.5 px-2 pt-2">
      <UserButton />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        {email && <p className="truncate text-xs text-ink-muted">{email}</p>}
      </div>
    </div>
  );
}
