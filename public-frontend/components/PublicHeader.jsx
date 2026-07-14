import PublicAccountState from "./PublicAccountState";

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05070d]/95 text-white shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <a
          href="/"
          className="group inline-flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5d4]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label="NexusRBX home"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
            <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
          </span>
          <span className="truncate text-sm font-semibold text-white">NexusRBX</span>
        </a>

        <div className="flex shrink-0 items-center gap-2">
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            <a className="rounded-md px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-white" href="/ai">
              AI Workspace
            </a>
            <a className="rounded-md px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-white" href="/tools/icon-generator">
              Icon Generator
            </a>
            <a className="rounded-md px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-white" href="/icons-market">
              Icon Market
            </a>
            <a className="rounded-md px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-white" href="/downloads">
              Downloads
            </a>
            <a className="rounded-md px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-white" href="/subscribe">
              Pricing
            </a>
            <a className="rounded-md px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-white" href="/contact">
              Contact
            </a>
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <PublicAccountState />
            <a
              href="/ai"
              className="inline-flex h-9 items-center justify-center rounded-md border border-[#00f5d4]/50 bg-[#00f5d4] px-3 text-sm font-semibold text-black transition-colors hover:bg-[#00ddbf]"
            >
              Start Building
            </a>
          </div>

          <details className="relative sm:hidden">
            <summary className="flex h-9 cursor-pointer list-none items-center rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-gray-200">
              Menu
            </summary>
            <div className="absolute right-0 top-12 z-50 grid min-w-52 gap-1 rounded-lg border border-white/10 bg-[#0b0e16] p-2 shadow-2xl">
              <a className="rounded-md px-3 py-2 text-sm text-gray-200 hover:bg-white/[0.06]" href="/ai">AI Workspace</a>
              <a className="rounded-md px-3 py-2 text-sm text-gray-200 hover:bg-white/[0.06]" href="/tools/icon-generator">Icon Generator</a>
              <a className="rounded-md px-3 py-2 text-sm text-gray-200 hover:bg-white/[0.06]" href="/icons-market">Icon Market</a>
              <a className="rounded-md px-3 py-2 text-sm text-gray-200 hover:bg-white/[0.06]" href="/downloads">Downloads</a>
              <a className="rounded-md px-3 py-2 text-sm text-gray-200 hover:bg-white/[0.06]" href="/subscribe">Pricing</a>
              <a className="rounded-md px-3 py-2 text-sm text-gray-200 hover:bg-white/[0.06]" href="/contact">Contact</a>
              <div className="mt-1 border-t border-white/10 pt-2">
                <PublicAccountState />
              </div>
              <a className="mt-1 rounded-md bg-[#00f5d4] px-3 py-2 text-center text-sm font-semibold text-black hover:bg-[#00ddbf]" href="/ai">
                Start Building
              </a>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
