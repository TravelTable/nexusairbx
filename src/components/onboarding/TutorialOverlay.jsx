import React, { useState, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import TutorialTooltip from "./TutorialTooltip";
import { TOUR_STEPS } from "./tourSteps";

const SPOTLIGHT_PADDING = 6;
const SPOTLIGHT_RADIUS = 12;

function getSpotlightRect(targetSelector) {
  const el = document.querySelector(targetSelector);
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  return {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
    radius: SPOTLIGHT_RADIUS,
  };
}

export default function TutorialOverlay({
  activeStep,
  isActive,
  nextStep,
  prevStep,
  skipTutorial,
}) {
  const maskId = useId().replace(/:/g, "");
  const [spotlight, setSpotlight] = useState(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!isActive) return undefined;

    const updateSpotlight = () => {
      const step = TOUR_STEPS[activeStep];
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      if (!step) {
        setSpotlight(null);
        return;
      }
      setSpotlight(getSpotlightRect(step.target));
    };

    updateSpotlight();

    const step = TOUR_STEPS[activeStep];
    const el = document.querySelector(step?.target);
    let observer;
    if (el) {
      observer = new ResizeObserver(updateSpotlight);
      observer.observe(el);
      observer.observe(document.body);
    }

    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, { passive: true, capture: true });

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, { capture: true });
    };
  }, [activeStep, isActive]);

  if (!isActive) return null;

  const currentStep = TOUR_STEPS[activeStep];
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
        className="absolute inset-0 bg-slate-950/25 backdrop-blur-[8px] pointer-events-auto transition-opacity duration-200"
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

      {currentStep ? (
        <div className="pointer-events-auto">
          <TutorialTooltip
            step={currentStep}
            currentStepIndex={activeStep}
            totalSteps={TOUR_STEPS.length}
            onNext={() => nextStep(TOUR_STEPS.length)}
            onPrev={prevStep}
            onSkip={skipTutorial}
          />
        </div>
      ) : null}
    </div>
  );

  return createPortal(overlay, document.body);
}
