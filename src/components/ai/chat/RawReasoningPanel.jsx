import React, { useState } from "react";
import { Brain, ChevronDown } from "lib/icons";
import FEATURE_FLAGS from "../../../lib/featureFlags";

const COLLAPSE_THRESHOLD = 600;

export default function RawReasoningPanel({ text = "", live = false }) {
  const clean = String(text || "").trim();
  const [open, setOpen] = useState(() => live || clean.length <= COLLAPSE_THRESHOLD);

  if (!FEATURE_FLAGS.rawReasoning || !clean) return null;

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-950/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
        aria-expanded={open}
      >
        <Brain className={`w-3.5 h-3.5 ${live ? "text-amber-300 animate-pulse" : "text-amber-200"}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-amber-100/80">
          Raw model reasoning
        </span>
        <ChevronDown className={`w-3.5 h-3.5 ml-auto text-amber-200/70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 border-t border-amber-400/10">
          <p className="mb-2 text-[10px] leading-relaxed text-amber-100/60">
            Unfiltered model output. This is not verified truth.
          </p>
          <div className="text-[12px] leading-relaxed text-amber-50/90 whitespace-pre-wrap font-mono">
            {clean}
          </div>
        </div>
      )}
    </div>
  );
}
