import React from "react";
import {
  Wand2,
  Bug,
  Shield,
  Zap,
  Layers,
  FileCode2,
  Sparkles,
  RefreshCw,
} from "lib/icons";

// Studio/script quick refine suggestions. Shown only while refine mode is active.
const REFINE_CHIPS = [
  { label: "Add validation", text: "Add server-side validation and type checks for remote inputs", icon: Shield },
  { label: "Fix bugs", text: "Find and fix bugs, edge cases, and unsafe assumptions in the current scripts", icon: Bug },
  { label: "Optimize", text: "Optimize performance and reduce unnecessary work while keeping behavior the same", icon: Zap },
  { label: "Split modules", text: "Split oversized scripts into clearer ModuleScripts with single responsibilities", icon: Layers },
  { label: "Add comments", text: "Add brief comments for non-obvious logic without changing behavior", icon: FileCode2 },
  { label: "Harden remotes", text: "Harden RemoteEvents/RemoteFunctions with cooldowns, ownership checks, and anti-exploit guards", icon: RefreshCw },
  { label: "Polish UX", text: "Polish player-facing feedback, messaging, and UI polish without redesigning the whole system", icon: Sparkles },
];

export default function RefineChips({ onRefine, isRefining = false, className = "" }) {
  if (typeof onRefine !== "function") return null;

  return (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto scrollbar-none ${className}`}
      role="group"
      aria-label="Quick refine suggestions"
    >
      <span className="shrink-0 inline-flex items-center gap-1 pr-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ds-text-muted)]">
        <Wand2 className="w-3 h-3 text-[var(--ds-accent)]" />
        Quick
      </span>
      {REFINE_CHIPS.map(({ label, text, icon: Icon }) => (
        <button
          key={label}
          type="button"
          onClick={() => onRefine(text)}
          disabled={isRefining}
          title={text}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)] text-[11px] font-semibold text-[var(--ds-text-secondary)] whitespace-nowrap transition-all hover:text-[var(--ds-text)] hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-accent-soft)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon className="w-3.5 h-3.5 text-[var(--ds-accent)]" />
          {label}
        </button>
      ))}
    </div>
  );
}
