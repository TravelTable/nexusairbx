import React from "react";
import { ShieldAlert, AlertTriangle, ShieldCheck } from "lucide-react";

// Security notes, warnings, and overall QA/validation for the active artifact.
export default function ValidationReportPanel({ artifact }) {
  if (!artifact) return null;
  const security = artifact.securityNotes || [];
  const warnings = artifact.warnings || [];
  const qa = artifact.qaReport;
  const hasQa = qa && Number.isFinite(Number(qa.score));

  if (!security.length && !warnings.length && !hasQa) return null;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-[#ff006e]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Safety &amp; Validation</span>
      </div>

      {hasQa && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-black/30 border border-white/5">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Quality score</span>
          <span className={`text-sm font-black ${Number(qa.score) >= 80 ? "text-[#00f5d4]" : Number(qa.score) >= 50 ? "text-amber-300" : "text-[#ff6b6b]"}`}>
            {qa.score}
          </span>
        </div>
      )}

      {security.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#ff006e]/90">
            <ShieldAlert className="w-3.5 h-3.5" /> Security
          </div>
          <ul className="space-y-1.5">
            {security.map((note, i) => (
              <li key={i} className="text-[13px] text-gray-300 leading-relaxed pl-1">• {note}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300/90">
            <AlertTriangle className="w-3.5 h-3.5" /> Warnings
          </div>
          <ul className="space-y-1.5">
            {warnings.map((w, i) => (
              <li key={i} className="text-[13px] text-gray-300 leading-relaxed pl-1">• {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
