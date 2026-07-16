import PublicAccountState from "./PublicAccountState";
import PublicNavBehavior from "./PublicNavBehavior";

const navLinkClass =
  "rounded-md px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5d4]";

const dropdownLinkClass =
  "block rounded-md px-3 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5d4]";

function DesktopGroup({ label, children }) {
  return (
    <details className="group relative">
      <summary
        className={`${navLinkClass} flex cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden`}
      >
        {label}
        <span aria-hidden="true" className="text-[10px] text-zinc-500 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="absolute left-0 top-11 z-50 w-56 rounded-lg border border-white/10 bg-[#10131b] p-2 shadow-xl shadow-black/30">
        {children}
      </div>
    </details>
  );
}

export default function PublicHeader() {
  return (
    <header
      className="sticky top-0 z-50 border-b border-white/10 bg-[#080a10]/95 text-white backdrop-blur-xl"
      data-public-header
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href="/"
          className="inline-flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5d4]"
          aria-label="NexusRBX home"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
            <img src="/logo.png" alt="" className="h-7 w-7 object-contain" width="28" height="28" />
          </span>
          <span className="truncate text-sm font-semibold tracking-tight text-white">NexusRBX</span>
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

          <div className="border-l border-white/10 pl-5">
            <PublicAccountState />
          </div>
        </div>

        <details className="group relative lg:hidden">
          <summary className="flex h-10 cursor-pointer list-none items-center rounded-md border border-white/15 bg-white/[0.04] px-3 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5d4] [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Menu</span>
            <span className="hidden group-open:inline">Close</span>
          </summary>
          <div className="absolute right-0 top-12 z-50 max-h-[calc(100vh-5rem)] w-[min(25rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-white/10 bg-[#10131b] p-3 shadow-xl shadow-black/40">
            <nav className="grid gap-4" aria-label="Mobile navigation" data-public-nav>
              <div>
                <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Product</p>
                <a className={dropdownLinkClass} href="/ai">AI Workspace</a>
                <a className={dropdownLinkClass} href="/tools/icon-generator">Icon Generator</a>
                <a className={dropdownLinkClass} href="/icons-market">Creator Store</a>
              </div>

              <div className="grid gap-0.5 border-y border-white/10 py-3">
                <a className={dropdownLinkClass} href="/docs">Docs</a>
                <a className={dropdownLinkClass} href="/pricing">Pricing</a>
                <a className={dropdownLinkClass} href="/downloads">Downloads</a>
              </div>

              <div>
                <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Resources</p>
                <a className={dropdownLinkClass} href="/contact">Contact</a>
                <a className={dropdownLinkClass} href="/support">Support</a>
                <a className={dropdownLinkClass} href="/legal">Legal</a>
              </div>
            </nav>

            <div className="mt-3 border-t border-white/10 pt-3">
              <PublicAccountState mobile />
            </div>
          </div>
        </details>
      </div>
      <PublicNavBehavior />
    </header>
  );
}
