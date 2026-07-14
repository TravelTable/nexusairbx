import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NativeModelReviewPanel from "./NativeModelReviewPanel";

jest.mock("../../../lib/studioBridgeApi", () => ({
  buildNativeModelInStudio: jest.fn(),
  getStudioCommand: jest.fn(),
  getStudioStatus: jest.fn(),
  validateNativeModelSpec: jest.fn(),
}));

const {
  buildNativeModelInStudio,
  getStudioCommand,
  getStudioStatus,
  validateNativeModelSpec,
} = require("../../../lib/studioBridgeApi");

function artifact() {
  return {
    nativeModelSpec: {
      schemaVersion: 1,
      modelId: "table",
      name: "Wooden Table",
      description: "Editable table",
      targetParentPath: "Workspace/NexusBuilds",
      placement: { mode: "origin" },
      root: {
        id: "root",
        className: "Model",
        name: "Wooden Table",
        properties: {},
        children: [
          {
            id: "top",
            className: "Part",
            name: "Top",
            properties: {},
          },
        ],
      },
    },
  };
}

describe("NativeModelReviewPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getStudioCommand.mockResolvedValue({ status: "queued" });
    validateNativeModelSpec.mockResolvedValue({
      ok: true,
      normalizedSpec: artifact().nativeModelSpec,
      summary: {
        instances: 2,
        parts: 1,
        constraints: 0,
        estimatedBounds: { x: 6, y: 3, z: 4 },
        warnings: ["Keep part counts modest."],
      },
    });
  });

  test("renders native build plan without requiring raw JSON", async () => {
    getStudioStatus.mockResolvedValue({ sessions: [] });
    render(<NativeModelReviewPanel artifact={artifact()} />);

    await waitFor(() => expect(screen.getByText("6 x 3 x 4")).toBeTruthy());

    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("6 x 3 x 4")).toBeTruthy();
    expect(screen.getByText("Object hierarchy")).toBeTruthy();
    expect(screen.getByText("Pair Studio to build.")).toBeTruthy();
    expect(screen.queryByText(/"schemaVersion"/)).toBeNull();
  });

  test("queues once when Studio is connected", async () => {
    getStudioStatus.mockResolvedValue({ sessions: [{ id: "plugin_1", status: "connected" }] });
    buildNativeModelInStudio.mockResolvedValue({ commandId: "cmd_1" });
    render(<NativeModelReviewPanel artifact={artifact()} />);

    await waitFor(() => expect(screen.getByText("Build in Studio").closest("button").disabled).toBe(false));
    const button = screen.getByText("Build in Studio").closest("button");
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(buildNativeModelInStudio).toHaveBeenCalledTimes(1));
    expect(buildNativeModelInStudio.mock.calls[0][0]).toMatchObject({
      applyMode: "manual_review",
      sessionId: "plugin_1",
    });
  });

  test("does not offer a plugin-only build for an MCP session", async () => {
    getStudioStatus.mockResolvedValue({
      sessions: [{
        id: "mcp_1",
        connectionType: "mcp_local",
        status: "connected",
        live: true,
        connectorLive: true,
        mcpServerAvailable: true,
      }],
    });
    render(<NativeModelReviewPanel artifact={artifact()} />);

    await waitFor(() => expect(screen.getByText("Pair Studio to build.")).toBeTruthy());
    expect(screen.getByText("Build in Studio").closest("button").disabled).toBe(true);
    expect(buildNativeModelInStudio).not.toHaveBeenCalled();
  });

  test("renders validation failure state", async () => {
    getStudioStatus.mockResolvedValue({ sessions: [{ status: "connected" }] });
    validateNativeModelSpec.mockRejectedValue(new Error("Unsupported native model class: Script"));
    render(<NativeModelReviewPanel artifact={artifact()} />);

    await waitFor(() => expect(screen.getByText("Unsupported native model class: Script")).toBeTruthy());
    expect(screen.getByText("failed")).toBeTruthy();
  });
});
