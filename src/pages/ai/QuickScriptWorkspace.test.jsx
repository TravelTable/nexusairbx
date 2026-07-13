import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import QuickScriptWorkspace from "./QuickScriptWorkspace";

jest.mock("../../components/ai/QuickScriptCodeBlock", () => ({
  __esModule: true,
  default: ({ code }) => <pre>{code}</pre>,
}));

const result = {
  title: "Damage part",
  scriptType: "Script",
  studioLocation: "ServerScriptService/VeryLongFolderName/DamagePartHandler.server.lua",
  code: "print('ready')",
  requiredObjects: ["A part named DamagePart"],
  setup: ["Place this script in ServerScriptService"],
  testing: ["Touch DamagePart in Play mode"],
  limitations: ["Only affects player characters"],
  assumptions: ["DamagePart already exists"],
};

function renderWorkspace(overrides = {}) {
  const props = {
    prompt: "",
    setPrompt: jest.fn(),
    quickScript: { status: "idle", result: null },
    user: { uid: "user-1" },
    onGenerate: jest.fn(),
    onRetry: jest.fn(),
    onCopy: jest.fn(),
    onSave: jest.fn(),
    onExport: jest.fn(),
    onStudioPush: jest.fn(),
    onContinueEditing: jest.fn(),
    onOpenAgentBuild: jest.fn(),
    onImprovePrompt: jest.fn(),
    ...overrides,
  };

  return { props, ...render(<QuickScriptWorkspace {...props} />) };
}

describe("QuickScriptWorkspace", () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  test("shows idle guidance and fills the prompt from an example", () => {
    const { props } = renderWorkspace();

    expect(screen.getByText("Build one focused Roblox script")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /damages players when they touch/i }));

    expect(props.setPrompt).toHaveBeenCalledWith(
      "Make a Script that damages players when they touch a part named DamagePart."
    );
  });

  test("submits on Enter, preserves Shift+Enter, and supports the generate button", () => {
    const { props } = renderWorkspace({ prompt: "Create a round timer" });
    const prompt = screen.getByRole("textbox", { name: "Quick Script prompt" });

    fireEvent.keyDown(prompt, { key: "Enter", shiftKey: true });
    expect(props.onGenerate).not.toHaveBeenCalled();

    fireEvent.keyDown(prompt, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Generate script" }));
    expect(props.onGenerate).toHaveBeenCalledTimes(2);
  });

  test("announces generation progress and disables prompt actions", () => {
    renderWorkspace({
      prompt: "Create a round timer",
      quickScript: { status: "generating", stage: "Validating Luau" },
      isImproving: false,
    });

    expect(screen.getAllByText("Validating Luau").length).toBeGreaterThan(0);
    expect(screen.getByRole("textbox", { name: "Quick Script prompt" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Generation in progress" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Improve" })).toBeDisabled();
  });

  test("renders a retryable error and keeps Agent handoff available", () => {
    const { props } = renderWorkspace({
      prompt: "Build an inventory system",
      quickScript: {
        status: "error",
        prompt: "Build an inventory system",
        error: { message: "This request timed out.", retryable: true },
      },
    });

    expect(screen.getAllByText("Build an inventory system")).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent("This request timed out.");
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
    fireEvent.click(screen.getByRole("button", { name: /Open as Agent Build/i }));

    expect(props.onRetry).toHaveBeenCalledTimes(1);
    expect(props.onOpenAgentBuild).toHaveBeenCalledTimes(1);
  });

  test("shows result tabs, actions, anonymous guidance, and mobile pane switching", async () => {
    const { props } = renderWorkspace({
      prompt: "Make a damage part",
      user: null,
      quickScript: { status: "success", prompt: "Make a damage part", result },
    });

    expect(screen.getByTestId("quick-result-pane")).toHaveClass("flex");
    expect(screen.getByTestId("quick-prompt-pane")).toHaveClass("hidden");
    expect(screen.getByText(/Sign up to save, export, push to Studio/i)).toBeInTheDocument();
    expect(await screen.findByText("print('ready')")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Copy/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.click(screen.getByRole("button", { name: "Studio" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue editing" }));
    fireEvent.click(screen.getByRole("button", { name: /Open as Agent Build/i }));

    expect(props.onCopy).toHaveBeenCalledTimes(1);
    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(props.onExport).toHaveBeenCalledTimes(1);
    expect(props.onStudioPush).toHaveBeenCalledTimes(1);
    expect(props.onContinueEditing).toHaveBeenCalledTimes(1);
    expect(props.onOpenAgentBuild).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Setup" }), { button: 0, ctrlKey: false });
    expect(screen.getByText("A part named DamagePart")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Diagnostics" }), { button: 0, ctrlKey: false });
    expect(screen.getByText("Only affects player characters")).toBeInTheDocument();
    expect(screen.getByText("Assumption: DamagePart already exists")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Prompt" }));
    await waitFor(() => expect(screen.getByTestId("quick-prompt-pane")).toHaveClass("flex"));
    expect(screen.getByRole("textbox", { name: "Quick Script prompt" })).toHaveValue("Make a damage part");
  });
});
