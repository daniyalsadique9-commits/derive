import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-ink-muted sm:flex-row sm:justify-between">
        <p>
          <span className="font-serif font-semibold text-ink">{siteConfig.name}</span> ·{" "}
          {siteConfig.event}
        </p>
        <p>AI-generated answers can contain errors. Verify important results.</p>
      </div>
    </footer>
  );
}
