import React from "react";
import { render, screen } from "@testing-library/react";
import AgentStepList from "./AgentStepList";

describe("AgentStepList", () => {
  test("keeps completed Studio activity quiet until the user asks for details", () => {
    render(
      <AgentStepList
        collapsible
        steps={[
          { id: "manifest", type: "get_project_manifest", label: "Build Studio project manifest", status: "succeeded" },
          { id: "read", type: "read_script", label: "Read player controller", status: "succeeded" },
        ]}
      />
    );

    const disclosure = screen.getByText("2 Studio steps completed").closest("details");
    expect(disclosure).toBeTruthy();
    expect(disclosure.open).toBe(false);
    expect(disclosure.className).not.toMatch(/border|background|\bbg-/);
    expect(screen.getByText("Show activity")).toBeTruthy();
  });

  test("never hides a Studio step that needs attention", () => {
    render(
      <AgentStepList
        collapsible
        steps={[
          { id: "write", type: "write_script", label: "Apply player controller", status: "failed", error: "Write failed" },
        ]}
      />
    );

    expect(screen.queryByText("Show activity")).toBeNull();
    expect(screen.getByText("Apply player controller")).toBeTruthy();
    expect(screen.getByText("Error")).toBeTruthy();
  });

  test("renders a manifest conflict as a terminal step error", () => {
    render(
      <AgentStepList
        steps={[
          {
            id: "manifest",
            type: "get_project_manifest",
            label: "Build Studio project manifest",
            status: "failed",
            failureCode: "MANIFEST_CONFLICTED",
            error: "Manifest revision revision_1 conflicted: overlapping canonical paths.",
            manifestConflict: { reason: "overlapping_canonical_paths" },
          },
        ]}
      />
    );

    expect(screen.getByText("Error")).toBeTruthy();
    expect(screen.getByText(/project index got out of sync/i)).toBeTruthy();
    expect(screen.getByText(/Refreshing Studio project index/i)).toBeTruthy();
  });

  test("shows the exact failed child operation and expandable raw result", () => {
    render(
      <AgentStepList
        steps={[
          {
            id: "batch",
            type: "batch_operations",
            label: "Create RunMap",
            status: "failed",
            error: "Studio command failed",
            result: {
              failureCode: "invalid_property_value",
              rollbackCode: "rollback_failed",
              failedOperation: {
                index: 4,
                type: "update_properties",
                path: "Workspace/RunMap/FinishLine",
                code: "invalid_property_value",
                error: "Material is not valid for Part",
                result: { ok: false, property: "Material" },
              },
            },
          },
        ]}
      />
    );

    expect(screen.getByText(/Operation 4 · update_properties · Workspace\/RunMap\/FinishLine/)).toBeTruthy();
    expect(screen.getByText("Failed operation details")).toBeTruthy();
    expect(screen.getByText("rollback_failed")).toBeTruthy();
    expect(screen.getByText(/\"property\": \"Material\"/)).toBeTruthy();
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
