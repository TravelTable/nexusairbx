"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "../../lib/icons";
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
  routeSlot = null,
  before = null,
}) {
  const [indexOpen, setIndexOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleCommandShortcut = (event) => {
      if (!(
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ))
        return;
      event.preventDefault();
      searchButtonRef.current = document.activeElement;
      openSearch();
    };
    document.addEventListener("keydown", handleCommandShortcut);
    return () => document.removeEventListener("keydown", handleCommandShortcut);
  }, [openSearch]);

  return (
    <>
      <header
        className={styles.header}
        data-universal-header
        data-scrolled={scrolled ? "true" : undefined}
      >
        {before}
        <div className={styles.frame}>
          <div className={styles.left}>
            <UniversalBrand LinkComponent={LinkComponent} />
            <nav className={styles.navigation} aria-label="Primary navigation">
              {navigation.map((item) =>
                renderLink(
                  LinkComponent,
                  item.href,
                  {
                    key: item.href,
                    className: styles.navLink,
                    "aria-current": isCurrent(resolvedPathname, item.href)
                      ? "page"
                      : undefined,
                  },
                  item.label,
                ),
              )}
            </nav>
          </div>
          <div className={styles.right}>
            <button
              ref={searchButtonRef}
              type="button"
              className={styles.searchButton}
              aria-label="Search NexusRBX"
              aria-haspopup="dialog"
              aria-expanded={searchOpen}
              onClick={(event) => {
                searchButtonRef.current = event.currentTarget;
                openSearch();
              }}
            >
              <Search
                className={styles.searchIcon}
                aria-hidden="true"
                size={15}
                strokeWidth={2}
              />
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
              <span>Tools</span>
              <ChevronDown
                className={styles.indexChevron}
                aria-hidden="true"
                size={13}
                strokeWidth={2}
              />
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
              <span>Tools</span>
              <ChevronDown
                className={styles.indexChevron}
                aria-hidden="true"
                size={13}
                strokeWidth={2}
              />
            </button>
            {routeSlot ? <div className={styles.routeSlot}>{routeSlot}</div> : null}
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
