/* eslint-disable testing-library/no-container, testing-library/no-node-access */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import HomepageV2Content from "./HomepageV2Content";

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
    const connectorLink = screen.getByRole("link", { name: /Get the desktop connector/i });
    expect(connectorLink.getAttribute("href")).toBe("/downloads");
    expect(connectorLink.className).toContain("min-h-11");

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

  test("uses responsive cinematic media and the complete story hierarchy", () => {
    const { container } = render(<HomepageV2Content navigate={jest.fn()} />);

    expect(
      screen.getByRole("heading", { name: "AI Roblox Script Generator for Studio", level: 1 })
    ).toBeTruthy();

    const heroImage = container.querySelector("[data-home-hero-image]");
    expect(heroImage.getAttribute("src")).toBe("/assets/nexus-cinematic-hero-v2-1600.webp");
    expect(heroImage.getAttribute("width")).toBe("1600");
    expect(heroImage.getAttribute("height")).toBe("901");
    expect(heroImage.getAttribute("loading")).toBe("eager");
    expect(heroImage.getAttribute("fetchpriority")).toBe("high");
    expect(heroImage.previousElementSibling.getAttribute("srcset")).toBe(
      "/assets/nexus-cinematic-hero-v2-960.webp"
    );

    const vaultImage = container.querySelector("[data-home-vault-image]");
    expect(vaultImage.getAttribute("src")).toBe("/assets/nexus-cinematic-vault-v2-1600.webp");
    expect(vaultImage.getAttribute("loading")).toBe("lazy");
    expect(vaultImage.previousElementSibling.getAttribute("srcset")).toBe(
      "/assets/nexus-cinematic-vault-v2-960.webp"
    );

    const finalImage = container.querySelector("[data-home-final-image]");
    expect(finalImage.getAttribute("src")).toBe("/assets/nexus-cinematic-final-v2-1600.webp");
    expect(finalImage.getAttribute("width")).toBe("1600");
    expect(finalImage.getAttribute("height")).toBe("901");
    expect(finalImage.getAttribute("loading")).toBe("lazy");
    expect(finalImage.previousElementSibling.getAttribute("srcset")).toBe(
      "/assets/nexus-cinematic-final-v2-960.webp"
    );

    expect(container.querySelectorAll("[data-home-story-card]")).toHaveLength(3);
    expect(container.querySelectorAll("[data-home-capability]")).toHaveLength(6);
    expect(container.querySelector('img[src*="nexus-product-mock"]')).toBeNull();
  });
});
