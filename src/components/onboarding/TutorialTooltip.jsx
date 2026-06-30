import React, { useEffect, useRef } from "react";
import { ArrowLeft, X } from "lib/icons";
import { Button } from "../ui";

export default function TutorialTooltip({
  step,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}) {
  const { title, content } = step;
  const closeRef = useRef(null);
  const progress = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [currentStepIndex]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onSkip?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSkip]);

  return (
    <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[120] pointer-events-none sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[360px]">
      <section
        className="pointer-events-auto overflow-hidden rounded-2xl border border-white/10 bg-[#101015]/95 shadow-[0_24px_70px_rgba(0,0,0,0.52)] backdrop-blur-xl"
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-content"
      >
        <div className="h-1 bg-white/5" aria-hidden="true">
          <div className="h-full bg-[#00f5d4] transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00f5d4]">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
              <h4 id="tour-title" className="mt-1 text-base font-bold leading-tight text-white">
                {title}
              </h4>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onSkip}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-white focus-ring"
              title="Skip tour"
              aria-label="Skip onboarding tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p id="tour-content" className="text-sm leading-relaxed text-zinc-300">
            {content}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-3">
            <button
              type="button"
              onClick={onSkip}
              className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 transition-colors hover:text-zinc-300 focus-ring rounded-md px-1 py-1"
            >
              Skip
            </button>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrev}
                  className="h-9 rounded-lg px-2"
                  title="Previous step"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              ) : null}

              <Button
                variant="primary"
                size="sm"
                onClick={onNext}
                className="h-9 rounded-lg px-4 text-[10px] font-bold uppercase tracking-wider"
              >
                {currentStepIndex + 1 === totalSteps ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
