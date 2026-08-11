import React from "react";
import { ArrowLeft, ArrowRight, Info, X } from "lib/icons";
import { Button } from "../ui";

export default function TutorialTooltip({
  step,
  currentStepIndex,
  totalSteps,
  hasTarget,
  onNext,
  onPrev,
  onSkip,
}) {
  const { title, content, action, targetLabel, missingTargetHint } = step;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;
  const isLastStep = currentStepIndex + 1 === totalSteps;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[120] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[380px]">
      <section
        className="pointer-events-auto overflow-hidden rounded-2xl border border-[var(--ds-accent-border)] bg-[var(--ds-surface-overlay)] shadow-[var(--ds-shadow-overlay)]"
        aria-live="polite"
        aria-labelledby="tour-title"
        aria-describedby="tour-content"
      >
        <div className="h-1 bg-[var(--ds-fill-hover)]" aria-hidden="true">
          <div
            className="h-full origin-left bg-[var(--ds-accent)] transition-transform duration-200 ease-out motion-reduce:transition-none"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--ds-accent)]">
                Creator milestone {currentStepIndex + 1} of {totalSteps}
              </span>
              <h2 id="tour-title" className="mt-1 text-base font-bold leading-tight text-[var(--ds-text)]">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="focus-ring flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-[var(--ds-text-subtle)] transition-colors duration-150 hover:bg-[var(--ds-accent-soft)] hover:text-[var(--ds-accent)] motion-reduce:transition-none"
              title="Dismiss guide"
              aria-label="Dismiss creator milestones"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p id="tour-content" className="text-sm leading-relaxed text-[var(--ds-text-secondary)]">
            {content}
          </p>

          <div className="mt-3 rounded-xl border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-3 py-2.5">
            <p className="text-xs font-semibold leading-relaxed text-[var(--ds-text)]">
              <span className="mr-1 text-[var(--ds-accent)]">Try this:</span>
              {action}
            </p>
          </div>

          <div className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[var(--ds-text-muted)]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ds-accent)]" aria-hidden="true" />
            <span>
              {hasTarget
                ? `${targetLabel || "The relevant control"} is highlighted in your workspace.`
                : missingTargetHint}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ds-border-subtle)] pt-3">
            <button
              type="button"
              onClick={onSkip}
              className="focus-ring min-h-11 rounded-lg px-2 text-xs font-bold text-[var(--ds-text-subtle)] transition-colors duration-150 hover:text-[var(--ds-text)] motion-reduce:transition-none"
            >
              Dismiss guide
            </button>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrev}
                  className="min-h-11 rounded-xl px-3"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Back
                </Button>
              ) : null}

              <Button
                variant="primary"
                size="sm"
                onClick={onNext}
                className="min-h-11 rounded-xl bg-[var(--ds-accent)] px-4 text-xs font-bold text-[var(--ds-accent-foreground)] hover:bg-[var(--ds-accent-hover)]"
              >
                {isLastStep ? "Finish" : "Next milestone"}
                {isLastStep ? null : <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
