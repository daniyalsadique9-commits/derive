import type { ReactNode } from "react";
import type { AnswerLanguage } from "@/lib/ai/schema";
import { cn } from "@/lib/utils/cn";

export const LANGUAGE_OPTIONS: { value: AnswerLanguage; label: string }[] = [
  { value: "english", label: "English" },
  { value: "hinglish", label: "Hinglish" },
];

export const inputStyles =
  "w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none placeholder:text-ink-muted/70 focus:border-accent/50";

export function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-sm font-semibold text-ink">{children}</p>;
}

/** A row of mutually exclusive options. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-subtle p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 rounded-md font-medium whitespace-nowrap transition-colors",
            size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
            value === option.value
              ? "bg-surface text-ink shadow-sm"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
      />
      <span className="min-w-0 text-sm text-ink">{children}</span>
    </label>
  );
}
