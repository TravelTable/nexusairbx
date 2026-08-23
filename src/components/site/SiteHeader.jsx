import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import UniversalHeaderFrame from "../universal/UniversalHeaderFrame";
import WorkspaceRibbon from "../universal/WorkspaceRibbon";
import { universalPrimaryNavigation, universalSiteIndexSections } from "../../content/universalNavigation";
import useHeaderIdentity from "./useHeaderIdentity";
import { getHeaderVariantForPath } from "./siteHeaderIdentity";
import SkipToMainContent from "./SkipToMainContent";
import styles from "./SiteHeaderLedger.module.css";

const STATIC_PUBLIC_PATHS = ["/docs", "/pricing", "/legal"];

function AppLink({ to, children, ...props }) {
  if (STATIC_PUBLIC_PATHS.some((path) => to === path || to.startsWith(`${path}/`))) {
    return <a href={to} {...props}>{children}</a>;
  }
  return <Link to={to} {...props}>{children}</Link>;
}

function useDismissibleMenu(open, setOpen, buttonRef, menuRef) {
  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (buttonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [buttonRef, menuRef, open, setOpen]);
}

function UnreadCount({ count }) {
  if (!count) return null;
  return <span className={styles.unread} aria-label={`${count} unread support messages`}>{count > 99 ? "99+" : count}</span>;
}

function AccountControl({ identity, mobile = false, showWorkspaceAction = true }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  useDismissibleMenu(open, setOpen, buttonRef, menuRef);

  const groupClass = mobile
    ? `${styles.accountGroup} ${styles.accountGroupMobile}`
    : styles.accountGroup;

  if (!identity.authReady) {
    return <div className={`${groupClass} ${styles.checking}`} role="status">ACCOUNT / CHECKING</div>;
  }

  if (!identity.user) {
    return (
      <div className={groupClass}>
        <AppLink to="/signin" className={styles.textAction}>Sign in</AppLink>
        <AppLink to="/signup" className={`${styles.textAction} ${styles.primaryAction}`}>Start free</AppLink>
      </div>
    );
  }

  const robloxLabel = identity.robloxLoading
    ? "Checking Roblox connection"
    : identity.robloxConnected
      ? `Roblox / ${identity.robloxUsername || "connected"}`
      : "Roblox / not connected";

  return (
    <div className={groupClass}>
      {showWorkspaceAction ? <AppLink to="/ai" className={`${styles.textAction} ${styles.primaryAction}`}>Open workspace</AppLink> : null}
      <div className={styles.accountRoot}>
        <button
          ref={buttonRef}
          type="button"
          className={styles.accountButton}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {identity.displayName || "Account"}
          <UnreadCount count={identity.supportUnreadCount} />
        </button>
        {open ? (
          <div
            ref={menuRef}
            role="menu"
            aria-label="Account menu"
            className={`${styles.accountMenu} ${mobile ? styles.accountMenuMobile : ""}`}
          >
            <div className={styles.accountIdentity}>
              <strong>{identity.displayName}</strong>
              <span>{identity.email}</span>
              <span>{identity.planLabel} access</span>
            </div>
            <nav>
              <AppLink role="menuitem" to="/billing" className={styles.menuItem} onClick={() => setOpen(false)}>Billing</AppLink>
              <AppLink role="menuitem" to="/settings" className={styles.menuItem} onClick={() => setOpen(false)}>Settings</AppLink>
              <AppLink role="menuitem" to="/support" className={styles.menuItem} onClick={() => setOpen(false)}>
                <span>Support</span><UnreadCount count={identity.supportUnreadCount} />
              </AppLink>
              {identity.isSupportStaff ? (
                <AppLink role="menuitem" to="/admin/support" className={styles.menuItem} onClick={() => setOpen(false)}>Staff support</AppLink>
              ) : null}
              <button
                role="menuitem"
                type="button"
                className={styles.signOut}
                onClick={() => {
                  setOpen(false);
                  void identity.signOutUser();
                }}
              >
                Sign out
              </button>
            </nav>
            <div className={styles.robloxRecord}>
              <span>{robloxLabel}</span>
              <button
                type="button"
                disabled={Boolean(identity.robloxAction)}
                onClick={identity.robloxConnected ? identity.reconnectRoblox : identity.connectRoblox}
              >
                {identity.robloxAction ? "Opening…" : identity.robloxConnected ? "Reconnect" : "Connect"}
              </button>
              {identity.robloxError ? <span className={styles.error}>{identity.robloxError}</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SiteHeader({
  variant,
  workspaceLeft = null,
  workspaceRight = null,
  robloxStatusOverride,
  robloxLoadingOverride,
  className = "",
  skipTargetId = "main-content",
}) {
  const location = useLocation();
  const resolvedVariant = variant || getHeaderVariantForPath(location.pathname);
  const identity = useHeaderIdentity({ robloxStatusOverride, robloxLoadingOverride });

  if (resolvedVariant === "workspace") {
    return (
      <WorkspaceRibbon
        LinkComponent={AppLink}
        className={className}
        label={location.pathname.startsWith("/script/") ? "SCRIPT RECORD / REVIEW" : "QUICK SCRIPT / CURRENT TARGET"}
        left={workspaceLeft}
        right={(
          <>
            {workspaceRight}
            <AccountControl identity={identity} showWorkspaceAction={false} />
          </>
        )}
      />
    );
  }

  return (
    <UniversalHeaderFrame
      pathname={location.pathname}
      navigation={universalPrimaryNavigation}
      siteIndexSections={universalSiteIndexSections}
      LinkComponent={AppLink}
      accountSlot={<AccountControl identity={identity} />}
      mobileAccountSlot={<AccountControl identity={identity} mobile />}
      before={<SkipToMainContent targetId={skipTargetId} />}
    />
  );
}
