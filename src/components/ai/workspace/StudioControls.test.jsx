import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StudioControls from "./StudioControls";

describe("StudioControls", () => {
  test("lets users choose build preferences while disconnected", () => {
    render(<StudioControls connected={false} />);

    expect(screen.getByText("Studio disconnected")).toBeTruthy();
    expect(screen.getByLabelText("Apply changes")).toBeEnabled();
    expect(screen.getByLabelText("Checks")).toBeEnabled();
    expect(screen.getByLabelText("Review destructive changes")).not.toBeChecked();
    expect(screen.queryByLabelText("Live Studio")).toBeNull();
    expect(screen.queryByLabelText("Auto Push")).toBeNull();
  });

  test("explains unavailable write and playtest options for a read-only MCP target", () => {
    render(
      <StudioControls
        connected
        placeName="Baseplate"
        connectionType="mcp_local"
        connectionState="mcp"
        capabilities={{
          supported: ["readProject"],
          commands: { read_script: { available: true } },
          transports: [{
            sessionId: "mcp-1",
            connectionType: "mcp_local",
            supportedCommands: ["read_script"],
          }],
        }}
      />
    );

    expect(screen.getByText("Connected — Baseplate")).toBeTruthy();
    expect(screen.getByText("Automatic routing · Local MCP")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Automatic — unavailable" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Playtest — unavailable" })).toBeDisabled();
    expect(screen.getByText(/Playtest needs/)).toBeTruthy();
  });

  test("enables playtest policies when the target registry advertises MCP playtest and writes", () => {
    render(
      <StudioControls
        connected
        connectionType="plugin_bridge"
        connectionState="both"
        capabilities={{
          supported: ["playtest", "writeScript"],
          commands: {
            run_play_test: { available: true },
            patch_script: { available: true },
          },
          transports: [
            { sessionId: "plugin-1", connectionType: "plugin_bridge", supportedCommands: ["apply_artifact"] },
            { sessionId: "mcp-1", connectionType: "mcp_local", supportedCommands: ["run_play_test", "patch_script"] },
          ],
        }}
      />
    );

    expect(screen.getByText("Automatic routing · Plugin + MCP")).toBeTruthy();
    expect(screen.queryByRole("option", { name: "After playtest (legacy)" })).toBeNull();
    expect(screen.getByRole("option", { name: "Playtest" })).toBeEnabled();
  });

  test("surfaces a settings save failure instead of silently swallowing it", async () => {
    render(
      <StudioControls
        connected
        connectionType="mcp_local"
        connectionState="mcp"
        capabilities={{ supported: ["writeScript"], commands: { patch_script: { available: true } } }}
        onPreferencesChange={() => Promise.resolve({ ok: false, error: "Settings rejected" })}
      />
    );

    fireEvent.click(screen.getByLabelText("Review destructive changes"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Settings rejected"));
  });
});
