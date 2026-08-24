/* eslint-disable testing-library/no-container, testing-library/no-node-access */
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import HomepageV2Content from "./HomepageV2Content";

const mockSubmitHomepagePrompt = jest.fn();

jest.mock("@vercel/analytics", () => ({ track: jest.fn() }));
jest.mock("../../lib/experiments", () => ({ getExperimentAnalyticsProperties: () => ({}), getHomepageCtaCopy: () => "Generate" }));
jest.mock("../../lib/homepageActivation", () => ({ submitHomepagePrompt: (...args) => mockSubmitHomepagePrompt(...args), trackHomepagePromptStarted: jest.fn() }));
jest.mock("../../lib/productAnalytics", () => ({ trackProductEvent: jest.fn(() => Promise.resolve()) }));
jest.mock("./HomepageFooter", () => () => <footer>Homepage footer</footer>);

describe("HomepageV2Content", () => {
  beforeEach(() => mockSubmitHomepagePrompt.mockReset());

  test("provides the primary composer as an accessible loading interaction", () => {
    mockSubmitHomepagePrompt.mockImplementation(({ setLoading }) => setLoading(true));
    render(<HomepageV2Content navigate={jest.fn()} />);
    const main = screen.getByRole("main");
    const input = document.getElementById("homepage-hero-prompt");
    const form = document.querySelector("[data-home-prompt='homepage-hero-prompt']");
    expect(main.id).toBe("main-content");
    expect(main.tabIndex).toBe(-1);
    expect(within(form).getByRole("textbox", { name: "What Roblox game do you want to make?" })).toBe(input);
    fireEvent.change(input, { target: { value: "Build a round system" } });
    fireEvent.click(form.querySelector("button[type='submit']"));
    expect(screen.getByRole("button", { name: "Opening..." }).disabled).toBe(true);
    expect(form.getAttribute("aria-busy")).toBe("true");
    expect(form.querySelector("[class*='submissionSweep']")).toBeTruthy();
    expect(form.querySelector("button[type='submit'] svg path").getAttribute("d")).toBe("m4.5 10.5 3.25 3.25L15.5 6");
  });

  test("associates submission errors with the exact prompt", () => {
    mockSubmitHomepagePrompt.mockImplementation(({ setError }) => setError("Could not start generation."));
    render(<HomepageV2Content navigate={jest.fn()} />);
    const input = document.getElementById("homepage-hero-prompt");
    fireEvent.change(input, { target: { value: "Build a shop UI" } });
    fireEvent.click(document.querySelector("[data-home-prompt='homepage-hero-prompt'] button[type='submit']"));
    expect(screen.getByRole("alert").id).toBe("homepage-hero-prompt-message");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  test("keeps a static search-intent heading, animated promise, lead image, and labeled image slots", () => {
    const { container } = render(<HomepageV2Content navigate={jest.fn()} />);
    expect(screen.getByRole("heading", { name: "AI Roblox Script Generator and Studio Agent", level: 1 })).toBeTruthy();
    expect(screen.getByLabelText("Build your Roblox game. Make it playable.")).toBeTruthy();
    expect(container.querySelectorAll("[data-image-placeholder]")).toHaveLength(12);
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(screen.getByRole("img", { name: /Roblox character running beside a simple block/i }).getAttribute("src")).toBe(
      "/assets/nexusrbx-roblox-gameplay-hero.png",
    );
  });

  test("switches the tabbed tool showcase", () => {
    render(<HomepageV2Content navigate={jest.fn()} />);
    const studioTab = screen.getByRole("tab", { name: "Studio sync" });
    expect(screen.getByRole("tab", { name: "Agent build" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(studioTab);
    expect(studioTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("heading", { name: "Work with the place you have" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "STUDIO BRIDGE SCREENSHOT image placeholder" })).toBeTruthy();
  });

  test("presents the build stack and accessible FAQ", () => {
    const { container } = render(<HomepageV2Content navigate={jest.fn()} />);
    expect(container.querySelectorAll("[class*='stackGrid'] article")).toHaveLength(6);
    expect(screen.getByText("Can Nexus work with an existing Roblox game?")).toBeTruthy();
    expect(screen.getByText(/reads the current project first/i)).toBeTruthy();
  });

  test("keeps one composer action plus explicit hero links", () => {
    const { container } = render(<HomepageV2Content navigate={jest.fn()} />);
    const hero = container.querySelector("[data-home-hero]");
    expect(hero.querySelectorAll("button[type='submit']")).toHaveLength(1);
    expect(hero.querySelectorAll("a")).toHaveLength(2);
    expect(Array.from(hero.querySelectorAll("a")).map((link) => link.getAttribute("href"))).toEqual(["/ai", "/pricing"]);
    expect(hero.querySelector("button[type='submit']").textContent).toBe("Start building");
  });

  test("links to every focused search landing page with descriptive anchor text", () => {
    render(<HomepageV2Content navigate={jest.fn()} />);
    const focusedTools = screen.getByRole("navigation", { name: "Focused Roblox creation tools" });
    const expectedLinks = [
      ["Roblox script generator", "/roblox-script-generator"],
      ["Roblox AI scripter", "/roblox-ai-scripter"],
      ["Studio script generator", "/roblox-studio-script-generator"],
      ["Luau script generator", "/roblox-lua-script-generator"],
      ["Roblox GUI maker", "/roblox-gui-maker"],
    ];

    expectedLinks.forEach(([name, href]) => {
      expect(within(focusedTools).getByRole("link", { name: new RegExp(name, "i") }).getAttribute("href")).toBe(href);
    });
  });

  test("submits the selected creation mode", () => {
    render(<HomepageV2Content navigate={jest.fn()} />);
    const form = document.querySelector("[data-home-prompt='homepage-hero-prompt']");
    fireEvent.click(within(form).getByRole("button", { name: /Choose creation mode/ }));
    fireEvent.click(within(form).getByRole("button", { name: "Asset" }));
    fireEvent.change(within(form).getByRole("textbox"), {
      target: { value: "Create a crystal lantern icon" },
    });
    fireEvent.click(form.querySelector("button[type='submit']"));

    expect(mockSubmitHomepagePrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        creationMode: "asset",
        inputValue: "Create a crystal lantern icon",
      }),
    );
  });
});
