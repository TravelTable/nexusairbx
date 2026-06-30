import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import TutorialTooltip from "./TutorialTooltip";
import { TOUR_STEPS } from "./tourSteps";
import {
  DEFAULT_TOOLTIP_SIZE,
  createSpotlightRect,
  getTooltipPlacement,
  resolveTourTarget,
} from "./tutorialGeometry";

export default function TutorialOverlay({
  activeStep,
  isActive,
  nextStep,
  prevStep,
  skipTutorial,
}) {
  const maskId = useId().replace(/:/g, "");
  const pendingFrameRef = useRef(null);
  const pendingTimeoutRef = useRef(null);
  const [tooltipSize, setTooltipSize] = useState(DEFAULT_TOOLTIP_SIZE);
  const [targetState, setTargetState] = useState({
    rect: null,
    spotlight: null,
    tooltip: null,
    selector: null,
  });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const measureStep = useCallback(() => {
    const step = TOUR_STEPS[activeStep];
    const nextViewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    setViewport(nextViewport);

    if (!step) {
      setTargetState({ rect: null, spotlight: null, tooltip: null, selector: null });
      return null;
    }

    const { element, selector } = resolveTourTarget(step, nextViewport.width);
    if (!element) {
      setTargetState({ rect: null, spotlight: null, tooltip: null, selector: null });
      return null;
    }

    const rect = element.getBoundingClientRect();
    const spotlight = createSpotlightRect(rect);
    const tooltip = getTooltipPlacement({
      targetRect: rect,
      preferredPosition: step.position,
      tooltipSize,
      viewport: nextViewport,
    });

    setTargetState({ rect, spotlight, tooltip, selector });
    return element;
  }, [activeStep, tooltipSize]);

  const scheduleMeasure = useCallback(() => {
    if (pendingFrameRef.current) cancelAnimationFrame(pendingFrameRef.current);
    pendingFrameRef.current = requestAnimationFrame(() => {
      pendingFrameRef.current = null;
      measureStep();
    });
  }, [measureStep]);

  const handleTooltipSizeChange = useCallback((nextSize) => {
    setTooltipSize((currentSize) => {
      if (currentSize.width === nextSize.width && currentSize.height === nextSize.height) {
        return currentSize;
      }

      return nextSize;
    });
  }, []);

  useEffect(() => {
    if (!isActive) return undefined;

    const step = TOUR_STEPS[activeStep];
    const element = measureStep();

    if (!step) return undefined;

    if (!element) {
      const skipTimer = window.setTimeout(() => nextStep(TOUR_STEPS.length), 80);
      return () => window.clearTimeout(skipTimer);
    }

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    element.scrollIntoView({
      block: "center",
      inline: "center",
      behavior: reduceMotion ? "auto" : "smooth",
    });

    scheduleMeasure();
    pendingTimeoutRef.current = window.setTimeout(scheduleMeasure, reduceMotion ? 40 : 220);

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(scheduleMeasure);
      observer.observe(element);
      observer.observe(document.body);
    }

    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, { passive: true, capture: true });

    return () => {
      if (pendingFrameRef.current) cancelAnimationFrame(pendingFrameRef.current);
      if (pendingTimeoutRef.current) window.clearTimeout(pendingTimeoutRef.current);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, { capture: true });
    };
  }, [activeStep, isActive, measureStep, nextStep, scheduleMeasure]);

  useEffect(() => {
    if (isActive) scheduleMeasure();
  }, [isActive, scheduleMeasure, tooltipSize]);

  if (!isActive) return null;

  const currentStep = TOUR_STEPS[activeStep];
  const spotlight = targetState.spotlight;
  const maskStyle = {
    maskImage: `url(#${maskId})`,
    WebkitMaskImage: `url(#${maskId})`,
  };

  const overlay = (
    <div className="fixed inset-0 z-[100] pointer-events-none select-none">
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        aria-hidden="true"
        viewBox={`0 0 ${viewport.width || 1} ${viewport.height || 1}`}
        preserveAspectRatio="none"
      >
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={viewport.width || 1}
            height={viewport.height || 1}
          >
            <rect x="0" y="0" width={viewport.width || 1} height={viewport.height || 1} fill="white" />
            {spotlight ? (
              <rect
                x={spotlight.left}
                y={spotlight.top}
                width={spotlight.width}
                height={spotlight.height}
                rx={spotlight.radius}
                ry={spotlight.radius}
                fill="black"
              />
            ) : null}
          </mask>
        </defs>
      </svg>

      <div
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[3px] pointer-events-auto transition-opacity duration-200"
        style={maskStyle}
        aria-hidden="true"
      />

      {spotlight ? (
        <div
          className="absolute pointer-events-none rounded-xl border border-[#00f5d4]/35 shadow-[0_0_0_1px_rgba(0,245,212,0.12),0_0_28px_rgba(0,245,212,0.1)] transition-all duration-200"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
          aria-hidden="true"
        />
      ) : null}

      {currentStep && targetState.tooltip ? (
        <div className="pointer-events-auto">
          <TutorialTooltip
            step={currentStep}
            placement={targetState.tooltip}
            currentStepIndex={activeStep}
            totalSteps={TOUR_STEPS.length}
            onNext={() => nextStep(TOUR_STEPS.length)}
            onPrev={prevStep}
            onSkip={skipTutorial}
            onSizeChange={handleTooltipSizeChange}
          />
        </div>
      ) : null}
    </div>
  );

  return createPortal(overlay, document.body);
}
