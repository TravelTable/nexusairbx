import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY,
  TUTORIAL_COMPLETION_STORAGE_KEY,
  useTutorial,
} from "./useTutorial";

function TutorialHarness({ maxSteps = 5 }) {
  const tutorial = useTutorial();

  return (
    <div>
      <span>{tutorial.isActive ? `Active ${tutorial.activeStep}` : "Inactive"}</span>
      <span>{tutorial.shouldOfferTutorial ? "Guide offered" : "Guide hidden"}</span>
      <button type="button" onClick={() => tutorial.nextStep(maxSteps)}>Next</button>
      <button type="button" onClick={tutorial.skipTutorial}>Dismiss</button>
      <button type="button" onClick={tutorial.startTutorial}>Restart</button>
    </div>
  );
}

describe("useTutorial", () => {
  beforeEach(() => {
    localStorage.clear();
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

  it("writes both markers on dismissal so the existing Settings restart remains compatible", async () => {
    render(<TutorialHarness />);
    await waitFor(() => expect(screen.getByText("Guide offered")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Restart" }));

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.getByText("Inactive")).toBeTruthy();
    expect(screen.getByText("Guide hidden")).toBeTruthy();
    expect(localStorage.getItem(TUTORIAL_COMPLETION_STORAGE_KEY)).toBe("true");
    expect(localStorage.getItem(LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY)).toBe("true");
  });

  it("restart clears both markers and returns to the first milestone", async () => {
    localStorage.setItem(TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    localStorage.setItem(LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    render(<TutorialHarness />);
    await waitFor(() => expect(screen.getByText("Inactive")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Restart" }));

    expect(screen.getByText("Active 0")).toBeTruthy();
    expect(screen.getByText("Guide hidden")).toBeTruthy();
    expect(localStorage.getItem(TUTORIAL_COMPLETION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY)).toBeNull();
  });

  it("completes after the fifth milestone", async () => {
    render(<TutorialHarness />);
    await waitFor(() => expect(screen.getByText("Guide offered")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Restart" }));

    const nextButton = screen.getByRole("button", { name: "Next" });
    for (let step = 0; step < 5; step += 1) {
      fireEvent.click(nextButton);
    }

    expect(screen.getByText("Inactive")).toBeTruthy();
    expect(localStorage.getItem(TUTORIAL_COMPLETION_STORAGE_KEY)).toBe("true");
  });
});
