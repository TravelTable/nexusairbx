import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { Segmented } from "./index";

test("uses an honest labeled button group for mutually exclusive modes", () => {
  const onChange = jest.fn();
  render(
    <Segmented
      size="sm"
      fullWidth
      ariaLabel="Generation mode"
      options={[
        { id: "quick", label: "Quick" },
        { id: "agent", label: "Agent Build" },
      ]}
      value="quick"
      onChange={onChange}
    />,
  );

  const group = screen.getByRole("group", { name: "Generation mode" });
  const buttons = within(group).getAllByRole("button");
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
  expect(buttons[1]).toHaveAttribute("aria-pressed", "false");

  buttons.forEach((button) => {
    expect(button.className).toContain("min-h-11");
    expect(button.className).toContain("md:min-h-9");
  });

  fireEvent.click(buttons[1]);
  expect(onChange).toHaveBeenCalledWith("agent");
});
