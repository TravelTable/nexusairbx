import PublicAccountState, { PublicAccountProvider } from "./PublicAccountState";
import PublicNavBehavior from "./PublicNavBehavior";
import SkipToMainContent from "../../src/components/site/SkipToMainContent";

const navLinkClass =
  "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[var(--ds-text-secondary)] transition-[background-color,color,transform] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)] motion-reduce:transform-none";

const dropdownLinkClass =
  "flex min-h-11 items-center rounded-lg px-3 text-sm text-[var(--ds-text-secondary)] transition-[background-color,color,transform] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)] motion-reduce:transform-none";

function DesktopGroup({ label, children }) {
  return (
    <details className="group relative">
      <summary
        className={`${navLinkClass} flex cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden`}
      >
        {label}
        <span aria-hidden="true" className="text-[10px] text-[var(--ds-text-muted)] transition-transform group-open:rotate-180 motion-reduce:transition-none">
          ▾
        </span>
      </summary>
      <div className="absolute left-0 top-11 z-50 w-56 origin-top-left rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-overlay)] p-2 shadow-xl shadow-black/10">
        {children}
      </div>
    </details>
  );
}

export default function PublicHeader({ showSkipLink = false }) {
  return (
    <PublicAccountProvider>
      <header
        className="sticky top-0 z-50 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] text-[var(--ds-text)] backdrop-blur-xl"
        data-public-header
      >
      {showSkipLink ? <SkipToMainContent /> : null}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href="/"
          className="inline-flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)]"
          aria-label="NexusRBX home"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)]">
            <img src="/logo.png" alt="" className="h-7 w-7 object-contain" width="28" height="28" />
          </span>
          <span className="truncate text-sm font-semibold tracking-[-0.01em] text-[var(--ds-text)]">NexusRBX</span>
        </a>

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-5 lg:flex">
          <nav className="flex items-center gap-0.5" aria-label="Primary navigation" data-public-nav>
            <DesktopGroup label="Product">
              <a className={dropdownLinkClass} href="/ai">AI Workspace</a>
              <a className={dropdownLinkClass} href="/tools/icon-generator">Icon Generator</a>
              <a className={dropdownLinkClass} href="/icons-market">Creator Store</a>
            </DesktopGroup>
            <a className={navLinkClass} href="/docs">Docs</a>
            <a className={navLinkClass} href="/pricing">Pricing</a>
            <a className={navLinkClass} href="/downloads">Downloads</a>
            <DesktopGroup label="Resources">
              <a className={dropdownLinkClass} href="/contact">Contact</a>
              <a className={dropdownLinkClass} href="/support">Support</a>
              <a className={dropdownLinkClass} href="/legal">Legal</a>
            </DesktopGroup>
          </nav>

          <div className="border-l border-[var(--ds-border-subtle)] pl-5">
            <PublicAccountState />
          </div>
        </div>

        <details className="group relative lg:hidden">
          <summary className="flex h-11 cursor-pointer list-none items-center rounded-lg border border-[var(--ds-border-strong)] bg-[var(--ds-fill-subtle)] px-3 text-sm font-medium text-[var(--ds-text)] transition-[background-color,transform] hover:bg-[var(--ds-fill-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)] motion-reduce:transform-none [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Menu</span>
            <span className="hidden group-open:inline">Close</span>
          </summary>
          <div className="absolute right-0 top-12 z-50 max-h-[calc(100vh-5rem)] w-[min(25rem,calc(100vw-2rem))] origin-top-right overflow-y-auto rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-overlay)] p-3 shadow-xl shadow-black/10">
            <nav className="grid gap-4" aria-label="Mobile navigation" data-public-nav>
              <div>
                <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-muted)]">Product</p>
                <a className={dropdownLinkClass} href="/ai">AI Workspace</a>
                <a className={dropdownLinkClass} href="/tools/icon-generator">Icon Generator</a>
                <a className={dropdownLinkClass} href="/icons-market">Creator Store</a>
              </div>

              <div className="grid gap-0.5 border-y border-[var(--ds-border-subtle)] py-3">
                <a className={dropdownLinkClass} href="/docs">Docs</a>
                <a className={dropdownLinkClass} href="/pricing">Pricing</a>
                <a className={dropdownLinkClass} href="/downloads">Downloads</a>
              </div>

              <div>
                <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-muted)]">Resources</p>
                <a className={dropdownLinkClass} href="/contact">Contact</a>
                <a className={dropdownLinkClass} href="/support">Support</a>
                <a className={dropdownLinkClass} href="/legal">Legal</a>
              </div>
            </nav>

            <div className="mt-3 border-t border-[var(--ds-border-subtle)] pt-3">
              <PublicAccountState mobile />
            </div>
          </div>
        </details>
      </div>
        <PublicNavBehavior />
      </header>
    </PublicAccountProvider>
  );
}
