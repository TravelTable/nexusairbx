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
    <header className="relative z-20 flex h-11 shrink-0 items-center justify-between gap-3 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenNavigation}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-ring xl:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
          <span className="max-w-40 truncate text-[var(--ds-text-muted)]">{projectTitle}</span>
          <span className="text-[var(--ds-text-muted)]" aria-hidden="true">/</span>
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
            className="h-11 min-w-0 max-w-[min(46vw,28rem)] rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-2 text-sm font-medium text-[var(--ds-text)] outline-none focus:border-[var(--ds-accent-border)] focus-ring xl:h-8"
            aria-label="Chat title"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="group/title flex min-h-11 min-w-0 items-center gap-1.5 rounded-md px-1 py-1 text-left text-sm font-medium text-[var(--ds-text)] transition-colors hover:bg-[var(--ds-fill-subtle)] focus-ring xl:min-h-0"
            title="Rename chat"
          >
            <span className="truncate">{chatTitle}</span>
            <Pencil className="h-3 w-3 shrink-0 text-[var(--ds-text-muted)] opacity-0 transition-opacity group-hover/title:opacity-100 group-focus-visible/title:opacity-100" />
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {onOpenPlan ? (
          <button
            type="button"
            onClick={onOpenPlan}
            aria-label="Review plan"
            className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-ring xl:h-8 xl:min-w-0"
          >
            <ListChecks className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Review</span>
          </button>
        ) : null}
        {isBusy ? (
          <span className="hidden text-[11px] font-medium text-[var(--ds-text-secondary)] md:inline">Nexus working</span>
        ) : null}
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-[var(--ds-text-secondary)]"
          title={connectionLabel}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              studioConnected ? "bg-[var(--ds-accent)]" : "bg-[var(--ds-surface-3)]"
            }`}
          />
          <span className="hidden sm:inline">{connectionLabel}</span>
        </span>
      </div>
    </header>
  );
}
