"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import UniversalBrand, { renderLink } from "./UniversalBrand";
import UniversalCommandMenu from "./UniversalCommandMenu";
import UniversalSiteIndex from "./UniversalSiteIndex";
import styles from "./UniversalHeader.module.css";

function isCurrent(pathname, href) {
  if (!pathname || !href.startsWith("/")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function UniversalHeaderFrame({
  pathname = "",
  navigation,
  siteIndexSections,
  LinkComponent = "a",
  accountSlot = null,
  mobileAccountSlot = accountSlot,
  compactAccountSlot = mobileAccountSlot,
  before = null,
}) {
  const [indexOpen, setIndexOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [resolvedPathname, setResolvedPathname] = useState(pathname);
  const indexButtonRef = useRef(null);
  const searchButtonRef = useRef(null);
  const closeIndex = useCallback(() => setIndexOpen(false), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const openSearch = useCallback(() => {
    setIndexOpen(false);
    setSearchOpen(true);
  }, []);

  useEffect(() => {
    if (pathname || typeof window === "undefined") return;
    setResolvedPathname(window.location.pathname || "");
  }, [pathname]);

  useEffect(() => {
    const handleCommandShortcut = (event) => {
      if (!((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) return;
      event.preventDefault();
      searchButtonRef.current = document.activeElement;
      openSearch();
    };
    document.addEventListener("keydown", handleCommandShortcut);
    return () => document.removeEventListener("keydown", handleCommandShortcut);
  }, [openSearch]);

  return (
    <>
      <header className={styles.header} data-universal-header>
        {before}
        <div className={styles.frame}>
          <div className={styles.left}>
            <UniversalBrand LinkComponent={LinkComponent} />
            <nav className={styles.navigation} aria-label="Primary navigation">
              {navigation.map((item) => renderLink(
                LinkComponent,
                item.href,
                {
                  key: item.href,
                  className: styles.navLink,
                  "aria-current": isCurrent(resolvedPathname, item.href) ? "page" : undefined,
                },
                item.label,
              ))}
            </nav>
          </div>
          <div className={styles.right}>
            <button
              ref={searchButtonRef}
              type="button"
              className={styles.searchButton}
              aria-haspopup="dialog"
              aria-expanded={searchOpen}
              onClick={(event) => {
                searchButtonRef.current = event.currentTarget;
                openSearch();
              }}
            >
              <span aria-hidden="true">⌕</span>
              <span className={styles.searchLabel}>Search</span>
              <kbd className={styles.searchShortcut}>⌘K</kbd>
            </button>
            <div className={styles.desktopRight}>{accountSlot}</div>
            <div className={styles.mobileAccount}>{compactAccountSlot}</div>
            <button
              type="button"
              className={`${styles.indexButton} ${styles.mobileIndex}`}
              aria-expanded={indexOpen}
              aria-haspopup="dialog"
              onClick={(event) => {
                indexButtonRef.current = event.currentTarget;
                setSearchOpen(false);
                setIndexOpen(true);
              }}
            >
              Tools
            </button>
            <button
              type="button"
              className={`${styles.indexButton} ${styles.desktopRight}`}
              aria-expanded={indexOpen}
              aria-haspopup="dialog"
              onClick={(event) => {
                indexButtonRef.current = event.currentTarget;
                setSearchOpen(false);
                setIndexOpen(true);
              }}
            >
              Tools
            </button>
          </div>
        </div>
      </header>
      <UniversalSiteIndex
        open={indexOpen}
        onClose={closeIndex}
        sections={siteIndexSections}
        pathname={resolvedPathname}
        LinkComponent={LinkComponent}
        accountSlot={accountSlot}
        mobileAccountSlot={mobileAccountSlot}
        openerRef={indexButtonRef}
      />
      <UniversalCommandMenu
        open={searchOpen}
        onClose={closeSearch}
        sections={siteIndexSections}
        LinkComponent={LinkComponent}
        openerRef={searchButtonRef}
      />
    </>
  );
}
