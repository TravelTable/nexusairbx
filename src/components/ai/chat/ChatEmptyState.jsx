import React from "react";
import { Sparkles, Layout, Code2, Rocket } from "lucide-react";

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

export default function ChatEmptyState({ onQuickStart }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-10 py-12">
      <div className="space-y-3 max-w-xl">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#00f5d4]/10 border border-[#00f5d4]/20 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-[#00f5d4]" />
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white">What do you want to build?</h1>
        <p className="text-sm text-gray-400 leading-relaxed">
          Describe your idea. I&apos;ll ask only what I need, show you a plan, build it, and help you export it into Roblox.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.title}
            type="button"
            onClick={() => onQuickStart?.(ex.prompt)}
            className="p-5 rounded-2xl bg-gray-900/40 border border-gray-800 hover:border-white/20 text-left transition-all"
          >
            <div className="mb-3 p-2 rounded-lg w-fit bg-white/5" style={{ color: ex.accent }}>
              <ex.icon className="w-4 h-4" />
            </div>
            <div className="font-bold text-white text-sm mb-1">{ex.title}</div>
            <div className="text-[11px] text-gray-500 leading-relaxed">{ex.prompt}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
