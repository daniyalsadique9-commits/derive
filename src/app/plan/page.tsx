import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StudyPlanner } from "@/components/plan/StudyPlanner";
import { SiteHeader } from "@/components/site/SiteHeader";
import { signedInUser } from "@/lib/server/user-profile";

export const metadata: Metadata = { title: "Study plan" };

export default async function PlanPage() {
  const user = await signedInUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12">
        <div className="mb-8 print:hidden">
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Study plan</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">
            A personalised roadmap for your semester, built from the official syllabus.
          </p>
        </div>
        <StudyPlanner userId={user.id} firstName={user.firstName ?? user.username ?? "Your"} />
      </main>
    </div>
  );
}
