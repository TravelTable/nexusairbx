import { buildPublicMetadata } from "../../../src/lib/seo";
import PricingCatalog from "../../components/PricingCatalog";
import PublicHeader from "../../components/PublicHeader";

export const metadata = buildPublicMetadata({
  title: "NexusRBX Pricing | Creator and Studio Plans",
  description: "Compare NexusRBX Free, Starter, Pro, Pro+, and Team plans with monthly and yearly billing details.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--ds-bg-canvas)] text-[var(--ds-text)]">
      <a
        className="sr-only z-[60] rounded-lg bg-[var(--ds-accent)] px-4 py-2 text-sm font-semibold text-[var(--ds-accent-foreground)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main-content"
      >
        Skip to pricing
      </a>
      <PublicHeader />
      <PricingCatalog />
      <footer className="border-t border-[var(--ds-border-subtle)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <a className="text-sm font-semibold text-[var(--ds-text)]" href="/">NexusRBX</a>
            <p className="mt-2 max-w-xl text-xs leading-5 text-[var(--ds-text-muted)]">
              Independent creator software. NexusRBX is not affiliated with or endorsed by Roblox Corporation.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--ds-text-secondary)]" aria-label="Pricing footer">
            <a className="hover:text-[var(--ds-text)]" href="/docs">Docs</a>
            <a className="text-[var(--ds-text)]" href="/pricing" aria-current="page">Pricing</a>
            <a className="hover:text-[var(--ds-text)]" href="/contact">Contact</a>
            <a className="hover:text-[var(--ds-text)]" href="/legal">Legal</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
