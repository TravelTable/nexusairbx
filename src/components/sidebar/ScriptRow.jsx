import React, { useMemo } from "react";
import { Edit, Trash2, Monitor, Smartphone } from "lucide-react";
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
    if (script.type === "ui") tags.push({ label: "UI", color: "text-[#00f5d4] bg-[#00f5d4]/10" });
    else tags.push({ label: "Logic", color: "text-[#9b5de5] bg-[#9b5de5]/10" });
    
    // Mocking some tags based on title for demo purposes
    if (script.title?.toLowerCase().includes("mobile")) tags.push({ icon: Smartphone, color: "text-blue-400" });
    if (script.title?.toLowerCase().includes("pc")) tags.push({ icon: Monitor, color: "text-gray-400" });
    
    return tags;
  }, [script]);

  return (
    <div
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-300 text-left group cursor-pointer relative overflow-hidden ${
        isSelected
          ? "border-[#00f5d4]/50 bg-[#00f5d4]/5 shadow-[0_0_20px_rgba(0,245,212,0.05)]"
          : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10"
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
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00f5d4] shadow-[0_0_10px_#00f5d4]" />
      )}

      <div className="flex-1 min-w-0">
        {renaming ? (
          <input
            className="bg-gray-800 border border-[#00f5d4] rounded-lg px-2 py-1 text-sm text-white w-full outline-none shadow-[0_0_10px_rgba(0,245,212,0.2)]"
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
                className={`font-bold truncate transition-colors ${isSelected ? "text-white" : "text-gray-300 group-hover:text-white"}`}
                title={script.title || "Untitled"}
              >
                {script.title || "Untitled"}
              </span>
              {version && (
                <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono text-gray-500">
                  v{version}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 font-medium">
                {fromNow(script.updatedAt)}
              </span>
              <div className="flex items-center gap-1">
                {systemTags.map((tag, i) => (
                  <div key={i} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${tag.color || "bg-white/5 text-gray-500"}`}>
                    {tag.icon && <tag.icon className="w-2.5 h-2.5" />}
                    {tag.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
        {!renaming && (
          <button
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
            title="Rename"
            tabIndex={-1}
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
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Delete"
          tabIndex={-1}
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
