import React from "react";
import {
  Wand2,
  Moon,
  X,
  Smartphone,
  Maximize2,
  Square,
  Sparkles,
  Circle,
} from "lib/icons";

// One-click refine suggestions. Each chip submits its `text` through the
// existing refine flow (PreviewTab's onRefine), so iteration is one tap.
const REFINE_CHIPS = [
  { label: "Make it darker", text: "Make the color scheme darker and moodier", icon: Moon },
  { label: "Add close button", text: "Add a close button in the top-right corner", icon: X },
  { label: "Mobile layout", text: "Optimize the layout for mobile / portrait screens", icon: Smartphone },
  { label: "More spacing", text: "Add more spacing and padding between elements", icon: Maximize2 },
  { label: "Bigger buttons", text: "Make the buttons bigger with larger tap targets", icon: Square },
  { label: "Add icons", text: "Add relevant icons to the buttons and labels", icon: Sparkles },
  { label: "Rounder corners", text: "Increase the corner radius for a rounder, softer look", icon: Circle },
];

export default function RefineChips({ onRefine, isRefining = false, className = "" }) {
  if (typeof onRefine !== "function") return null;

  return (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto scrollbar-none ${className}`}
      role="group"
      aria-label="Quick refine suggestions"
    >
      <span className="shrink-0 inline-flex items-center gap-1 pr-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
        <Wand2 className="w-3 h-3 text-[#9b5de5]" />
        Quick
      </span>
      {REFINE_CHIPS.map(({ label, text, icon: Icon }) => (
        <button
          key={label}
          type="button"
          onClick={() => onRefine(text)}
          disabled={isRefining}
          title={text}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-gray-300 whitespace-nowrap transition-all hover:text-white hover:border-[#00f5d4]/50 hover:bg-[#00f5d4]/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon className="w-3.5 h-3.5 text-[#00f5d4]" />
          {label}
        </button>
      ))}
    </div>
  );
}
