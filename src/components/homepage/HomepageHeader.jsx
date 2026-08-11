import { Gamepad2 } from "lib/icons";
import { shouldUseLocalDevelopmentAuth } from "lib/localDevelopmentAuth";
import { Button } from "../shadcn/button";
import { homepageFooterLinks, homepageHero } from "../../content/homepageLanding";

export default function HomepageHeader({
  accountSlot,
  ctaHref = homepageHero.primaryCta.href,
  ctaLabel = homepageHero.primaryCta.label,
  robloxStatus,
  onConnectRoblox,
}) {
  const localDevelopmentAuth = shouldUseLocalDevelopmentAuth();
  const primaryLinks = homepageFooterLinks.filter((link) => link.label !== "Support");

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <a className="inline-flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)]" href="/" aria-label="NexusRBX home">
          <img className="h-8 w-8 flex-none object-contain" src="/nexus-mark.svg" alt="" width="32" height="32" />
          <span className="truncate text-lg font-semibold tracking-[-0.02em]">NexusRBX</span>
        </a>

        <div className="flex items-center gap-5 lg:gap-8">
          <nav className="hidden items-center gap-2 text-sm font-medium text-[var(--ds-text-secondary)] md:flex" aria-label="Primary">
            {primaryLinks.map((link) => (
              <a className="inline-flex min-h-11 items-center rounded-lg px-3 transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)]" href={link.href} key={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {accountSlot ||
              (robloxStatus?.connected && robloxStatus?.profile ? (
                <div className="flex items-center gap-2">
                  <img
                    src={robloxStatus.profile.picture}
                    className="h-7 w-7 rounded-full border border-[var(--ds-border-strong)]"
                    alt={robloxStatus.profile.preferred_username}
                  />
                  <span className="text-xs font-semibold text-[var(--ds-text-secondary)]">
                    @{robloxStatus.profile.preferred_username}
                  </span>
                </div>
              ) : robloxStatus && !robloxStatus.connected && onConnectRoblox ? (
                <button
                  onClick={onConnectRoblox}
                  className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-3 text-xs font-semibold text-[var(--ds-text-secondary)] transition-[background-color,color,transform] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] active:scale-[0.98] motion-reduce:transform-none"
                >
                  <Gamepad2 className="h-3.5 w-3.5" />
                  Connect Roblox
                </button>
              ) : (
                <a className="hidden min-h-11 items-center rounded-lg px-2 text-sm font-medium text-[var(--ds-text-secondary)] transition-colors hover:text-[var(--ds-text)] sm:inline-flex" href={localDevelopmentAuth ? "/ai" : "/signin"}>
                  {localDevelopmentAuth ? "Open workspace" : "Sign in"}
                </a>
              ))}
            <Button asChild className="hidden bg-[var(--ds-accent)] text-[var(--ds-accent-foreground)] hover:bg-[var(--ds-accent-hover)] active:bg-[var(--ds-accent-pressed)] sm:inline-flex">
              <a href={ctaHref}>{ctaLabel}</a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
