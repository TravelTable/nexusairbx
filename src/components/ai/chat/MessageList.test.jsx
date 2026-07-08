import React from "react";
import { render, screen } from "@testing-library/react";
import MessageList from "./MessageList";

jest.mock("../../../lib/featureFlags", () => {
  const flags = {
    streamV2: true,
    unifiedAgent: true,
    rawReasoning: true,
  };
  return {
    __esModule: true,
    FEATURE_FLAGS: flags,
    default: flags,
  };
});

jest.mock("../../../context/SettingsContext", () => ({
  useSettings: () => ({ settings: { showThinking: true } }),
}));

jest.mock("motion/react", () => ({
  motion: {
    create: () =>
      function MotionStub({ children, ...props }) {
        return <span {...props}>{children}</span>;
      },
  },
}));

const baseProps = {
  messages: [],
  user: { email: "builder@example.com" },
  activeMode: "general",
  generationStage: "",
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

  test("streams agent commands/actions inline in the work stream", () => {
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
          streamState: {
            activity: [
              { id: "a1", type: "thinking", text: "I am preparing the shop UI files." },
              { id: "tool-s1", type: "tool_step", text: "Generate artifact", status: "running", stepType: "generate_artifact" },
              { id: "tool-s2", type: "tool_step", text: "Write ShopService", status: "awaiting_approval", stepType: "write_script" },
            ],
          },
          steps: [
            { id: "s1", type: "generate_artifact", label: "Generate artifact", status: "running" },
            { id: "s2", type: "write_script", label: "Write ShopService", status: "awaiting_approval" },
          ],
        }}
      />
    );

    expect(screen.getByText("Generate artifact")).toBeTruthy();
    expect(screen.getByText("Write ShopService")).toBeTruthy();
    expect(screen.queryByText("Studio actions")).toBeNull();
  });

  test("streams live reasoning as normal work-log prose", () => {
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
            activity: [
              { id: "thinking-1", type: "thinking", text: "Reasoning about the datastore approach" },
            ],
            hasThought: true,
            hasVisibleOutput: false,
          },
        }}
      />
    );

    expect(screen.getByText("Analyzing Request...")).toBeTruthy();
    expect(screen.getByText("Reasoning about the datastore approach")).toBeTruthy();
    expect(screen.queryByText("Build reasoning")).toBeNull();
  });

  test("shows a single work stream with inline file code excerpts", () => {
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
            activity: [
              { id: "thinking-1", type: "thinking", text: "Splitting server authority from shared configuration." },
              {
                id: "file-start-inventory",
                type: "file_start",
                text: "Creating ServerScriptService/InventoryService.server.lua",
                path: "ServerScriptService/InventoryService.server.lua",
                kind: "server",
                status: "Writing",
              },
              {
                id: "file-chunk-inventory",
                type: "file_chunk",
                text: "Writing ServerScriptService/InventoryService.server.lua",
                path: "ServerScriptService/InventoryService.server.lua",
                kind: "server",
                status: "Writing",
                code: "local InventoryService = {}\nreturn InventoryService",
              },
            ],
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

    expect(screen.getByText("Writing files...")).toBeTruthy();
    expect(screen.getAllByText("ServerScriptService/InventoryService.server.lua").length).toBeGreaterThan(0);
    expect(screen.getByText(/local InventoryService/)).toBeTruthy();
    expect(screen.queryByText("Active file preview")).toBeNull();
    expect(screen.queryByText("Discovered")).toBeNull();
    expect(screen.queryByText("2 lines")).toBeNull();
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
            activity: [
              { id: "stage-reconnect", type: "stage", text: "Reconnecting to generation stream...", status: "Reconnecting" },
              {
                id: "file-shop",
                type: "file_chunk",
                text: "Writing ReplicatedStorage/ShopConfig.lua",
                path: "ReplicatedStorage/ShopConfig.lua",
                kind: "config",
                code: "return {}",
              },
            ],
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

    expect(screen.getAllByText("Reconnecting to generation stream...").length).toBeGreaterThan(0);
    expect(screen.getByText("Writing ReplicatedStorage/ShopConfig.lua")).toBeTruthy();
  });

  test("shows LiveWorkStream during orchestration with staged activity", () => {
    render(
      <MessageList
        {...baseProps}
        generationStage="Analyzing request..."
        pendingMessage={{
          role: "assistant",
          content: "",
          stage: "Analyzing request...",
          streamState: {
            activity: [
              { id: "stage-1", type: "stage", text: "Understanding your task...", status: "Understanding your task..." },
              { id: "stage-2", type: "stage", text: "Analyzing request...", status: "Analyzing request..." },
            ],
          },
        }}
      />
    );

    expect(screen.getByText("Understanding your task...")).toBeTruthy();
    expect(screen.getAllByText("Analyzing request...").length).toBeGreaterThan(0);
    expect(screen.queryByText("Nexus is working")).toBeNull();
  });

  test("shows raw reasoning panel when streamState includes rawReasoning", () => {
    render(
      <MessageList
        {...baseProps}
        pendingMessage={{
          role: "assistant",
          content: "",
          type: "chat",
          prompt: "Build a shop",
          streamState: {
            rawReasoning: "Checking module boundaries before writing files.",
            activity: [],
          },
        }}
      />
    );

    expect(screen.getByText(/Thinking/i)).toBeTruthy();
    expect(screen.getByText(/Checking module boundaries/i)).toBeTruthy();
  });

  test("does not duplicate the user prompt once Firestore has persisted it", () => {
    render(
      <MessageList
        {...baseProps}
        messages={[
          {
            id: "req-1-user",
            role: "user",
            content: "generate a fly gui fast",
            requestId: "req-1",
          },
        ]}
        generationStage="Analyzing Request..."
        pendingMessage={{
          role: "assistant",
          content: "",
          type: "chat",
          prompt: "generate a fly gui fast",
          requestId: "req-1",
          stage: "Analyzing Request...",
          streamState: {
            activity: [
              { id: "stage-1", type: "stage", text: "Analyzing Request...", status: "Analyzing Request..." },
            ],
          },
        }}
      />
    );

    expect(screen.getAllByText("generate a fly gui fast")).toHaveLength(1);
  });
});
