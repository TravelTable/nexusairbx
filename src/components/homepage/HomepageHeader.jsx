import { Gamepad2 } from "lib/icons";
import { Button } from "../shadcn/button";
import { homepageFooterLinks, homepageHero } from "../../content/homepageLanding";

export default function HomepageHeader({
  accountSlot,
  ctaHref = homepageHero.primaryCta.href,
  ctaLabel = homepageHero.primaryCta.label,
  robloxStatus,
  onConnectRoblox,
}) {
  const primaryLinks = homepageFooterLinks.filter((link) => link.label !== "Support");

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/88 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <a className="inline-flex min-w-0 items-center gap-2.5 text-white" href="/" aria-label="NexusRBX home">
          <img className="h-8 w-8 flex-none rounded-md object-contain" src="/logo.png" alt="" width="32" height="32" />
          <span className="truncate text-xl font-black tracking-tight">NexusRBX</span>
        </a>

        <div className="flex items-center gap-5 lg:gap-8">
          <nav className="hidden items-center gap-6 text-sm font-semibold text-zinc-300 md:flex" aria-label="Primary">
            {primaryLinks.map((link) => (
              <a className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" href={link.href} key={link.href}>
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
                    className="h-7 w-7 rounded-full border border-white/20"
                    alt={robloxStatus.profile.preferred_username}
                  />
                  <span className="text-xs font-semibold text-zinc-300">
                    @{robloxStatus.profile.preferred_username}
                  </span>
                </div>
              ) : robloxStatus && !robloxStatus.connected && onConnectRoblox ? (
                <button
                  onClick={onConnectRoblox}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.1] hover:text-white"
                >
                  <Gamepad2 className="h-3.5 w-3.5" />
                  Connect Roblox
                </button>
              ) : (
                <a className="hidden text-sm font-semibold text-zinc-300 transition hover:text-white sm:inline-flex" href="/signin">
                  Sign in
                </a>
              ))}
            <Button asChild className="hidden bg-[#3855f6] hover:bg-[#5068ff] sm:inline-flex">
              <a href={ctaHref}>{ctaLabel}</a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
