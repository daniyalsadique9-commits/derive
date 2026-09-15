import { SiteHeader } from "./SiteHeader";

/** Shown straight away while a page is prepared on the server. */
export function PageSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main aria-busy="true" className="mx-auto w-full max-w-6xl flex-1 px-5 py-12">
        <div className="h-10 w-64 max-w-full animate-pulse rounded-lg bg-subtle" />
        <div className="mt-4 h-5 w-[28rem] max-w-full animate-pulse rounded bg-subtle" />
        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[400px_minmax(0,1fr)]">
          <div className="h-96 animate-pulse rounded-2xl bg-subtle" />
          <div className="hidden h-96 animate-pulse rounded-2xl bg-subtle lg:block" />
        </div>
      </main>
    </div>
  );
}
