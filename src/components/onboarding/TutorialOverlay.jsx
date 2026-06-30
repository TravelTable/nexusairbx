import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import TutorialTooltip from "./TutorialTooltip";
import { TOUR_STEPS } from "./tourSteps";
import { resolveTourTarget } from "./tutorialGeometry";

const TOUR_TARGET_CLASS = "nexus-tour-active-target";
const TOUR_TARGET_LABEL = "data-nexus-tour-label";
const RING_STYLE_ID = "nexus-tour-target-style";

function ensureRingStyles() {
  if (document.getElementById(RING_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = RING_STYLE_ID;
  style.textContent = `
    .${TOUR_TARGET_CLASS} {
      position: relative !important;
      z-index: 70 !important;
      outline: 2px solid rgba(0, 245, 212, 0.95) !important;
      outline-offset: 5px !important;
      box-shadow:
        0 0 0 7px rgba(0, 245, 212, 0.14),
        0 0 30px rgba(0, 245, 212, 0.26) !important;
      border-radius: 12px !important;
      transition:
        outline-color 160ms ease,
        outline-offset 160ms ease,
        box-shadow 160ms ease !important;
    }

    .${TOUR_TARGET_CLASS}::after {
      content: attr(${TOUR_TARGET_LABEL});
      position: absolute;
      right: -6px;
      top: -6px;
      transform: translateY(-100%);
      border: 1px solid rgba(0, 245, 212, 0.28);
      border-radius: 999px;
      background: rgba(7, 7, 10, 0.96);
      color: #a8fff4;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      line-height: 1;
      padding: 5px 7px;
      text-transform: uppercase;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.32);
    }

    @media (max-width: 640px) {
      .${TOUR_TARGET_CLASS} {
        outline-offset: 3px !important;
      }

      .${TOUR_TARGET_CLASS}::after {
        right: 0;
        top: 0;
        transform: translateY(calc(-100% - 4px));
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .${TOUR_TARGET_CLASS} {
        transition: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function clearTargetHighlight(element) {
  if (!element) return;
  element.classList.remove(TOUR_TARGET_CLASS);
  element.removeAttribute(TOUR_TARGET_LABEL);
}

export default function TutorialOverlay({
  activeStep,
  isActive,
  nextStep,
  prevStep,
  skipTutorial,
}) {
  const highlightedRef = useRef(null);
  const previousDescriptionRef = useRef(null);
  const pendingFrameRef = useRef(null);
  const pendingSkipRef = useRef(null);
  const [targetState, setTargetState] = useState({
    hasTarget: false,
  });

  const clearCurrentHighlight = useCallback(() => {
    const element = highlightedRef.current;
    if (!element) return;

    clearTargetHighlight(element);
    const previousDescription = previousDescriptionRef.current;
    if (previousDescription?.element === element && previousDescription.value) {
      element.setAttribute("aria-describedby", previousDescription.value);
    } else {
      element.removeAttribute("aria-describedby");
    }

    highlightedRef.current = null;
    previousDescriptionRef.current = null;
  }, []);

  const resolveStepTarget = useCallback(() => {
    const step = TOUR_STEPS[activeStep];
    if (!step) {
      clearCurrentHighlight();
      setTargetState({ hasTarget: false });
      return null;
    }

    const { element } = resolveTourTarget(step, window.innerWidth);
    if (!element) {
      clearCurrentHighlight();
      setTargetState({ hasTarget: false });
      return null;
    }

    if (highlightedRef.current !== element) {
      clearCurrentHighlight();
      highlightedRef.current = element;
      previousDescriptionRef.current = {
        element,
        value: element.getAttribute("aria-describedby"),
      };
    }

    ensureRingStyles();
    element.classList.add(TOUR_TARGET_CLASS);
    element.setAttribute(TOUR_TARGET_LABEL, `Step ${activeStep + 1}`);
    element.setAttribute("aria-describedby", "tour-content");
    setTargetState({ hasTarget: true });
    return element;
  }, [activeStep, clearCurrentHighlight]);

  const scheduleResolve = useCallback(() => {
    if (pendingFrameRef.current) cancelAnimationFrame(pendingFrameRef.current);
    pendingFrameRef.current = requestAnimationFrame(() => {
      pendingFrameRef.current = null;
      resolveStepTarget();
    });
  }, [resolveStepTarget]);

  useEffect(() => {
    if (!isActive) {
      clearCurrentHighlight();
      return undefined;
    }

    const step = TOUR_STEPS[activeStep];
    const element = resolveStepTarget();

    if (!step) return undefined;

    if (!element) {
      pendingSkipRef.current = window.setTimeout(() => nextStep(TOUR_STEPS.length), 80);
      return () => window.clearTimeout(pendingSkipRef.current);
    }

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    element.scrollIntoView({
      block: "center",
      inline: "center",
      behavior: reduceMotion ? "auto" : "smooth",
    });

    scheduleResolve();

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(scheduleResolve);
      observer.observe(element);
      observer.observe(document.body);
    }

    window.addEventListener("resize", scheduleResolve);
    window.addEventListener("scroll", scheduleResolve, { passive: true, capture: true });

    return () => {
      if (pendingFrameRef.current) cancelAnimationFrame(pendingFrameRef.current);
      if (pendingSkipRef.current) window.clearTimeout(pendingSkipRef.current);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", scheduleResolve);
      window.removeEventListener("scroll", scheduleResolve, { capture: true });
    };
  }, [activeStep, clearCurrentHighlight, isActive, nextStep, resolveStepTarget, scheduleResolve]);

  useEffect(() => clearCurrentHighlight, [clearCurrentHighlight]);

  if (!isActive) return null;

  const currentStep = TOUR_STEPS[activeStep];
  if (!currentStep || !targetState.hasTarget) return null;

  return createPortal(
    <TutorialTooltip
      step={currentStep}
      currentStepIndex={activeStep}
      totalSteps={TOUR_STEPS.length}
      onNext={() => nextStep(TOUR_STEPS.length)}
      onPrev={prevStep}
      onSkip={skipTutorial}
    />,
    document.body
  );
}
