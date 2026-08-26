import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import LiveWorkStream from "./LiveWorkStream";

describe("LiveWorkStream motion states", () => {
  it("renders a transparent shimmer status without the oversized loader card", () => {
    const { container } = render(
      <LiveWorkStream
        pendingMessage={{ stage: "Understanding your task...", streamState: { activity: [] } }}
      />
    );

    expect(screen.getByRole("status").textContent).toContain("Understanding your task...");
    expect(screen.getByTestId("live-work-stream").className).toContain("py-1");
    expect(container.querySelector(".nexus-build-loader")).toBeNull();
    expect(screen.queryByText("Starting work...")).toBeNull();
  });

  it("keeps live approval steps expanded and actionable", () => {
    const onApproveStep = jest.fn();
    const step = {
      id: "write",
      type: "write_script",
      label: "Write player controller",
      status: "awaiting_approval",
    };

    render(
      <LiveWorkStream
        pendingMessage={{
          stage: "Waiting for approval...",
          steps: [step],
          streamState: {
            activity: [{
              id: "tool-write",
              type: "tool_step",
              text: step.label,
              status: step.status,
              stepType: step.type,
            }],
          },
        }}
        onApproveStep={onApproveStep}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Approve step" }));
    expect(onApproveStep).toHaveBeenCalledWith(step);
  });

  it("emits a finite completion cue only on the status transition", () => {
    const runningMessage = {
      stage: "Implementing",
      steps: [
        {
          id: "edit",
          type: "edit_file",
          label: "Edit project files",
          status: "running",
        },
      ],
    };
    const completedMessage = {
      ...runningMessage,
      steps: [
        {
          ...runningMessage.steps[0],
          status: "succeeded",
        },
      ],
    };

    const { container, rerender } = render(
      <LiveWorkStream pendingMessage={runningMessage} />
    );

    let row = container.querySelector(".nexus-tool-step");
    expect(row.getAttribute("data-motion-status")).toBe("active");
    expect(row.hasAttribute("data-motion-event")).toBe(false);

    rerender(<LiveWorkStream pendingMessage={completedMessage} />);

    row = container.querySelector(".nexus-tool-step");
    expect(row.getAttribute("data-motion-status")).toBe("complete");
    expect(row.getAttribute("data-motion-event")).toBe("complete");

    rerender(<LiveWorkStream pendingMessage={completedMessage} />);

    row = container.querySelector(".nexus-tool-step");
    expect(row.hasAttribute("data-motion-event")).toBe(false);
  });
});
