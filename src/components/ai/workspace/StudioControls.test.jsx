import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import StudioControls from "./StudioControls";

describe("StudioControls", () => {
  test("shows export-only status without a plugin-required Live Studio control", () => {
    render(<StudioControls connected={false} studioEnabled />);

    expect(screen.getByText("Export only")).toBeTruthy();
    expect(screen.getByText("Project ZIP ready")).toBeTruthy();
    expect(screen.queryByLabelText("Live Studio")).toBeNull();
  });

  test("shows a read-only MCP session without plugin mutation controls", () => {
    render(
      <StudioControls
        connected
        connectionType="mcp_local"
        connectionState="mcp"
        capabilities={{ readProject: true, writeScript: false }}
        studioEnabled
        autoPushEnabled
        autoPushAuthorized
      />
    );

    expect(screen.getByText("Studio · MCP")).toBeTruthy();
    expect(screen.getByText("MCP · Read only")).toBeTruthy();
    expect(screen.getByLabelText("Live Studio")).toBeChecked();
    expect(screen.queryByRole("option", { name: "Manual Review" })).toBeNull();
    expect(screen.getByText("Auto Push · Plugin only")).toBeTruthy();
    expect(screen.queryByLabelText("Auto Push")).toBeNull();
  });

  test("disables Live Studio when an MCP session advertises no tools", () => {
    render(
      <StudioControls
        connected
        connectionType="mcp_local"
        connectionState="mcp"
        capabilities={{ supported: [] }}
        studioEnabled
      />
    );

    expect(screen.getByText("MCP · No tools")).toBeTruthy();
    expect(screen.getByLabelText("Live Studio")).toBeDisabled();
    expect(screen.getByLabelText("Live Studio")).not.toBeChecked();
  });

  test("fails closed when a plugin advertises no verified tools", () => {
    render(
      <StudioControls
        connected
        connectionType="plugin_bridge"
        connectionState="plugin"
        studioEnabled
        autoPushEnabled
        autoPushAuthorized={false}
      />
    );

    expect(screen.getByText("Studio · Plugin")).toBeTruthy();
    expect(screen.getByText("Plugin has no verified tools")).toBeTruthy();
    expect(screen.getByLabelText("Live Studio")).toBeDisabled();
    expect(screen.getByLabelText("Live Studio")).not.toBeChecked();
    expect(screen.queryByLabelText("Auto Push")).toBeNull();
  });
});
