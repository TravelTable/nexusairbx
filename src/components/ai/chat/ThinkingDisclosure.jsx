import React, { useState } from "react";
import { Brain, ChevronDown } from "lib/icons";

/**
 * Collapsible display-safe build log for finalized messages. Hidden when there
 * is no text or when the user disables thinking/progress display.
 */
function thoughtEnabled() {
  try {
    const s = JSON.parse(localStorage.getItem("nexusrbx:settings") || "{}");
    return s.showThinking !== false;
  } catch (_) {
    return true;
  }
}

export default function ThinkingDisclosure({ text, live = false, defaultOpen = false, label = null }) {
  const clean = String(text || "").replace(/<\/?thinking>/gi, "").trim();
  const [open, setOpen] = useState(defaultOpen || live);
  if (!clean || !thoughtEnabled()) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
        aria-expanded={open}
      >
        <Brain className={`w-3.5 h-3.5 ${live ? "text-[#00f5d4] animate-pulse" : "text-[#9b5de5]"}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          {label || (live ? "Thinking" : "Build log")}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 ml-auto text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 border-t border-white/5 text-[12px] leading-relaxed text-gray-400 whitespace-pre-wrap">
          {clean}
        </div>
      )}
    </div>
  );
}
