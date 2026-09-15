"use client";

import {
  BookOpen,
  CalendarRange,
  ListChecks,
  MessageSquareText,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAnswerInProgress } from "@/lib/client/solver-session";
import { cn } from "@/lib/utils/cn";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/solve", label: "Solve", icon: MessageSquareText },
  { href: "/syllabus", label: "Syllabus", icon: BookOpen },
  { href: "/plan", label: "Study plan", icon: CalendarRange },
  { href: "/viva", label: "Viva", icon: ListChecks },
];

/** The main sections, with the current one highlighted. */
export function SiteNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const answering = useAnswerInProgress();

  return (
    <nav aria-label="Main" className={cn("items-center gap-1", className)}>
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent-soft text-accent"
                : "text-ink-muted hover:bg-subtle hover:text-ink",
            )}
          >
            <Icon className="size-4" />
            {label}
            {href === "/solve" && answering && (
              <span className="size-1.5 animate-pulse rounded-full bg-accent">
                <span className="sr-only">(an answer is being written)</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
