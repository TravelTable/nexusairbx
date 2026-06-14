import React from "react";
import { render, screen } from "@testing-library/react";
import MessageList from "./MessageList";

const baseProps = {
  messages: [],
  user: { email: "builder@example.com" },
  activeMode: "general",
  generationStage: "",
  chatEndRef: { current: null },
  onViewUi: jest.fn(),
  onRefine: jest.fn(),
  onFixUiAudit: jest.fn(),
  onApprovePlan: jest.fn(),
  onClarifySubmit: jest.fn(),
  onEditPlan: jest.fn(),
  notify: jest.fn(),
  isBusy: true,
};

describe("MessageList pending activity", () => {
  test("shows the live stage header before visible output arrives", () => {
    render(
      <MessageList
        {...baseProps}
        generationStage="Planning Layout..."
        pendingMessage={{
          role: "assistant",
          content: "",
          type: "ui",
          prompt: "Build a shop UI",
          stage: "Planning Layout...",
        }}
      />
    );

    expect(screen.getByText("Nexus is working")).toBeTruthy();
    expect(screen.getByText("Planning Layout...")).toBeTruthy();
    // The fixed fake checklist is gone — progress now streams live below the header.
    expect(screen.queryByText("Understanding task")).toBeNull();
    expect(screen.queryByText("Finalizing")).toBeNull();
  });

  test("streams agent commands/actions as they arrive", () => {
    render(
      <MessageList
        {...baseProps}
        generationStage="Generating..."
        pendingMessage={{
          role: "assistant",
          content: "",
          type: "ui",
          prompt: "Build a shop UI",
          stage: "Generating...",
          steps: [
            { id: "s1", type: "generate_artifact", label: "Generate artifact", status: "running" },
            { id: "s2", type: "write_script", label: "Write ShopService", status: "awaiting_approval" },
          ],
        }}
      />
    );

    expect(screen.getByText("Generate artifact")).toBeTruthy();
    expect(screen.getByText("Write ShopService")).toBeTruthy();
  });

  test("streams the live chain-of-thought in a Thinking disclosure (not as answer content)", () => {
    render(
      <MessageList
        {...baseProps}
        generationStage="Analyzing Request..."
        pendingMessage={{
          role: "assistant",
          content: "",
          type: "chat",
          prompt: "Make a datastore script",
          stage: "Analyzing Request...",
          streamState: {
            thought: "Reasoning about the datastore approach",
            hasThought: true,
            hasVisibleOutput: false,
          },
        }}
      />
    );

    expect(screen.getByText("Analyzing Request...")).toBeTruthy();
    // The thought is surfaced live inside the collapsible "Thinking…" disclosure.
    expect(screen.getByText("Thinking…")).toBeTruthy();
    expect(screen.getByText("Reasoning about the datastore approach")).toBeTruthy();
  });
});
