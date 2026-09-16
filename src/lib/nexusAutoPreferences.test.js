import { act, renderHook } from "@testing-library/react";
import { useNexusAutoPreferences } from "../hooks/useNexusAutoPreferences";
import {
  normalizeNexusAutoPreferences, readNexusAutoPreferences, writeNexusAutoPreferences, NEXUS_AUTO_STORAGE_KEY,
} from "./nexusAutoPreferences";

beforeEach(() => { localStorage.clear(); readNexusAutoPreferences(); });

test("defaults are Balanced with no provider or credit restriction", () => {
  expect(readNexusAutoPreferences()).toEqual({ mode: "balanced" });
  expect(normalizeNexusAutoPreferences({ mode: "not-a-mode", creditCeiling: -1 })).toEqual({ mode: "balanced" });
});

test("normalizes provider settings while preserving an explicit empty allowlist and zero ceiling", () => {
  expect(normalizeNexusAutoPreferences({ mode: "economy", allowedProviders: ["OpenAI", " openai ", "Google"], creditCeiling: 50 }))
    .toEqual({ mode: "economy", allowedProviders: ["google", "openai"], creditCeiling: 50 });
  expect(normalizeNexusAutoPreferences({ allowedProviders: [], creditCeiling: 0 }))
    .toEqual({ mode: "balanced", allowedProviders: [], creditCeiling: 0 });
});

test("preferences persist and update all mounted picker instances", () => {
  const first = renderHook(useNexusAutoPreferences);
  const second = renderHook(useNexusAutoPreferences);
  act(() => first.result.current.setAutoPreferences({ mode: "max", allowedProviders: ["anthropic"], creditCeiling: 50 }));
  expect(second.result.current.autoPreferences).toEqual({ mode: "max", allowedProviders: ["anthropic"], creditCeiling: 50 });
  expect(readNexusAutoPreferences()).toEqual(second.result.current.autoPreferences);
});

test("malformed storage falls back safely and cross-tab updates are observed", () => {
  localStorage.setItem(NEXUS_AUTO_STORAGE_KEY, "broken json");
  expect(readNexusAutoPreferences()).toEqual({ mode: "balanced" });
  const { result } = renderHook(useNexusAutoPreferences);
  act(() => {
    localStorage.setItem(NEXUS_AUTO_STORAGE_KEY, JSON.stringify({ mode: "economy" }));
    window.dispatchEvent(new StorageEvent("storage", { key: NEXUS_AUTO_STORAGE_KEY }));
  });
  expect(result.current.autoPreferences.mode).toBe("economy");
  act(() => writeNexusAutoPreferences({ mode: "balanced" }));
});

test("credit restrictions still apply during the session when persistence is blocked", () => {
  const blockedStorage = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  writeNexusAutoPreferences({ mode: "economy", allowedProviders: ["google"], creditCeiling: 20 });
  expect(readNexusAutoPreferences()).toEqual({ mode: "economy", allowedProviders: ["google"], creditCeiling: 20 });
  blockedStorage.mockRestore();
  writeNexusAutoPreferences({ mode: "balanced" });
});
