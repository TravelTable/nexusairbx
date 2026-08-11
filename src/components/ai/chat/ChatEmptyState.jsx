import React from "react";
import { Layout, Code2, Rocket, LayoutGrid, ArrowRight } from "lib/icons";

const EXAMPLES = [
  {
    icon: Layout,
    title: "Build in Studio",
    prompt: "Build a Roblox shop system in Studio with item cards, prices, and server-validated purchases. Keep Manual Review on.",
  },
  {
    icon: Code2,
    title: "Inspect and fix",
    prompt: "Inspect my paired Studio place and fix the script that gives players a speed boost when they touch a part.",
  },
  {
    icon: Rocket,
    title: "Wire a system",
    prompt: "Wire a leaderboard system with a UI, remotes, and a DataStore-backed score saver, then explain the approval steps before applying.",
  },
];

export default function ChatEmptyState({ onQuickStart, onOpenTemplates }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 py-8 text-center motion-safe:animate-fade-in-up sm:gap-7 [@media(max-height:760px)]:gap-4 [@media(max-height:760px)]:py-4">
      <div className="max-w-2xl space-y-3">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] [@media(max-height:760px)]:hidden">
          <img src="/logo.png" alt="" className="h-6 w-6 object-contain" />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--ds-text)] sm:text-[28px]">
          What should the Studio agent do?
        </h1>
        <p className="text-[13px] leading-relaxed text-[var(--ds-text-secondary)] sm:text-sm">
          Describe the outcome. Nexus can inspect your paired place, plan the change, and prepare every Studio write for review.
        </p>
      </div>

      <div className="scrollbar-subtle flex w-full max-w-[760px] snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.title}
            type="button"
            onClick={() => onQuickStart?.(ex.prompt)}
            className="group min-h-28 min-w-[15rem] flex-1 snap-start rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-3.5 text-left transition-[border-color,background-color] duration-[var(--motion-fast)] hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-fill-subtle)] focus-ring"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="grid h-7 w-7 place-items-center rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[var(--ds-accent)]">
                <ex.icon className="h-3.5 w-3.5" />
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[var(--ds-text-muted)] transition-colors group-hover:text-[var(--ds-accent)]" />
            </div>
            <div className="mb-1 text-sm font-semibold text-[var(--ds-text)]">{ex.title}</div>
            <div className="line-clamp-3 text-[11px] leading-relaxed text-[var(--ds-text-muted)]">{ex.prompt}</div>
          </button>
        ))}
      </div>

      {onOpenTemplates && (
        <button
          type="button"
          onClick={onOpenTemplates}
          className="inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-fill-subtle)] hover:text-[var(--ds-text)] focus-ring"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Browse template gallery
        </button>
      )}
    </div>
  );
}
