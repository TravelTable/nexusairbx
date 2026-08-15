import PublicAccountState, { PublicAccountProvider } from "./PublicAccountState";
import PublicNavBehavior from "./PublicNavBehavior";
import SkipToMainContent from "../../src/components/site/SkipToMainContent";
import { homepageNavigation, homepageResourceNavigation } from "../../src/content/siteNavigation";

const navLinkClass =
  "inline-flex min-h-11 items-center rounded-[7px] px-3 text-[13px] font-medium text-[var(--ds-text-secondary)] transition-[background-color,color] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]";

const dropdownLinkClass =
  "flex min-h-11 items-center rounded-[7px] px-3 text-[13px] text-[var(--ds-text-secondary)] transition-[background-color,color] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]";

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
      <div className="absolute left-0 top-11 z-50 w-56 origin-top-left rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface-overlay)] p-2 shadow-[var(--ds-shadow-overlay)]">
        {children}
      </div>
    </details>
  );
}

export default function PublicHeader({ showSkipLink = false, homepage = false, overlay = false }) {
  const isHomepage = homepage || overlay;

  return (
    <PublicAccountProvider>
      <header
        className="sticky top-0 z-50 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] text-[var(--ds-text)]"
        data-public-header
        data-overlay={isHomepage ? "true" : undefined}
      >
      {showSkipLink ? <SkipToMainContent /> : null}
      <div className={`${isHomepage ? "max-w-[88rem]" : "max-w-7xl"} mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8`} data-public-header-inner>
        <a
          href="/"
          className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
          aria-label="NexusRBX home"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[var(--ds-border)] bg-transparent">
            <img src="/nexus-mark.svg" alt="" className="h-6 w-6 object-contain" width="24" height="24" />
          </span>
          <span className="truncate text-[13px] font-semibold tracking-[-0.01em] text-[var(--ds-text)]">NexusRBX</span>
        </a>

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-5 lg:flex">
          {isHomepage ? (
            <nav className="flex items-center gap-0.5" aria-label="Homepage navigation" data-public-nav>
              {homepageNavigation.map((item) => (
                <a className={`${navLinkClass} font-semibold`} href={item.href} key={item.href}>{item.label}</a>
              ))}
              <DesktopGroup label="Resources">
                {homepageResourceNavigation.map((item) => (
                  <a className={dropdownLinkClass} href={item.href} key={item.href}>{item.label}</a>
                ))}
              </DesktopGroup>
            </nav>
          ) : (
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
          )}

          <div className="flex items-center gap-2 border-l border-[var(--ds-border-subtle)] pl-5">
            <div className={isHomepage ? "[&>div>a:last-child]:hidden" : ""}>
              <PublicAccountState />
            </div>
            {isHomepage ? (
              <a className="inline-flex h-11 items-center justify-center rounded-[8px] bg-[var(--ds-text)] px-5 text-[13px] font-semibold text-[var(--ds-bg-canvas)] transition-[background-color,transform] hover:bg-[var(--ds-text-secondary)] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] motion-reduce:transform-none" href="/ai">
                Start building
              </a>
            ) : null}
          </div>
        </div>

        <details className="group relative lg:hidden">
          <summary className="flex h-11 cursor-pointer list-none items-center rounded-[8px] border border-[var(--ds-border-strong)] bg-[var(--ds-fill-subtle)] px-3 text-[13px] font-medium text-[var(--ds-text)] transition-[background-color,transform] hover:bg-[var(--ds-fill-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] motion-reduce:transform-none [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Menu</span>
            <span className="hidden group-open:inline">Close</span>
          </summary>
          <div className="absolute right-0 top-12 z-50 max-h-[calc(100vh-5rem)] w-[min(25rem,calc(100vw-2rem))] origin-top-right overflow-y-auto rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface-overlay)] p-3 shadow-[var(--ds-shadow-overlay)]">
            <nav className="grid gap-4" aria-label="Mobile navigation" data-public-nav>
              {isHomepage ? (
                <div className="grid gap-0.5">
                  {homepageNavigation.map((item) => (
                    <a className={`${dropdownLinkClass} font-semibold`} href={item.href} key={item.href}>{item.label}</a>
                  ))}
                  <div className="mt-3 border-t border-[var(--ds-border-subtle)] pt-3">
                    <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-muted)]">Resources</p>
                    {homepageResourceNavigation.map((item) => (
                      <a className={dropdownLinkClass} href={item.href} key={item.href}>{item.label}</a>
                    ))}
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}
            </nav>

            <div className="mt-3 grid gap-2 border-t border-[var(--ds-border-subtle)] pt-3">
              <div className={isHomepage ? "[&>div>a:last-child]:hidden" : ""}>
                <PublicAccountState mobile />
              </div>
              {isHomepage ? (
                <a className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[var(--ds-text)] px-5 text-[13px] font-semibold text-[var(--ds-bg-canvas)] hover:bg-[var(--ds-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]" href="/ai">
                  Start building
                </a>
              ) : null}
            </div>
          </div>
        </details>
      </div>
        <PublicNavBehavior />
      </header>
    </PublicAccountProvider>
  );
}
