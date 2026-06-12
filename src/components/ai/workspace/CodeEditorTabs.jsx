import React from "react";
import { kindMeta } from "./workspaceMeta";

// Horizontal tab strip for the open artifact's files (center workspace).
export default function CodeEditorTabs({ files = [], activeFileId, onSelectFile }) {
  if (!files.length) return null;
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide bg-black/40 px-1.5 py-1 border-b border-white/5">
      {files.map((file) => {
        const meta = kindMeta(file.kind);
        const Icon = meta.icon;
        const active = file.id === activeFileId;
        return (
          <button
            key={file.id}
            type="button"
            onClick={() => onSelectFile(file.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              active ? "bg-gray-800 shadow-lg text-white" : "text-gray-500 hover:text-gray-300"
            }`}
            title={file.path}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: active ? meta.accent : undefined }} />
            <span className="max-w-[160px] truncate">{file.name}</span>
            {file.dirty && <span className="text-[#fee440] leading-none" title="Unsaved changes">●</span>}
          </button>
        );
      })}
    </div>
  );
}
