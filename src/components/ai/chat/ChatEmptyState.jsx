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
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 py-10 text-center motion-safe:animate-fade-in-up [@media(max-height:760px)]:gap-5 [@media(max-height:760px)]:py-5">
      <div className="max-w-2xl space-y-4">
        <div className="mx-auto flex h-9 w-9 items-center justify-center [@media(max-height:760px)]:hidden">
          <img src="/logo.png" alt="" className="h-7 w-7 object-contain opacity-90" />
        </div>
        <h1 className="pc-display-heading text-[2rem] leading-[1.08] text-[var(--ds-text)] sm:text-[2.5rem]">
          What should the Studio agent do?
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-[var(--ds-text-secondary)]">
          Describe the outcome. Nexus can inspect your paired place, plan the change, and prepare every Studio write for review.
        </p>
      </div>

      <div className="scrollbar-subtle flex w-full max-w-[800px] snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.title}
            type="button"
            onClick={() => onQuickStart?.(ex.prompt)}
            className="group min-h-28 min-w-[15rem] flex-1 snap-start border-x-0 border-b-0 border-t border-[var(--ds-border)] bg-transparent px-1 py-4 text-left transition-[border-color,color] duration-[var(--motion-fast)] hover:border-[var(--ds-accent)] focus-ring"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="grid h-7 w-7 place-items-center text-[var(--ds-accent)]">
                <ex.icon className="h-3.5 w-3.5" />
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[var(--ds-text-muted)] transition-colors group-hover:text-[var(--ds-accent)]" />
            </div>
            <div className="mb-1.5 text-[15px] font-medium text-[var(--ds-text)]">{ex.title}</div>
            <div className="line-clamp-3 text-xs leading-relaxed text-[var(--ds-text-muted)]">{ex.prompt}</div>
          </button>
        ))}
      </div>

      {onOpenTemplates && (
        <button
          type="button"
          onClick={onOpenTemplates}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--ds-border)] px-4 text-xs font-medium text-[var(--ds-text-secondary)] transition-colors hover:border-[var(--ds-accent-border)] hover:text-[var(--ds-text)] focus-ring"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Browse template gallery
        </button>
      )}
    </div>
  );
}
