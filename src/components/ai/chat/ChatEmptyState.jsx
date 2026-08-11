import React from "react";
import { Layout, Code2, Rocket, LayoutGrid, ArrowRight } from "lib/icons";

const EXAMPLES = [
  {
    icon: Layout,
    eyebrow: "Adventure",
    title: "Floating-island quest",
    prompt: "Build a floating-island adventure with collectible crystals, checkpoints, and a simple quest HUD. Plan the change before writing to Studio.",
  },
  {
    icon: Code2,
    eyebrow: "Tycoon",
    title: "Café tycoon loop",
    prompt: "Build the core loop for a café tycoon: earn coins, unlock stations, save progress, and explain the first playtest.",
  },
  {
    icon: Rocket,
    eyebrow: "Existing game",
    title: "Inspect, fix, verify",
    prompt: "Inspect my paired Studio place, find the broken gameplay script, fix it safely, and show me the playtest evidence before I approve the result.",
  },
];

const BUILD_STAGES = ["Idea", "Plan", "Build", "Playtest"];

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
    <div className="flex min-h-full w-full flex-1 items-start justify-center py-[clamp(1.5rem,7vh,4.5rem)] motion-safe:animate-fade-in-up">
      <section className="w-full max-w-[920px]" aria-labelledby="workspace-start-title">
        <div className="grid items-end gap-6 border-b border-[var(--ds-border-subtle)] pb-6 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
          <div className="max-w-2xl text-left">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)]">
                <img src="/nexus-mark.svg" alt="" className="h-6 w-6 object-contain" />
              </span>
              <span className="text-xs font-semibold text-[var(--ds-accent)]">Creator workshop</span>
            </div>
            <h1 id="workspace-start-title" className="pc-display-heading text-[2.25rem] font-semibold leading-[1.05] text-[var(--ds-text)] sm:text-[3rem]">
              What are we building?
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--ds-text-secondary)]">
              Start with the game loop, not a code dump. Nexus can shape the plan, build in your paired place, and carry the result through a real playtest.
            </p>
          </div>

          <div className="rounded-[16px] border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-4 text-left">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-[var(--ds-text)]">Project build path</span>
              <span className="text-[11px] text-[var(--ds-text-muted)]">You approve the writes</span>
            </div>
            {hasBuildContext && (
              <div
                role="group"
                aria-label="Current build context"
                className="mb-4 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] px-3 py-2.5"
              >
                <dl className="grid gap-2">
                  {buildContext.projectTitle && (
                    <div className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-baseline gap-2">
                      <dt className="text-[10px] font-semibold text-[var(--ds-text-muted)]">Project</dt>
                      <dd
                        className="truncate text-xs font-semibold text-[var(--ds-text)]"
                        title={buildContext.projectTitle}
                      >
                        {buildContext.projectTitle}
                      </dd>
                    </div>
                  )}
                  {buildContext.placeTitle && (
                    <div className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-baseline gap-2">
                      <dt className="text-[10px] font-semibold text-[var(--ds-text-muted)]">Place</dt>
                      <dd className="min-w-0 text-xs font-semibold text-[var(--ds-text)]">
                        <span className="block truncate" title={buildContext.placeTitle}>
                          {buildContext.placeTitle}
                        </span>
                        {buildContext.placeId && buildContext.placeTitle !== `Place ${buildContext.placeId}` && (
                          <span className="mt-0.5 block truncate text-[10px] font-normal text-[var(--ds-text-muted)]">
                            Place {buildContext.placeId}
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                  {buildContext.hasStudioStatus && (
                    <div className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-center gap-2">
                      <dt className="text-[10px] font-semibold text-[var(--ds-text-muted)]">Studio</dt>
                      <dd className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-[var(--ds-text-secondary)]">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            buildContext.studioConnected
                              ? "bg-[var(--ds-success)]"
                              : "bg-[var(--ds-surface-3)]"
                          }`}
                          aria-hidden="true"
                        />
                        {buildContext.studioConnected ? "Connected" : "Disconnected"}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
            <ol className="grid grid-cols-4 gap-2" aria-label="Project build path">
              {BUILD_STAGES.map((stage, index) => (
                <li key={stage} className="min-w-0">
                  <span
                    className={`mb-2 block h-1.5 rounded-full ${
                      index === 0 ? "bg-[var(--ds-accent)]" : "bg-[var(--ds-fill-active)]"
                    }`}
                    aria-hidden="true"
                  />
                  <span className={`block truncate text-[10px] font-semibold ${
                    index === 0 ? "text-[var(--ds-accent)]" : "text-[var(--ds-text-muted)]"
                  }`}
                  >
                    {stage}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Starter builds">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.title}
              type="button"
              onClick={() => onQuickStart?.(ex.prompt)}
              className="group min-h-36 rounded-[16px] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] p-4 text-left transition-[border-color,background-color,transform] duration-[var(--motion-fast)] hover:-translate-y-0.5 hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-accent-soft)] focus-ring motion-reduce:transform-none"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]">
                  <ex.icon className="h-3.5 w-3.5" />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--ds-text-muted)] transition-colors group-hover:text-[var(--ds-accent)]" />
              </div>
              <div className="text-[10px] font-semibold text-[var(--ds-accent)]">{ex.eyebrow}</div>
              <div className="mt-1 text-[15px] font-semibold text-[var(--ds-text)]">{ex.title}</div>
              <div className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--ds-text-muted)]">{ex.prompt}</div>
            </button>
          ))}
        </div>

        {onOpenTemplates && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onOpenTemplates}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--ds-border)] px-4 text-xs font-semibold text-[var(--ds-text-secondary)] transition-colors hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-fill-subtle)] hover:text-[var(--ds-text)] focus-ring"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Browse build templates
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
