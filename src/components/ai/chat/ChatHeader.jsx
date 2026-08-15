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
  workspaceControls = null,
  navigationOpen = false,
  navigationControls = undefined,
  navigationButtonRef = null,
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
    <header className="nexus-chat-header">
      <div className="nexus-chat-header__identity">
        <button
          ref={navigationButtonRef}
          type="button"
          onClick={onOpenNavigation}
          className="nexus-chat-header__nav focus-ring"
          aria-label="Toggle project navigation"
          aria-controls={navigationControls}
          aria-expanded={navigationOpen}
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="nexus-chat-header__mark" aria-hidden="true">
          <span>N</span>
        </div>

        <div className="nexus-chat-header__titles">
          <span className="nexus-chat-header__project" title={projectTitle}>{projectTitle}</span>

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
              className="nexus-chat-header__title-input focus-ring"
              aria-label="Chat title"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="nexus-chat-header__title group/title focus-ring"
              title="Rename chat"
            >
              <span>{chatTitle}</span>
              <Pencil className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/title:opacity-100 group-focus-visible/title:opacity-100" />
            </button>
          )}
        </div>
      </div>

      <div className="nexus-chat-header__controls">
        {workspaceControls ? <div className="nexus-chat-header__workspace-controls">{workspaceControls}</div> : null}
        {onOpenPlan ? (
          <button
            type="button"
            onClick={onOpenPlan}
            aria-label="Review plan"
            className="nexus-chat-header__review focus-ring"
          >
            <ListChecks className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Review</span>
          </button>
        ) : null}
        {isBusy ? (
          <span className="nexus-chat-header__working" role="status">
            <span aria-hidden="true" />
            Nexus working
          </span>
        ) : null}
        <span
          className="nexus-chat-header__studio-state"
          title={connectionLabel}
        >
          <span
            className="nexus-chat-header__studio-dot"
            data-connected={studioConnected ? "true" : "false"}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">{connectionLabel}</span>
        </span>
      </div>
    </header>
  );
}
