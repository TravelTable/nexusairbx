import React, { useEffect, useRef, useState } from "react";
import { Brain, ChevronDown } from "lib/icons";
import FEATURE_FLAGS from "../../../lib/featureFlags";

/**
 * Cursor-style live "thinking" stream. While the model is generating this shows
 * its raw reasoning tokens as flowing text with a blinking cursor and auto-scroll.
 * Once generation finishes it stays as a collapsible disclosure.
 */
export default function RawReasoningPanel({ text = "", live = false }) {
  const clean = String(text || "").trim();
  const [open, setOpen] = useState(true);
  const [stick, setStick] = useState(true);
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (live) setOpen(true);
  }, [live]);

  useEffect(() => {
    if (!open || !live || !stick || !scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [clean, open, live, stick]);

  if (!FEATURE_FLAGS.rawReasoning || !clean) return null;

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setStick(el.scrollHeight - el.scrollTop - el.clientHeight < 48);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b0b0b]/90 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
        aria-expanded={open}
      >
        <Brain className={`w-3.5 h-3.5 ${live ? "text-[#00f5d4] motion-safe:animate-pulse" : "text-[#9b5de5]"}`} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
          {live ? "Thinking" : "Thought process"}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 ml-auto text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="max-h-[24rem] overflow-y-auto px-4 pb-4 pt-2 border-t border-white/5"
        >
          <div className="text-[13px] leading-relaxed text-gray-400 whitespace-pre-wrap font-mono">
            {clean}
            {live ? (
              <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-[#00f5d4] motion-safe:animate-pulse" />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
