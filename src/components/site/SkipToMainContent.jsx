import React from "react";

export default function SkipToMainContent({ targetId = "main-content" }) {
  return (
    <a
      href={`#${targetId}`}
      className="fixed left-4 top-3 z-[100] inline-flex min-h-11 -translate-y-24 items-center rounded-[10px] bg-[var(--ds-accent)] px-4 py-2 text-sm font-semibold text-[var(--ds-accent-foreground)] shadow-[var(--ds-shadow-overlay)] transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent)] focus:ring-offset-2 focus:ring-offset-[var(--ds-bg-canvas)]"
    >
      Skip to main content
    </a>
  );
}
