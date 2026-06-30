import React, { useEffect, useRef } from "react";
import { ArrowLeft, X } from "lib/icons";
import { Button } from "../ui";
import { DEFAULT_TOOLTIP_SIZE } from "./tutorialGeometry";

export default function TutorialTooltip({
  step,
  placement,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onSizeChange,
}) {
  const { title, content } = step;
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const coords = placement || {
    top: 16,
    left: 16,
    width: DEFAULT_TOOLTIP_SIZE.width,
    placement: "bottom",
    arrow: null,
  };

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [currentStepIndex]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node || !onSizeChange) return undefined;

    const publishSize = () => {
      const rect = node.getBoundingClientRect();
      onSizeChange({
        width: rect.width || DEFAULT_TOOLTIP_SIZE.width,
        height: rect.height || DEFAULT_TOOLTIP_SIZE.height,
      });
    };

    publishSize();

    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(publishSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [onSizeChange, title, content]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onSkip?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSkip]);

  const arrow = coords.arrow;
  const arrowStyle = arrow
    ? arrow.side === "top" || arrow.side === "bottom"
      ? { [arrow.side]: -6, left: arrow.offset }
      : { [arrow.side]: -6, top: arrow.offset }
    : null;

  const arrowClass =
    arrow?.side === "top"
      ? "border-l border-t -translate-x-1/2"
      : arrow?.side === "bottom"
        ? "border-r border-b -translate-x-1/2"
        : arrow?.side === "left"
          ? "border-l border-b -translate-y-1/2"
          : arrow?.side === "right"
            ? "border-r border-t -translate-y-1/2"
            : "";

  return (
    <div
      ref={dialogRef}
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        width: coords.width,
        maxWidth: "calc(100vw - 32px)",
        zIndex: 110,
      }}
      className="rounded-xl border border-white/10 bg-[#121216]/95 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-[top,left,width] duration-200 ease-out focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-content"
      tabIndex={-1}
    >
      {arrow ? (
        <div
          className={`absolute h-3 w-3 rotate-45 bg-[#121216] border-white/10 ${arrowClass}`}
          style={arrowStyle}
          aria-hidden="true"
        />
      ) : null}

      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00f5d4]">
          Step {currentStepIndex + 1} of {totalSteps}
        </span>
        <button
          ref={closeRef}
          onClick={onSkip}
          className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white focus-ring"
          title="Skip Tour"
          aria-label="Skip onboarding tour"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <h4 id="tour-title" className="text-sm font-bold text-white mb-1.5 leading-snug">
        {title}
      </h4>
      <p id="tour-content" className="text-xs text-zinc-400 leading-relaxed mb-4">
        {content}
      </p>

      <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-3">
        <button
          onClick={onSkip}
          className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Skip Tour
        </button>

        <div className="flex items-center gap-2">
          {currentStepIndex > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrev}
              className="px-2 h-7 rounded-lg"
              title="Previous Step"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={onNext}
            className="px-3 h-7 rounded-lg text-[10px] font-bold uppercase tracking-wider"
          >
            {currentStepIndex + 1 === totalSteps ? "Finish" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
