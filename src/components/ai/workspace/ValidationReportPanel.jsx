import React from "react";
import { ShieldAlert, AlertTriangle, ShieldCheck } from "lib/icons";

// Security notes, warnings, and overall QA/validation for the active artifact.
export default function ValidationReportPanel({ artifact }) {
  if (!artifact) return null;
  const security = artifact.securityNotes || [];
  const warnings = artifact.warnings || [];
  const qa = artifact.qaReport;
  const hasQa = qa && Number.isFinite(Number(qa.score));

  if (!security.length && !warnings.length && !hasQa) return null;

  return (
    <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-[var(--ds-danger)]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-secondary)]">Safety &amp; Validation</span>
      </div>

      {hasQa && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)]">
          <span className="text-[11px] font-bold text-[var(--ds-text-secondary)] uppercase tracking-wider">Quality score</span>
          <span className={`text-sm font-bold ${Number(qa.score) >= 80 ? "text-[var(--ds-success)]" : Number(qa.score) >= 50 ? "text-[var(--ds-warning)]" : "text-[var(--ds-danger)]"}`}>
            {qa.score}
          </span>
        </div>
      )}

      {security.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ds-danger)]">
            <ShieldAlert className="w-3.5 h-3.5" /> Security
          </div>
          <ul className="space-y-1.5">
            {security.map((note, i) => (
              <li key={i} className="text-[13px] text-[var(--ds-text-secondary)] leading-relaxed pl-1">• {note}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ds-warning)] ">
            <AlertTriangle className="w-3.5 h-3.5" /> Warnings
          </div>
          <ul className="space-y-1.5">
            {warnings.map((w, i) => (
              <li key={i} className="text-[13px] text-[var(--ds-text-secondary)] leading-relaxed pl-1">• {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
