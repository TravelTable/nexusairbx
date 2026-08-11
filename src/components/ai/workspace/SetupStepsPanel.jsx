import React from "react";
import { Wrench } from "lib/icons";

// Numbered Studio setup instructions for the active artifact.
export default function SetupStepsPanel({ steps = [] }) {
  if (!steps.length) return null;
  return (
    <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Wrench className="w-3.5 h-3.5 text-[var(--ds-accent)]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-secondary)]">Studio Setup</span>
      </div>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-[13px] text-[var(--ds-text-secondary)] leading-relaxed">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-border)] text-[var(--ds-accent)] text-[10px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
