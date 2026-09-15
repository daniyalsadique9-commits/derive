"use client";

import { UserButton } from "@clerk/nextjs";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/brand/Logo";

/** The admin area's own header: a way back to the app and a button to lock the panel. */
export function AdminHeader({ unlocked }: { unlocked: boolean }) {
  const router = useRouter();

  async function lock() {
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => null);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
        <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
          <LogoMark />
          <span className="font-serif text-lg font-semibold text-ink">Derive</span>
          <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
            Admin
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href="/solve"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Back to app</span>
          </Link>
          {unlocked && (
            <button
              type="button"
              onClick={lock}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
            >
              <Lock className="size-4" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          )}
          <UserButton />
        </div>
      </div>
    </header>
  );
}
