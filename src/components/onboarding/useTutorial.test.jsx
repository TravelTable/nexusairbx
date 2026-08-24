import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY,
  TUTORIAL_COMPLETION_STORAGE_KEY,
  TUTORIAL_PROGRESS_STORAGE_KEY,
  TUTORIAL_RESTART_REQUEST_STORAGE_KEY,
  requestTutorialRestart,
  useTutorial,
} from "./useTutorial";

function TutorialHarness({ maxSteps = 5 }) {
  const tutorial = useTutorial();

  return (
    <div>
      <span>{tutorial.isActive ? `Active ${tutorial.activeStep}` : "Inactive"}</span>
      <span>{tutorial.shouldOfferTutorial ? "Guide offered" : "Guide hidden"}</span>
      <span>{tutorial.hasSavedProgress ? "Progress saved" : "No saved progress"}</span>
      <button type="button" onClick={() => tutorial.nextStep(maxSteps)}>Next</button>
      <button type="button" onClick={tutorial.skipTutorial}>Skip for now</button>
      <button type="button" onClick={tutorial.resumeTutorial}>Resume</button>
      <button type="button" onClick={tutorial.restartTutorial}>Restart</button>
    </div>
  );
}

describe("useTutorial", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("offers the versioned guide without interrupting users who only completed the previous tour", async () => {
    localStorage.setItem(LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    render(<TutorialHarness />);

    await waitFor(() => expect(screen.getByText("Guide offered")).toBeTruthy());
    expect(screen.getByText("Inactive")).toBeTruthy();
    expect(localStorage.getItem(TUTORIAL_COMPLETION_STORAGE_KEY)).toBeNull();
  });

  it("stays dismissed only when both the versioned and compatibility markers exist", async () => {
    localStorage.setItem(TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    localStorage.setItem(LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    render(<TutorialHarness />);

    await waitFor(() => expect(screen.getByText("Inactive")).toBeTruthy());
    expect(screen.getByText("Guide hidden")).toBeTruthy();
  });

  it("saves the current milestone on skip and resumes it after remount", async () => {
    const { unmount } = render(<TutorialHarness />);
    await waitFor(() => expect(screen.getByText("Guide offered")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Active 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));

    expect(screen.getByText("Inactive")).toBeTruthy();
    expect(screen.getByText("Guide offered")).toBeTruthy();
    expect(screen.getByText("Progress saved")).toBeTruthy();
    expect(localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY)).toBe("2");
    expect(localStorage.getItem(TUTORIAL_COMPLETION_STORAGE_KEY)).toBeNull();

    unmount();
    render(<TutorialHarness />);
    await waitFor(() => expect(screen.getByText("Guide offered")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getByText("Active 2")).toBeTruthy();
  });

  it("discards stale progress that cannot map to a creator milestone", async () => {
    localStorage.setItem(TUTORIAL_PROGRESS_STORAGE_KEY, "999");
    render(<TutorialHarness />);

    await waitFor(() => expect(screen.getByText("Guide offered")).toBeTruthy());
    expect(screen.getByText("No saved progress")).toBeTruthy();
    expect(localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getByText("Active 0")).toBeTruthy();
  });

  it("restart clears completion and progress before returning to the first milestone", async () => {
    localStorage.setItem(TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    localStorage.setItem(LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    localStorage.setItem(TUTORIAL_PROGRESS_STORAGE_KEY, "3");
    render(<TutorialHarness />);
    await waitFor(() => expect(screen.getByText("Inactive")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Restart" }));

    expect(screen.getByText("Active 0")).toBeTruthy();
    expect(screen.getByText("Guide hidden")).toBeTruthy();
    expect(screen.getByText("No saved progress")).toBeTruthy();
    expect(localStorage.getItem(TUTORIAL_COMPLETION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it("honors a cross-route restart request and consumes it once", async () => {
    localStorage.setItem(TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    localStorage.setItem(LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    localStorage.setItem(TUTORIAL_PROGRESS_STORAGE_KEY, "4");
    requestTutorialRestart();

    render(<TutorialHarness />);

    await waitFor(() => expect(screen.getByText("Active 0")).toBeTruthy());
    expect(screen.getByText("Guide hidden")).toBeTruthy();
    expect(sessionStorage.getItem(TUTORIAL_RESTART_REQUEST_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it("keeps a consumed restart active under React Strict Mode", async () => {
    localStorage.setItem(TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    localStorage.setItem(LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    localStorage.setItem(TUTORIAL_PROGRESS_STORAGE_KEY, "4");
    requestTutorialRestart();

    render(
      <React.StrictMode>
        <TutorialHarness />
      </React.StrictMode>,
    );

    await waitFor(() => expect(screen.getByText("Active 0")).toBeTruthy());
    expect(screen.getByText("Guide hidden")).toBeTruthy();
    expect(screen.getByText("No saved progress")).toBeTruthy();
  });

  it("carries a restart across routes when session storage is unavailable", async () => {
    localStorage.setItem(TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    localStorage.setItem(LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    localStorage.setItem(TUTORIAL_PROGRESS_STORAGE_KEY, "3");
    const originalSetItem = Storage.prototype.setItem;
    const setItem = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(function setItemWithBlockedSession(key, value) {
        if (this === sessionStorage) throw new Error("Session storage blocked");
        return Reflect.apply(originalSetItem, this, [key, value]);
      });

    requestTutorialRestart();
    setItem.mockRestore();
    render(<TutorialHarness />);

    await waitFor(() => expect(screen.getByText("Active 0")).toBeTruthy());
    expect(screen.getByText("Guide hidden")).toBeTruthy();
    expect(localStorage.getItem(TUTORIAL_COMPLETION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it("completes after the fifth milestone", async () => {
    render(<TutorialHarness />);
    await waitFor(() => expect(screen.getByText("Guide offered")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    const nextButton = screen.getByRole("button", { name: "Next" });
    for (let step = 0; step < 5; step += 1) {
      fireEvent.click(nextButton);
    }

    expect(screen.getByText("Inactive")).toBeTruthy();
    expect(localStorage.getItem(TUTORIAL_COMPLETION_STORAGE_KEY)).toBe("true");
    expect(localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY)).toBeNull();
  });
});
