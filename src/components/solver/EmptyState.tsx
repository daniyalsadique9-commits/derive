import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";

const SUGGESTIONS = [
  { subject: "Maths", question: "Why is the derivative of sin x equal to cos x?" },
  {
    subject: "Physics",
    question:
      "A ball is thrown up at 20 m/s from the top of a 25 m building (g = 10 m/s²). When does it hit the ground?",
  },
  {
    subject: "Electrical",
    question:
      "Plot the charging curve of an RC circuit with R = 1 kΩ and C = 100 µF, and explain the time constant.",
  },
  {
    subject: "Programming",
    question: "What is the difference between an array and a pointer in C?",
  },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface EmptyStateProps {
  firstName: string;
  composer: ReactNode;
  onPick: (question: string) => void;
}

export function EmptyState({ firstName, composer, onPick }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-10 sm:justify-center">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="mb-5 size-11 rounded-xl" />
          <h1 className="font-serif text-3xl tracking-tight text-ink sm:text-4xl">
            {/* Time-of-day text can differ between server and browser clocks. */}
            <span suppressHydrationWarning>{greeting()}</span>, {firstName}
          </h1>
          <p className="mt-3 text-ink-muted">Ask a question, or upload a photo or PDF of one.</p>
        </div>

        {composer}

        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {SUGGESTIONS.map(({ subject, question }) => (
            <button
              key={question}
              type="button"
              onClick={() => onPick(question)}
              className="rounded-xl border border-line bg-surface/60 p-3.5 text-left text-sm transition-colors hover:border-accent/40 hover:bg-surface"
            >
              <span className="text-[0.7rem] font-semibold tracking-wide text-accent uppercase">
                {subject}
              </span>
              <span className="mt-1 line-clamp-2 block text-ink">{question}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
