import { summarizeEntitlements, isPremiumPlan } from "./billing";

describe("summarizeEntitlements", () => {
  test("preserves dev override flags", () => {
    const summary = summarizeEntitlements({
      plan: "TEAM",
      sub: { limit: 1000000000, used: 0, resetsAt: null },
      payg: { remaining: 0 },
      entitlements: ["subscriber", "team"],
      flags: {
        isAdmin: true,
        unlimitedTokens: true,
        devOverride: true,
      },
    });

    expect(summary.plan).toBe("TEAM");
    expect(summary.unlimitedTokens).toBe(true);
    expect(summary.devOverride).toBe(true);
    expect(summary.isAdmin).toBe(true);
    expect(summary.flags).toEqual({
      isAdmin: true,
      unlimitedTokens: true,
      devOverride: true,
    });
  });

  test("marks Pro Plus as premium", () => {
    const summary = summarizeEntitlements({
      plan: "PRO_PLUS",
      sub: { limit: 100000, used: 0, resetsAt: null },
      payg: { remaining: 0 },
      entitlements: ["subscriber", "pro_plus"],
    });

    expect(summary.isPremium).toBe(true);
    expect(isPremiumPlan("PRO_PLUS", ["subscriber", "pro_plus"])).toBe(true);
    expect(isPremiumPlan("FREE", [])).toBe(false);
  });
});
