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
    <div className="min-h-[40vh] flex flex-col items-center justify-center text-center space-y-10 py-12 animate-fade-in-up">
      <div className="space-y-4 max-w-xl">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-nexus-cyan/10 border border-nexus-cyan/20 flex items-center justify-center shadow-[0_0_40px_-8px_rgba(0,245,212,0.4)]">
          <img src="/logo.png" alt="" className="w-9 h-9 object-contain" />
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
          <span className="gradient-text">What should the Studio agent do?</span>
        </h1>
        <p className="text-sm md:text-[15px] text-gray-400 leading-relaxed">
          Pair Studio, keep Manual Review enabled, then ask the agent to inspect, build, wire, or fix your Roblox project. It will plan the work, generate files, and help apply approved changes through Studio.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.title}
            type="button"
            onClick={() => onQuickStart?.(ex.prompt)}
            className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/25 hover:bg-white/[0.05] hover:-translate-y-0.5 text-left transition-all focus-ring"
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
            <div className="text-[11px] text-gray-500 leading-relaxed">{ex.prompt}</div>
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
