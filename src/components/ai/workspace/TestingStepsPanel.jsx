import React from "react";
import { FlaskConical, CheckCircle2 } from "lucide-react";

// How to test the generated system in Studio.
export default function TestingStepsPanel({ steps = [] }) {
  if (!steps.length) return null;
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical className="w-3.5 h-3.5 text-[#9b5de5]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Testing</span>
      </div>
      <ul className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] text-gray-300 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#9b5de5]/70" />
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
