import React from "react";
import { X } from "lib/icons";
import { kindMeta } from "./workspaceMeta";

// Horizontal tab strip for the open artifact's files (center workspace).
export default function CodeEditorTabs({ files = [], activeFileId, onSelectFile, onCloseFile = null }) {
  if (!files.length) return null;
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none bg-[var(--ds-fill-hover)] px-1.5 py-1 border-b border-[var(--ds-border-subtle)]">
      {files.map((file) => {
        const meta = kindMeta(file.kind);
        const Icon = meta.icon;
        const active = file.id === activeFileId;
        return (
          <button
            key={file.id}
            type="button"
            onClick={() => onSelectFile(file.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-[background-color,border-color,color] duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${
              active ? "bg-[var(--ds-surface-2)] shadow-lg text-[var(--ds-text)]" : "text-[var(--ds-text-muted)] hover:text-[var(--ds-text-secondary)]"
            }`}
            title={file.path}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: active ? meta.accent : undefined }} />
            <span className="max-w-[160px] truncate">{file.name}</span>
            {file.dirty && <span className="text-[var(--ds-warning)] leading-none" title="Unsaved changes">●</span>}
            {onCloseFile && (
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseFile(file.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onCloseFile(file.id);
                  }
                }}
                className="inline-flex items-center justify-center rounded text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
                title={`Close ${file.name}`}
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
