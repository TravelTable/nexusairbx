const ORIGINAL_ENV = process.env;

describe("mode gates", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test("uses system-only premium list when flag enabled", () => {
    process.env.REACT_APP_SYSTEM_ONLY_PREMIUM = "true";
    const { getPremiumModeIds, isPremiumMode } = require("./modeGates");

    expect(getPremiumModeIds()).toEqual(["system"]);
    expect(isPremiumMode("system")).toBe(true);
    expect(isPremiumMode("security")).toBe(false);
  });

  test("uses legacy premium list when flag disabled", () => {
    process.env.REACT_APP_SYSTEM_ONLY_PREMIUM = "false";
    const { isPremiumMode } = require("./modeGates");

    expect(isPremiumMode("system")).toBe(true);
    expect(isPremiumMode("security")).toBe(true);
  });
});
