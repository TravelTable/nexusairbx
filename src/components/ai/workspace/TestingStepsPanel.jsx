import React from "react";
import { FlaskConical, CheckCircle2 } from "lib/icons";

// How to test the generated system in Studio.
export default function TestingStepsPanel({ steps = [] }) {
  if (!steps.length) return null;
  return (
    <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical className="w-3.5 h-3.5 text-[var(--ds-info)]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-secondary)]">Testing</span>
      </div>
      <ul className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] text-[var(--ds-text-secondary)] leading-relaxed">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ds-info)]" />
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
