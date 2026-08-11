import React from "react";
import { Edit, Trash2, Loader2 } from "lib/icons";

export default function ChatRow({
  chat,
  currentChatId,
  isGenerating = false,
  agentStatus = null,
  onOpenChat,
  renamingChatId,
  renameChatTitle,
  setRenameChatTitle,
  onRenameStart,
  onRenameCommit,
  onRenameCancel,
  onDeleteClick,
}) {
  const isSelected = currentChatId === chat.id;
  const isRenaming = renamingChatId === chat.id;
  const visibleStatus = agentStatus || (isGenerating ? "running" : null);
  const statusLabel = visibleStatus ? String(visibleStatus).replaceAll("_", " ") : null;

  return (
    <div
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-300 text-left group relative overflow-hidden ${
        isSelected
          ? "border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)]"
          : "border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] hover:bg-[var(--ds-fill-subtle)] hover:border-[var(--ds-border-subtle)]"
      }`}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--ds-accent)] shadow-none" />
      )}
      {isRenaming ? (
        <div className="flex-1 min-w-0">
          <input
            className="bg-[var(--ds-surface-2)] border border-[var(--ds-accent)] rounded-full px-3 py-1 text-xs text-[var(--ds-text)] w-full outline-none"
            aria-label={`Rename chat ${chat.title || "Untitled chat"}`}
            value={renameChatTitle}
            onChange={(e) => setRenameChatTitle(e.target.value)}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onRenameCommit(chat.id, renameChatTitle);
              }
              if (e.key === "Escape") {
                e.stopPropagation();
                onRenameCancel();
              }
            }}
            onBlur={() => {
              onRenameCommit(chat.id, renameChatTitle);
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          className="flex-1 min-w-0 cursor-pointer rounded-lg text-left focus-ring"
          aria-label={`Open chat ${chat.title || "Untitled chat"}`}
          aria-current={isSelected ? "page" : undefined}
          onClick={() => onOpenChat(chat.id)}
        >
          <div className="flex flex-col gap-0.5">
            <span
              className={`font-bold text-sm truncate flex items-center gap-1.5 ${
                isSelected ? "text-[var(--ds-text)]" : "text-[var(--ds-text-secondary)] group-hover:text-[var(--ds-text)]"
              }`}
            >
              {visibleStatus && (
                <Loader2 className="w-3 h-3 shrink-0 text-[var(--ds-accent)] animate-spin" />
              )}
              <span className="truncate">{chat.title || "Untitled chat"}</span>
            </span>
            <span className="text-[10px] truncate">
              {visibleStatus ? (
                <span className="text-[var(--ds-accent)] font-semibold capitalize">{statusLabel}</span>
              ) : (
                <span className="text-[var(--ds-text-muted)]">{chat.lastMessage || "No messages yet"}</span>
              )}
            </span>
          </div>
        </button>
      )}
      {!isRenaming && (
        <div className="flex items-center gap-1 ml-2 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100 md:opacity-60 md:group-hover:opacity-100">
          <button
            type="button"
            className="p-1.5 rounded-lg text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] hover:bg-[var(--ds-fill-subtle)]"
            aria-label={`Rename chat ${chat.title || "Untitled chat"}`}
            onClick={(e) => {
              e.stopPropagation();
              onRenameStart(chat.id, chat.title || "");
            }}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--ds-text-muted)] hover:bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] hover:text-[var(--ds-danger)]"
            aria-label={`Delete chat ${chat.title || "Untitled chat"}`}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(chat.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
