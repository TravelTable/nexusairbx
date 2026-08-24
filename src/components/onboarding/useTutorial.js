import { useCallback, useEffect, useRef, useState } from "react";
import { TOUR_STEPS } from "./tourSteps";

export const TUTORIAL_COMPLETION_STORAGE_KEY = "nexus_tutorial_completed_v2";
export const LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY = "nexus_tutorial_completed";
export const TUTORIAL_PROGRESS_STORAGE_KEY = "nexus_tutorial_progress_v2";
export const TUTORIAL_RESTART_REQUEST_STORAGE_KEY =
  "nexus_tutorial_restart_requested_v2";

let restartRequestedInMemory = false;

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

function readProgress() {
  try {
    const stored = localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY);
    if (stored === null) return null;
    const parsed = Number(stored);
    if (
      Number.isInteger(parsed) &&
      parsed >= 0 &&
      parsed < TOUR_STEPS.length
    ) {
      return parsed;
    }
    localStorage.removeItem(TUTORIAL_PROGRESS_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

function writeProgress(step) {
  try {
    localStorage.setItem(
      TUTORIAL_PROGRESS_STORAGE_KEY,
      String(Math.max(0, Number.parseInt(step, 10) || 0)),
    );
  } catch {
    // The in-memory milestone still supports a same-session resume.
  }
}

function clearProgress() {
  try {
    localStorage.removeItem(TUTORIAL_PROGRESS_STORAGE_KEY);
  } catch {
    // Restarting still resets the current in-memory milestone.
  }
}

export function requestTutorialRestart() {
  restartRequestedInMemory = true;
  clearCompletion();
  clearProgress();
  try {
    sessionStorage.setItem(TUTORIAL_RESTART_REQUEST_STORAGE_KEY, "true");
  } catch {
    // Same-runtime navigation consumes the in-memory request. Clearing the
    // completion markers above still exposes the guide after a full reload.
  }
}

function consumeTutorialRestartRequest() {
  let requested = restartRequestedInMemory;
  restartRequestedInMemory = false;
  try {
    requested =
      sessionStorage.getItem(TUTORIAL_RESTART_REQUEST_STORAGE_KEY) === "true" ||
      requested;
    sessionStorage.removeItem(TUTORIAL_RESTART_REQUEST_STORAGE_KEY);
    return requested;
  } catch {
    return requested;
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
  const initializedRef = useRef(false);
  const [activeStep, setActiveStep] = useState(() => readProgress() || 0);
  const [isActive, setIsActive] = useState(false);
  const [shouldOfferTutorial, setShouldOfferTutorial] = useState(false);
  const [hasSavedProgress, setHasSavedProgress] = useState(
    () => readProgress() !== null,
  );

  useEffect(() => {
    // React 18 replays mount effects in development Strict Mode. A restart is
    // consumable, so initialization must be idempotent for this hook instance.
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (consumeTutorialRestartRequest()) {
      clearCompletion();
      clearProgress();
      setActiveStep(0);
      setHasSavedProgress(false);
      setIsActive(true);
      setShouldOfferTutorial(false);
      return;
    }

    const progress = readProgress();
    setActiveStep(progress || 0);
    setHasSavedProgress(progress !== null);
    setShouldOfferTutorial(!readCompletion());
  }, []);

  const nextStep = useCallback((maxSteps) => {
    setActiveStep((previousStep) => {
      if (previousStep + 1 >= maxSteps) {
        writeCompletion();
        clearProgress();
        setIsActive(false);
        setShouldOfferTutorial(false);
        setHasSavedProgress(false);
        return 0;
      }
      const next = previousStep + 1;
      writeProgress(next);
      setHasSavedProgress(true);
      return next;
    });
  }, []);

  const prevStep = useCallback(() => {
    setActiveStep((previousStep) => {
      const next = Math.max(0, previousStep - 1);
      writeProgress(next);
      setHasSavedProgress(true);
      return next;
    });
  }, []);

  const skipTutorial = useCallback(() => {
    clearCompletion();
    writeProgress(activeStep);
    setIsActive(false);
    setShouldOfferTutorial(true);
    setHasSavedProgress(true);
  }, [activeStep]);

  const resumeTutorial = useCallback(() => {
    clearCompletion();
    const progress = readProgress();
    setActiveStep(progress ?? activeStep);
    setHasSavedProgress(progress !== null || hasSavedProgress);
    setIsActive(true);
    setShouldOfferTutorial(false);
  }, [activeStep, hasSavedProgress]);

  const restartTutorial = useCallback(() => {
    clearCompletion();
    clearProgress();
    setActiveStep(0);
    setHasSavedProgress(false);
    setIsActive(true);
    setShouldOfferTutorial(false);
  }, []);

  return {
    activeStep,
    isActive,
    shouldOfferTutorial,
    hasSavedProgress,
    nextStep,
    prevStep,
    skipTutorial,
    resumeTutorial,
    restartTutorial,
    startTutorial: resumeTutorial,
  };
}
