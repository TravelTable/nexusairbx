import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import ModelSwitcher from "./ModelSwitcher";
import { useModelCatalog } from "../../hooks/useModelCatalog";
import { readNexusAutoPreferences } from "../../lib/nexusAutoPreferences";

jest.mock("../../hooks/useModelCatalog", () => ({ useModelCatalog: jest.fn() }));
jest.mock("../../lib/workspaceMenuPosition", () => ({
  getWorkspaceMenuHost: () => global.document.body, readWorkspaceHostScale: () => 1,
  resolveAnchoredMenuPosition: () => ({ strategy: "fixed", width: Math.min(420, global.window.innerWidth - 16), top: 20, left: 8, maxHeight: 640 }),
}));

const model = (id, extra = {}) => ({ id, name: id, provider: "openai", availableToPaid: true, availableToFree: false, pricingConfigured: true, ...extra });
const models = [
  model("current/frontier", { displayName: "Current Frontier", section: "latest", releasedAt: new Date(Date.now() - 86_400_000).toISOString(), badges: ["NEW", "FRONTIER"], description: "Complex coding and debugging", creditUsage: { level: "high" } }),
  model("anthropic/everyday", { name: "Everyday Coding", provider: "anthropic", section: "recommended", recommended: true, badges: ["RECOMMENDED"], description: "Everyday coding tasks", strengths: ["Refactoring", "Debugging"], contextWindow: 1_000_000, creditUsage: { level: "medium" } }),
  model("google/fast", { name: "Fast Coding", provider: "google", section: "efficient", availableToFree: true, badges: ["FAST", "BEST VALUE"], creditUsage: { level: "low" } }),
  model("other/available", { name: "Other Model", section: "more" }),
];

beforeEach(() => { localStorage.clear(); useModelCatalog.mockReturnValue({ models, loading: false, refreshing: false }); });
const open = () => fireEvent.click(screen.getByTitle("Select AI model"));

test("Auto leads the grouped catalog, models appear once, and More Models starts collapsed", () => {
  render(<ModelSwitcher value="nexus-free-auto" onChange={jest.fn()} isStarterOrAbove />);
  open();
  const dialog = screen.getByRole("dialog", { name: "Choose AI model" });
  expect(dialog.querySelector("[data-model-option]")).toHaveTextContent("Nexus Auto");
  for (const section of ["Latest", "Recommended", "Fast & Efficient"]) expect(screen.getByRole("region", { name: section })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Everyday Coding" })).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "Other Model" })).not.toBeInTheDocument();
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /More Models/ }));
  expect(screen.getByRole("button", { name: "Other Model" })).toBeInTheDocument();
  expect(screen.getByText("High credits")).toBeInTheDocument();
});

test("paid users select supported models and the legacy Auto sentinel remains compatible", () => {
  const onChange = jest.fn();
  render(<ModelSwitcher value="nexus-auto" onChange={onChange} isStarterOrAbove />);
  expect(screen.getByTitle("Select AI model")).toHaveTextContent("Auto · Balanced");
  open(); fireEvent.click(screen.getByRole("button", { name: "Everyday Coding" }));
  expect(onChange).toHaveBeenCalledWith("anthropic/everyday");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByTitle("Select AI model")).toHaveFocus();
  open(); fireEvent.click(screen.getByRole("button", { name: /Nexus Auto RECOMMENDED/ }));
  expect(onChange).toHaveBeenCalledWith("nexus-free-auto");
});

test("missing selection defaults to Nexus Auto while unsupported catalog rows are omitted", () => {
  useModelCatalog.mockReturnValue({ models: [...models, model("unsupported", { pricingConfigured: false }), model("disabled", { availability: "disabled" })] });
  const onChange = jest.fn();
  render(<ModelSwitcher onChange={onChange} isStarterOrAbove />);
  expect(onChange).toHaveBeenCalledWith("nexus-free-auto");
  open();
  expect(screen.queryByText("unsupported")).not.toBeInTheDocument();
  expect(screen.queryByText("disabled")).not.toBeInTheDocument();
  expect(screen.queryByText("Gemini 3.6 Flash")).not.toBeInTheDocument();
});

test("free accounts can inspect paid models but cannot select them", () => {
  const onChange = jest.fn(); const onStarterNudge = jest.fn();
  render(<ModelSwitcher value="nexus-free-auto" onChange={onChange} onStarterNudge={onStarterNudge} />);
  open();
  const locked = screen.getByRole("button", { name: "Everyday Coding, unavailable on your plan" });
  expect(locked).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(locked);
  expect(onChange).not.toHaveBeenCalled();
  expect(onStarterNudge).toHaveBeenCalledWith("Model Selection");
  fireEvent.click(screen.getByRole("button", { name: "Fast Coding" }));
  expect(onChange).toHaveBeenCalledWith("google/fast");
});

test("Auto modes support arrow keys and settings preserve provider exclusion and credit ceiling", () => {
  const onChange = jest.fn();
  render(<ModelSwitcher value="nexus-free-auto" onChange={onChange} isStarterOrAbove />);
  open();
  const balanced = screen.getByRole("radio", { name: "Balanced, recommended" });
  expect(balanced).toHaveAttribute("aria-checked", "true");
  fireEvent.keyDown(balanced, { key: "ArrowLeft" });
  expect(screen.getByRole("radio", { name: "Economy" })).toHaveFocus();
  expect(readNexusAutoPreferences().mode).toBe("economy");
  fireEvent.click(screen.getByText("Auto preferences"));
  fireEvent.click(screen.getByRole("checkbox", { name: "OpenAI" }));
  fireEvent.change(screen.getByRole("spinbutton", { name: /Maximum credits per request/ }), { target: { value: "50" } });
  expect(readNexusAutoPreferences()).toEqual({ mode: "economy", allowedProviders: ["anthropic", "google"], creditCeiling: 50 });
  expect(onChange).toHaveBeenCalledWith("nexus-free-auto");
});

test("keyboard navigation, Escape focus restoration and accessible details work without hover", () => {
  render(<ModelSwitcher value="nexus-free-auto" onChange={jest.fn()} isStarterOrAbove />);
  open();
  const auto = screen.getByRole("button", { name: /Nexus Auto RECOMMENDED/ });
  act(() => auto.focus());
  fireEvent.keyDown(auto, { key: "ArrowDown" });
  expect(screen.getByRole("button", { name: "Current Frontier" })).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "About Everyday Coding" }));
  const details = screen.getByRole("region", { name: "Details for Everyday Coding" });
  expect(within(details).getByText("1M tokens")).toBeInTheDocument();
  expect(within(details).getByText("Refactoring, Debugging")).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByTitle("Select AI model")).toHaveFocus();
});

test("large catalogs expose search and filters and search expands matching More Models", () => {
  useModelCatalog.mockReturnValue({ models: [...models, ...Array.from({ length: 40 }, (_, index) => model(`Extra Model ${index}`, { section: "more" }))] });
  render(<ModelSwitcher value="nexus-free-auto" onChange={jest.fn()} isStarterOrAbove />);
  open();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search models" }), { target: { value: "Extra Model 39" } });
  expect(screen.getByRole("button", { name: "Extra Model 39" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Everyday Coding" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Filter models" }), { target: { value: "low" } });
  expect(screen.getByRole("button", { name: "Fast Coding" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Current Frontier" })).not.toBeInTheDocument();
});

test("narrow screens retain a viewport-sized scroll surface and readable Auto controls", () => {
  const originalWidth = window.innerWidth;
  window.innerWidth = 320;
  render(<ModelSwitcher value="nexus-free-auto" onChange={jest.fn()} isStarterOrAbove />);
  open();
  expect(screen.getByRole("dialog")).toHaveStyle({ width: "304px" });
  expect(screen.getAllByRole("radio")).toHaveLength(3);
  expect(screen.getByRole("button", { name: "Current Frontier" })).toBeInTheDocument();
  window.innerWidth = originalWidth;
});

test("catalog failure offers retry without advertising a fabricated fallback model", () => {
  const refresh = jest.fn();
  useModelCatalog.mockReturnValue({ models: [], error: new Error("offline"), refresh });
  render(<ModelSwitcher value="nexus-free-auto" onChange={jest.fn()} />);
  open();
  expect(screen.getByText("Live models are temporarily unavailable.")).toBeInTheDocument();
  expect(screen.queryByText("Gemini 3.6 Flash")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(refresh).toHaveBeenCalled();
});
