/* eslint-disable testing-library/no-container, testing-library/no-node-access */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { homepageGenres } from "../../content/homepageV2";
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
jest.mock("./HomepageFooter", () => () => <footer>Homepage footer</footer>);
jest.mock("./RobloxTrustStrip", () => () => null);

describe("HomepageV2Content", () => {
  beforeEach(() => {
    mockSubmitHomepagePrompt.mockReset();
  });

  test("provides the primary builder as an accessible loading interaction", () => {
    mockSubmitHomepagePrompt.mockImplementation(({ setLoading }) => setLoading(true));

    render(<HomepageV2Content navigate={jest.fn()} />);

    const main = screen.getByRole("main");
    const input = document.getElementById("homepage-hero-prompt");
    const heroForm = document.querySelector("[data-home-prompt='homepage-hero-prompt']");

    expect(main.id).toBe("main-content");
    expect(main.tabIndex).toBe(-1);
    expect(main.contains(screen.getByRole("contentinfo"))).toBe(false);
    expect(screen.getAllByRole("textbox", { name: "What Roblox game do you want to make?" })).toContain(input);
    expect(input.getAttribute("aria-describedby")).toBe("homepage-hero-prompt-message");

    fireEvent.change(input, { target: { value: "Build a round system" } });
    fireEvent.click(heroForm.querySelector("button[type='submit']"));

    expect(screen.getAllByRole("button", { name: "Opening..." })[0].disabled).toBe(true);
    expect(heroForm.getAttribute("aria-busy")).toBe("true");
  });

  test("associates submission errors with the exact prompt instance", () => {
    mockSubmitHomepagePrompt.mockImplementation(({ setError }) => setError("Could not start generation."));

    render(<HomepageV2Content navigate={jest.fn()} />);
    const input = document.getElementById("homepage-hero-prompt");
    const heroForm = document.querySelector("[data-home-prompt='homepage-hero-prompt']");
    fireEvent.change(input, { target: { value: "Build a shop UI" } });
    fireEvent.click(heroForm.querySelector("button[type='submit']"));

    expect(screen.getByRole("alert").textContent).toBe("Could not start generation.");
    expect(screen.getByRole("alert").id).toBe("homepage-hero-prompt-message");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  test("renders the complete game-builder story without shipping concept PNGs", () => {
    const { container } = render(<HomepageV2Content navigate={jest.fn()} />);

    expect(screen.getByRole("heading", { name: /Make the Roblox game in your head/i, level: 1 })).toBeTruthy();
    expect(container.querySelectorAll("[data-home-genre]")).toHaveLength(6);
    expect(container.querySelectorAll("ol[aria-label='NexusRBX build stages'] > li")).toHaveLength(4);

    const focusedToolHrefs = Array.from(
      container.querySelectorAll("nav[aria-label='Focused Roblox creation tools'] a"),
      (link) => link.getAttribute("href"),
    );
    expect(focusedToolHrefs).toEqual([
      "/roblox-script-generator",
      "/roblox-ai-scripter",
      "/roblox-studio-script-generator",
      "/roblox-lua-script-generator",
      "/roblox-gui-maker",
    ]);
    expect(container.querySelector("img[src*='nexus-cinematic']")).toBeNull();
    expect(container.querySelectorAll("[data-mini-world]").length).toBeGreaterThanOrEqual(6);
    expect(screen.getByRole("group", { name: "Illustrative NexusRBX workflow example" })).toBeTruthy();
    expect(screen.getByText("Plan approved")).toBeTruthy();
    expect(screen.getByText("Issue found")).toBeTruthy();
    expect(screen.getByText("Fix applied")).toBeTruthy();
    expect(screen.getByText("Playtest passed")).toBeTruthy();
  });

  test("loads a selected genre into the hero composer", () => {
    render(<HomepageV2Content navigate={jest.fn()} />);
    const horror = screen.getByRole("button", { name: /Horror/i });

    expect(screen.getByRole("button", { name: /Obby/i }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Choose a genre")).toBeTruthy();

    fireEvent.click(horror);

    expect(horror.getAttribute("aria-pressed")).toBe("true");
    expect(document.getElementById("homepage-hero-prompt").value).toBe(
      homepageGenres.find(({ id }) => id === "horror").prompt,
    );
    expect(screen.getByText("Horror starting point")).toBeTruthy();
    expect(screen.getByText("Prompt loaded into the builder above.")).toBeTruthy();
  });

  test("returns to the loaded prompt only after the user asks to continue", () => {
    render(<HomepageV2Content navigate={jest.fn()} />);
    const input = document.getElementById("homepage-hero-prompt");
    input.scrollIntoView = jest.fn();

    fireEvent.click(screen.getByRole("button", { name: /Horror/i }));
    expect(document.activeElement).not.toBe(input);

    fireEvent.click(screen.getByRole("button", { name: /Continue with this idea/i }));
    expect(document.activeElement).toBe(input);
    expect(input.scrollIntoView).toHaveBeenCalled();
  });

  test("labels workshop examples honestly and previews no more than three plans", () => {
    const { container } = render(<HomepageV2Content navigate={jest.fn()} />);

    expect(screen.getByRole("heading", { name: /Proof should be earned/i })).toBeTruthy();
    expect(screen.getByText(/not customer testimonials/i)).toBeTruthy();
    expect(container.querySelectorAll("#pricing article")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /Compare every plan/i }).getAttribute("href")).toBe("/pricing");
  });

  test("keeps the hero composer as the only dominant hero action", () => {
    const { container } = render(<HomepageV2Content navigate={jest.fn()} />);
    const hero = container.querySelector("[data-home-hero]");

    expect(hero.querySelectorAll("button[type='submit']")).toHaveLength(1);
    expect(hero.querySelectorAll("a")).toHaveLength(0);
    expect(hero.querySelector("button[type='submit']").textContent).toBe("Start building");
  });
});
