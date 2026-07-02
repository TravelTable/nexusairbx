import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TutorialOverlay from "./TutorialOverlay";
import { useTutorial } from "./useTutorial";

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
      <button data-tour="prompt-input" type="button">
        Prompt input
      </button>
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
  const originalResizeObserver = window.ResizeObserver;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const originalMatchMedia = window.matchMedia;
  const originalGlobalResizeObserver = global.ResizeObserver;
  const originalGlobalRequestAnimationFrame = global.requestAnimationFrame;
  const originalGlobalCancelAnimationFrame = global.cancelAnimationFrame;
  const originalScrollIntoView = Element.prototype.scrollIntoView;

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();

    const MockResizeObserver = class {
      observe() {}
      disconnect() {}
    };
    const mockRequestAnimationFrame = (callback) => window.setTimeout(callback, 0);
    const mockCancelAnimationFrame = (id) => window.clearTimeout(id);

    window.ResizeObserver = MockResizeObserver;
    global.ResizeObserver = MockResizeObserver;
    window.requestAnimationFrame = mockRequestAnimationFrame;
    global.requestAnimationFrame = mockRequestAnimationFrame;
    window.cancelAnimationFrame = mockCancelAnimationFrame;
    global.cancelAnimationFrame = mockCancelAnimationFrame;
    window.matchMedia = jest.fn(() => ({
      matches: true,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    window.ResizeObserver = originalResizeObserver;
    global.ResizeObserver = originalGlobalResizeObserver;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    global.requestAnimationFrame = originalGlobalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    global.cancelAnimationFrame = originalGlobalCancelAnimationFrame;
    window.matchMedia = originalMatchMedia;
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it("skips hidden or missing targets instead of rendering a centered fallback tooltip", async () => {
    const nextStep = jest.fn();

    render(
      <TutorialOverlay
        activeStep={0}
        isActive
        nextStep={nextStep}
        prevStep={jest.fn()}
        skipTutorial={jest.fn()}
      />
    );

    act(() => {
      jest.advanceTimersByTime(90);
    });

    await waitFor(() => expect(nextStep).toHaveBeenCalledWith(4));
    expect(screen.queryByText("Describe Your Needs")).toBeNull();
  });

  it("restart flow activates the first valid step", async () => {
    localStorage.setItem("nexus_tutorial_completed", "true");
    render(<TestTutorial />);

    const target = screen.getByText("Prompt input");
    mockRect(target, { top: 80, left: 80, width: 160, height: 40 });

    expect(screen.queryByText("Describe Your Needs")).toBeNull();

    fireEvent.click(screen.getByText("Restart tour"));

    act(() => {
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => expect(screen.getByText("Describe Your Needs")).toBeTruthy());
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(target.classList.contains(ACTIVE_TARGET_CLASS)).toBe(true);
    expect(target.getAttribute("aria-describedby")).toBe("tour-content");
  });

  it("moves the highlight to the current valid step and restores existing descriptions", async () => {
    const nextStep = jest.fn();
    const promptTarget = document.createElement("textarea");
    const improveTarget = document.createElement("button");

    promptTarget.dataset.tour = "prompt-input";
    promptTarget.setAttribute("aria-describedby", "existing-prompt-help");
    improveTarget.dataset.tour = "improve-btn";
    mockRect(promptTarget, { top: 80, left: 80, width: 280, height: 120 });
    mockRect(improveTarget, { top: 180, left: 80, width: 160, height: 40 });
    document.body.append(promptTarget, improveTarget);

    const { rerender } = render(
      <TutorialOverlay
        activeStep={0}
        isActive
        nextStep={nextStep}
        prevStep={jest.fn()}
        skipTutorial={jest.fn()}
      />
    );

    act(() => {
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => expect(promptTarget.classList.contains(ACTIVE_TARGET_CLASS)).toBe(true));

    rerender(
      <TutorialOverlay
        activeStep={1}
        isActive
        nextStep={nextStep}
        prevStep={jest.fn()}
        skipTutorial={jest.fn()}
      />
    );

    act(() => {
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => expect(improveTarget.classList.contains(ACTIVE_TARGET_CLASS)).toBe(true));
    expect(promptTarget.classList.contains(ACTIVE_TARGET_CLASS)).toBe(false);
    expect(promptTarget.getAttribute("aria-describedby")).toBe("existing-prompt-help");
    expect(improveTarget.getAttribute("aria-describedby")).toBe("tour-content");
  });
});
