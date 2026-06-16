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

  test("streams the live build reasoning disclosure (not as answer content)", () => {
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
    // The thought is surfaced live inside the collapsible build reasoning disclosure.
    expect(screen.getByText("Build reasoning")).toBeTruthy();
    expect(screen.getByText("Reasoning about the datastore approach")).toBeTruthy();
  });

  test("shows live file cards, counters, and active code preview", () => {
    render(
      <MessageList
        {...baseProps}
        generationStage="Writing files..."
        pendingMessage={{
          role: "assistant",
          content: "",
          type: "chat",
          prompt: "Make an inventory system",
          stage: "Writing files...",
          streamState: {
            thought: "Splitting server authority from shared configuration.",
            explanation: "Creating the project files.",
            activeFileId: "inventory",
            files: [
              {
                id: "inventory",
                name: "InventoryService",
                path: "ServerScriptService/InventoryService.server.lua",
                kind: "server",
                status: "writing",
                lineCount: 2,
                purpose: "Owns server-side inventory updates.",
                content: "local InventoryService = {}\nreturn InventoryService",
              },
            ],
            fileCounts: {
              discovered: 1,
              writing: 1,
              reviewing: 0,
              ready: 0,
            },
          },
        }}
      />
    );

    expect(screen.getByText("Live build")).toBeTruthy();
    expect(screen.getByText("Writing files...")).toBeTruthy();
    expect(screen.getByText("InventoryService")).toBeTruthy();
    expect(screen.getAllByText("ServerScriptService/InventoryService.server.lua").length).toBeGreaterThan(0);
    expect(screen.getByText("2 lines")).toBeTruthy();
    expect(screen.getByText("Active file preview")).toBeTruthy();
    expect(screen.getByText(/local InventoryService/)).toBeTruthy();
  });

  test("keeps live panel visible while reconnecting", () => {
    render(
      <MessageList
        {...baseProps}
        generationStage="Reconnecting to generation stream..."
        pendingMessage={{
          role: "assistant",
          content: "",
          type: "chat",
          prompt: "Make a shop",
          stage: "Reconnecting to generation stream...",
          streamStatus: "reconnecting",
          streamState: {
            files: [
              {
                id: "shop",
                name: "ShopConfig",
                path: "ReplicatedStorage/ShopConfig.lua",
                kind: "config",
                status: "reviewing",
                lineCount: 1,
                content: "return {}",
              },
            ],
            fileCounts: {
              discovered: 1,
              writing: 0,
              reviewing: 1,
              ready: 0,
            },
          },
        }}
      />
    );

    expect(screen.getByText("Reconnecting to generation stream...")).toBeTruthy();
    expect(screen.getByText("ShopConfig")).toBeTruthy();
  });
});
