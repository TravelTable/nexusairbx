"use client";

import { useEffect, useRef } from "react";
import UniversalBrand, { renderLink } from "./UniversalBrand";
import styles from "./UniversalHeader.module.css";

function isCurrent(pathname, href) {
  if (!pathname || !href.startsWith("/")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function UniversalSiteIndex({
  open,
  onClose,
  sections,
  pathname,
  LinkComponent = "a",
  accountSlot = null,
  openerRef,
}) {
  const surfaceRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const opener = openerRef?.current;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(surfaceRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) || []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      opener?.focus();
    };
  }, [onClose, open, openerRef]);

  if (!open) return null;

  return (
    <div ref={surfaceRef} className={styles.siteIndex} role="dialog" aria-modal="true" aria-label="NexusRBX site index">
      <div className={styles.indexHeader}>
        <UniversalBrand LinkComponent={LinkComponent} />
        <button ref={closeRef} type="button" className={styles.indexClose} onClick={onClose}>CLOSE INDEX</button>
      </div>
      <div className={styles.indexBody}>
        <div className={styles.indexIntro}>
          <h1 className="nx-route-heading">Project routes</h1>
          <p>Build with Studio context, create project assets, inspect the record, or manage the account behind the work.</p>
        </div>
        <div className={styles.indexSections}>
          {sections.map((section) => (
            <section className={styles.indexSection} key={section.label} aria-labelledby={`index-${section.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <h2 id={`index-${section.label.toLowerCase().replace(/\s+/g, "-")}`}>{section.label}</h2>
              <div className={styles.indexLinks}>
                {section.items.map((item) => renderLink(
                  LinkComponent,
                  item.href,
                  {
                    key: item.href,
                    className: styles.indexLink,
                    "aria-current": isCurrent(pathname, item.href) ? "page" : undefined,
                    onClick: onClose,
                  },
                  item.label,
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <div className={styles.indexFooter}>
        <span>NexusRBX / Roblox project creation, review, and Studio handoff</span>
        {accountSlot}
      </div>
    </div>
  );
}
