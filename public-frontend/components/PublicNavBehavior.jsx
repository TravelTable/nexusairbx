"use client";

import { useEffect } from "react";

function setExpanded(detail) {
  const summary = detail.querySelector(":scope > summary");
  if (summary) {
    summary.setAttribute("aria-expanded", detail.open ? "true" : "false");
  }
}

export default function PublicNavBehavior() {
  useEffect(() => {
    const header = document.querySelector("[data-public-header]");
    if (!header) return undefined;

    const getDetails = () => [...header.querySelectorAll("details")];
    const navLinks = [...header.querySelectorAll("[data-public-nav] a[href]")];
    const pathname = window.location.pathname.replace(/\/$/, "") || "/";

    getDetails().forEach(setExpanded);
    navLinks.forEach((link) => {
      const href = new URL(link.href, window.location.origin).pathname.replace(/\/$/, "") || "/";
      const sectionMatch = (href === "/docs" || href === "/legal") && pathname.startsWith(`${href}/`);
      if (href === pathname || sectionMatch) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    function closeDetail(detail, { restoreFocus = false } = {}) {
      if (!detail?.open) return;
      detail.open = false;
      setExpanded(detail);
      if (restoreFocus) {
        detail.querySelector(":scope > summary")?.focus();
      }
    }

    function onToggle(event) {
      const detail = event.target;
      if (!(detail instanceof HTMLDetailsElement) || !header.contains(detail)) return;
      setExpanded(detail);
      if (!detail.open) return;

      getDetails().forEach((candidate) => {
        const isNestedRelation = detail.contains(candidate) || candidate.contains(detail);
        if (candidate !== detail && !isNestedRelation) closeDetail(candidate);
      });
    }

    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      const openDetail = getDetails().reverse().find((detail) => detail.open);
      if (!openDetail) return;
      event.preventDefault();
      closeDetail(openDetail, { restoreFocus: true });
    }

    function onPointerDown(event) {
      if (header.contains(event.target)) return;
      getDetails().forEach((detail) => closeDetail(detail));
    }

    function onNavClick(event) {
      if (!event.target.closest("a[href]")) return;
      getDetails().forEach((detail) => closeDetail(detail));
    }

    header.addEventListener("toggle", onToggle, true);
    header.addEventListener("keydown", onKeyDown);
    header.addEventListener("click", onNavClick);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      header.removeEventListener("toggle", onToggle, true);
      header.removeEventListener("keydown", onKeyDown);
      header.removeEventListener("click", onNavClick);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return null;
}
