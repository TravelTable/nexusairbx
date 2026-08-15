/* eslint-disable testing-library/no-container, testing-library/no-node-access */
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

describe("HomepageV2Content", () => {
  beforeEach(() => {
    mockSubmitHomepagePrompt.mockReset();
  });

  test("provides the primary composer as an accessible loading interaction", () => {
    mockSubmitHomepagePrompt.mockImplementation(({ setLoading }) => setLoading(true));

    render(<HomepageV2Content navigate={jest.fn()} />);

    const main = screen.getByRole("main");
    const input = document.getElementById("homepage-hero-prompt");
    const heroForm = document.querySelector("[data-home-prompt='homepage-hero-prompt']");

    expect(main.id).toBe("main-content");
    expect(main.tabIndex).toBe(-1);
    expect(main.contains(screen.getByRole("contentinfo"))).toBe(false);
    expect(screen.getByRole("textbox", { name: "What Roblox game do you want to make?" })).toBe(input);
    expect(input.getAttribute("aria-describedby")).toBe("homepage-hero-prompt-message");

    fireEvent.change(input, { target: { value: "Build a round system" } });
    fireEvent.click(heroForm.querySelector("button[type='submit']"));

    expect(screen.getByRole("button", { name: "Opening..." }).disabled).toBe(true);
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

  test("submits the multiline composer with Enter and preserves Shift+Enter", () => {
    render(<HomepageV2Content navigate={jest.fn()} />);
    const input = document.getElementById("homepage-hero-prompt");

    fireEvent.change(input, { target: { value: "Build an inventory" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", shiftKey: true });
    expect(mockSubmitHomepagePrompt).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(mockSubmitHomepagePrompt).toHaveBeenCalledWith(expect.objectContaining({
      inputValue: "Build an inventory",
      method: "enter",
    }));
  });

  test("uses a real product-shaped hero and the approved flat 2D Stage artwork", () => {
    const { container } = render(<HomepageV2Content navigate={jest.fn()} />);

    expect(screen.getByRole("heading", { name: /Talk to your Roblox project.*Watch it take shape/i, level: 1 })).toBeTruthy();
    const demo = screen.getByRole("group", { name: "Interactive NexusRBX product demonstration" });
    expect(within(demo).getByRole("region", { name: "Stage" })).toBeTruthy();
    expect(within(demo).getByRole("list", { name: "Conversation-to-construction sequence" }).children).toHaveLength(6);

    const stageImage = screen.getByRole("img", { name: /Flat editorial map/i });
    expect(stageImage.getAttribute("src")).toBe("/assets/nexus-world-under-construction-2d.webp");
    expect(screen.getByAltText(/technical cutaway/i).getAttribute("src")).toBe("/assets/nexus-project-xray-2d.webp");
    expect(screen.getByAltText(/grey blockout/i).getAttribute("src")).toBe("/assets/nexus-world-transformation-2d.webp");
    expect(screen.getByAltText(/diagnostic route/i).getAttribute("src")).toBe("/assets/nexus-debug-trace-2d.webp");
    expect(screen.getByAltText(/inventory, HUD, navigation/i).getAttribute("src")).toBe("/assets/nexus-interface-assembly-2d.webp");
    expect(screen.getByAltText(/reviewed Nexus change set/i).getAttribute("src")).toBe("/assets/nexus-studio-bridge-2d.webp");
    expect(stageImage.getAttribute("width")).toBe("1920");
    expect(stageImage.getAttribute("height")).toBe("1072");
    expect(container.textContent).not.toMatch(/creator workshop|nexus workshop/i);
    expect(container.querySelector("img[src*='3d']")).toBeNull();
  });

  test("uses the Nexus display family for the explanatory build ledger", () => {
    const { container } = render(<HomepageV2Content navigate={jest.fn()} />);
    const icons = Array.from(
      container.querySelectorAll("#workflow [data-nexus-display-icon]"),
      (icon) => icon.getAttribute("data-nexus-display-icon"),
    );

    expect(icons).toEqual(["ask", "assets", "plan", "build", "debug", "complete"]);
    expect(container.querySelectorAll("[aria-label='Conversation-to-construction sequence'] [data-nexus-display-icon]")).toHaveLength(0);
  });

    test("lets creators inspect every request stage without relying on purple alone", () => {
    render(<HomepageV2Content navigate={jest.fn()} />);
    const inspect = screen.getByRole("button", { name: "Inspect" });
    const build = screen.getByRole("button", { name: "Build" });

    expect(build.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(inspect);

    expect(inspect.getAttribute("aria-pressed")).toBe("true");
    expect(build.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("6 references found")).toBeTruthy();
    expect(screen.getAllByText("Read the real project").length).toBeGreaterThanOrEqual(1);
    });

    test("turns the world progression artwork into an operable three-state comparison", () => {
      const { container } = render(<HomepageV2Content navigate={jest.fn()} />);

      const figure = container.querySelector("[data-transformation-stage]");
      expect(figure.getAttribute("data-transformation-stage")).toBe("build");

      fireEvent.click(screen.getByRole("button", { name: /Finished world/i }));
      expect(figure.getAttribute("data-transformation-stage")).toBe("finished");
      expect(screen.getByText(/Finished world selected: Tested experience/i)).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: /Blockout/i }));
      expect(figure.getAttribute("data-transformation-stage")).toBe("blockout");
    });

  test("loads a selected genre into the hero composer", () => {
    const { container } = render(<HomepageV2Content navigate={jest.fn()} />);
    const horror = screen.getByRole("button", { name: /Horror/i });

    expect(container.querySelectorAll("[data-home-genre]")).toHaveLength(8);
    expect(container.querySelectorAll("[data-home-genre] img[loading='lazy']")).toHaveLength(8);
    homepageGenres.forEach((genre) => {
      const image = screen.getByAltText(genre.imageAlt);
      expect(image.getAttribute("src")).toBe(genre.image);
      expect(image.getAttribute("width")).toBe("704");
      expect(image.getAttribute("height")).toBe("440");
    });
    expect(horror.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Choose a direction")).toBeTruthy();

    fireEvent.click(horror);

    expect(horror.getAttribute("aria-pressed")).toBe("true");
    expect(document.getElementById("homepage-hero-prompt").value).toBe(
      homepageGenres.find(({ id }) => id === "horror").prompt,
    );
    expect(screen.getByText("Horror brief loaded")).toBeTruthy();
  });

  test("returns to a loaded genre brief only when the user asks", () => {
    render(<HomepageV2Content navigate={jest.fn()} />);
    const input = document.getElementById("homepage-hero-prompt");
    input.scrollIntoView = jest.fn();

    fireEvent.click(screen.getByRole("button", { name: /Horror/i }));
    expect(document.activeElement).not.toBe(input);

    fireEvent.click(screen.getByRole("button", { name: /Continue in the composer/i }));
    expect(document.activeElement).toBe(input);
    expect(input.scrollIntoView).toHaveBeenCalled();
  });

  test("labels curated examples and Robux upside honestly", () => {
    const { container } = render(<HomepageV2Content navigate={jest.fn()} />);

    expect(screen.getByRole("heading", { name: /Breadth without invented customer proof/i })).toBeTruthy();
    expect(screen.getByText(/not testimonials or earnings claims/i)).toBeTruthy();
    expect(container.querySelectorAll("#examples article")).toHaveLength(3);
    expect(screen.getByText(/Robux can follow—never promised/i)).toBeTruthy();
    expect(screen.getByText(/Robux is an outcome, not a generate button/i)).toBeTruthy();
  });

  test("keeps one dominant conversion action in the hero", () => {
    const { container } = render(<HomepageV2Content navigate={jest.fn()} />);
    const hero = container.querySelector("[data-home-hero]");

    expect(hero.querySelectorAll("button[type='submit']")).toHaveLength(1);
    expect(hero.querySelectorAll("a")).toHaveLength(0);
    expect(hero.querySelector("button[type='submit']").textContent).toBe("Start building");
  });
});
