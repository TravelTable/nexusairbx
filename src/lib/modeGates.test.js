import { getPremiumModeIds, isPremiumMode } from "./modeGates";

describe("mode gates", () => {
  test("all operating modes are free (no per-mode premium gating)", () => {
    expect(getPremiumModeIds()).toEqual([]);
    expect(isPremiumMode("agent")).toBe(false);
    expect(isPremiumMode("plan")).toBe(false);
    expect(isPremiumMode("debug")).toBe(false);
    expect(isPremiumMode("ask")).toBe(false);
    expect(isPremiumMode("system")).toBe(false);
  });
});
