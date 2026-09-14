import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/brand/Logo";
import { buttonStyles } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-ink-muted sm:flex">
          <Link href="/syllabus" className="transition-colors hover:text-ink">
            Syllabus
          </Link>
          <Link href="/plan" prefetch={false} className="transition-colors hover:text-ink">
            Study plan
          </Link>
          <Link href="/viva" prefetch={false} className="transition-colors hover:text-ink">
            Viva
          </Link>
        </nav>
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
            <Link href="/solve" prefetch={false} className={buttonStyles()}>
              Open app
            </Link>
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
