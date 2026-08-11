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
      outline: 2px solid rgba(var(--ds-accent-rgb), 0.95) !important;
      outline-offset: 5px !important;
      box-shadow:
        0 0 0 7px rgba(var(--ds-accent-rgb), 0.14),
        0 0 24px rgba(var(--ds-accent-rgb), 0.22) !important;
      border-radius: 12px !important;
      transition:
        outline-color 160ms ease,
        outline-offset 160ms ease,
        box-shadow 160ms ease !important;
    }

    @media (max-width: 640px) {
      .${TOUR_TARGET_CLASS} {
        outline-offset: 3px !important;
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
  const [hasTarget, setHasTarget] = useState(false);

  const clearCurrentHighlight = useCallback(() => {
    const element = highlightedRef.current;
    if (!element) return;

    clearTargetHighlight(element);
    const previousDescription = previousDescriptionRef.current;
    if (previousDescription?.element === element && previousDescription.value !== null) {
      element.setAttribute("aria-describedby", previousDescription.value);
    } else {
      element.removeAttribute("aria-describedby");
    }

    highlightedRef.current = null;
    previousDescriptionRef.current = null;
  }, []);

  const resolveStepTarget = useCallback(() => {
    const step = TOUR_STEPS[activeStep];
    const { element } = resolveTourTarget(step, window.innerWidth);

    if (!element) {
      clearCurrentHighlight();
      setHasTarget((currentValue) => (currentValue ? false : currentValue));
      return;
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
    const targetLabel = `Milestone ${activeStep + 1}`;
    if (element.getAttribute(TOUR_TARGET_LABEL) !== targetLabel) {
      element.setAttribute(TOUR_TARGET_LABEL, targetLabel);
    }
    const describedBy = [previousDescriptionRef.current?.value, "tour-content"]
      .filter(Boolean)
      .join(" ");
    if (element.getAttribute("aria-describedby") !== describedBy) {
      element.setAttribute("aria-describedby", describedBy);
    }
    setHasTarget((currentValue) => (currentValue ? currentValue : true));
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
      setHasTarget(false);
      return undefined;
    }

    resolveStepTarget();

    const observer =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(scheduleResolve)
        : null;

    observer?.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden"],
    });
    window.addEventListener("resize", scheduleResolve);

    return () => {
      if (pendingFrameRef.current) cancelAnimationFrame(pendingFrameRef.current);
      observer?.disconnect();
      window.removeEventListener("resize", scheduleResolve);
      clearCurrentHighlight();
    };
  }, [activeStep, clearCurrentHighlight, isActive, resolveStepTarget, scheduleResolve]);

  useEffect(() => clearCurrentHighlight, [clearCurrentHighlight]);

  if (!isActive) return null;

  const currentStep = TOUR_STEPS[activeStep];
  if (!currentStep) return null;

  return createPortal(
    <TutorialTooltip
      step={currentStep}
      currentStepIndex={activeStep}
      totalSteps={TOUR_STEPS.length}
      hasTarget={hasTarget}
      onNext={() => nextStep(TOUR_STEPS.length)}
      onPrev={prevStep}
      onSkip={skipTutorial}
    />,
    document.body
  );
}
