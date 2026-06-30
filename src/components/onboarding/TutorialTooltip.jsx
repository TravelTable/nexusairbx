import React, { useState, useEffect } from "react";
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
  const { target, title, content, position } = step;
  const [coords, setCoords] = useState({ top: 0, left: 0, transform: "", position: "fixed" });

  useEffect(() => {
    const updateCoords = () => {
      const el = document.querySelector(target);
      if (!el) {
        // Center of the viewport fallback
        setCoords({
          top: window.innerHeight / 2,
          left: window.innerWidth / 2,
          transform: "translate(-50%, -50%)",
          position: "fixed",
        });
        return;
      }

      const rect = el.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      let top = 0;
      let left = 0;
      let transform = "";
      const gap = 14;

      switch (position) {
        case "top":
          top = rect.top + scrollY - gap;
          left = rect.left + scrollX + rect.width / 2;
          transform = "translate(-50%, -100%)";
          break;
        case "bottom":
          top = rect.bottom + scrollY + gap;
          left = rect.left + scrollX + rect.width / 2;
          transform = "translate(-50%, 0)";
          break;
        case "left":
          top = rect.top + scrollY + rect.height / 2;
          left = rect.left + scrollX - gap;
          transform = "translate(-100%, -50%)";
          break;
        case "right":
          top = rect.top + scrollY + rect.height / 2;
          left = rect.right + scrollX + gap;
          transform = "translate(0, -50%)";
          break;
        default:
          top = window.innerHeight / 2;
          left = window.innerWidth / 2;
          transform = "translate(-50%, -50%)";
          break;
      }

      setCoords({
        top,
        left,
        transform,
        position: "absolute",
      });
    };

    updateCoords();

    // Use ResizeObserver for more accurate coordination updates
    const el = document.querySelector(target);
    let observer;
    if (el) {
      observer = new ResizeObserver(updateCoords);
      observer.observe(el);
      observer.observe(document.body);
    }

    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, { passive: true });

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords);
    };
  }, [target, position]);

  return (
    <div
      style={{
        position: coords.position,
        top: coords.top,
        left: coords.left,
        transform: coords.transform,
        zIndex: 100,
      }}
      className="w-[320px] rounded-2xl border border-white/10 bg-[#121216]/95 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-250 ease-out"
      role="dialog"
      aria-labelledby="tour-title"
      aria-describedby="tour-content"
    >
      {/* Arrow Indicator */}
      {coords.position === "absolute" && (
        <div
          className={`absolute w-3 h-3 bg-[#121216] border-white/10 rotate-45 ${
            position === "top"
              ? "bottom-[-6px] left-1/2 -translate-x-1/2 border-r border-b"
              : position === "bottom"
              ? "top-[-6px] left-1/2 -translate-x-1/2 border-l border-t"
              : position === "left"
              ? "right-[-6px] top-1/2 -translate-y-1/2 border-r border-t"
              : position === "right"
              ? "left-[-6px] top-1/2 -translate-y-1/2 border-l border-b"
              : ""
          }`}
        />
      )}

      {/* Header Info */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00f5d4]">
          Step {currentStepIndex + 1} of {totalSteps}
        </span>
        <button
          onClick={onSkip}
          className="text-zinc-500 hover:text-white transition-colors"
          title="Skip Tour"
          aria-label="Skip onboarding tour"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <h4 id="tour-title" className="text-sm font-bold text-white mb-1.5 leading-snug">
        {title}
      </h4>
      <p id="tour-content" className="text-xs text-zinc-400 leading-relaxed mb-4">
        {content}
      </p>

      {/* Navigation Buttons */}
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
