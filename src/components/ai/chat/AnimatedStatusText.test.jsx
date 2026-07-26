import React from "react";
import { act, render, screen } from "@testing-library/react";
import AnimatedStatusText from "./AnimatedStatusText";

describe("AnimatedStatusText", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("animates only when the status value changes", () => {
    jest.useFakeTimers();
    const { container, rerender } = render(
      <AnimatedStatusText value="Thinking" />
    );

    expect(screen.getByText("Thinking")).toBeTruthy();
    expect(container.querySelector(".nexus-status-text-out")).toBeNull();

    rerender(<AnimatedStatusText value="Writing files" />);

    expect(screen.getByText("Thinking").classList.contains("nexus-status-text-out")).toBe(true);
    expect(screen.getByText("Writing files").classList.contains("nexus-status-text-in")).toBe(true);

    act(() => {
      jest.advanceTimersByTime(140);
    });

    expect(screen.queryByText("Thinking")).toBeNull();
    expect(screen.getByText("Writing files")).toBeTruthy();
  });
});
