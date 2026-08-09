import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("../../lib/localDevelopmentAuth", () => ({
  shouldUseLocalDevelopmentAuth: () => false,
}));
jest.mock("./PluginCallout", () => () => null);

import RobloxTrustStrip from "./RobloxTrustStrip";

describe("RobloxTrustStrip account CTA", () => {
  test("opens the workspace for a signed-in account instead of offering sign-in", () => {
    render(<RobloxTrustStrip user={{ uid: "user_1" }} authReady />);

    expect(screen.getByRole("link", { name: "Open AI workspace" }).getAttribute("href")).toBe("/ai");
    expect(screen.queryByRole("link", { name: "Sign in with Google" })).toBeNull();
  });

  test("offers Google sign-in only after signed-out auth resolves", () => {
    const { rerender } = render(<RobloxTrustStrip user={null} authReady={false} />);

    expect(screen.getByRole("status").textContent).toBe("Checking account...");
    expect(screen.queryByRole("link", { name: "Sign in with Google" })).toBeNull();

    rerender(<RobloxTrustStrip user={null} authReady />);
    expect(screen.getByRole("link", { name: "Sign in with Google" }).getAttribute("href")).toBe("/signin");
  });
});
