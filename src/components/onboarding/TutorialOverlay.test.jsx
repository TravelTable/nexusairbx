import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TutorialOverlay from "./TutorialOverlay";
import {
  LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY,
  TUTORIAL_COMPLETION_STORAGE_KEY,
  useTutorial,
} from "./useTutorial";

const ACTIVE_TARGET_CLASS = "nexus-tour-active-target";

function mockRect(element, rect) {
  element.getBoundingClientRect = jest.fn(() => ({
    top: rect.top,
    left: rect.left,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    width: rect.width,
    height: rect.height,
    x: rect.left,
    y: rect.top,
    toJSON: () => {},
  }));
}

function TestTutorial() {
  const tutorial = useTutorial();

  return (
    <div>
      <button type="button" onClick={tutorial.startTutorial}>
        Restart tour
      </button>
      <textarea data-tour="prompt-input" aria-label="Idea composer" />
      <TutorialOverlay
        activeStep={tutorial.activeStep}
        isActive={tutorial.isActive}
        nextStep={tutorial.nextStep}
        prevStep={tutorial.prevStep}
        skipTutorial={tutorial.skipTutorial}
      />
    </div>
  );
}

describe("TutorialOverlay", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const originalGlobalRequestAnimationFrame = global.requestAnimationFrame;
  const originalGlobalCancelAnimationFrame = global.cancelAnimationFrame;
  const originalScrollIntoView = Element.prototype.scrollIntoView;

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();

    const mockRequestAnimationFrame = (callback) => window.setTimeout(callback, 0);
    const mockCancelAnimationFrame = (id) => window.clearTimeout(id);

    window.requestAnimationFrame = mockRequestAnimationFrame;
    global.requestAnimationFrame = mockRequestAnimationFrame;
    window.cancelAnimationFrame = mockCancelAnimationFrame;
    global.cancelAnimationFrame = mockCancelAnimationFrame;
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    window.requestAnimationFrame = originalRequestAnimationFrame;
    global.requestAnimationFrame = originalGlobalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    global.cancelAnimationFrame = originalGlobalCancelAnimationFrame;
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it("keeps a non-modal milestone visible when its optional target is absent", () => {
    const nextStep = jest.fn();

    render(
      <>
        <button type="button">Keep working</button>
        <TutorialOverlay
          activeStep={0}
          isActive
          nextStep={nextStep}
          prevStep={jest.fn()}
          skipTutorial={jest.fn()}
        />
      </>
    );

    const workspaceButton = screen.getByRole("button", { name: "Keep working" });
    workspaceButton.focus();

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(
      screen.getByRole("region", { name: "Describe the game in your head" })
    ).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByText(/Open Quick Script or Agent Build when you are ready/i)
    ).toBeTruthy();
    expect(nextStep).not.toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(workspaceButton);
  });

  it("uses 44px controls and reduced-motion-safe progress", () => {
    render(
      <TutorialOverlay
        activeStep={0}
        isActive
        nextStep={jest.fn()}
        prevStep={jest.fn()}
        skipTutorial={jest.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Dismiss creator milestones" }).className).toContain(
      "min-h-11"
    );
    expect(screen.getByRole("button", { name: "Dismiss guide" }).className).toContain("min-h-11");
    expect(screen.getByRole("button", { name: /Next milestone/i }).className).toContain("min-h-11");
    expect(
      document.querySelector(".motion-reduce\\:transition-none")
    ).toBeTruthy();
  });

  it("restart flow activates the first milestone without moving focus or scrolling", async () => {
    localStorage.setItem(TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    localStorage.setItem(LEGACY_TUTORIAL_COMPLETION_STORAGE_KEY, "true");
    render(<TestTutorial />);

    const target = screen.getByRole("textbox", { name: "Idea composer" });
    const restartButton = screen.getByRole("button", { name: "Restart tour" });
    mockRect(target, { top: 80, left: 80, width: 280, height: 96 });

    expect(screen.queryByText("Describe the game in your head")).toBeNull();
    restartButton.focus();
    fireEvent.click(restartButton);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(screen.getByText("Describe the game in your head")).toBeTruthy());
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(restartButton);
    expect(target.classList.contains(ACTIVE_TARGET_CLASS)).toBe(true);
    expect(target.getAttribute("aria-describedby")).toContain("tour-content");
  });

  it("moves optional highlighting between milestones and restores existing descriptions", async () => {
    const promptTarget = document.createElement("textarea");
    const studioTarget = document.createElement("button");

    promptTarget.dataset.tour = "prompt-input";
    promptTarget.setAttribute("aria-describedby", "existing-prompt-help");
    studioTarget.dataset.tour = "studio-pair";
    mockRect(promptTarget, { top: 80, left: 80, width: 280, height: 96 });
    mockRect(studioTarget, { top: 180, left: 80, width: 180, height: 44 });
    document.body.append(promptTarget, studioTarget);

    const { rerender } = render(
      <TutorialOverlay
        activeStep={0}
        isActive
        nextStep={jest.fn()}
        prevStep={jest.fn()}
        skipTutorial={jest.fn()}
      />
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(promptTarget.classList.contains(ACTIVE_TARGET_CLASS)).toBe(true));
    expect(promptTarget.getAttribute("aria-describedby")).toContain("existing-prompt-help");
    expect(promptTarget.getAttribute("aria-describedby")).toContain("tour-content");

    rerender(
      <TutorialOverlay
        activeStep={1}
        isActive
        nextStep={jest.fn()}
        prevStep={jest.fn()}
        skipTutorial={jest.fn()}
      />
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(studioTarget.classList.contains(ACTIVE_TARGET_CLASS)).toBe(true));
    expect(promptTarget.classList.contains(ACTIVE_TARGET_CLASS)).toBe(false);
    expect(promptTarget.getAttribute("aria-describedby")).toBe("existing-prompt-help");
    expect(studioTarget.getAttribute("aria-describedby")).toBe("tour-content");
  });
});
