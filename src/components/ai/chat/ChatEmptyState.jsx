import React from "react";
const STARTERS = [
  {
    phase: "NEW WORLD",
    title: "Design a simulator loop",
    prompt: "Plan a Roblox simulator with a satisfying upgrade loop, retention systems, monetization options, and a small first version I can playtest today.",
  },
  {
    phase: "CHANGE SET",
    title: "Add an inventory that fits this game",
    prompt: "Inspect my project and build an inventory UI that matches the existing visual style, works on mobile, and saves player items safely.",
  },
  {
    phase: "FAULT REPORT",
    title: "Find the break, fix it, prove it",
    prompt: "Inspect my paired Studio place, trace the broken gameplay flow, fix it safely, and show the playtest evidence before I approve the result.",
  },
];

function cleanContextValue(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
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
  const selectedProjectTitle = normalizedProjectId
    && normalizedProjectTitle
    && normalizedProjectTitle.toLowerCase() !== "workspace"
    ? normalizedProjectTitle
    : "";

  const studioTarget = studioPlacePreference && typeof studioPlacePreference === "object"
    ? studioPlacePreference
    : null;
  const targetId = cleanContextValue(
    studioTarget?.targetId || studioTarget?.studioTargetId || studioTarget?.id,
  );
  const placeId = cleanContextValue(studioTarget?.placeId || studioTarget?.targetPlaceId);
  const hasSelectedPlace = Boolean(targetId || placeId);
  const selectedPlaceTitle = hasSelectedPlace
    ? cleanContextValue(
        studioTarget?.placeName
        || studioTarget?.label
        || studioTarget?.experienceName
        || studioTarget?.displayName
        || studioTarget?.name,
      ) || (placeId ? `Place ${placeId}` : "Selected Studio place")
    : "";
  const hasStudioStatus = studioLoading === false && typeof studioConnected === "boolean";

  return {
    projectTitle: selectedProjectTitle,
    placeTitle: selectedPlaceTitle,
    placeId,
    hasStudioStatus,
    studioConnected: studioConnected === true,
  };
}

export default function ChatEmptyState({
  onQuickStart,
  onOpenTemplates,
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
    buildContext.projectTitle || buildContext.placeTitle || buildContext.hasStudioStatus,
  );

  return (
    <div className="chat-empty-state">
      <section className="chat-empty-state__inner" aria-labelledby="workspace-start-title">
        <div className="chat-empty-state__intro">
          <div className="chat-empty-state__copy">
            <p className="chat-empty-state__eyebrow">REQUEST / 000 — OPEN</p>
            <h1 id="workspace-start-title">What are we changing?</h1>
            <p>
              Name the game, system, interface, or fault. Nexus will read the paired project,
              plan the change, record every file it touches, and return test evidence for review.
            </p>
          </div>
        </div>

        {hasBuildContext ? (
          <dl className="chat-empty-state__context" role="group" aria-label="Current build context">
            {buildContext.projectTitle ? (
              <div>
                <dt>Project</dt>
                <dd title={buildContext.projectTitle}>{buildContext.projectTitle}</dd>
              </div>
            ) : null}
            {buildContext.placeTitle ? (
              <div>
                <dt>Place</dt>
                <dd title={buildContext.placeTitle}>
                  {buildContext.placeTitle}
                  {buildContext.placeId && buildContext.placeTitle !== `Place ${buildContext.placeId}`
                    ? <small>Place {buildContext.placeId}</small>
                    : null}
                </dd>
              </div>
            ) : null}
            {buildContext.hasStudioStatus ? (
              <div>
                <dt>Studio</dt>
                <dd>
                  <span
                    className="chat-empty-state__status"
                    data-connected={buildContext.studioConnected ? "true" : "false"}
                    aria-hidden="true"
                  />
                  {buildContext.studioConnected ? "Connected" : "Disconnected"}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="chat-empty-state__starters" aria-label="Roblox starter requests">
          {STARTERS.map((starter) => (
            <button
              key={starter.title}
              type="button"
              onClick={() => onQuickStart?.(starter.prompt)}
              className="chat-empty-state__starter focus-ring"
            >
              <span className="chat-empty-state__starter-copy">
                <span>
                  <small>{starter.phase}</small>
                  <strong>{starter.title}</strong>
                </span>
              </span>
              <span className="chat-empty-state__starter-action" aria-hidden="true">Load request →</span>
            </button>
          ))}
        </div>

        <div className="chat-empty-state__footer">
          <span>The project stays readable. Nothing ships without a record.</span>
          {onOpenTemplates ? (
            <button type="button" onClick={onOpenTemplates} className="chat-empty-state__templates focus-ring">
              Browse request templates →
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
