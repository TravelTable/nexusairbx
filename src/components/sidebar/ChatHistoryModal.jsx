import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, MessageSquare, Loader2 } from "lucide-react";
import Modal from "../Modal";
import ChatRow from "./ChatRow";

export default function ChatHistoryModal({
  isOpen,
  onClose,
  chats,
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
  const [searchTerm, setSearchTerm] = useState("");
  const [displayLimit, setDisplayLimit] = useState(10);
  const observerTarget = useRef(null);

  const filteredChats = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = Array.isArray(chats) ? chats : [];
    if (!q) return list;
    return list.filter(
      (c) =>
        (c.title || "").toLowerCase().includes(q) ||
        (c.lastMessage || "").toLowerCase().includes(q)
    );
  }, [chats, searchTerm]);

  const visibleChats = useMemo(() => {
    return filteredChats.slice(0, displayLimit);
  }, [filteredChats, displayLimit]);

  const hasMore = displayLimit < filteredChats.length;

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setDisplayLimit(10);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setDisplayLimit((prev) => prev + 10);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isOpen, hasMore]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chat History">
      <div className="flex flex-col gap-4 max-h-[60vh]">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-[#9b5de5] transition-colors" />
          <input
            className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-10 py-3 text-sm text-white outline-none focus:border-[#9b5de5]/30 focus:bg-white/[0.05] transition-all"
            placeholder="Search all chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {visibleChats.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10">
              <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No chats found.</p>
            </div>
          ) : (
            <>
              {visibleChats.map((c) => (
                <ChatRow
                  key={c.id}
                  chat={c}
                  currentChatId={currentChatId}
                  onOpenChat={(id) => {
                    onOpenChat(id);
                    onClose();
                  }}
                  renamingChatId={renamingChatId}
                  renameChatTitle={renameChatTitle}
                  setRenameChatTitle={setRenameChatTitle}
                  onRenameStart={onRenameStart}
                  onRenameCommit={onRenameCommit}
                  onRenameCancel={onRenameCancel}
                  onDeleteClick={onDeleteClick}
                />
              ))}
              
              {hasMore && (
                <div 
                  ref={observerTarget} 
                  className="py-4 flex justify-center items-center gap-2 text-gray-500 text-xs"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading more chats...
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
