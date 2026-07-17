import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import StudioTargetPicker from "./StudioTargetPicker";

describe("StudioTargetPicker", () => {
  const selection = {
    prompt: "Where should I make these changes?",
    options: [
      { id: "opaque-one", label: "My Obby" },
      { id: "opaque-two", label: "Untitled Studio project" },
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
});
