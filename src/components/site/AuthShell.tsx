import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { siteConfig } from "@/config/site";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" aria-label="Home" className="flex flex-col items-center gap-3 text-center">
        <Logo />
        <span className="text-sm text-ink-muted">{siteConfig.tagline}</span>
      </Link>
      {children}
    </main>
  );
}
