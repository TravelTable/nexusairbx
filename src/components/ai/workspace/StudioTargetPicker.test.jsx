import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import StudioTargetPicker from "./StudioTargetPicker";

describe("StudioTargetPicker", () => {
  const selection = {
    prompt: "Where should I make these changes?",
    options: [
      { id: "opaque-one", placeId: "1", universeId: "10", label: "My Obby" },
      { id: "opaque-two", placeId: "2", universeId: "20", label: "Untitled Studio project" },
    ],
  };

  test("shows friendly place choices without exposing target identifiers", () => {
    const onSelect = jest.fn();
    render(<StudioTargetPicker selection={selection} onSelect={onSelect} />);

    expect(screen.getByText("Where should I make these changes?")).toBeTruthy();
    expect(screen.getByText("Waiting for your choice")).toBeTruthy();
    expect(screen.getByText("My Obby")).toBeTruthy();
    expect(screen.queryByText("opaque-one")).toBeNull();
    expect(screen.queryByText(/MCP|plugin|protocol|session/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "My Obby" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(selection.options[0]);
  });

  test("shows the continuing state and prevents duplicate choices", () => {
    const onSelect = jest.fn();
    render(
      <StudioTargetPicker
        selection={selection}
        onSelect={onSelect}
        selectingTargetId="opaque-one"
      />
    );

    expect(screen.getByText("Continuing in My Obby…")).toBeTruthy();
    const buttons = screen.getAllByRole("button");
    expect(buttons.every((button) => button.disabled)).toBe(true);
    fireEvent.click(buttons[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  test("identifies the transport when the same Studio place is connected twice", () => {
    const onSelect = jest.fn();
    render(
      <StudioTargetPicker
        selection={{
          prompt: "Switch Studio place",
          options: [
            {
              id: "plugin-target",
              placeId: "123",
              label: "Place1",
              connectionType: "plugin_bridge",
              source: "plugin",
            },
            {
              id: "mcp-target",
              placeId: "123",
              label: "Place1 (2)",
              connectionType: "mcp_local",
              source: "mcp",
            },
          ],
        }}
        onSelect={onSelect}
      />
    );

    const pluginChoice = screen.getByRole("button", {
      name: /Place1 Recommended · Studio plugin/i,
    });
    const mcpChoice = screen.getByRole("button", {
      name: /Place1 \(2\) Advanced · Roblox Studio MCP/i,
    });

    fireEvent.click(mcpChoice);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: "mcp-target",
      connectionType: "mcp_local",
    }));
    expect(pluginChoice).toBeTruthy();
  });

  test("explains why a local place cannot be selected", () => {
    const onSelect = jest.fn();
    render(
      <StudioTargetPicker
        selection={{
          prompt: "Choose a place",
          options: [{
            id: "local-place",
            label: "LocalPlace.rbxl",
            disabled: true,
            disabledReason: "Complete live Studio identity required",
          }],
        }}
        onSelect={onSelect}
      />
    );

    const button = screen.getByRole("button", {
      name: /LocalPlace\.rbxl Complete live Studio identity required/i,
    });
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
