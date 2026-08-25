import React from "react";
import { Boxes, FileCode2, FolderTree, Radio, ShieldCheck } from "lib/icons";

const BUILD_PATH = [
  { label: "Project", icon: FolderTree },
  { label: "Approach", icon: Radio },
  { label: "Files", icon: FileCode2 },
  { label: "Studio", icon: Boxes },
  { label: "Proof", icon: ShieldCheck },
];

function BuildPathMap({ studioConnected }) {
  return (
    <ol
      className="chat-empty-state__build-path"
      aria-label="Nexus build path: project, approach, files, Studio, and proof"
    >
      {BUILD_PATH.map(({ label, icon: Icon }, index) => (
        <li
          key={label}
          data-ready={
            label === "Studio" && studioConnected ? "true" : undefined
          }
        >
          <span className="chat-empty-state__build-node">
            <Icon aria-hidden="true" />
          </span>
          <span>{label}</span>
          {index < BUILD_PATH.length - 1 ? <i aria-hidden="true" /> : null}
        </li>
      ))}
    </ol>
  );
}

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
  studioPlacePreference,
}) {
  const normalizedProjectId = cleanContextValue(projectId);
  const normalizedProjectTitle = cleanContextValue(projectTitle);
  const selectedProjectTitle =
    normalizedProjectId &&
    normalizedProjectTitle &&
    normalizedProjectTitle.toLowerCase() !== "workspace"
      ? normalizedProjectTitle
      : "";

  const studioTarget =
    studioPlacePreference && typeof studioPlacePreference === "object"
      ? studioPlacePreference
      : null;
  const targetId = cleanContextValue(
    studioTarget?.targetId || studioTarget?.studioTargetId || studioTarget?.id,
  );
  const placeId = cleanContextValue(
    studioTarget?.placeId || studioTarget?.targetPlaceId,
  );
  const hasSelectedPlace = Boolean(targetId || placeId);
  const selectedPlaceTitle = hasSelectedPlace
    ? cleanContextValue(
        studioTarget?.placeName ||
          studioTarget?.label ||
          studioTarget?.experienceName ||
          studioTarget?.displayName ||
          studioTarget?.name,
      ) || (placeId ? `Place ${placeId}` : "Selected Studio place")
    : "";
  const hasStudioStatus =
    studioLoading === false && typeof studioConnected === "boolean";

  return {
    projectTitle: selectedProjectTitle,
    placeTitle: selectedPlaceTitle,
    placeId,
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
  studioPlacePreference,
}) {
  const buildContext = resolveBuildContext({
    projectTitle,
    projectId,
    studioConnected,
    studioLoading,
    studioPlacePreference,
  });
  const hasBuildContext = Boolean(
    buildContext.projectTitle ||
      buildContext.placeTitle ||
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
            <h1 id="workspace-start-title">What should Nexus build?</h1>
            <p>
              Describe the result you want. Nexus will inspect the paired
              project, make safe assumptions, build the change, and return
              verification evidence for review.
            </p>
          </div>
        </div>

        <BuildPathMap studioConnected={buildContext.studioConnected} />

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
            {buildContext.placeTitle ? (
              <div>
                <dt>Place</dt>
                <dd title={buildContext.placeTitle}>
                  {buildContext.placeTitle}
                  {buildContext.placeId &&
                  buildContext.placeTitle !==
                    `Place ${buildContext.placeId}` ? (
                    <small>Place {buildContext.placeId}</small>
                  ) : null}
                </dd>
              </div>
            ) : null}
            {buildContext.hasStudioStatus ? (
              <div>
                <dt>Studio</dt>
                <dd>
                  <span
                    className="chat-empty-state__status"
                    data-connected={
                      buildContext.studioConnected ? "true" : "false"
                    }
                    aria-hidden="true"
                  />
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
