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
    <div className="border-t border-white/5 bg-black/30 px-4 py-3 space-y-3 text-xs">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10" style={{ color: meta.accent }}>
          <Icon className="w-3.5 h-3.5" />
          <span className="font-bold uppercase tracking-wider text-[10px]">{meta.label}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-gray-400">
          <MapPin className="w-3.5 h-3.5 text-gray-500" />
          {file.placement}
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ color: status.color }}>
          <span className="w-2 h-2 rounded-full" style={{ background: status.dot }} />
          <span className="font-bold uppercase tracking-wider text-[10px]">{status.label}</span>
        </span>
      </div>

      {file.purpose && (
        <div className="flex items-start gap-2 text-gray-400">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-500" />
          <span className="leading-relaxed">{file.purpose}</span>
        </div>
      )}

      {file.dependencies?.length > 0 && (
        <div className="flex items-start gap-2 text-gray-400">
          <GitBranch className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-500" />
          <div className="flex flex-wrap gap-1.5">
            {file.dependencies.map((dep, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300">
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      {file.warnings?.length > 0 && (
        <div className="flex items-start gap-2 text-amber-300/90">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <ul className="space-y-0.5 leading-relaxed">
            {file.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {validation && (
        <div className={`flex items-start gap-2 ${validation.ok ? "text-[#00f5d4]" : "text-amber-300/90"}`}>
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span className="leading-relaxed">
            {validation.ok ? "Validation passed" : validation.message || "Validation reported issues"}
          </span>
        </div>
      )}
    </div>
  );
}
