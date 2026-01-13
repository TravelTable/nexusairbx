import React from "react";
import { Bookmark, Edit, Trash2, Check } from "lucide-react";
import { getVersionStr, fromNow, keyForScript } from "../../lib/sidebarUtils";

const ScriptRow = React.memo(function ScriptRow({
  script,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onToggleSave,
  isSaved,
  renaming,
  renameValue,
  setRenameValue,
  onRenameCommit,
  onRenameCancel,
}) {
  const version = getVersionStr(script);
  return (
    <div
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${
        isSelected
          ? "border-[#00f5d4] bg-gray-800/60"
          : "border-gray-700 bg-gray-900/40"
      } transition-colors text-left group`}
      tabIndex={0}
      role="row"
      aria-selected={isSelected}
      style={{ outline: "none" }}
      data-id={script.id}
      data-version={version}
      aria-label={`Select script ${script.title || "Untitled"}`}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        {renaming ? (
          <input
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white w-full"
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
          <span
            className="font-semibold text-white truncate block max-w-[12rem] md:max-w-[16rem]"
            title={script.title || "Untitled"}
          >
            {script.title || "Untitled"}
            {version && (
              <span className="inline-block px-2 py-0.5 rounded bg-[#9b5de5]/20 text-[#9b5de5] text-xs font-semibold ml-2">
                v{version}
              </span>
            )}
          </span>
        )}
        <div className="text-xs text-gray-400">
          {script.updatedAt && (
            <span title={new Date(script.updatedAt).toLocaleString()}>
              Last updated: {fromNow(script.updatedAt)}
            </span>
          )}
          <span className="ml-2 text-[10px] text-gray-500 hidden group-hover:inline">
            (F2: Rename • Delete: Delete)
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <button
          className="p-1 rounded hover:bg-gray-700"
          title={isSaved ? "Unsave" : "Save"}
          tabIndex={-1}
          aria-label={isSaved ? "Unsave script" : "Save script"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(script);
          }}
        >
          {isSaved ? (
            <Bookmark className="h-4 w-4 text-[#00f5d4]" />
          ) : (
            <Bookmark className="h-4 w-4 text-gray-400" />
          )}
        </button>
        {renaming ? (
          <button
            className="p-1 rounded hover:bg-gray-700"
            title="Save"
            tabIndex={-1}
            aria-label="Save script name"
            onClick={(e) => {
              e.stopPropagation();
              if (renameValue.trim()) onRenameCommit(script.id, renameValue.trim());
              onRenameCancel();
            }}
          >
            <Check className="h-4 w-4 text-green-400" />
          </button>
        ) : (
          <button
            className="p-1 rounded hover:bg-gray-700"
            title="Rename"
            tabIndex={-1}
            aria-label="Rename script"
            onClick={(e) => {
              e.stopPropagation();
              onRename(script.id, script.title || "");
            }}
          >
            <Edit className="h-4 w-4 text-gray-400" />
          </button>
        )}
        <button
          className="p-1 rounded hover:bg-gray-700"
          title="Delete"
          tabIndex={-1}
          aria-label="Delete script"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(script.id);
          }}
        >
          <Trash2 className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
});

export default ScriptRow;
