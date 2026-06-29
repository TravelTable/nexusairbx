import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  CreditCard,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  PlugZap,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Wrench,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "../shadcn/avatar";
import { Badge } from "../shadcn/badge";
import { Button } from "../shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../shadcn/dropdown-menu";
import { Separator } from "../shadcn/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../shadcn/sheet";
import { Skeleton } from "../shadcn/skeleton";
import { cn } from "../../lib/utils";
import useHeaderIdentity from "./useHeaderIdentity";
import { getHeaderVariantForPath } from "./siteHeaderIdentity";

const HEADER_CONFIG = {
  marketing: {
    label: "Roblox AI creation suite",
    nav: [
      { to: "/ai", label: "AI Workspace", icon: Bot },
      { to: "/tools/icon-generator", label: "Icon Generator", icon: Sparkles },
      { to: "/icons-market", label: "Icon Market", icon: Store },
      { to: "/subscribe", label: "Pricing", icon: CreditCard },
      { to: "/contact", label: "Contact", icon: HelpCircle },
    ],
    cta: { to: "/ai", label: "Start Building", icon: Rocket },
  },
  tools: {
    label: "Creator tools",
    nav: [
      { to: "/tools/icon-generator", label: "Icon Generator", icon: Sparkles },
      { to: "/icons-market", label: "Icon Market", icon: Store },
      { to: "/ai", label: "AI Workspace", icon: Bot },
      { to: "/subscribe", label: "Pricing", icon: CreditCard },
    ],
    cta: { to: "/ai", label: "Open Workspace", icon: Bot },
  },
  account: {
    label: "Account and billing",
    nav: [
      { to: "/settings", label: "Settings", icon: Settings },
      { to: "/billing", label: "Billing", icon: CreditCard },
      { to: "/subscribe", label: "Plans", icon: ShieldCheck },
      { to: "/ai", label: "AI Workspace", icon: Bot },
    ],
    cta: { to: "/ai", label: "Back to Workspace", icon: Bot },
  },
  auth: {
    label: "Secure creator access",
    nav: [
      { to: "/", label: "Home", icon: Home },
      { to: "/contact", label: "Contact", icon: HelpCircle },
    ],
    cta: null,
  },
  legal: {
    label: "NexusRBX policy center",
    nav: [
      { to: "/", label: "Home", icon: Home },
      { to: "/subscribe", label: "Pricing", icon: CreditCard },
      { to: "/ai", label: "AI Workspace", icon: Bot },
      { to: "/contact", label: "Contact", icon: HelpCircle },
    ],
    cta: { to: "/ai", label: "Open Workspace", icon: Bot },
  },
  workspace: {
    label: "AI workspace",
    nav: [],
    cta: null,
  },
};

function isActivePath(pathname, target) {
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(`${target}/`);
}

function Brand({ compact = false, subtitle }) {
  return (
    <Link
      to="/"
      className="group inline-flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5d4]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      aria-label="NexusRBX home"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
        <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">NexusRBX</span>
          {subtitle && <span className="hidden truncate text-xs text-gray-500 sm:block">{subtitle}</span>}
        </span>
      )}
    </Link>
  );
}

function HeaderAvatar({ identity, className }) {
  return (
    <Avatar className={cn("h-9 w-9 border border-white/10 bg-white/[0.04]", className)}>
      {identity.avatar.src && (
        <AvatarImage src={identity.avatar.src} alt={`${identity.displayName} profile`} />
      )}
      <AvatarFallback className="bg-[#111827] text-xs font-semibold text-[#00f5d4]">
        {identity.avatar.fallback}
      </AvatarFallback>
    </Avatar>
  );
}

function NavLinks({ links, pathname, mobile = false }) {
  return (
    <nav className={cn(mobile ? "grid gap-1" : "hidden items-center gap-1 lg:flex")} aria-label="Primary">
      {links.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(pathname, item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5d4]/70",
              mobile
                ? "min-h-11 justify-start text-gray-200 hover:bg-white/[0.06]"
                : "text-gray-400 hover:bg-white/[0.05] hover:text-white",
              active && "bg-[#00f5d4]/10 text-[#00f5d4]"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function AccountMenu({ identity, compact = false }) {
  const {
    user,
    displayName,
    email,
    planLabel,
    tokensLabel,
    robloxUsername,
    robloxConnected,
    robloxLoading,
    robloxError,
    robloxAction,
    connectRoblox,
    reconnectRoblox,
    refreshRobloxStatus,
    signOutUser,
  } = identity;

  if (!user) {
    return (
      <div className="hidden items-center gap-2 sm:flex">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:bg-white/[0.06] hover:text-white"
        >
          <Link to="/signin">Sign in</Link>
        </Button>
        {!compact && (
          <Button
            asChild
            size="sm"
            className="border border-[#00f5d4]/50 bg-[#00f5d4] text-black hover:bg-[#00ddbf]"
          >
            <Link to="/signup">Create account</Link>
          </Button>
        )}
      </div>
    );
  }

  const robloxLabel = robloxConnected
    ? robloxUsername || "Roblox connected"
    : robloxLoading
      ? "Checking Roblox"
      : "Roblox not connected";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-left text-sm text-gray-200 transition-colors hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5d4]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
            compact && "border-transparent bg-transparent px-0 hover:bg-white/[0.04]"
          )}
          aria-label="Open account menu"
        >
          <HeaderAvatar identity={identity} className="h-8 w-8" />
          {!compact && (
            <>
              <span className="hidden min-w-0 max-w-[160px] lg:block">
                <span className="block truncate text-xs font-semibold text-white">{displayName}</span>
                <span className="block truncate text-[11px] text-gray-500">{planLabel}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-gray-500 lg:block" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] border-white/10 bg-[#080b13] p-2 text-white shadow-2xl">
        <DropdownMenuLabel className="p-2 font-normal">
          <div className="flex items-start gap-3">
            <HeaderAvatar identity={identity} className="h-11 w-11" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{displayName}</div>
              {email && <div className="truncate text-xs text-gray-500">{email}</div>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className="border border-[#00f5d4]/30 bg-[#00f5d4]/10 text-[#00f5d4] hover:bg-[#00f5d4]/10">
                  {planLabel}
                </Badge>
                <Badge className={cn(
                  "border bg-white/[0.04] hover:bg-white/[0.04]",
                  robloxConnected ? "border-emerald-400/30 text-emerald-300" : "border-white/10 text-gray-400"
                )}>
                  {robloxLabel}
                </Badge>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <div className="grid grid-cols-2 gap-2 px-2 pb-2">
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-2">
            <div className="text-[11px] text-gray-500">Plan</div>
            <div className="mt-1 truncate text-sm font-semibold text-white">{planLabel}</div>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-2">
            <div className="text-[11px] text-gray-500">Usage</div>
            <div className="mt-1 truncate text-sm font-semibold text-white">{tokensLabel}</div>
          </div>
        </div>
        <div className="px-2 pb-2">
          {robloxLoading ? (
            <div className="space-y-2 rounded-md border border-white/10 bg-white/[0.04] p-3">
              <Skeleton className="h-3 w-28 bg-white/10" />
              <Skeleton className="h-8 w-full bg-white/10" />
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={Boolean(robloxAction)}
              onClick={robloxConnected ? reconnectRoblox : connectRoblox}
              className="w-full border-white/10 bg-white/[0.04] text-gray-100 hover:bg-white/[0.08]"
            >
              <PlugZap className="h-4 w-4" />
              {robloxAction ? "Opening Roblox..." : robloxConnected ? "Reconnect Roblox" : "Connect Roblox"}
            </Button>
          )}
          {robloxError && (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-400/20 bg-amber-400/10 p-2 text-xs text-amber-100">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1">{robloxError}</span>
              <button
                type="button"
                onClick={() => refreshRobloxStatus()}
                className="shrink-0 rounded text-amber-50 underline-offset-4 hover:underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/[0.08] focus:text-white">
          <Link to="/ai"><Bot className="mr-2 h-4 w-4" />AI Workspace</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/[0.08] focus:text-white">
          <Link to="/tools/icon-generator"><Sparkles className="mr-2 h-4 w-4" />Icon Generator</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/[0.08] focus:text-white">
          <Link to="/icons-market"><Store className="mr-2 h-4 w-4" />Icon Market</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/[0.08] focus:text-white">
          <Link to="/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/[0.08] focus:text-white">
          <Link to="/billing"><CreditCard className="mr-2 h-4 w-4" />Billing</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/[0.08] focus:text-white">
          <Link to="/contact"><HelpCircle className="mr-2 h-4 w-4" />Contact</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void signOutUser();
          }}
          className="cursor-pointer text-red-200 focus:bg-red-500/10 focus:text-red-100"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileMenu({ config, identity, pathname, isWorkspace }) {
  const CtaIcon = config.cta?.icon;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-gray-300 hover:bg-white/[0.06] hover:text-white lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[88vw] max-w-sm border-white/10 bg-[#080b13] text-white">
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="text-white">NexusRBX</SheetTitle>
          <SheetDescription className="text-gray-500">{config.label}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {identity.user ? (
            <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
              <HeaderAvatar identity={identity} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{identity.displayName}</div>
                <div className="truncate text-xs text-gray-500">{identity.tokensLabel}</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <SheetClose asChild>
                <Button asChild variant="outline" className="border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]">
                  <Link to="/signin">Sign in</Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild className="bg-[#00f5d4] text-black hover:bg-[#00ddbf]">
                  <Link to="/signup">Sign up</Link>
                </Button>
              </SheetClose>
            </div>
          )}
          {!isWorkspace && <NavLinks links={config.nav} pathname={pathname} mobile />}
          {config.cta && (
            <SheetClose asChild>
              <Button asChild className="w-full bg-[#00f5d4] text-black hover:bg-[#00ddbf]">
                <Link to={config.cta.to}>
                  {CtaIcon && <CtaIcon className="h-4 w-4" />}
                  {config.cta.label}
                </Link>
              </Button>
            </SheetClose>
          )}
          {identity.user && (
            <>
              <Separator className="bg-white/10" />
              <div className="grid gap-1">
                {[
                  { to: "/settings", label: "Settings", icon: Settings },
                  { to: "/billing", label: "Billing", icon: CreditCard },
                  { to: "/contact", label: "Contact", icon: HelpCircle },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <SheetClose key={item.to} asChild>
                      <Link
                        to={item.to}
                        className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/[0.06]"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}
                <button
                  type="button"
                  onClick={() => void identity.signOutUser()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-200 hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function SiteHeader({
  variant,
  workspaceLeft = null,
  workspaceRight = null,
  robloxStatusOverride,
  robloxLoadingOverride,
  className,
}) {
  const location = useLocation();
  const resolvedVariant = variant || getHeaderVariantForPath(location.pathname);
  const config = HEADER_CONFIG[resolvedVariant] || HEADER_CONFIG.marketing;
  const isWorkspace = resolvedVariant === "workspace";
  const identity = useHeaderIdentity({ robloxStatusOverride, robloxLoadingOverride });

  const ctaIcon = config.cta?.icon;
  const headerClass = cn(
    "z-50 border-b border-white/10 bg-[#05070d]/95 text-white shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl",
    isWorkspace ? "relative z-30 border-white/5 bg-black/30 shadow-none" : "sticky top-0",
    className
  );
  const innerClass = cn(
    "flex min-w-0 items-center justify-between gap-3",
    isWorkspace ? "px-4 py-2.5" : "mx-auto h-16 max-w-7xl px-4 sm:px-6 lg:px-8"
  );

  const workspaceControls = useMemo(() => (
    isWorkspace ? (
      <>
        <div className="flex min-w-0 flex-1 items-center gap-3">{workspaceLeft}</div>
        <div className="flex min-w-0 shrink-0 items-center gap-3">{workspaceRight}</div>
      </>
    ) : null
  ), [isWorkspace, workspaceLeft, workspaceRight]);

  return (
    <header className={headerClass}>
      <div className={innerClass}>
        {isWorkspace ? (
          <>
            <div className="hidden min-w-0 shrink-0 sm:block">
              <Brand compact subtitle={config.label} />
            </div>
            {workspaceControls}
            <AccountMenu identity={identity} compact />
            <MobileMenu config={config} identity={identity} pathname={location.pathname} isWorkspace />
          </>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-6">
              <Brand subtitle={config.label} />
              <NavLinks links={config.nav} pathname={location.pathname} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {identity.user && resolvedVariant === "account" && (
                <Badge className="hidden border border-white/10 bg-white/[0.04] text-gray-300 hover:bg-white/[0.04] md:inline-flex">
                  <Wrench className="mr-1 h-3 w-3" />
                  {identity.robloxLoading ? "Checking Roblox" : identity.robloxConnected ? "Roblox linked" : "Connect Roblox"}
                </Badge>
              )}
              {config.cta && (
                <Button
                  asChild
                  size="sm"
                  className="hidden border border-[#00f5d4]/50 bg-[#00f5d4] text-black hover:bg-[#00ddbf] md:inline-flex"
                >
                  <Link to={config.cta.to}>
                    {ctaIcon && React.createElement(ctaIcon, { className: "h-4 w-4" })}
                    {config.cta.label}
                  </Link>
                </Button>
              )}
              <AccountMenu identity={identity} compact={resolvedVariant === "auth"} />
              <MobileMenu config={config} identity={identity} pathname={location.pathname} isWorkspace={false} />
            </div>
          </>
        )}
      </div>
    </header>
  );
}
