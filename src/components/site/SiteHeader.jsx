import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, ChevronDown, LogOut, Menu } from "lib/icons";

import { Avatar, AvatarFallback, AvatarImage } from "../shadcn/avatar";
import { Button } from "../shadcn/button";
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

const PRODUCT_LINKS = [
  { to: "/ai", label: "AI Workspace" },
  { to: "/tools/icon-generator", label: "Icon Generator" },
  { to: "/icons-market", label: "Creator Store" },
];

const PRIMARY_LINKS = [
  { to: "/docs", label: "Docs", staticPage: true },
  { to: "/pricing", label: "Pricing", staticPage: true },
  { to: "/downloads", label: "Downloads" },
];

const RESOURCE_LINKS = [
  { to: "/contact", label: "Contact" },
  { to: "/support", label: "Support" },
  { to: "/terms", label: "Legal" },
];

function isActivePath(pathname, target) {
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(`${target}/`);
}

function DestinationLink({ item, className, children, ...props }) {
  if (item.staticPage) {
    return <a href={item.to} className={className} {...props}>{children}</a>;
  }
  return <Link to={item.to} className={className} {...props}>{children}</Link>;
}

function Brand({ compact = false }) {
  return (
    <Link
      to="/"
      aria-label="NexusRBX home"
      className="inline-flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e0c2]"
    >
      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-[#11151d]">
        <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
      </span>
      {!compact && <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">NexusRBX</span>}
    </Link>
  );
}

function HeaderAvatar({ identity, className }) {
  return (
    <Avatar className={cn("h-8 w-8 border border-white/10 bg-[#11151d]", className)}>
      {identity.avatar.src && <AvatarImage src={identity.avatar.src} alt="" />}
      <AvatarFallback className="bg-[#111827] text-xs font-semibold text-[#00e0c2]">
        {identity.avatar.fallback}
      </AvatarFallback>
    </Avatar>
  );
}

function useDismissibleMenu(open, setOpen, buttonRef, menuRef) {
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (buttonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [buttonRef, menuRef, open, setOpen]);
}

function NavDisclosure({ label, items, pathname }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const active = items.some((item) => isActivePath(pathname, item.to));
  useDismissibleMenu(open, setOpen, buttonRef, menuRef);

  const focusFirstItem = () => {
    window.requestAnimationFrame(() => menuRef.current?.querySelector("a")?.focus());
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            focusFirstItem();
          }
        }}
        className={cn(
          "inline-flex h-10 items-center gap-1 rounded-md px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e0c2]",
          active && "text-white"
        )}
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          onKeyDown={(event) => {
            const links = Array.from(menuRef.current?.querySelectorAll("a") || []);
            const index = links.indexOf(document.activeElement);
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const direction = event.key === "ArrowDown" ? 1 : -1;
              links[(index + direction + links.length) % links.length]?.focus();
            }
          }}
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-56 rounded-lg border border-white/10 bg-[#0b0e14] p-1.5 shadow-2xl"
        >
          {items.map((item) => (
            <DestinationLink
              key={item.to}
              item={item}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-md px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white focus:bg-white/[0.06] focus:text-white focus:outline-none",
                isActivePath(pathname, item.to) && "bg-white/[0.05] text-white"
              )}
            >
              {item.label}
            </DestinationLink>
          ))}
        </div>
      )}
    </div>
  );
}

function DesktopNavigation({ pathname }) {
  return (
    <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary navigation">
      <NavDisclosure label="Product" items={PRODUCT_LINKS} pathname={pathname} />
      {PRIMARY_LINKS.map((item) => (
        <DestinationLink
          key={item.to}
          item={item}
          aria-current={isActivePath(pathname, item.to) ? "page" : undefined}
          className={cn(
            "inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e0c2]",
            isActivePath(pathname, item.to) && "text-white"
          )}
        >
          {item.label}
        </DestinationLink>
      ))}
      <NavDisclosure label="Resources" items={RESOURCE_LINKS} pathname={pathname} />
    </nav>
  );
}

function SupportCount({ count }) {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-[#00e0c2] px-1.5 py-0.5 text-center text-[11px] font-bold text-[#04100e]">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function AccountMenu({ identity, compact = false }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  useDismissibleMenu(open, setOpen, buttonRef, menuRef);

  if (!identity.authReady) return <Skeleton className="h-9 w-24 rounded-md bg-white/10" />;
  if (!identity.user) return null;

  const robloxLabel = identity.robloxLoading
    ? "Checking Roblox connection"
    : identity.robloxConnected
      ? `Roblox: ${identity.robloxUsername || "connected"}`
      : "Roblox not connected";
  const menuLinkClass = "flex min-h-10 items-center rounded-md px-3 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white focus:bg-white/[0.06] focus:text-white focus:outline-none";

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-1.5 text-sm text-slate-200 hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e0c2]"
      >
        <HeaderAvatar identity={identity} />
        {!compact && <span className="hidden max-w-28 truncate pr-1 xl:block">{identity.displayName}</span>}
        {!compact && <ChevronDown className={cn("hidden h-3.5 w-3.5 text-slate-500 xl:block", open && "rotate-180")} />}
        {identity.supportUnreadCount > 0 && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#07090d] bg-[#00e0c2]" aria-label={`${identity.supportUnreadCount} unread support messages`} />
        )}
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(21rem,calc(100vw-1.5rem))] rounded-lg border border-white/10 bg-[#0b0e14] p-2 shadow-2xl"
        >
          <div className="px-3 pb-3 pt-2">
            <div className="truncate text-sm font-semibold text-white">{identity.displayName}</div>
            <div className="mt-0.5 truncate text-xs text-slate-500">{identity.email}</div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
              <span>{identity.planLabel} plan</span>
              <span className="truncate">{identity.tokensLabel}</span>
            </div>
          </div>
          <Separator className="mb-1 bg-white/10" />
          <Link role="menuitem" to="/billing" onClick={() => setOpen(false)} className={menuLinkClass}>Billing</Link>
          <Link role="menuitem" to="/settings" onClick={() => setOpen(false)} className={menuLinkClass}>Settings</Link>
          <Link role="menuitem" to="/support" onClick={() => setOpen(false)} className={menuLinkClass}>
            Support <SupportCount count={identity.supportUnreadCount} />
          </Link>
          {identity.isSupportStaff && (
            <Link role="menuitem" to="/admin/support" onClick={() => setOpen(false)} className={menuLinkClass}>Staff support</Link>
          )}
          <Separator className="my-1 bg-white/10" />
          <div className="rounded-md px-3 py-2 text-xs text-slate-400">
            <div className="flex items-center justify-between gap-3">
              <span>{robloxLabel}</span>
              <button
                type="button"
                disabled={Boolean(identity.robloxAction)}
                onClick={identity.robloxConnected ? identity.reconnectRoblox : identity.connectRoblox}
                className="shrink-0 font-medium text-[#00e0c2] hover:text-[#51efd9] disabled:opacity-50"
              >
                {identity.robloxAction ? "Opening…" : identity.robloxConnected ? "Reconnect" : "Connect"}
              </button>
            </div>
            {identity.robloxError && (
              <div className="mt-2 flex gap-2 text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{identity.robloxError}</span>
              </div>
            )}
          </div>
          <Separator className="my-1 bg-white/10" />
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              void identity.signOutUser();
            }}
            className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-red-200 hover:bg-red-500/10 focus:bg-red-500/10 focus:outline-none"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function DesktopIdentityActions({ identity, checkout = false }) {
  if (!identity.authReady) {
    return <div className="hidden items-center gap-2 lg:flex"><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-28" /></div>;
  }
  if (identity.user) {
    return (
      <div className="hidden items-center gap-2 lg:flex">
        {!checkout && (
          <Button asChild size="sm" className="bg-[#00e0c2] text-[#04100e] hover:bg-[#51efd9]">
            <Link to="/ai">Open workspace</Link>
          </Button>
        )}
        <AccountMenu identity={identity} compact={checkout} />
      </div>
    );
  }
  return (
    <div className="hidden items-center gap-2 lg:flex">
      <Button asChild size="sm" variant="ghost" className="text-slate-300 hover:bg-white/[0.05] hover:text-white">
        <Link to="/signin">Sign in</Link>
      </Button>
      {!checkout && (
        <Button asChild size="sm" className="bg-[#00e0c2] text-[#04100e] hover:bg-[#51efd9]">
          <Link to="/signup">Start free</Link>
        </Button>
      )}
    </div>
  );
}

function MobileDestination({ item, pathname }) {
  const className = cn(
    "flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-slate-200 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e0c2]",
    isActivePath(pathname, item.to) && "bg-white/[0.05] text-white"
  );
  return (
    <SheetClose asChild>
      {item.staticPage
        ? <a href={item.to} className={className}>{item.label}</a>
        : <Link to={item.to} className={className}>{item.label}</Link>}
    </SheetClose>
  );
}

function MobileMenu({ identity, pathname, workspace = false, checkout = false }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="text-slate-300 hover:bg-white/[0.06] hover:text-white lg:hidden" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto border-white/10 bg-[#0b0e14] text-white">
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="text-white">NexusRBX</SheetTitle>
          <SheetDescription className="text-slate-400">{checkout ? "Secure checkout" : workspace ? "Workspace menu" : "Site navigation"}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {identity.authReady && identity.user ? (
            <div className="flex items-center gap-3 border-b border-white/10 pb-5">
              <HeaderAvatar identity={identity} className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{identity.displayName}</div>
                <div className="truncate text-xs text-slate-500">{identity.email}</div>
              </div>
            </div>
          ) : identity.authReady ? (
            <div className="grid grid-cols-2 gap-2">
              <SheetClose asChild><Button asChild variant="outline" className="border-white/10 bg-transparent text-white"><Link to="/signin">Sign in</Link></Button></SheetClose>
              <SheetClose asChild><Button asChild className="bg-[#00e0c2] text-[#04100e]"><Link to="/signup">Start free</Link></Button></SheetClose>
            </div>
          ) : <Skeleton className="h-12 w-full" />}

          {!workspace && !checkout && (
            <nav className="space-y-4" aria-label="Mobile navigation">
              <div>
                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Product</div>
                {PRODUCT_LINKS.map((item) => <MobileDestination key={item.to} item={item} pathname={pathname} />)}
              </div>
              <div>
                {PRIMARY_LINKS.map((item) => <MobileDestination key={item.to} item={item} pathname={pathname} />)}
              </div>
              <div>
                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Resources</div>
                {RESOURCE_LINKS.map((item) => <MobileDestination key={item.to} item={item} pathname={pathname} />)}
              </div>
            </nav>
          )}

          {identity.user && (
            <div className="border-t border-white/10 pt-4">
              {!checkout && <MobileDestination item={{ to: "/ai", label: "Open workspace" }} pathname={pathname} />}
              <MobileDestination item={{ to: "/billing", label: "Billing" }} pathname={pathname} />
              <MobileDestination item={{ to: "/settings", label: "Settings" }} pathname={pathname} />
              <SheetClose asChild>
                <Link to="/support" className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-slate-200 hover:bg-white/[0.06]">
                  Support <SupportCount count={identity.supportUnreadCount} />
                </Link>
              </SheetClose>
              {identity.isSupportStaff && <MobileDestination item={{ to: "/admin/support", label: "Staff support" }} pathname={pathname} />}
              <button type="button" onClick={() => void identity.signOutUser()} className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-red-200 hover:bg-red-500/10">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
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
  const isWorkspace = resolvedVariant === "workspace";
  const isCheckout = resolvedVariant === "checkout";
  const identity = useHeaderIdentity({ robloxStatusOverride, robloxLoadingOverride });

  const workspaceControls = useMemo(() => (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-3">{workspaceLeft}</div>
      <div className="flex min-w-0 shrink-0 items-center gap-3">{workspaceRight}</div>
    </>
  ), [workspaceLeft, workspaceRight]);

  return (
    <header className={cn(
      "z-50 border-b border-white/10 bg-[#07090d]/95 text-white",
      isWorkspace ? "relative z-30 bg-black/30" : "sticky top-0",
      className
    )}>
      <div className={cn(
        "flex min-w-0 items-center justify-between gap-3",
        isWorkspace ? "px-3 py-2.5 sm:px-4" : "mx-auto h-16 max-w-[82rem] px-4 sm:px-6 lg:px-8"
      )}>
        {isWorkspace ? (
          <>
            <div className="hidden shrink-0 sm:block"><Brand compact /></div>
            {workspaceControls}
            <div className="hidden lg:block"><AccountMenu identity={identity} compact /></div>
            <MobileMenu identity={identity} pathname={location.pathname} workspace />
          </>
        ) : isCheckout ? (
          <>
            <div className="flex min-w-0 items-center gap-4">
              <Brand />
              <span className="hidden border-l border-white/10 pl-4 text-sm text-slate-400 sm:block">Review and checkout</span>
            </div>
            <div className="flex items-center gap-2">
              <DesktopIdentityActions identity={identity} checkout />
              <MobileMenu identity={identity} pathname={location.pathname} checkout />
            </div>
          </>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-8">
              <Brand />
              <DesktopNavigation pathname={location.pathname} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <DesktopIdentityActions identity={identity} />
              <MobileMenu identity={identity} pathname={location.pathname} />
            </div>
          </>
        )}
      </div>
    </header>
  );
}
