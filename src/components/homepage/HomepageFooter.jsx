import { Separator } from "../shadcn/separator";
import { homepageFooterLinks } from "../../content/homepageLanding";

export default function HomepageFooter() {
  return (
    <footer className="mt-8 border-t border-[var(--ds-border-subtle)] bg-[var(--ds-bg-canvas)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-7 sm:px-6 md:flex-row md:items-center md:justify-between">
        <a className="inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)]" href="/" aria-label="NexusRBX home">
          <img className="h-7 w-7 rounded-md object-contain" src="/logo.png" alt="" width="28" height="28" />
          <span>NexusRBX.com</span>
        </a>
        <nav className="flex flex-wrap gap-2 text-sm font-medium text-[var(--ds-text-secondary)]" aria-label="Footer">
          {homepageFooterLinks.map((link) => (
            <a className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)]" href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      <Separator className="mx-auto max-w-6xl bg-[var(--ds-border-subtle)]" />
      <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-[var(--ds-text-muted)] sm:px-6">
        NexusRBX.com, not affiliated with Roblox Corporation.
      </p>
    </footer>
  );
}
