import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, MessageSquare, Loader2 } from "lib/icons";
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
  activeAgentStatusByChat = {},
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
    <Modal isOpen={isOpen} onClose={onClose} title="Chats">
      <div className="flex flex-col gap-4 max-h-[60vh]">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ds-text-muted)] group-focus-within:text-[var(--ds-plan)] transition-colors" />
          <input
            className="w-full rounded-xl bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)] px-10 py-3 text-sm text-[var(--ds-text)] outline-none focus:border-[color-mix(in_srgb,var(--ds-plan)_35%,transparent)] focus:bg-[var(--ds-fill-subtle)] transition-all"
            placeholder="Search all chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-subtle">
          {visibleChats.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-[var(--ds-fill-subtle)] border border-dashed border-[var(--ds-border-subtle)]">
              <MessageSquare className="w-10 h-10 text-[var(--ds-text-muted)] mx-auto mb-3" />
              <p className="text-sm text-[var(--ds-text-muted)]">No chats found.</p>
            </div>
          ) : (
            <>
              {visibleChats.map((c) => (
                <ChatRow
                  key={c.id}
                  chat={c}
                  currentChatId={currentChatId}
                  agentStatus={activeAgentStatusByChat[c.id] || null}
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
                  className="py-4 flex justify-center items-center gap-2 text-[var(--ds-text-muted)] text-xs"
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
