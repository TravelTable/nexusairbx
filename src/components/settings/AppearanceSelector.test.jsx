import React, { useState } from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import AppearanceSelector from "./AppearanceSelector";

function StatefulAppearanceSelector() {
  const [value, setValue] = useState("system");
  return <AppearanceSelector value={value} onChange={setValue} />;
}

test("offers System, Light, and Dark as an accessible single-choice control", () => {
  render(<StatefulAppearanceSelector />);

  const group = screen.getByRole("radiogroup", { name: "Color appearance" });
  const system = screen.getByRole("radio", { name: /System/i });
  const light = screen.getByRole("radio", { name: /Light/i });
  const dark = screen.getByRole("radio", { name: /Dark/i });

  expect(group).toContainElement(system);
  expect(system).toHaveAttribute("aria-checked", "true");
  expect(light).toHaveAttribute("aria-checked", "false");
  expect(dark).toHaveAttribute("aria-checked", "false");
  expect(system).toHaveAttribute("tabindex", "0");
  expect(light).toHaveAttribute("tabindex", "-1");
  expect(dark).toHaveAttribute("tabindex", "-1");

  fireEvent.click(light);
  expect(system).toHaveAttribute("aria-checked", "false");
  expect(light).toHaveAttribute("aria-checked", "true");
});

test("supports roving radio focus with arrow, Home, and End keys", () => {
  render(<StatefulAppearanceSelector />);

  const system = screen.getByRole("radio", { name: /System/i });
  const light = screen.getByRole("radio", { name: /Light/i });
  const dark = screen.getByRole("radio", { name: /Dark/i });

  system.focus();
  fireEvent.keyDown(system, { key: "ArrowRight" });
  expect(light).toHaveFocus();
  expect(light).toHaveAttribute("aria-checked", "true");
  expect(light).toHaveAttribute("tabindex", "0");

  fireEvent.keyDown(light, { key: "ArrowDown" });
  expect(dark).toHaveFocus();
  expect(dark).toHaveAttribute("aria-checked", "true");

  fireEvent.keyDown(dark, { key: "ArrowRight" });
  expect(system).toHaveFocus();
  expect(system).toHaveAttribute("aria-checked", "true");

  fireEvent.keyDown(system, { key: "End" });
  expect(dark).toHaveFocus();
  expect(dark).toHaveAttribute("aria-checked", "true");

  fireEvent.keyDown(dark, { key: "Home" });
  expect(system).toHaveFocus();
  expect(system).toHaveAttribute("aria-checked", "true");
});

test("does not change appearance while persistence is disabled", () => {
  const onChange = jest.fn();
  render(<AppearanceSelector value="dark" onChange={onChange} disabled />);

  fireEvent.click(screen.getByRole("radio", { name: /Light/i }));
  expect(onChange).not.toHaveBeenCalled();
  screen.getAllByRole("radio").forEach((radio) => expect(radio).toHaveAttribute("tabindex", "-1"));
});
