import React from "react";
import { render, screen } from "@testing-library/react";

import { Segmented } from "./index";

test("keeps segmented mode targets touch-sized on mobile and compact on desktop", () => {
  render(
    <Segmented
      size="sm"
      fullWidth
      options={[
        { id: "quick", label: "Quick" },
        { id: "agent", label: "Agent Build" },
      ]}
      value="quick"
      onChange={jest.fn()}
    />,
  );

  screen.getAllByRole("tab").forEach((tab) => {
    expect(tab.className).toContain("min-h-11");
    expect(tab.className).toContain("md:min-h-0");
  });
});
