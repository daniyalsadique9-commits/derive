import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { SiteHeader } from "@/components/site/SiteHeader";
import { currentUserIsAdmin } from "@/lib/server/admin-auth";
import { adminState } from "@/lib/server/admin-state";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await currentUserIsAdmin())) notFound();
  const initialState = await adminState();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-3 mb-8 max-w-2xl leading-relaxed text-ink-muted">
          Monitor usage and control who can use Derive and how much.
        </p>
        <AdminPanel initialState={initialState} />
      </main>
    </div>
  );
}
