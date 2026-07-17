import React from "react";
import { render, screen } from "@testing-library/react";
import AgentStepList from "./AgentStepList";

describe("AgentStepList", () => {
  test("renders a manifest conflict as a terminal step error", () => {
    render(
      <AgentStepList
        steps={[
          {
            id: "manifest",
            type: "get_project_manifest",
            label: "Build Studio project manifest",
            status: "failed",
            error: "Manifest revision revision_1 conflicted: overlapping canonical paths.",
          },
        ]}
      />
    );

    expect(screen.getByText("Error")).toBeTruthy();
    expect(screen.getByText(/Manifest revision revision_1 conflicted/i)).toBeTruthy();
  });

  test("explains how to recover Local MCP after a compatible plugin fallback", () => {
    render(
      <AgentStepList
        steps={[
          {
            id: "manifest",
            type: "get_project_manifest",
            label: "Build Studio project manifest",
            status: "delivered",
            executionProvider: "plugin_bridge",
            fallbackReason: "mcp_place_mismatch",
          },
        ]}
      />
    );

    expect(screen.getByText("Continuing through the Studio plugin")).toBeTruthy();
    expect(screen.getByText(/Local MCP is connected to a different place/i)).toBeTruthy();
    expect(screen.getByText(/open the selected place in Local MCP, connect it, then retry/i)).toBeTruthy();
  });

  test("gives a recoverable plugin update instruction", () => {
    render(
      <AgentStepList
        steps={[
          {
            id: "create",
            type: "create_instance",
            label: "Create ScreenGui",
            status: "blocked",
            errorCode: "PLUGIN_COMMAND_UNSUPPORTED",
          },
        ]}
      />
    );

    expect(screen.getByText("Update the Studio plugin to continue")).toBeTruthy();
    expect(screen.getByText(/Reinstall the latest NexusRBXStudioBridge plugin/i)).toBeTruthy();
  });
});
