import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/brand/Logo";
import { buttonStyles } from "@/components/ui/button";
import { AnswerInProgress } from "./AnswerInProgress";
import { SiteNav } from "./SiteNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-5 px-5">
        <Link href="/" aria-label="Home" className="shrink-0">
          <Logo />
        </Link>
        <SiteNav className="hidden md:flex" />
        <div className="ml-auto flex items-center gap-2 whitespace-nowrap">
          <Show when="signed-out">
            <SignInButton>
              <button
                className={buttonStyles({ variant: "ghost", className: "hidden sm:inline-flex" })}
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton>
              <button className={buttonStyles()}>Get started</button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/solve" className={buttonStyles()}>
              Open app
              <AnswerInProgress />
            </Link>
            <UserButton />
          </Show>
        </div>
      </div>
      <SiteNav className="flex overflow-x-auto border-t border-line/60 px-4 py-2 md:hidden" />
    </header>
  );
}
