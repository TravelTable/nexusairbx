import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

const mockSubmitHomepagePrompt = jest.fn();

jest.mock("@vercel/analytics", () => ({ track: jest.fn() }));
jest.mock("../../lib/experiments", () => ({
  getExperimentAnalyticsProperties: () => ({}),
  getHomepageCtaCopy: () => "Generate",
}));
jest.mock("../../lib/homepageActivation", () => ({
  submitHomepagePrompt: (...args) => mockSubmitHomepagePrompt(...args),
  trackHomepagePromptStarted: jest.fn(),
}));
jest.mock("../../lib/productAnalytics", () => ({
  trackProductEvent: jest.fn(() => Promise.resolve()),
}));
jest.mock("./HomepageFeatures", () => () => null);
jest.mock("./HomepageWorkflow", () => () => null);
jest.mock("./HomepageIntentEvidence", () => () => null);
jest.mock("./HomepageFooter", () => () => <footer>Homepage footer</footer>);
jest.mock("./RobloxTrustStrip", () => () => null);
jest.mock("./CompanionDownloadSection", () => () => null);

import HomepageV2Content from "./HomepageV2Content";

describe("HomepageV2Content prompt accessibility", () => {
  beforeEach(() => {
    mockSubmitHomepagePrompt.mockReset();
  });

  test("provides a main landmark, labeled prompt, focus treatment, and loading state", () => {
    mockSubmitHomepagePrompt.mockImplementation(({ setLoading }) => setLoading(true));

    render(<HomepageV2Content navigate={jest.fn()} />);

    const main = screen.getByRole("main");
    expect(main.id).toBe("main-content");
    expect(main.tabIndex).toBe(-1);
    expect(main.contains(screen.getByRole("contentinfo"))).toBe(false);
    const input = screen.getByRole("textbox", { name: "Describe the Roblox script or UI you want" });
    expect(input.className).toContain("focus-visible:ring-2");
    expect(input.className).toContain("flex-none");
    expect(input.className).toContain("sm:flex-1");
    expect(input.getAttribute("aria-describedby")).toBe("homepage-prompt-message");
    expect(screen.getByRole("link", { name: /Get the Studio companion/i }).className).toContain("min-h-11");

    fireEvent.change(input, { target: { value: "Build a round system" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    expect(screen.getByRole("button", { name: "Opening..." }).disabled).toBe(true);
    expect(document.querySelector("[data-generation-intent-form='homepage']").getAttribute("aria-busy")).toBe("true");
  });

  test("associates submission errors with the prompt", () => {
    mockSubmitHomepagePrompt.mockImplementation(({ setError }) => setError("Could not start generation."));

    render(<HomepageV2Content navigate={jest.fn()} />);
    const input = screen.getByRole("textbox", { name: "Describe the Roblox script or UI you want" });
    fireEvent.change(input, { target: { value: "Build a shop UI" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    expect(screen.getByRole("alert").textContent).toBe("Could not start generation.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});
