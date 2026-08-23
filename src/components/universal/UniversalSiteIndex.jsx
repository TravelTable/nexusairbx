"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CircleDollarSign,
  Code2,
  CreditCard,
  Gauge,
  Image,
  Library,
  LifeBuoy,
  LogIn,
  Mail,
  PanelsTopLeft,
  Plug,
  Scale,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import UniversalBrand, { renderLink } from "./UniversalBrand";
import styles from "./UniversalHeader.module.css";

function isCurrent(pathname, href) {
  if (!pathname || !href.startsWith("/")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const routeIcons = {
  billing: CreditCard,
  book: BookOpen,
  code: Code2,
  contact: Mail,
  image: Image,
  layout: PanelsTopLeft,
  legal: Scale,
  library: Library,
  plug: Plug,
  settings: Settings,
  signin: LogIn,
  sparkles: Sparkles,
  store: ShoppingBag,
  support: LifeBuoy,
  usage: Gauge,
};

function RouteIcon({ name }) {
  const Icon = routeIcons[name] || CircleDollarSign;
  return <Icon aria-hidden="true" size={18} strokeWidth={1.7} />;
}

export default function UniversalSiteIndex({
  open,
  onClose,
  sections,
  pathname,
  LinkComponent = "a",
  accountSlot = null,
  mobileAccountSlot = accountSlot,
  openerRef,
}) {
  const surfaceRef = useRef(null);
  const closeRef = useRef(null);
  const [query, setQuery] = useState("");

  const featuredItem = sections.flatMap((section) => section.items).find((item) => item.href === "/ai");
  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sections.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!normalizedQuery && item.href === featuredItem?.href) return false;
        return `${item.label} ${item.shortLabel || ""} ${item.description || ""} ${section.label}`.toLowerCase().includes(normalizedQuery);
      }),
    })).filter((section) => section.items.length > 0);
  }, [featuredItem?.href, query, sections]);

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
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) || []).filter((element) => element.offsetParent !== null);
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
        <button ref={closeRef} type="button" className={styles.indexClose} onClick={onClose}>
          <X aria-hidden="true" size={15} strokeWidth={2} />
          <span>Close</span>
        </button>
      </div>
      <div className={styles.indexBody}>
        <div className={styles.indexIntro}>
          <span className={styles.indexEyebrow}>NEXUS DIRECTORY</span>
          <h1 className="nx-route-heading">Where do you want to go?</h1>
          <p>Create, find assets, connect Studio, or manage your NexusRBX account.</p>
          <label className={styles.indexSearch}>
            <Search aria-hidden="true" size={17} strokeWidth={1.8} />
            <span className={styles.srOnly}>Search tools and routes</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tools and routes…"
              autoComplete="off"
            />
            <kbd>⌘K</kbd>
          </label>
        </div>
        {!query && featuredItem ? renderLink(
          LinkComponent,
          featuredItem.href,
          {
            className: styles.indexFeatured,
            "aria-current": isCurrent(pathname, featuredItem.href) ? "page" : undefined,
            onClick: onClose,
          },
          <>
            <span className={styles.featuredIcon}><RouteIcon name={featuredItem.icon} /></span>
            <span className={styles.featuredCopy}>
              <small>CONTINUE BUILDING</small>
              <strong>{featuredItem.label}</strong>
              <span>{featuredItem.description}</span>
            </span>
            <span className={styles.featuredAction}>Open workspace <ArrowUpRight aria-hidden="true" size={16} /></span>
          </>,
        ) : null}
        <div className={styles.indexSections} aria-live="polite">
          {filteredSections.map((section) => (
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
                  <>
                    <span className={styles.routeIcon}><RouteIcon name={item.icon} /></span>
                    <span className={styles.routeCopy}>
                      <strong>{item.shortLabel || item.label}</strong>
                      <span>{item.description}</span>
                    </span>
                    <ArrowUpRight className={styles.routeArrow} aria-hidden="true" size={15} strokeWidth={1.8} />
                  </>,
                ))}
              </div>
            </section>
          ))}
          {filteredSections.length === 0 ? (
            <div className={styles.indexEmpty}>
              <Search aria-hidden="true" size={20} />
              <strong>No matching routes</strong>
              <span>Try a tool name, category, or task.</span>
            </div>
          ) : null}
        </div>
      </div>
      <div className={styles.indexFooter}>
        <span>NexusRBX / Build, review, and hand off to Studio</span>
        {accountSlot ? <div className={`${styles.indexAccount} ${styles.indexAccountDesktop}`}>{accountSlot}</div> : null}
        {mobileAccountSlot ? <div className={`${styles.indexAccount} ${styles.indexAccountMobile}`}>{mobileAccountSlot}</div> : null}
      </div>
    </div>
  );
}
