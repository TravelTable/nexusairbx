import React from "react";
import UniversalWorkspaceRibbon from "../../components/universal/WorkspaceRibbon";
import "./WorkspaceRibbon.css";

export default function WorkspaceRibbon({
  mode,
  onModeChange,
  projectTitle,
  modelControl,
  studioControl,
  isBusy = false,
}) {
  return (
    <UniversalWorkspaceRibbon
      label="CURRENT PROJECT"
      left={(
        <div className="ai-workspace-ribbon__project" title={projectTitle}>
          <strong>{projectTitle || "Workspace"}</strong>
          <span>{mode === "agent_build" ? "BUILD RECORD" : "SCRIPT RECORD"}</span>
        </div>
      )}
      right={(
        <>
          <div
            data-tour="mode-switcher"
            className="ai-workspace-ribbon__modes"
            role="group"
            aria-label="Workspace mode"
          >
            <button
              type="button"
              data-active={mode === "agent_build" ? "true" : "false"}
              aria-pressed={mode === "agent_build"}
              onClick={() => onModeChange("agent_build")}
            >
              Build
            </button>
            <button
              type="button"
              data-active={mode === "quick_script" ? "true" : "false"}
              aria-pressed={mode === "quick_script"}
              onClick={() => onModeChange("quick_script")}
            >
              Script
            </button>
          </div>
          {modelControl ? <div className="ai-workspace-ribbon__model">{modelControl}</div> : null}
          <div data-tour="studio-pair" className="ai-workspace-ribbon__studio">{studioControl}</div>
          {isBusy ? <span className="ai-workspace-ribbon__run" role="status">Run active</span> : null}
        </>
      )}
    />
  );
}
