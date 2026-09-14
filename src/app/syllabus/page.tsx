import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SyllabusBrowser } from "@/components/syllabus/SyllabusBrowser";
import { SYLLABUS } from "@/data/syllabus";

export const metadata: Metadata = { title: "Syllabus" };

export default function SyllabusPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-14">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Syllabus</h1>
        <p className="mt-3 mb-8 max-w-2xl leading-relaxed text-ink-muted">
          {SYLLABUS.program} Semester {SYLLABUS.semester}, {SYLLABUS.group} (Batch {SYLLABUS.batch}
          ).
        </p>
        <SyllabusBrowser syllabus={SYLLABUS} />
      </main>
      <SiteFooter />
    </div>
  );
}
