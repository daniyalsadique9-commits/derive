import Image from "next/image";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils/cn";

/** The Derive mark: a stylised red D. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative grid size-8 shrink-0", className)}>
      <Image
        src="/brand/derive-mark.png"
        alt=""
        fill
        sizes="64px"
        unoptimized
        className="object-contain"
      />
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-serif text-xl font-semibold tracking-tight text-ink">
        {siteConfig.name}
      </span>
    </span>
  );
}
