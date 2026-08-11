import { useCallback, useEffect, useState } from "react";

export const TUTORIAL_COMPLETION_STORAGE_KEY = "nexus_tutorial_completed_v2";
export const LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY = "nexus_tutorial_completed";

function readCompletion() {
  try {
    // Keeping the legacy marker in the contract means the existing Settings
    // restart action can still opt a user back into the newly versioned guide.
    return (
      localStorage.getItem(TUTORIAL_COMPLETION_STORAGE_KEY) === "true" &&
      localStorage.getItem(LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

function writeCompletion() {
  try {
    localStorage.setItem(TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    localStorage.setItem(LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY, "true");
  } catch {
    // Storage can be unavailable in hardened browser contexts. The in-memory
    // state still lets the user dismiss the guide for the current session.
  }
}

function clearCompletion() {
  try {
    localStorage.removeItem(TUTORIAL_COMPLETION_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY);
  } catch {
    // Restarting still works for the current session when storage is blocked.
  }
}

export function useTutorial() {
  const [activeStep, setActiveStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(!readCompletion());
  }, []);

  const nextStep = useCallback((maxSteps) => {
    setActiveStep((previousStep) => {
      if (previousStep + 1 >= maxSteps) {
        writeCompletion();
        setIsActive(false);
        return 0;
      }
      return previousStep + 1;
    });
  }, []);

  const prevStep = useCallback(() => {
    setActiveStep((previousStep) => Math.max(0, previousStep - 1));
  }, []);

  const skipTutorial = useCallback(() => {
    writeCompletion();
    setIsActive(false);
    setActiveStep(0);
  }, []);

  const startTutorial = useCallback(() => {
    clearCompletion();
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
