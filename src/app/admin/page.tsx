import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { adminAccess } from "@/lib/server/admin-guard";
import { adminState } from "@/lib/server/admin-state";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  // The layout shows the sign-in form instead; this check only keeps the data from loading.
  if (!(await adminAccess())?.unlocked) return null;

  return (
    <>
      <h1 className="font-serif text-4xl font-semibold tracking-tight">Overview</h1>
      <p className="mt-3 mb-8 max-w-2xl leading-relaxed text-ink-muted">
        Usage, limits and controls for Derive.
      </p>
      <AdminPanel initialState={await adminState()} />
    </>
  );
}
