import React, { useEffect, useRef, useState } from "react";
import { ListChecks, Menu, Pencil } from "lib/icons";

function cleanTitle(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export default function ChatHeader({
  chatTitle = "New chat",
  projectTitle = "Workspace",
  studioConnected = false,
  studioConnectionState = "",
  isBusy = false,
  onRenameChat,
  onOpenNavigation,
  onOpenPlan,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chatTitle);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(chatTitle);
  }, [chatTitle, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const finishEditing = () => {
    const nextTitle = cleanTitle(draft);
    setEditing(false);
    if (nextTitle && nextTitle !== chatTitle) onRenameChat?.(nextTitle);
    else setDraft(chatTitle);
  };

  const connectionLabel = studioConnected
    ? "Studio Live"
    : String(studioConnectionState || "").toLowerCase() === "connecting"
      ? "Studio connecting"
      : "Studio offline";

  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] bg-ink-900/95 px-3 backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenNavigation}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white xl:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
          <span className="max-w-40 truncate text-gray-500">{projectTitle}</span>
          <span className="text-gray-700" aria-hidden="true">/</span>
        </div>

        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={finishEditing}
            onKeyDown={(event) => {
              if (event.key === "Enter") finishEditing();
              if (event.key === "Escape") {
                setDraft(chatTitle);
                setEditing(false);
              }
            }}
            maxLength={80}
            className="h-8 min-w-0 max-w-[min(46vw,28rem)] rounded-md border border-white/10 bg-white/[0.05] px-2 text-sm font-semibold text-white outline-none focus:border-[#00f5d4]/40"
            aria-label="Chat title"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="group/title flex min-w-0 items-center gap-1.5 rounded-md px-1 py-1 text-left text-sm font-semibold text-gray-100 transition-colors hover:bg-white/[0.04]"
            title="Rename chat"
          >
            <span className="truncate">{chatTitle}</span>
            <Pencil className="h-3 w-3 shrink-0 text-gray-600 opacity-0 transition-opacity group-hover/title:opacity-100 group-focus-visible/title:opacity-100" />
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {onOpenPlan ? (
          <button
            type="button"
            onClick={onOpenPlan}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <ListChecks className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Review</span>
          </button>
        ) : null}
        {isBusy ? (
          <span className="hidden text-[11px] font-medium text-gray-400 md:inline">Nexus working</span>
        ) : null}
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-gray-400"
          title={connectionLabel}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              studioConnected
                ? "bg-[#00f5d4] shadow-[0_0_7px_rgba(0,245,212,0.45)]"
                : "bg-gray-600"
            }`}
          />
          <span className="hidden sm:inline">{connectionLabel}</span>
        </span>
      </div>
    </header>
  );
}
