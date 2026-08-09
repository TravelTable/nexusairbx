import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("lib/icons", () => {
  const Icon = (props) => <span {...props} />;
  return {
    Blocks: Icon,
    Library: Icon,
    SearchCheck: Icon,
    WandSparkles: Icon,
  };
});

import HomepageFeatures from "./HomepageFeatures";

test("provides the cross-page features fragment target", () => {
  render(<HomepageFeatures />);

  const section = screen.getByRole("region", {
    name: "Generate, debug, and ship Roblox code without leaving your build loop.",
  });
  expect(section.id).toBe("features");
});
