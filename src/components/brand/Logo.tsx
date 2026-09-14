import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils/cn";

/** A delta (Δ) in a rounded tile: the symbol for change, used in derivations. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-canvas",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinejoin="round"
        className="size-[58%]"
      >
        <path d="M12 3.5 20 17.5H4Z" />
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-serif text-xl font-semibold tracking-tight text-ink">
        {siteConfig.name}
      </span>
    </span>
  );
}
