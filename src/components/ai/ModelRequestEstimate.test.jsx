import React from "react";
import { act, render, screen } from "@testing-library/react";
import ModelRequestEstimate from "./ModelRequestEstimate";
import { authedFetch } from "../../lib/billing";
import { writeNexusAutoPreferences } from "../../lib/nexusAutoPreferences";

jest.mock("../../lib/billing", () => ({ authedFetch: jest.fn() }));
const result = (quote, ok = true) => ({ ok, json: async () => quote });
const tick = async () => { await act(async () => { jest.advanceTimersByTime(650); }); };

beforeEach(() => { jest.useFakeTimers(); localStorage.clear(); authedFetch.mockReset(); });
afterEach(() => jest.useRealTimers());

test("quotes current provider prices through the backend with context and Auto preferences", async () => {
  writeNexusAutoPreferences({ mode: "economy", allowedProviders: ["google"], creditCeiling: 50 });
  authedFetch.mockResolvedValue(result({ modelId: "google/current", modelName: "Current Flash", autoSelected: true,
    autoMode: "economy", estimatedCredits: { min: 4, max: 9 }, reasons: ["Low complexity", "Economy mode"] }));
  render(<ModelRequestEstimate prompt="Update the UI" model="nexus-free-auto" contextChars={3000} requestCategory="frontend" />);
  expect(authedFetch).not.toHaveBeenCalled();
  await tick();
  const [url, options] = authedFetch.mock.calls[0];
  expect(url).toBe("/api/models/estimate");
  const body = JSON.parse(options.body);
  expect(body.autoPreferences).toEqual({ mode: "economy", allowedProviders: ["google"], creditCeiling: 50 });
  expect(body.request).toMatchObject({ requestCategory: "frontend", maxOutputTokens: 8000 });
  expect(body.request.estimatedInputTokens).toBeGreaterThan(2000);
  expect(body.estimatedCredits).toBeUndefined();
  expect(screen.getByRole("status")).toHaveTextContent("Nexus Auto would select Current Flash");
  expect(screen.getByRole("status")).toHaveTextContent("4–9 credits");
});

test("re-estimates on model change and uses the server range for direct selection", async () => {
  authedFetch.mockResolvedValueOnce(result({ modelId: "a", modelName: "Model A", estimatedCredits: { min: 2, max: 5 } }))
    .mockResolvedValueOnce(result({ modelId: "b", modelName: "Model B", estimatedCredits: { min: 20, max: 35 } }));
  const { rerender } = render(<ModelRequestEstimate prompt="Refactor a module" model="a" />);
  await tick();
  expect(screen.getByRole("status")).toHaveTextContent("2–5 credits");
  rerender(<ModelRequestEstimate prompt="Refactor a module" model="b" />);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await tick();
  expect(screen.getByRole("status")).toHaveTextContent("Model B · Estimated usage: 20–35 credits");
});

test("changes to Auto controls trigger a fresh quote", async () => {
  authedFetch.mockResolvedValue(result({ modelId: "a", estimatedCredits: { min: 2, max: 5 } }));
  render(<ModelRequestEstimate prompt="Write a module" model="nexus-free-auto" />);
  await tick();
  act(() => writeNexusAutoPreferences({ mode: "max", allowedProviders: ["openai"], creditCeiling: 40 }));
  await tick();
  expect(authedFetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse(authedFetch.mock.calls[1][1].body).autoPreferences).toEqual({ mode: "max", allowedProviders: ["openai"], creditCeiling: 40 });
});

test("reports credit ceiling errors instead of silently displaying a more expensive model", async () => {
  authedFetch.mockResolvedValue(result({ code: "AUTO_CREDIT_CEILING_EXCEEDED", error: { message: "No eligible model fits your 50-credit ceiling." } }, false));
  render(<ModelRequestEstimate prompt="Build a feature" model="nexus-free-auto" />);
  await tick();
  expect(screen.getByRole("status")).toHaveTextContent("No eligible model fits your 50-credit ceiling.");
  expect(screen.queryByText(/would select/)).not.toBeInTheDocument();
});

test("blank and disabled requests do not quote, and stale responses cannot replace a newer quote", async () => {
  let resolveFirst;
  authedFetch.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
    .mockResolvedValueOnce(result({ modelId: "new", modelName: "New selection", estimatedCredits: { min: 3, max: 6 } }));
  const { rerender } = render(<ModelRequestEstimate prompt="" model="old" />);
  await tick(); expect(authedFetch).not.toHaveBeenCalled();
  rerender(<ModelRequestEstimate prompt="Task" model="old" enabled={false} />);
  await tick(); expect(authedFetch).not.toHaveBeenCalled();
  rerender(<ModelRequestEstimate prompt="Task" model="old" />);
  await tick();
  rerender(<ModelRequestEstimate prompt="Task" model="new" />);
  await tick();
  await act(async () => { resolveFirst(result({ modelId: "old", modelName: "Old selection", estimatedCredits: { min: 30, max: 60 } })); });
  expect(screen.getByRole("status")).toHaveTextContent("New selection");
  expect(screen.queryByText(/Old selection/)).not.toBeInTheDocument();
});
