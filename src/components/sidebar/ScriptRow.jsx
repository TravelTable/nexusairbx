import React, { useMemo } from "react";
import { Edit, Trash2, Monitor, Smartphone } from "lib/icons";
import { getVersionStr, fromNow } from "../../lib/sidebarUtils";

const ScriptRow = React.memo(function ScriptRow({
  script,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  renaming,
  renameValue,
  setRenameValue,
  onRenameCommit,
  onRenameCancel,
}) {
  const version = getVersionStr(script);

  // Extract system tags from script metadata or title
  const systemTags = useMemo(() => {
    const tags = [];
    if (script.type === "ui") tags.push({ label: "UI", color: "text-[var(--ds-accent)] bg-[var(--ds-accent-soft)]" });
    else tags.push({ label: "Logic", color: "text-[var(--ds-info)] bg-[color-mix(in_srgb,var(--ds-info)_12%,transparent)]" });
    
    // Mocking some tags based on title for demo purposes
    if (script.title?.toLowerCase().includes("mobile")) tags.push({ icon: Smartphone, color: " text-[var(--ds-info)] " });
    if (script.title?.toLowerCase().includes("pc")) tags.push({ icon: Monitor, color: "text-[var(--ds-text-secondary)]" });
    
    return tags;
  }, [script]);

  return (
    <div
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-300 text-left group cursor-pointer relative overflow-hidden ${
        isSelected
          ? "border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)]"
          : "border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] hover:bg-[var(--ds-fill-subtle)] hover:border-[var(--ds-border-subtle)]"
      }`}
      tabIndex={0}
      role="row"
      aria-selected={isSelected}
      style={{ outline: "none" }}
      data-id={script.id}
      data-version={version}
      aria-label={`Select script ${script.title || "Untitled"}`}
      onClick={onSelect}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--ds-accent)] shadow-none" />
      )}

      <div className="flex-1 min-w-0">
        {renaming ? (
          <input
            className="w-full rounded-lg border border-[var(--ds-accent)] bg-[var(--ds-surface-2)] px-2 py-1 text-sm text-[var(--ds-text)] outline-none"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                if (renameValue.trim()) onRenameCommit(script.id, renameValue.trim());
              }
              if (e.key === "Escape") {
                e.stopPropagation();
                onRenameCancel();
              }
            }}
            onBlur={() => {
              if (renameValue.trim()) onRenameCommit(script.id, renameValue.trim());
              onRenameCancel();
            }}
            aria-label="Rename script"
          />
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className={`font-bold truncate transition-colors ${isSelected ? "text-[var(--ds-text)]" : "text-[var(--ds-text-secondary)] group-hover:text-[var(--ds-text)]"}`}
                title={script.title || "Untitled"}
              >
                {script.title || "Untitled"}
              </span>
              {version && (
                <span className="px-1.5 py-0.5 rounded bg-[var(--ds-fill-subtle)] text-[10px] font-mono text-[var(--ds-text-muted)]">
                  v{version}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--ds-text-muted)] font-medium">
                {fromNow(script.updatedAt)}
              </span>
              <div className="flex items-center gap-1">
                {systemTags.map((tag, i) => (
                  <div key={i} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${tag.color || "bg-[var(--ds-fill-subtle)] text-[var(--ds-text-muted)]"}`}>
                    {tag.icon && <tag.icon className="w-2.5 h-2.5" />}
                    {tag.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 ml-2 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100 md:opacity-60 md:group-hover:opacity-100">
        {!renaming && (
          <button
            className="p-1.5 rounded-lg text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] hover:bg-[var(--ds-fill-subtle)] transition-colors"
            title="Rename"
            aria-label="Rename script"
            onClick={(e) => {
              e.stopPropagation();
              onRename(script.id, script.title || "");
            }}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
        )}
        
        <button
          className="rounded-lg p-1.5 text-[var(--ds-text-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] hover:text-[var(--ds-danger)]"
          title="Delete"
          aria-label="Delete script"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(script.id);
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

export default ScriptRow;
