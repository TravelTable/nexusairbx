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
    expect(main.contains(screen.getByText("Homepage footer").closest("footer"))).toBe(false);
    expect(within(heroForm).getByRole("textbox", { name: "What Roblox game do you want to make?" })).toBe(input);
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

  test("opens on a concrete request and a flat 2D project cutaway", () => {
    const { container } = render(<HomepageV2Content navigate={jest.fn()} />);

    expect(screen.getByRole("heading", { name: "Create a round-based horror game in a broken arcade.", level: 1 })).toBeTruthy();
    expect(screen.getByText("REQUEST / 184")).toBeTruthy();
    expect(screen.getByText("18 objects / 4 existing systems / 1 blocked remote")).toBeTruthy();

    const projectImage = screen.getByRole("img", { name: /broken arcade project/i });
    expect(projectImage.getAttribute("src")).toBe("/assets/nexus-world-under-construction-2d.webp");
    expect(screen.getByAltText(/technical cutaway/i).getAttribute("src")).toBe("/assets/nexus-project-xray-2d.webp");
    expect(screen.getByAltText(/diagnostic route/i).getAttribute("src")).toBe("/assets/nexus-debug-trace-2d.webp");
    expect(screen.getByAltText(/inventory, HUD, navigation/i).getAttribute("src")).toBe("/assets/nexus-interface-assembly-2d.webp");
    expect(projectImage.getAttribute("width")).toBe("1920");
    expect(projectImage.getAttribute("height")).toBe("1072");
    expect(container.textContent).not.toMatch(/creator workshop|nexus workshop/i);
    expect(container.querySelector("img[src*='3d']")).toBeNull();
  });

  test("changes composition across read, change, test, and review evidence", () => {
    const { container } = render(<HomepageV2Content navigate={jest.fn()} />);

    expect(screen.getByRole("heading", { name: "One request. One legible record of work." })).toBeTruthy();
    expect(screen.getByRole("list", { name: "Affected Roblox project objects" }).children).toHaveLength(4);
    expect(screen.getByLabelText("Illustrative Luau change")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Playtest run record" }).children).toHaveLength(6);
    expect(screen.getByText("READY FOR YOUR DECISION")).toBeTruthy();
    expect(container.querySelectorAll("#workflow [data-nexus-display-icon]")).toHaveLength(0);
    expect(container.querySelectorAll("#workflow button")).toHaveLength(0);
  });

  test("communicates build state with text and a complete run record", () => {
    render(<HomepageV2Content navigate={jest.fn()} />);

    expect(screen.getByText("TEST FAILED").getAttribute("data-tone")).toBe("warning");
    expect(screen.getByText("7 CHECKS PASSED", { selector: "strong" }).getAttribute("data-tone")).toBe("success");
    expect(screen.getAllByText("7 CHECKS PASSED").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Restore snapshot NXS-184")).toBeTruthy();
  });

  test("uses one selected world with a text index and loads its brief into the composer", () => {
    const { container } = render(<HomepageV2Content navigate={jest.fn()} />);
    const horror = screen.getByRole("button", { name: /Horror/i });
    const obby = screen.getByRole("button", { name: /Obby/i });
    const horrorGenre = homepageGenres.find(({ id }) => id === "horror");
    const obbyGenre = homepageGenres.find(({ id }) => id === "obby");

    expect(container.querySelectorAll("[data-home-genre]")).toHaveLength(8);
    expect(container.querySelectorAll("[data-home-genre] img")).toHaveLength(0);
    expect(container.querySelectorAll("#genres img[loading='lazy']")).toHaveLength(1);
    const initialImage = screen.getByAltText(horrorGenre.imageAlt);
    expect(initialImage.getAttribute("src")).toBe(horrorGenre.image);
    expect(initialImage.getAttribute("width")).toBe("704");
    expect(initialImage.getAttribute("height")).toBe("440");
    expect(horror.getAttribute("aria-pressed")).toBe("true");
    expect(obby.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("HORROR BRIEF LOADED")).toBeTruthy();

    fireEvent.click(obby);

    expect(horror.getAttribute("aria-pressed")).toBe("false");
    expect(obby.getAttribute("aria-pressed")).toBe("true");
    expect(document.getElementById("homepage-hero-prompt").value).toBe(
      obbyGenre.prompt,
    );
    expect(screen.getByAltText(obbyGenre.imageAlt).getAttribute("src")).toBe(obbyGenre.image);
    expect(screen.getByText("OBBY BRIEF LOADED")).toBeTruthy();
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
    expect(hero.querySelector("button[type='submit']").textContent).toBe("Run build");
  });
});
