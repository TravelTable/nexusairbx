import React from "react";
import { render } from "@testing-library/react";
import LiveWorkStream from "./LiveWorkStream";

describe("LiveWorkStream motion states", () => {
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
