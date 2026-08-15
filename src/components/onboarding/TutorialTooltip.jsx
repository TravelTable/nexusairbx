import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lib/icons";
import { getCollisionSafeTourPosition } from "./tutorialGeometry";

const DEFAULT_TOOLTIP_SIZE = { width: 340, height: 276 };

export default function TutorialTooltip({
  step,
  currentStepIndex,
  totalSteps,
  hasTarget,
  targetRect,
  onNext,
  onPrev,
  onSkip,
}) {
  const { title, content, action, targetLabel, missingTargetHint } = step;
  const isLastStep = currentStepIndex + 1 === totalSteps;
  const panelRef = useRef(null);
  const [panelSize, setPanelSize] = useState(DEFAULT_TOOLTIP_SIZE);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;

    const measure = () => {
      const rect = panel.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      setPanelSize((current) => (
        Math.abs(current.width - rect.width) < 0.5
          && Math.abs(current.height - rect.height) < 0.5
          ? current
          : { width: rect.width, height: rect.height }
      ));
    };

    measure();
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(measure);
    observer?.observe(panel);
    return () => observer?.disconnect();
  }, [currentStepIndex]);

  const position = useMemo(() => getCollisionSafeTourPosition({
    targetRect: hasTarget ? targetRect : null,
    viewportWidth: typeof window === "undefined" ? 1024 : window.innerWidth,
    viewportHeight: typeof window === "undefined" ? 768 : window.innerHeight,
    tooltipWidth: panelSize.width,
    tooltipHeight: panelSize.height,
  }), [hasTarget, panelSize.height, panelSize.width, targetRect]);

  return (
    <div
      className="pointer-events-none fixed z-[120]"
      data-placement={position.placement}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        width: `${position.width}px`,
        maxWidth: "calc(100vw - 24px)",
      }}
    >
      <section
        ref={panelRef}
        className="pointer-events-auto overflow-y-auto rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface-overlay)] shadow-[var(--ds-shadow-overlay)]"
        style={{ maxHeight: `${position.maxHeight}px` }}
        aria-live="polite"
        aria-labelledby="tour-title"
        aria-describedby="tour-content"
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-text-muted)]">
                Milestone {currentStepIndex + 1} of {totalSteps}
              </p>
              <h2 id="tour-title" className="mt-1.5 text-[15px] font-semibold leading-5 text-[var(--ds-text)]">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="focus-ring -mr-1 -mt-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] text-[var(--ds-text-muted)] transition-colors duration-150 hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] motion-reduce:transition-none"
              title="Dismiss guide"
              aria-label="Dismiss creator milestones"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className="mt-3 flex gap-1"
            role="progressbar"
            aria-label={`Creator milestones: ${currentStepIndex + 1} of ${totalSteps}`}
            aria-valuemin="1"
            aria-valuemax={totalSteps}
            aria-valuenow={currentStepIndex + 1}
          >
            {Array.from({ length: totalSteps }, (_, index) => (
              <span
                key={index}
                className={`h-0.5 flex-1 rounded-full ${
                  index <= currentStepIndex
                    ? "bg-[var(--ds-text)]"
                    : "bg-[var(--ds-fill-active)]"
                }`}
                aria-hidden="true"
              />
            ))}
          </div>

          <p id="tour-content" className="mt-3 text-sm leading-6 text-[var(--ds-text-secondary)]">
            {content}
          </p>

          <div className="mt-3 rounded-[10px] bg-[var(--ds-fill-subtle)] px-3 py-2.5">
            <p className="text-xs font-semibold leading-5 text-[var(--ds-text)]">
              <span className="mr-1 text-[var(--ds-text-muted)]">Next action:</span>
              {action}
            </p>
          </div>

          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--ds-text-muted)]">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ds-text-muted)]" aria-hidden="true" />
            <span>
              {hasTarget
                ? `${targetLabel || "The relevant control"} is outlined in the workspace.`
                : missingTargetHint}
            </span>
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ds-border-subtle)] pt-3">
            <button
              type="button"
              onClick={onSkip}
              className="focus-ring min-h-11 rounded-[10px] px-2 text-xs font-semibold text-[var(--ds-text-muted)] transition-colors duration-150 hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] motion-reduce:transition-none"
            >
              Dismiss guide
            </button>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 ? (
                <button
                  type="button"
                  onClick={onPrev}
                  className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-3 text-xs font-semibold text-[var(--ds-text-secondary)] transition-colors duration-150 hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] motion-reduce:transition-none"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Back
                </button>
              ) : null}

              <button
                type="button"
                onClick={onNext}
                className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-[var(--ds-text)] px-4 text-xs font-semibold text-[var(--ds-bg-canvas)] transition-colors duration-150 hover:bg-[var(--ds-text-secondary)] motion-reduce:transition-none"
              >
                {isLastStep ? "Finish" : "Next milestone"}
                {isLastStep ? null : <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
