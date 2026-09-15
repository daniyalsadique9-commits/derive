import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { VivaGenerator } from "@/components/viva/VivaGenerator";
import { signedInUser } from "@/lib/server/user-profile";

export const metadata: Metadata = { title: "Viva questions" };

export default async function VivaPage() {
  const user = await signedInUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12">
        <div className="mb-8 print:hidden">
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Viva questions</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">
            Practice questions for your lab and course vivas, with key formulae and model answers.
          </p>
        </div>
        <VivaGenerator userId={user.id} />
      </main>
    </div>
  );
}
