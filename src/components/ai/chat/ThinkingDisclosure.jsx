import React, { useState } from "react";
import { Brain, ChevronDown } from "lib/icons";
import { useSettings } from "../../../context/SettingsContext";

/**
 * Collapsible display-safe build log for finalized messages. Hidden when there
 * is no text or when the user disables thinking/progress display.
 */
export default function ThinkingDisclosure({ text, live = false, defaultOpen = false, label = null }) {
  const { settings } = useSettings();
  const clean = String(text || "").replace(/<\/?thinking>/gi, "").trim();
  const [open, setOpen] = useState(defaultOpen || live);
  if (!clean || settings.showThinking === false) return null;

  return (
    <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--ds-fill-subtle)] transition-colors"
        aria-expanded={open}
      >
        <Brain className={`w-3.5 h-3.5 ${live ? "text-[var(--ds-accent)] animate-pulse" : "text-[var(--ds-text-muted)]"}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-secondary)]">
          {label || (live ? "Thinking" : "Build log")}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 ml-auto text-[var(--ds-text-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 border-t border-[var(--ds-border-subtle)] text-[12px] leading-relaxed text-[var(--ds-text-secondary)] whitespace-pre-wrap">
          {clean}
        </div>
      )}
    </div>
  );
}
