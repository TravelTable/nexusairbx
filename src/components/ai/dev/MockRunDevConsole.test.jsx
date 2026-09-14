import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import MockRunDevConsole from "./MockRunDevConsole";

test("mock console exposes the mock-mode toggle and scenario playback controls", () => {
  const onEnabledChange = jest.fn();
  const onPlay = jest.fn();
  render(
    <MockRunDevConsole
      open
      enabled
      onEnabledChange={onEnabledChange}
      onPlay={onPlay}
      scenarios={[{ id: "ui-happy-path", label: "UI happy path", description: "demo" }]}
    />
  );

  fireEvent.click(screen.getByRole("checkbox"));
  expect(onEnabledChange).toHaveBeenCalledWith(false);

  fireEvent.click(screen.getByRole("button", { name: "UI happy path" }));
  expect(onPlay).toHaveBeenCalledWith("ui-happy-path");
});
