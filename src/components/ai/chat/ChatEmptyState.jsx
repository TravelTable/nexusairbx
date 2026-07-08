import React from "react";
import { Layout, Code2, Rocket, LayoutGrid, ArrowRight, ShieldCheck } from "lib/icons";

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
  {
    icon: ShieldCheck,
    title: "Review a change",
    prompt: "Review the latest Studio change for risky remotes, missing validation, and scripts that should be server-owned before I approve it.",
    accent: "#fee440",
  },
];

export default function ChatEmptyState({ onQuickStart, onOpenTemplates }) {
  return (
    <div className="flex min-h-[44vh] flex-col items-center justify-center space-y-9 py-12 text-center motion-safe:animate-fade-in-up">
      <div className="max-w-2xl space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#00f5d4]/18 bg-white/[0.045] shadow-[0_18px_44px_-30px_rgba(0,245,212,0.65)]">
          <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-white">
          Build, inspect, and fix Roblox projects with your Studio agent.
        </h1>
        <p className="mx-auto max-w-xl text-[15px] leading-7 text-gray-400">
          Ask for a build, code review, asset workflow, or Studio fix. Nexus keeps the work inspectable with plans, generated files, and approval steps before changes land in Studio.
        </p>
      </div>

      <div className="grid w-full max-w-5xl grid-cols-4 gap-3">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.title}
            type="button"
            onClick={() => onQuickStart?.(ex.prompt)}
            className="group relative rounded-[18px] border border-white/[0.075] bg-white/[0.035] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055] focus-ring"
          >
            <div className="flex items-center justify-between">
              <div
                className="mb-3 w-fit rounded-xl bg-white/[0.055] p-2.5 transition-transform group-hover:scale-105"
                style={{ color: ex.accent }}
              >
                <ex.icon className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </div>
            <div className="mb-1 font-display text-sm font-bold text-white">{ex.title}</div>
            <div className="text-[11px] leading-5 text-gray-500">{ex.prompt}</div>
          </button>
        ))}
      </div>

      {onOpenTemplates && (
        <button
          type="button"
          onClick={onOpenTemplates}
          className="inline-flex items-center gap-2 rounded-xl border border-[#00f5d4]/20 bg-[#00f5d4]/10 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-[#00f5d4] transition-all hover:bg-[#00f5d4]/16 focus-ring"
        >
          <LayoutGrid className="w-4 h-4" />
          Browse template gallery
        </button>
      )}
    </div>
  );
}
