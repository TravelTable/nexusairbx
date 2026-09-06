import React from "react";
import { FolderOpen, ArrowRight } from "../../../lib/icons";
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
  onQuickStart,
  recentProjects = [],
  onOpenProject,
  onOpenTemplates,
  onStartGuide,
  startGuideLabel = "Show the 5-step creator guide",
  guidedLaunchIdea,
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
            <p className="chat-empty-state__eyebrow">{guidedLaunchIdea ? 'Your first creation' : 'Start building'}</p>
            <h1 id="workspace-start-title">
              {guidedLaunchIdea ? 'Start with one playable part' : 'Your next Roblox game starts here.'}
            </h1>
            <p>
              {guidedLaunchIdea ? 'Your idea is here. Choose Plan my first milestone above, or use the conversation to shape it together.' : 'Start with an idea, shape the gameplay, and bring it to life in Studio.'}
            </p>
            {guidedLaunchIdea && <blockquote className="guided-launch-idea">{guidedLaunchIdea}</blockquote>}
          </div>
        </div>

        {!guidedLaunchIdea && onQuickStart ? (
          <div className="creator-starters" aria-label="Game starting points">
            {[
              { id: "obby", title: "Obby", detail: "Make every jump count", prompt: "Help me plan a colorful sky-island obby with checkpoints, moving platforms, and a finish reward." },
              { id: "simulator", title: "Simulator", detail: "Build a world that grows", prompt: "Help me plan a collecting simulator with satisfying upgrades, unlockable areas, and a simple first gameplay loop." },
              { id: "adventure", title: "Adventure", detail: "Give players a place to explore", prompt: "Help me plan an island adventure with exploration, a first quest, collectibles, and a memorable starting area." },
            ].map((idea) => (
              <button type="button" key={idea.id} className="creator-starter focus-ring" onClick={() => onQuickStart(idea.prompt)}>
                <img src={`/assets/nexus-template-worlds/${idea.id}.webp`} alt="" width="352" height="220" />
                <span><strong>{idea.title}</strong><small>{idea.detail}</small></span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : null}
        {recentProjects.length > 0 && onOpenProject ? (
          <div className="creator-recent" aria-label="Recent projects">
            <p>Continue building</p>
            {recentProjects.slice(0, 3).map((project) => (
              <button type="button" className="focus-ring" key={project.projectId} onClick={() => onOpenProject(project.projectId)}>
                <FolderOpen size={16} aria-hidden="true" /><span>{project.title || project.name || "Untitled project"}</span><ArrowRight size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : null}

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
