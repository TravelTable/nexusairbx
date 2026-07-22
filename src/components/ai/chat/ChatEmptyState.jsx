import React from "react";
import { Layout, Code2, Rocket, LayoutGrid, ArrowRight } from "lib/icons";

const EXAMPLES = [
  {
    icon: Layout,
    title: "Build in Studio",
    prompt: "Build a Roblox shop system in Studio with item cards, prices, and server-validated purchases. Keep Manual Review on.",
    accent: "#00f5d4",
  },
  {
    icon: Code2,
    title: "Inspect and fix",
    prompt: "Inspect my paired Studio place and fix the script that gives players a speed boost when they touch a part.",
    accent: "#9b5de5",
  },
  {
    icon: Rocket,
    title: "Wire a system",
    prompt: "Wire a leaderboard system with a UI, remotes, and a DataStore-backed score saver, then explain the approval steps before applying.",
    accent: "#f15bb5",
  },
];

export default function ChatEmptyState({ onQuickStart, onOpenTemplates }) {
  return (
    <div className="flex min-h-0 flex-col items-center justify-center space-y-8 py-8 text-center motion-safe:animate-fade-in-up sm:space-y-10 sm:py-10 [@media(max-height:850px)]:space-y-5 [@media(max-height:850px)]:py-4">
      <div className="space-y-4 max-w-xl">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-nexus-cyan/10 border border-nexus-cyan/20 flex items-center justify-center shadow-[0_0_40px_-8px_rgba(0,245,212,0.4)] [@media(max-height:850px)]:hidden">
          <img src="/logo.png" alt="" className="w-9 h-9 object-contain" />
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
          <span className="gradient-text">What should the Studio agent do?</span>
        </h1>
        <p className="text-sm md:text-[15px] text-gray-400 leading-relaxed">
          Start with a prompt to generate an exportable Roblox project. Optionally connect Studio, keep Manual Review enabled, then ask the agent to inspect, build, wire, or fix a live project. Every build is available as a placement-aware Project ZIP.
        </p>
      </div>

      <div className="scrollbar-subtle flex w-full max-w-3xl snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
        {EXAMPLES.map((ex, index) => (
          <button
            key={ex.title}
            type="button"
            onClick={() => onQuickStart?.(ex.prompt)}
            className="group relative min-h-36 min-w-[15rem] flex-1 snap-start rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-[border-color,background-color,transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.05] motion-safe:animate-fade-in-scale focus-ring"
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <div className="flex items-center justify-between">
              <div
                className="mb-3 p-2.5 rounded-xl w-fit bg-white/5 transition-transform group-hover:scale-110"
                style={{ color: ex.accent }}
              >
                <ex.icon className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </div>
            <div className="font-display font-bold text-white text-sm mb-1">{ex.title}</div>
            <div className="line-clamp-3 text-[11px] leading-relaxed text-gray-500">{ex.prompt}</div>
          </button>
        ))}
      </div>

      {onOpenTemplates && (
        <button
          type="button"
          onClick={onOpenTemplates}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-nexus-cyan/10 border border-nexus-cyan/20 text-nexus-cyan text-xs font-bold uppercase tracking-widest hover:bg-nexus-cyan/20 transition-all focus-ring"
        >
          <LayoutGrid className="w-4 h-4" />
          Browse template gallery
        </button>
      )}
    </div>
  );
}
