import React from "react";
import { Sparkles, Layout, Code2, Rocket, LayoutGrid } from "lucide-react";

const EXAMPLES = [
  {
    icon: Layout,
    title: "Build a shop UI",
    prompt: "Build a Roblox shop UI with item cards, prices, and a buy button.",
    accent: "#00f5d4",
  },
  {
    icon: Code2,
    title: "Write a Luau script",
    prompt: "Write a Luau script that gives players a speed boost when they touch a part.",
    accent: "#9b5de5",
  },
  {
    icon: Rocket,
    title: "Make a full system",
    prompt: "Create a leaderboard system with a UI and a DataStore-backed score saver.",
    accent: "#f15bb5",
  },
];

export default function ChatEmptyState({ onQuickStart, onOpenTemplates }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-10 py-12 animate-fade-in-up">
      <div className="space-y-4 max-w-xl">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-nexus-cyan/10 border border-nexus-cyan/20 flex items-center justify-center shadow-[0_0_40px_-8px_rgba(0,245,212,0.4)]">
          <Sparkles className="w-7 h-7 text-nexus-cyan" />
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
          <span className="gradient-text">What do you want to build?</span>
        </h1>
        <p className="text-sm md:text-[15px] text-gray-400 leading-relaxed">
          Describe your idea. I&apos;ll ask only what I need, show you a plan, build it, and help you export it into Roblox.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.title}
            type="button"
            onClick={() => onQuickStart?.(ex.prompt)}
            className="group p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/25 hover:bg-white/[0.05] text-left transition-all focus-ring"
          >
            <div
              className="mb-3 p-2.5 rounded-xl w-fit bg-white/5 transition-transform group-hover:scale-110"
              style={{ color: ex.accent }}
            >
              <ex.icon className="w-4 h-4" />
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
