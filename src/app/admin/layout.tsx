import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSignIn } from "@/components/admin/AdminSignIn";
import { adminAccess } from "@/lib/server/admin-guard";

export const dynamic = "force-dynamic";

/** Every admin page: hidden from non-admins, and behind the admin password. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await adminAccess();
  if (!access) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <AdminHeader unlocked={access.unlocked} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        {access.unlocked ? (
          children
        ) : (
          <div className="py-10">
            <AdminSignIn />
          </div>
        )}
      </main>
    </div>
  );
}
