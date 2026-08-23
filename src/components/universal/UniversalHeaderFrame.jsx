"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import UniversalBrand, { renderLink } from "./UniversalBrand";
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
  before = null,
}) {
  const [indexOpen, setIndexOpen] = useState(false);
  const [resolvedPathname, setResolvedPathname] = useState(pathname);
  const indexButtonRef = useRef(null);
  const closeIndex = useCallback(() => setIndexOpen(false), []);

  useEffect(() => {
    if (pathname || typeof window === "undefined") return;
    setResolvedPathname(window.location.pathname || "");
  }, [pathname]);

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
            <div className={styles.desktopRight}>{accountSlot}</div>
            <button
              type="button"
              className={`${styles.indexButton} ${styles.mobileIndex}`}
              aria-expanded={indexOpen}
              aria-haspopup="dialog"
              onClick={(event) => {
                indexButtonRef.current = event.currentTarget;
                setIndexOpen(true);
              }}
            >
              SITE INDEX
            </button>
            <button
              type="button"
              className={`${styles.indexButton} ${styles.desktopRight}`}
              aria-expanded={indexOpen}
              aria-haspopup="dialog"
              onClick={(event) => {
                indexButtonRef.current = event.currentTarget;
                setIndexOpen(true);
              }}
            >
              INDEX
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
        accountSlot={mobileAccountSlot}
        openerRef={indexButtonRef}
      />
    </>
  );
}
