import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Camera,
  ChartLine,
  Cpu,
  Dumbbell,
  Languages,
  Layers,
  Scale,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { buttonStyles } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: Layers,
    title: "Concept-first explanations",
    body: "Each answer starts with the underlying concept and where it comes from, then links every step back to it.",
  },
  {
    icon: ShieldCheck,
    title: "Verified answers",
    body: "Calculations are computed exactly, and each final answer is solved again independently before it is marked verified.",
  },
  {
    icon: ChartLine,
    title: "Accurate graphs",
    body: "Graphs are generated from real computation, so every curve and value is exact.",
  },
  {
    icon: Camera,
    title: "Photo questions",
    body: "Upload a photo of a handwritten problem, a textbook figure or a circuit diagram.",
  },
  {
    icon: Dumbbell,
    title: "Practice and recall",
    body: "Get similar, harder and trick versions of a question, or explain the concept back and receive feedback.",
  },
  {
    icon: Languages,
    title: "Simple English or Hinglish",
    body: "Answers use clear, simple English by default, with Hinglish available when it is easier to follow.",
  },
];

const VERIFICATION_STEPS: Feature[] = [
  {
    icon: Brain,
    title: "Reasoning",
    body: "A reasoning model works through the problem step by step before writing the answer.",
  },
  {
    icon: Cpu,
    title: "Exact computation",
    body: "Numerical results are calculated, not estimated.",
  },
  {
    icon: Scale,
    title: "Independent check",
    body: "A second model solves the question separately. An answer is flagged for review only when a third model also reaches a different result.",
  },
];

const SECTION_LABEL =
  "mb-1.5 font-sans text-[0.7rem] font-semibold tracking-[0.08em] text-ink-muted uppercase";

function AnswerPreview() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-24px_rgb(0_0_0/0.18)] sm:p-6">
      <div className="ml-auto w-fit max-w-[88%] rounded-2xl bg-subtle px-4 py-2.5 text-sm leading-relaxed">
        A ball is thrown up at 20 m/s from the top of a 25 m building (g = 10 m/s²). When does it
        hit the ground?
      </div>
      <div className="mt-6 space-y-5 font-serif leading-relaxed">
        <section>
          <p className={SECTION_LABEL}>Core concept</p>
          <p>
            Gravity reduces the ball&apos;s speed at a constant rate, so its height changes as{" "}
            <em>s = ut + ½at²</em>. Taking upward as positive, the ball lands 25 m below its
            starting point, so s = −25 m.
          </p>
        </section>
        <section>
          <p className={SECTION_LABEL}>Final answer</p>
          <p className="text-lg font-semibold">t = 5 s</p>
        </section>
      </div>
      <p className="mt-6 flex items-center gap-2 text-sm text-ink-muted">
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
          <ShieldCheck className="size-3.5" />
          Verified
        </span>
        Confirmed by an independent check
      </p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, body }: Feature) {
  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-6">
      <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 font-serif text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-16 pb-20 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div>
            <p className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted">
              {siteConfig.event}
            </p>
            <h1 className="mt-6 font-serif text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
              Understand <span className="text-accent">every step.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
              {siteConfig.description}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/solve" className={buttonStyles({ size: "lg" })}>
                Start solving
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/syllabus" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                Browse syllabus
              </Link>
            </div>
          </div>
          <AnswerPreview />
        </section>

        <section className="border-y border-line/70 bg-surface/40">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Features
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            How answers are verified
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-muted">
            Every answer goes through three checks before it is shown.
          </p>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {VERIFICATION_STEPS.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="rounded-2xl border border-line p-6">
                <div className="flex items-center gap-3">
                  <span className="font-serif text-2xl font-semibold text-accent">{index + 1}</span>
                  <Icon className="size-5 text-ink-muted" />
                </div>
                <h3 className="mt-4 font-serif text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
