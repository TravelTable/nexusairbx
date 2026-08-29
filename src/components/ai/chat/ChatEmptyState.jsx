import React from "react";
import { Shimmer } from "../../ai-elements/shimmer";
import LinkIcon from "../../ui/LinkIcon";
import LinkSlashIcon from "../../ui/LinkSlashIcon";

function cleanContextValue(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveBuildContext({
  projectTitle,
  projectId,
  studioConnected,
  studioLoading,
}) {
  const normalizedProjectId = cleanContextValue(projectId);
  const normalizedProjectTitle = cleanContextValue(projectTitle);
  const selectedProjectTitle =
    normalizedProjectId &&
    normalizedProjectTitle &&
    normalizedProjectTitle.toLowerCase() !== "workspace"
      ? normalizedProjectTitle
      : "";

  const hasStudioStatus =
    studioLoading === false && typeof studioConnected === "boolean";

  return {
    projectTitle: selectedProjectTitle,
    hasStudioStatus,
    studioConnected: studioConnected === true,
  };
}

export default function ChatEmptyState({
  onOpenTemplates,
  onStartGuide,
  startGuideLabel = "Show the 5-step creator guide",
  projectTitle,
  projectId,
  studioConnected,
  studioLoading,
}) {
  const buildContext = resolveBuildContext({
    projectTitle,
    projectId,
    studioConnected,
    studioLoading,
  });
  const hasBuildContext = Boolean(
    buildContext.projectTitle ||
      buildContext.hasStudioStatus,
  );

  return (
    <div className="chat-empty-state">
      <section
        className="chat-empty-state__inner"
        aria-labelledby="workspace-start-title"
      >
        <div className="chat-empty-state__intro">
          <div className="chat-empty-state__copy">
            <p className="chat-empty-state__eyebrow">Start building</p>
            <h1 id="workspace-start-title">
              <Shimmer
                as="span"
                duration={2.4}
                spread={1.5}
                baseColor="var(--nx-text)"
                highlightColor="var(--nx-purple-strong)"
              >
                What should Nexus build?
              </Shimmer>
            </h1>
            <p>
              Describe the result you want. Nexus will inspect the connected
              Studio session, make safe assumptions, build the change, and return
              verification evidence for review.
            </p>
          </div>
        </div>

        {hasBuildContext ? (
          <dl
            className="chat-empty-state__context"
            role="group"
            aria-label="Current build context"
          >
            {buildContext.projectTitle ? (
              <div>
                <dt>Project</dt>
                <dd title={buildContext.projectTitle}>
                  {buildContext.projectTitle}
                </dd>
              </div>
            ) : null}
            {buildContext.hasStudioStatus ? (
              <div>
                <dt>Studio</dt>
                <dd className={buildContext.studioConnected ? "chat-empty-state__connected" : "chat-empty-state__disconnected"}>
                  {buildContext.studioConnected ? (
                    <LinkIcon
                      className="chat-empty-state__connected-icon"
                      size={14}
                      aria-hidden="true"
                    />
                  ) : (
                    <LinkSlashIcon
                      className="chat-empty-state__disconnected-icon"
                      size={14}
                      aria-hidden="true"
                    />
                  )}
                  {buildContext.studioConnected ? "Connected" : "Disconnected"}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {onOpenTemplates || onStartGuide ? (
          <div className="chat-empty-state__footer">
            {onOpenTemplates ? (
              <button
                type="button"
                onClick={onOpenTemplates}
                className="chat-empty-state__templates focus-ring"
              >
                Browse request templates →
              </button>
            ) : null}
            {onStartGuide ? (
              <button
                type="button"
                onClick={onStartGuide}
                className="chat-empty-state__templates focus-ring"
              >
                {startGuideLabel} →
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
