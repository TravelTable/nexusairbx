import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("./PluginCallout", () => () => null);

import RobloxTrustStrip from "./RobloxTrustStrip";

describe("RobloxTrustStrip", () => {
  test("uses specific trust claims without implying Roblox endorsement", () => {
    render(<RobloxTrustStrip />);

    expect(screen.getByText("Review before Studio writes")).toBeTruthy();
    expect(screen.getByText("OAuth credentials stay server-side")).toBeTruthy();
    expect(screen.queryByText(/OAuth Verified/i)).toBeNull();
    expect(screen.getByRole("link", { name: "Built for Roblox Studio" }).getAttribute("href"))
      .toContain("create.roblox.com/store/asset/");
  });
});
