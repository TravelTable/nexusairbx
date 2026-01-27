import React from "react";
import { Edit, Trash2 } from "lucide-react";

export default function ChatRow({
  chat,
  currentChatId,
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

  return (
    <div
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-300 text-left group cursor-pointer relative overflow-hidden ${
        isSelected
          ? "border-[#9b5de5]/50 bg-[#9b5de5]/5 shadow-[0_0_20px_rgba(155,93,229,0.05)]"
          : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10"
      }`}
      onClick={() => onOpenChat(chat.id)}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#9b5de5] shadow-[0_0_10px_#9b5de5]" />
      )}
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <input
            className="bg-gray-800 border border-[#9b5de5] rounded-lg px-2 py-1 text-xs text-white w-full outline-none"
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
        ) : (
          <div className="flex flex-col gap-0.5">
            <span
              className={`font-bold text-sm truncate ${
                isSelected ? "text-white" : "text-gray-300 group-hover:text-white"
              }`}
            >
              {chat.title || "Untitled chat"}
            </span>
            <span className="text-[10px] text-gray-500 truncate">
              {chat.lastMessage || "No messages yet"}
            </span>
          </div>
        )}
      </div>
      {!isRenaming && (
        <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
          <button
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5"
            onClick={(e) => {
              e.stopPropagation();
              onRenameStart(chat.id, chat.title || "");
            }}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10"
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
