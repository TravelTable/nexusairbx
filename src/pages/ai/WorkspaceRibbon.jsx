import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ClipboardList, Menu, Pencil } from "lib/icons";
import UniversalWorkspaceRibbon from "../../components/universal/WorkspaceRibbon";
import "./WorkspaceRibbon.css";

function cleanTitle(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function WorkspaceRibbon({
  mode,
  onModeChange,
  projectTitle,
  chatTitle,
  modelControl,
  studioControl,
  isBusy = false,
  navigationOpen = false,
  navigationControls = undefined,
  navigationButtonRef = null,
  onToggleNavigation,
  onRenameChat,
  onChangeProject,
  onOpenEvidence,
  evidenceOpen = false,
  evidenceCount = 0,
  evidenceButtonRef = null,
}) {
  const visibleProjectTitle = projectTitle || "Choose game";
  const visibleChatTitle = chatTitle || "New chat";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chatTitle || "New chat");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(chatTitle || "New chat");
  }, [chatTitle, editing]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const finishEditing = () => {
    const nextTitle = cleanTitle(draft);
    setEditing(false);
    if (nextTitle && nextTitle !== chatTitle) onRenameChat?.(nextTitle);
    else setDraft(chatTitle || "New chat");
  };

  return (
    <UniversalWorkspaceRibbon
      label=""
      left={
        <>
          {mode === "agent" ? (
            <button
              ref={navigationButtonRef}
              type="button"
              className="ai-workspace-ribbon__nav focus-ring"
              aria-label="Toggle project navigation"
              aria-controls={navigationControls}
              aria-expanded={navigationOpen}
              onClick={onToggleNavigation}
            >
              <Menu aria-hidden="true" />
              <span>Projects</span>
            </button>
          ) : null}
          <div className="ai-workspace-ribbon__project">
            <button
              type="button"
              className="ai-workspace-ribbon__project-switch focus-ring"
              onClick={onChangeProject}
              title="Change game"
              aria-label={`Change game. Current game: ${visibleProjectTitle}`}
            >
              <span className="ai-workspace-ribbon__project-name">{visibleProjectTitle}</span>
              <ChevronDown aria-hidden="true" />
            </button>
            <i aria-hidden="true">/</i>
            {editing ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={finishEditing}
                onKeyDown={(event) => {
                  if (event.key === "Enter") finishEditing();
                  if (event.key === "Escape") {
                    setDraft(chatTitle || "New chat");
                    setEditing(false);
                  }
                }}
                maxLength={80}
                className="ai-workspace-ribbon__title-input focus-ring"
                aria-label="Chat title"
              />
            ) : onRenameChat ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="ai-workspace-ribbon__title focus-ring"
                title="Rename chat"
              >
                <strong>{visibleChatTitle}</strong>
                <Pencil aria-hidden="true" />
              </button>
            ) : (
              <strong className="ai-workspace-ribbon__static-title">{visibleChatTitle}</strong>
            )}
          </div>
        </>
      }
      right={
        <>
          <div
            data-tour="mode-switcher"
            className="ai-workspace-ribbon__modes"
            role="group"
            aria-label="Workspace mode"
          >
            <button
              type="button"
              data-active={mode === "agent" ? "true" : "false"}
              aria-pressed={mode === "agent"}
              onClick={() => onModeChange("agent")}
            >
              Agent
            </button>
            <button
              type="button"
              data-active={mode === "asset" ? "true" : "false"}
              aria-pressed={mode === "asset"}
              onClick={() => onModeChange("asset")}
            >
              Asset
            </button>
          </div>
          {modelControl ? <div className="ai-workspace-ribbon__model">{modelControl}</div> : null}
          <div data-tour="studio-pair" className="ai-workspace-ribbon__studio">
            {studioControl}
          </div>
          {mode === "agent" ? (
            <button
              ref={evidenceButtonRef}
              type="button"
              className="ai-workspace-ribbon__utility focus-ring"
              data-active={evidenceOpen ? "true" : "false"}
              aria-label={
                evidenceCount
                  ? `Open Evidence, ${evidenceCount} new ${evidenceCount === 1 ? "item" : "items"}`
                  : "Open Evidence"
              }
              aria-expanded={evidenceOpen}
              onClick={onOpenEvidence}
            >
              <ClipboardList aria-hidden="true" />
              <span>Evidence</span>
              <b aria-hidden="true">{evidenceCount}</b>
            </button>
          ) : null}
          {isBusy ? (
            <span className="ai-workspace-ribbon__run" role="status">
              <i className="nx-build-signal" data-active="true" aria-hidden="true" />
              Building
            </span>
          ) : null}
        </>
      }
    />
  );
}
