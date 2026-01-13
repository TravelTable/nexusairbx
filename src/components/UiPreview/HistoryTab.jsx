import React from "react";

export default function HistoryTab({ history, activeId, onSelectHistory }) {
  return (
    <div className="h-full flex flex-col gap-2">
      <div className="text-xs text-gray-400">Newest first</div>
      <div className="flex-1 overflow-auto space-y-1 pr-1">
        {history.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => onSelectHistory?.(h.id)}
            className={`w-full text-left px-2 py-2 rounded border ${
              h.id === activeId
                ? "border-[#9b5de5] bg-[#9b5de5]/10"
                : "border-gray-800 hover:bg-gray-900"
            }`}
            title={h.prompt}
          >
            <div className="text-xs text-gray-200 truncate">
              {h.prompt || "Untitled"}
            </div>
            <div className="text-[11px] text-gray-500">
              {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
            </div>
          </button>
        ))}
        {history.length === 0 ? (
          <div className="text-sm text-gray-500 py-6 text-center">
            No UI generations yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
