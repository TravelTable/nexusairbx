import { useState, useEffect, useCallback } from "react";

export function useTutorial() {
  const [activeStep, setActiveStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const isCompleted = localStorage.getItem("nexus_tutorial_completed");
    if (!isCompleted) {
      setIsActive(true);
    }
  }, []);

  const nextStep = useCallback((maxSteps) => {
    setActiveStep((prev) => {
      if (prev + 1 >= maxSteps) {
        localStorage.setItem("nexus_tutorial_completed", "true");
        setIsActive(false);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const prevStep = useCallback(() => {
    setActiveStep((prev) => Math.max(0, prev - 1));
  }, []);

  const skipTutorial = useCallback(() => {
    localStorage.setItem("nexus_tutorial_completed", "true");
    setIsActive(false);
    setActiveStep(0);
  }, []);

  const startTutorial = useCallback(() => {
    localStorage.removeItem("nexus_tutorial_completed");
    setActiveStep(0);
    setIsActive(true);
  }, []);

  return {
    activeStep,
    isActive,
    nextStep,
    prevStep,
    skipTutorial,
    startTutorial,
  };
}
