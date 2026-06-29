import React, { useState, useEffect } from "react";
import TutorialTooltip from "./TutorialTooltip";
import { TOUR_STEPS } from "./tourSteps";

export default function TutorialOverlay({
  activeStep,
  isActive,
  nextStep,
  prevStep,
  skipTutorial,
}) {
  const [maskPath, setMaskPath] = useState("");

  useEffect(() => {
    if (!isActive) return;

    const updateMask = () => {
      const step = TOUR_STEPS[activeStep];
      if (!step) return;

      const el = document.querySelector(step.target);
      if (!el) {
        // Transparent cover if target is not found (fallback)
        setMaskPath("");
        return;
      }

      const rect = el.getBoundingClientRect();
      const r = 12; // Radius of rounded corners for spotlight
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Draw mask overlay with cutout using evenodd rule
      const path = `M 0 0 h ${w} v ${h} h -${w} Z 
                    M ${rect.left} ${rect.top + r} 
                    a ${r} ${r} 0 0 1 ${r} -${r} 
                    h ${rect.width - 2 * r} 
                    a ${r} ${r} 0 0 1 ${r} ${r} 
                    v ${rect.height - 2 * r} 
                    a ${r} ${r} 0 0 1 -${r} ${r} 
                    h -${rect.width - 2 * r} 
                    a ${r} ${r} 0 0 1 -${r} -${r} Z`;

      setMaskPath(path);
    };

    updateMask();

    const step = TOUR_STEPS[activeStep];
    const el = document.querySelector(step?.target);
    let observer;
    if (el) {
      observer = new ResizeObserver(updateMask);
      observer.observe(el);
      observer.observe(document.body);
    }

    window.addEventListener("resize", updateMask);
    window.addEventListener("scroll", updateMask, { passive: true });

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener("resize", updateMask);
      window.removeEventListener("scroll", updateMask);
    };
  }, [activeStep, isActive]);

  if (!isActive) return null;

  const currentStep = TOUR_STEPS[activeStep];

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none">
      {/* SVG Spotlight Mask */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto fill-black/65">
        {maskPath ? (
          <path d={maskPath} fillRule="evenodd" />
        ) : (
          <rect width="100%" height="100%" />
        )}
      </svg>

      {/* Target Focus Highlight Overlay Box (interactivity helper) */}
      {currentStep && (
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
      )}
    </div>
  );
}
