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
import { homepageNavigation, homepageResourceNavigation } from "../../content/siteNavigation";
import useHeaderIdentity from "./useHeaderIdentity";
import { getHeaderVariantForPath } from "./siteHeaderIdentity";
import SkipToMainContent from "./SkipToMainContent";

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
  { to: "/legal", label: "Legal", staticPage: true },
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
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-[8px] px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
    >
      <span className={cn(
        "flex items-center justify-center overflow-hidden rounded-[8px] border border-[var(--ds-border-subtle)] bg-transparent",
        compact ? "h-7 w-7" : "h-8 w-8"
      )}>
        <img src="/nexus-mark.svg" alt="" className={cn("object-contain", compact ? "h-5 w-5" : "h-6 w-6")} />
      </span>
      {!compact && <span className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--ds-text)]">NexusRBX</span>}
    </Link>
  );
}

function HeaderAvatar({ identity, className }) {
  return (
    <Avatar className={cn("h-8 w-8 border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-2)]", className)}>
      {identity.avatar.src && <AvatarImage src={identity.avatar.src} alt="" />}
      <AvatarFallback className="bg-[var(--ds-surface-3)] text-xs font-semibold text-[var(--ds-accent)]">
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
          "inline-flex h-11 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
          active && "bg-[var(--ds-fill-selected)] text-[var(--ds-text)]"
        )}
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 text-[var(--ds-text-muted)] transition-transform", open && "rotate-180")} />
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
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-56 origin-top-left rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-overlay)] p-1.5 text-[var(--ds-text)] shadow-[var(--ds-shadow-overlay)]"
        >
          {items.map((item) => (
            <DestinationLink
              key={item.to}
              item={item}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(
                "block min-h-11 rounded-lg px-3 py-3 text-sm text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus:bg-[var(--ds-fill-hover)] focus:text-[var(--ds-text)] focus:outline-none",
                isActivePath(pathname, item.to) && "bg-[var(--ds-fill-selected)] text-[var(--ds-text)]"
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
            "inline-flex h-11 items-center rounded-full px-3 text-[13px] font-medium text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
            isActivePath(pathname, item.to) && "bg-[var(--ds-fill-selected)] text-[var(--ds-text)]"
          )}
        >
          {item.label}
        </DestinationLink>
      ))}
      <NavDisclosure label="Resources" items={RESOURCE_LINKS} pathname={pathname} />
    </nav>
  );
}

function HomepageDesktopNavigation({ pathname }) {
  return (
    <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Homepage navigation">
      {homepageNavigation.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="inline-flex h-11 items-center rounded-[7px] px-3 text-[13px] font-medium text-[var(--ds-text-secondary)] transition-[background-color,color] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
        >
          {item.label}
        </a>
      ))}
      <NavDisclosure label="Resources" items={homepageResourceNavigation} pathname={pathname} />
    </nav>
  );
}

function SupportCount({ count }) {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-[var(--ds-accent)] px-1.5 py-0.5 text-center text-[11px] font-bold text-[var(--ds-accent-foreground)]">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function AccountMenu({ identity, compact = false }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  useDismissibleMenu(open, setOpen, buttonRef, menuRef);

  if (!identity.authReady) return <Skeleton className="h-9 w-24 rounded-md bg-[var(--ds-fill-active)]" />;
  if (!identity.user) return null;

  const robloxLabel = identity.robloxLoading
    ? "Checking Roblox connection"
    : identity.robloxConnected
      ? `Roblox: ${identity.robloxUsername || "connected"}`
      : "Roblox not connected";
  const menuLinkClass = "flex min-h-11 items-center rounded-lg px-3 text-sm text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus:bg-[var(--ds-fill-hover)] focus:text-[var(--ds-text)] focus:outline-none";

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-11 items-center gap-2 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-1.5 text-sm text-[var(--ds-text-secondary)] hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)]"
      >
        <HeaderAvatar identity={identity} />
        {!compact && <span className="hidden max-w-28 truncate pr-1 xl:block">{identity.displayName}</span>}
        {!compact && <ChevronDown className={cn("hidden h-3.5 w-3.5 text-[var(--ds-text-muted)] xl:block", open && "rotate-180")} />}
        {identity.supportUnreadCount > 0 && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--ds-surface-overlay)] bg-[var(--ds-accent)]" aria-label={`${identity.supportUnreadCount} unread support messages`} />
        )}
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(21rem,calc(100vw-1.5rem))] origin-top-right rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-overlay)] p-2 text-[var(--ds-text)] shadow-[var(--ds-shadow-overlay)]"
        >
          <div className="px-3 pb-3 pt-2">
            <div className="truncate text-sm font-semibold text-[var(--ds-text)]">{identity.displayName}</div>
            <div className="mt-0.5 truncate text-xs text-[var(--ds-text-muted)]">{identity.email}</div>
            <div className="mt-3 text-xs text-[var(--ds-text-secondary)]">
              <span>{identity.planLabel} plan</span>
            </div>
          </div>
          <Separator className="mb-1 bg-[var(--ds-border-subtle)]" />
          <Link role="menuitem" to="/billing" onClick={() => setOpen(false)} className={menuLinkClass}>Billing</Link>
          <Link role="menuitem" to="/settings" onClick={() => setOpen(false)} className={menuLinkClass}>Settings</Link>
          <Link role="menuitem" to="/support" onClick={() => setOpen(false)} className={menuLinkClass}>
            Support <SupportCount count={identity.supportUnreadCount} />
          </Link>
          {identity.isSupportStaff && (
            <Link role="menuitem" to="/admin/support" onClick={() => setOpen(false)} className={menuLinkClass}>Staff support</Link>
          )}
          <Separator className="my-1 bg-[var(--ds-border-subtle)]" />
          <div className="rounded-md px-3 py-2 text-xs text-[var(--ds-text-secondary)]">
            <div className="flex items-center justify-between gap-3">
              <span>{robloxLabel}</span>
              <button
                type="button"
                disabled={Boolean(identity.robloxAction)}
                onClick={identity.robloxConnected ? identity.reconnectRoblox : identity.connectRoblox}
                className="min-h-11 shrink-0 rounded-md px-2 font-medium text-[var(--ds-accent)] hover:text-[var(--ds-accent-hover)] disabled:opacity-50"
              >
                {identity.robloxAction ? "Opening…" : identity.robloxConnected ? "Reconnect" : "Connect"}
              </button>
            </div>
            {identity.robloxError && (
              <div className="mt-2 flex gap-2 text-[var(--ds-warning)]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{identity.robloxError}</span>
              </div>
            )}
          </div>
          <Separator className="my-1 bg-[var(--ds-border-subtle)]" />
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              void identity.signOutUser();
            }}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-[var(--ds-danger)] hover:bg-[color-mix(in_srgb,var(--ds-danger)_10%,transparent)] focus:bg-[color-mix(in_srgb,var(--ds-danger)_10%,transparent)] focus:outline-none"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function DesktopIdentityActions({ identity, checkout = false, homepage = false }) {
  if (!identity.authReady) {
    return <div className="hidden items-center gap-2 lg:flex"><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-28" /></div>;
  }
  if (identity.user) {
    return (
      <div className="hidden items-center gap-2 lg:flex">
        {!checkout && (
          <Button asChild size="sm" className="min-h-11 rounded-[8px] bg-[var(--ds-text)] text-[var(--ds-bg-canvas)] hover:bg-[var(--ds-text-secondary)] active:scale-[0.985]">
            {homepage ? <Link to="/ai">Start building</Link> : <Link to="/ai">Open workspace</Link>}
          </Button>
        )}
        <AccountMenu identity={identity} compact={checkout} />
      </div>
    );
  }
  return (
    <div className="hidden items-center gap-2 lg:flex">
      <Button asChild size="sm" variant="ghost" className="min-h-11 text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]">
        <Link to="/signin">Sign in</Link>
      </Button>
      {!checkout && (
        <Button asChild size="sm" className="min-h-11 rounded-[8px] bg-[var(--ds-text)] text-[var(--ds-bg-canvas)] hover:bg-[var(--ds-text-secondary)] active:scale-[0.985]">
          {homepage ? <Link to="/ai">Start building</Link> : <Link to="/signup">Start free</Link>}
        </Button>
      )}
    </div>
  );
}

function MobileDestination({ item, pathname }) {
  const className = cn(
    "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)]",
    isActivePath(pathname, item.to) && "bg-[var(--ds-fill-selected)] text-[var(--ds-text)]"
  );
  return (
    <SheetClose asChild>
      {item.staticPage
        ? <a href={item.to} className={className}>{item.label}</a>
        : <Link to={item.to} className={className}>{item.label}</Link>}
    </SheetClose>
  );
}

function MobileMenu({ identity, pathname, workspace = false, checkout = false, homepage = false }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-full border border-[var(--ds-border-strong)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] lg:hidden" aria-label="Open navigation">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto border-[var(--ds-border)] bg-[var(--ds-surface-overlay)] text-[var(--ds-text)]">
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="text-[var(--ds-text)]">NexusRBX</SheetTitle>
          <SheetDescription className="text-[var(--ds-text-muted)]">{checkout ? "Secure checkout" : workspace ? "Workspace menu" : "Site navigation"}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {identity.authReady && identity.user ? (
            <div className="flex items-center gap-3 border-b border-[var(--ds-border-subtle)] pb-5">
              <HeaderAvatar identity={identity} className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{identity.displayName}</div>
                <div className="truncate text-xs text-[var(--ds-text-muted)]">{identity.email}</div>
              </div>
            </div>
          ) : identity.authReady ? (
            <div className={cn("grid gap-2", homepage ? "grid-cols-1" : "grid-cols-2")}>
              <SheetClose asChild><Button asChild variant="outline" className="min-h-11 border-[var(--ds-border)] bg-transparent text-[var(--ds-text)]"><Link to="/signin">Sign in</Link></Button></SheetClose>
              {!homepage && <SheetClose asChild><Button asChild className="min-h-11 bg-[var(--ds-text)] text-[var(--ds-bg-canvas)] hover:bg-[var(--ds-text-secondary)]"><Link to="/signup">Start free</Link></Button></SheetClose>}
            </div>
          ) : <Skeleton className="h-12 w-full" />}

          {homepage ? (
            <nav className="space-y-1" aria-label="Mobile homepage navigation">
              {homepageNavigation.map((item) => (
                <SheetClose asChild key={item.href}>
                  <a href={item.href} className="flex min-h-11 items-center rounded-[7px] px-3 text-sm font-medium text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)]">
                    {item.label}
                  </a>
                </SheetClose>
              ))}
              <div className="mt-3 border-t border-[var(--ds-border-subtle)] pt-3">
                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ds-text-muted)]">Resources</div>
                {homepageResourceNavigation.map((item) => <MobileDestination key={item.to} item={item} pathname={pathname} />)}
              </div>
              <SheetClose asChild>
                <Button asChild className="mt-3 min-h-11 w-full rounded-[8px] bg-[var(--ds-text)] text-[var(--ds-bg-canvas)] hover:bg-[var(--ds-text-secondary)]">
                  <Link to="/ai">Start building</Link>
                </Button>
              </SheetClose>
            </nav>
          ) : !workspace && !checkout && (
            <nav className="space-y-4" aria-label="Mobile navigation">
              <div>
                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ds-text-muted)]">Product</div>
                {PRODUCT_LINKS.map((item) => <MobileDestination key={item.to} item={item} pathname={pathname} />)}
              </div>
              <div>
                {PRIMARY_LINKS.map((item) => <MobileDestination key={item.to} item={item} pathname={pathname} />)}
              </div>
              <div>
                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ds-text-muted)]">Resources</div>
                {RESOURCE_LINKS.map((item) => <MobileDestination key={item.to} item={item} pathname={pathname} />)}
              </div>
            </nav>
          )}

          {identity.user && (
            <div className="border-t border-[var(--ds-border-subtle)] pt-4">
              {!checkout && !homepage && <MobileDestination item={{ to: "/ai", label: "Open workspace" }} pathname={pathname} />}
              <MobileDestination item={{ to: "/billing", label: "Billing" }} pathname={pathname} />
              <MobileDestination item={{ to: "/settings", label: "Settings" }} pathname={pathname} />
              <SheetClose asChild>
                <Link to="/support" className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)]">
                  Support <SupportCount count={identity.supportUnreadCount} />
                </Link>
              </SheetClose>
              {identity.isSupportStaff && <MobileDestination item={{ to: "/admin/support", label: "Staff support" }} pathname={pathname} />}
              <button type="button" onClick={() => void identity.signOutUser()} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-[var(--ds-danger)] hover:bg-[color-mix(in_srgb,var(--ds-danger)_10%,transparent)]">
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
  const isHomepage = location.pathname === "/" && !isWorkspace && !isCheckout;
  const identity = useHeaderIdentity({ robloxStatusOverride, robloxLoadingOverride });

  const workspaceControls = useMemo(() => (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-2 xl:gap-3">{workspaceLeft}</div>
      <div className="flex min-w-0 shrink-0 items-center gap-2 xl:gap-3">{workspaceRight}</div>
    </>
  ), [workspaceLeft, workspaceRight]);

  return (
    <header className={cn(
      "z-50 text-[var(--ds-text)]",
      isWorkspace
        ? "relative z-30 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)]"
        : isHomepage
          ? "sticky top-0 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)]"
          : "sticky top-0 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)]",
      className
    )} data-overlay={isHomepage ? "true" : undefined}>
      {location.pathname === "/" ? <SkipToMainContent /> : null}
      <div className={cn(
        "flex min-w-0 items-center justify-between gap-2 xl:gap-3",
        isWorkspace
          ? "px-3 py-1.5 sm:px-4"
          : isHomepage
            ? "mx-auto h-16 max-w-[88rem] px-4 sm:px-6 lg:px-8"
            : "mx-auto h-14 max-w-[82rem] px-4 sm:px-6 lg:px-8"
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
              <span className="hidden border-l border-[var(--ds-border-subtle)] pl-4 text-sm text-[var(--ds-text-muted)] sm:block">Review and checkout</span>
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
              {isHomepage ? <HomepageDesktopNavigation pathname={location.pathname} /> : <DesktopNavigation pathname={location.pathname} />}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <DesktopIdentityActions identity={identity} homepage={isHomepage} />
              <MobileMenu identity={identity} pathname={location.pathname} homepage={isHomepage} />
            </div>
          </>
        )}
      </div>
    </header>
  );
}
