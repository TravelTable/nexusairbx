import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import ModelSwitcher from "./ModelSwitcher";
import { useModelCatalog } from "../../hooks/useModelCatalog";

jest.mock("../../hooks/useModelCatalog", () => ({ useModelCatalog: jest.fn() }));
jest.mock("../../lib/workspaceMenuPosition", () => ({
  getWorkspaceMenuHost: () => global.document.body,
  resolveAnchoredMenuPosition: () => ({
    strategy: "fixed",
    width: 336,
    top: 20,
    left: 20,
    maxHeight: 500,
  }),
}));

const models = [
  {
    id: "google/gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    provider: "google",
    availableToPaid: true,
    availableToFree: true,
    pricingConfigured: true,
    recommended: true,
    recommendationScore: 20,
    recommendedFor: ["fast"],
  },
  {
    id: "anthropic/claude-opus-5",
    name: "Claude Opus 5",
    provider: "anthropic",
    availableToPaid: true,
    availableToFree: false,
    pricingConfigured: true,
    recommended: true,
    recommendationScore: 30,
    recommendedFor: ["coding", "reasoning"],
    capabilities: ["coding", "reasoning", "tools"],
  },
  {
    id: "acme/frontier",
    name: "Frontier",
    provider: "acme-cloud",
    availableToPaid: true,
    availableToFree: false,
    pricingConfigured: true,
    recommended: true,
    recommendationScore: 200,
    recommendedFor: ["general"],
  },
];

beforeEach(() => {
  useModelCatalog.mockReturnValue({ models, loading: false, refreshing: false });
});

test("renders the compact search-first Auto, Recommended, and provider-grouped catalogue", () => {
  render(
    <ModelSwitcher
      value="google/gemini-3.6-flash"
      onChange={jest.fn()}
      isStarterOrAbove
    />
  );
  fireEvent.click(screen.getByTitle("Select AI model"));
  expect(screen.getByRole("searchbox", { name: "Search models" })).toBeInTheDocument();
  expect(screen.getByText("Nexus Auto")).toBeInTheDocument();
  expect(screen.getByText("Recommended")).toBeInTheDocument();
  expect(screen.getByText("All models")).toBeInTheDocument();
  expect(screen.getByText("Acme Cloud")).toBeInTheDocument();
  expect(screen.getAllByRole("option", { name: /Claude Opus 5/i })).toHaveLength(2);
  expect(screen.getAllByRole("option", { name: /^Frontier$/i })).toHaveLength(1);
  expect(screen.queryByText(/× usage/i)).not.toBeInTheDocument();
  expect(screen.getByRole("listbox")).toHaveStyle({ maxHeight: "500px", width: "336px" });
});

test("search matches provider and free accounts cannot select locked paid models", () => {
  const onChange = jest.fn();
  const onStarterNudge = jest.fn();
  render(
    <ModelSwitcher
      value="google/gemini-3.6-flash"
      onChange={onChange}
      onStarterNudge={onStarterNudge}
    />
  );
  fireEvent.click(screen.getByTitle("Select AI model"));
  fireEvent.change(screen.getByRole("searchbox", { name: "Search models" }), {
    target: { value: "anthropic" },
  });
  const opusRows = screen.getAllByRole("option", { name: /Claude Opus 5/i });
  expect(opusRows[0]).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(opusRows[0]);
  expect(onStarterNudge).toHaveBeenCalledWith("Model Selection");
  expect(onChange).not.toHaveBeenCalledWith("anthropic/claude-opus-5");
});

test("paid users can select any supported model and Auto remains a routing preference", () => {
  const onChange = jest.fn();
  const { rerender } = render(
    <ModelSwitcher
      value="google/gemini-3.6-flash"
      onChange={onChange}
      isStarterOrAbove
    />
  );
  fireEvent.click(screen.getByTitle("Select AI model"));
  const opusRows = screen.getAllByRole("option", { name: /Claude Opus 5/i });
  expect(opusRows[0]).toHaveAttribute("aria-disabled", "false");
  fireEvent.click(opusRows[0]);
  expect(onChange).toHaveBeenCalledWith("anthropic/claude-opus-5");

  rerender(
    <ModelSwitcher value="nexus-free-auto" onChange={onChange} isStarterOrAbove />
  );
  expect(screen.getByTitle("Select AI model")).toHaveTextContent("Auto");
});

test("a long live catalogue stays in one bounded scroll surface and remains searchable", () => {
  const longCatalog = Array.from({ length: 80 }, (_, index) => ({
    id: `provider-${index % 8}/model-${index}`,
    name: `Model ${index}`,
    provider: `provider-${index % 8}`,
    availableToPaid: true,
    availableToFree: false,
    pricingConfigured: true,
    recommendationScore: 80 - index,
    recommendedFor: index % 2 ? ["coding"] : ["fast"],
  }));
  useModelCatalog.mockReturnValue({ models: longCatalog, loading: false, refreshing: false });

  render(<ModelSwitcher value="provider-0/model-0" onChange={jest.fn()} isStarterOrAbove />);
  fireEvent.click(screen.getByTitle("Select AI model"));
  const listbox = screen.getByRole("listbox");
  expect(listbox).toHaveClass("overflow-y-auto");
  expect(listbox).toHaveStyle({ maxHeight: "500px", width: "336px" });

  fireEvent.change(screen.getByRole("searchbox", { name: "Search models" }), {
    target: { value: "Model 79" },
  });
  expect(screen.getByRole("option", { name: /Model 79/i })).toBeInTheDocument();
});
