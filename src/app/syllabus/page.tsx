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
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">
          Semester {SYLLABUS.semester} · {SYLLABUS.group} · Batch {SYLLABUS.batch}
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          Syllabus
        </h1>
        <p className="mt-3 mb-10 max-w-2xl leading-relaxed text-ink-muted">
          Every course in the official {SYLLABUS.program} Semester {SYLLABUS.semester} syllabus,
          with its units, topics and reference books. Search any topic to find where it is taught.
        </p>
        <SyllabusBrowser syllabus={SYLLABUS} />
      </main>
      <SiteFooter />
    </div>
  );
}
