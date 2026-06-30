import React from "react";
import { Wrench } from "lib/icons";

// Numbered Studio setup instructions for the active artifact.
export default function SetupStepsPanel({ steps = [] }) {
  if (!steps.length) return null;
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Wrench className="w-3.5 h-3.5 text-[#00f5d4]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Studio Setup</span>
      </div>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-[13px] text-gray-300 leading-relaxed">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-[#00f5d4] text-[10px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
