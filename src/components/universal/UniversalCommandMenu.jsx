"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderLink } from "./UniversalBrand";
import styles from "./UniversalHeader.module.css";

export default function UniversalCommandMenu({
  open,
  onClose,
  sections,
  LinkComponent = "a",
  openerRef,
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const surfaceRef = useRef(null);
  const inputRef = useRef(null);
  const items = useMemo(() => sections.flatMap((section) => (
    section.items.map((item) => ({ ...item, section: section.label }))
  )), [sections]);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => `${item.label} ${item.section} ${item.href}`.toLowerCase().includes(normalized));
  }, [items, query]);

  useEffect(() => {
    if (!open) return undefined;
    const opener = openerRef?.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setQuery("");
    setActiveIndex(0);
    window.requestAnimationFrame(() => inputRef.current?.focus());

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(surfaceRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    <div className={styles.commandBackdrop} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        ref={surfaceRef}
        className={styles.commandMenu}
        role="dialog"
        aria-modal="true"
        aria-label="Search NexusRBX"
      >
        <div className={styles.commandInputRow}>
          <span aria-hidden="true" className={styles.searchGlyph}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => Math.min(results.length - 1, index + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(0, index - 1));
              } else if (event.key === "Enter" && results[activeIndex]) {
                event.preventDefault();
                surfaceRef.current?.querySelector('[data-active="true"]')?.click();
              }
            }}
            className={styles.commandInput}
            placeholder="Search pages and tools…"
            aria-label="Search pages and tools"
          />
          <button type="button" className={styles.commandClose} onClick={onClose}>Esc</button>
        </div>
        <div className={styles.commandResults} role="listbox" aria-label="Search results">
          {results.length ? results.map((item, index) => renderLink(
            LinkComponent,
            item.href,
            {
              key: `${item.section}-${item.href}`,
              className: styles.commandResult,
              role: "option",
              "aria-selected": index === activeIndex,
              "data-active": index === activeIndex ? "true" : "false",
              onMouseEnter: () => setActiveIndex(index),
              onClick: onClose,
            },
            <><span>{item.label}</span><small>{item.section}</small></>,
          )) : <p className={styles.commandEmpty}>No matching NexusRBX route.</p>}
        </div>
        <footer className={styles.commandFooter}>
          <span>Enter to open</span><span>↑↓ to browse</span><span>Esc to close</span>
        </footer>
      </section>
    </div>
  );
}
