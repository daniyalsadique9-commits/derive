import { LogoMark } from "@/components/brand/Logo";

/** Shown straight away while the app is prepared on the server. */
export default function SolveLoading() {
  return (
    <div aria-busy="true" className="flex h-dvh bg-canvas">
      <div className="hidden w-72 shrink-0 border-r border-line bg-sidebar lg:block" />
      <div className="grid flex-1 place-items-center">
        <LogoMark className="size-11 animate-pulse" />
      </div>
    </div>
  );
}
