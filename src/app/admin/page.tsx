import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { AdminSignIn } from "@/components/admin/AdminSignIn";
import { SiteHeader } from "@/components/site/SiteHeader";
import { isAdminUser } from "@/lib/server/admin-auth";
import { hasAdminSession } from "@/lib/server/admin-session";
import { adminState } from "@/lib/server/admin-state";
import { signedInUser } from "@/lib/server/user-profile";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await signedInUser();
  if (!user || !isAdminUser(user)) notFound();
  const unlocked = await hasAdminSession(user.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-3 mb-8 max-w-2xl leading-relaxed text-ink-muted">
          Monitor usage and control who can use Derive and how much.
        </p>
        {unlocked ? <AdminPanel initialState={await adminState()} /> : <AdminSignIn />}
      </main>
    </div>
  );
}
