import PublicAccountState, { PublicAccountProvider } from "./PublicAccountState";
import PublicNavBehavior from "./PublicNavBehavior";
import SkipToMainContent from "../../src/components/site/SkipToMainContent";

const navLinkClass =
  "inline-flex min-h-11 items-center rounded-full px-3 text-[13px] font-medium text-[var(--ds-text-secondary)] transition-[background-color,color,transform] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] motion-reduce:transform-none";

const dropdownLinkClass =
  "flex min-h-11 items-center rounded-lg px-3 text-[13px] text-[var(--ds-text-secondary)] transition-[background-color,color,transform] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] motion-reduce:transform-none";

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

export default function PublicHeader({ showSkipLink = false, overlay = false }) {
  return (
    <PublicAccountProvider>
      <header
        className={`${overlay
          ? "absolute inset-x-0 top-0 z-50 border-transparent bg-transparent"
          : "sticky top-0 z-50 border-b border-[var(--ds-border-subtle)] bg-[color-mix(in_srgb,var(--ds-surface-overlay)_94%,transparent)] backdrop-blur-xl"} text-[var(--ds-text)]`}
        data-public-header
        data-overlay={overlay ? "true" : undefined}
      >
      {showSkipLink ? <SkipToMainContent /> : null}
      <div className={`${overlay ? "max-w-none" : "max-w-7xl"} mx-auto flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8`} data-public-header-inner>
        <a
          href="/"
          className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
          aria-label="NexusRBX home"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)]">
            <img src="/logo.png" alt="" className="h-6 w-6 object-contain" width="24" height="24" />
          </span>
          <span className="truncate text-[13px] font-semibold tracking-[-0.01em] text-[var(--ds-text)]">NexusRBX</span>
        </a>

        <div className={`${overlay ? "hidden" : "hidden min-w-0 flex-1 items-center justify-end gap-5 lg:flex"}`}>
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

        <details className={`group relative ${overlay ? "lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2" : "lg:hidden"}`}>
          <summary className={`${overlay ? "w-11 justify-center rounded-full px-0" : "rounded-full px-3"} flex h-11 cursor-pointer list-none items-center border border-[var(--ds-border-strong)] bg-[var(--ds-fill-subtle)] text-[13px] font-medium text-[var(--ds-text)] transition-[background-color,transform] hover:bg-[var(--ds-fill-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] motion-reduce:transform-none [&::-webkit-details-marker]:hidden`}>
            {overlay ? (
              <>
                <span className="sr-only">Open navigation</span>
                <span aria-hidden="true" className="relative block h-4 w-4 rounded-[4px] border border-current before:absolute before:left-[3px] before:top-[3px] before:h-1 before:w-1 before:rounded-full before:bg-current after:absolute after:bottom-[3px] after:right-[3px] after:h-1 after:w-1 after:rounded-full after:bg-current" />
              </>
            ) : (
              <>
                <span className="group-open:hidden">Menu</span>
                <span className="hidden group-open:inline">Close</span>
              </>
            )}
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
