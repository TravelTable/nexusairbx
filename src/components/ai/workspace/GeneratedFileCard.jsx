import React from "react";
import { Circle } from "lucide-react";
import { kindMeta, statusMeta } from "./workspaceMeta";

// Compact row for a single generated file in the file tree.
export default function GeneratedFileCard({ file, active, onSelect }) {
  const meta = kindMeta(file.kind);
  const Icon = meta.icon;
  const status = statusMeta(file.dirty ? "edited" : file.status);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all group ${
        active ? "bg-white/[0.07] border border-white/10" : "border border-transparent hover:bg-white/[0.04]"
      }`}
      title={file.path}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color: meta.accent }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-[13px] font-semibold truncate ${active ? "text-white" : "text-gray-300 group-hover:text-white"}`}>
            {file.name}
          </span>
          {file.dirty && <span className="text-[#fee440] text-xs leading-none" title="Unsaved changes">●</span>}
        </div>
        <div className="text-[10px] text-gray-500 truncate">{meta.label}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0" title={status.label}>
        <Circle className="w-2 h-2" style={{ color: status.dot, fill: status.dot }} />
      </div>
    </button>
  );
}
