import React from "react";
import { Info, GitBranch, AlertTriangle, ShieldCheck, MapPin } from "lib/icons";
import { kindMeta, statusMeta } from "./workspaceMeta";

// Metadata strip beneath the editor: what the selected file is for, where it
// goes in Studio, its dependencies, warnings, and validation result.
export default function ArtifactInspector({ file }) {
  if (!file) return null;
  const meta = kindMeta(file.kind);
  const Icon = meta.icon;
  const status = statusMeta(file.dirty ? "edited" : file.status);
  const validation = file.validation;

  return (
    <div className="border-t border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-4 py-3 space-y-3 text-xs">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)]" style={{ color: meta.accent }}>
          <Icon className="w-3.5 h-3.5" />
          <span className="font-bold uppercase tracking-wider text-[10px]">{meta.label}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-[var(--ds-text-secondary)]">
          <MapPin className="w-3.5 h-3.5 text-[var(--ds-text-muted)]" />
          {file.placement}
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ color: status.color }}>
          <span className="w-2 h-2 rounded-full" style={{ background: status.dot }} />
          <span className="font-bold uppercase tracking-wider text-[10px]">{status.label}</span>
        </span>
      </div>

      {file.purpose && (
        <div className="flex items-start gap-2 text-[var(--ds-text-secondary)]">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--ds-text-muted)]" />
          <span className="leading-relaxed">{file.purpose}</span>
        </div>
      )}

      {file.dependencies?.length > 0 && (
        <div className="flex items-start gap-2 text-[var(--ds-text-secondary)]">
          <GitBranch className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--ds-text-muted)]" />
          <div className="flex flex-wrap gap-1.5">
            {file.dependencies.map((dep, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)] text-[10px] text-[var(--ds-text-secondary)]">
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      {file.warnings?.length > 0 && (
        <div className="flex items-start gap-2 text-[var(--ds-warning)] ">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <ul className="space-y-0.5 leading-relaxed">
            {file.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {validation && (
        <div className={`flex items-start gap-2 ${validation.ok ? "text-[var(--ds-success)]" : "text-[var(--ds-warning)]"}`}>
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span className="leading-relaxed">
            {validation.ok ? "Validation passed" : validation.message || "Validation reported issues"}
          </span>
        </div>
      )}
    </div>
  );
}
