import React from "react";
import ChatComposer from "./ChatComposer";
import './WorkspaceControls.css';

export default function CreationPromptComposer({
  contextIcon: ContextIcon,
  contextLabel,
  modeControl: customModeControl,
  promptAriaLabel,
  submitLabel,
  showWorkspaceOptions = false,
  workspaceOptionsContent = null,
  workspaceOptionsTitle,
  workspaceOptionsDescription,
  ...props
}) {
  const modeControl = customModeControl !== undefined ? customModeControl : contextLabel ? (
    <span className="nexus-composer-context" aria-label={`${contextLabel} composer`}>
      {ContextIcon ? <ContextIcon className="h-3.5 w-3.5" /> : null}
      <span>{contextLabel}</span>
    </span>
  ) : null;

  return (
    <ChatComposer
      {...props}
      modeControl={modeControl}
      promptAriaLabel={promptAriaLabel}
      submitLabel={submitLabel}
      showWorkspaceOptions={showWorkspaceOptions}
      customWorkspaceOptionsContent={workspaceOptionsContent}
      workspaceOptionsTitle={workspaceOptionsTitle}
      workspaceOptionsDescription={workspaceOptionsDescription}
      showDock={false}
      studioConnectionRequired={false}
    />
  );
}
