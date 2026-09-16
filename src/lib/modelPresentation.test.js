import { createModelSections, isRecentModel, modelBadges, presentModel, formatContextWindow } from "./modelPresentation";
import { isCatalogModelAvailable, isModelSelectable } from "./modelProviders";

const now = Date.parse("2026-09-15T12:00:00Z");
const model = (id, extra = {}) => ({ id, name: id, provider: "example", pricingConfigured: true, availableToPaid: true, ...extra });

test("NEW appears and expires from dates using the configured boundary", () => {
  const recent = { releasedAt: "2026-09-01T12:00:00Z", badges: ["FRONTIER", "FAST"] };
  expect(modelBadges(recent, { now })).toEqual(["NEW", "FRONTIER"]);
  expect(modelBadges(recent, { now, newBadgeDays: 7 })).toEqual(["FRONTIER", "FAST"]);
  expect(isRecentModel({ releasedAt: "2026-08-16T12:00:00Z" }, { now })).toBe(false);
  expect(isRecentModel({ releasedAt: "2026-09-16T12:00:00Z" }, { now })).toBe(false);
  expect(modelBadges({ badges: ["NEW"], isNew: true }, { now })).toEqual([]);
});

test("major updates refresh NEW while old Latest entries move out", () => {
  expect(isRecentModel({ releasedAt: "2020-01-01", majorUpdateAt: "2026-09-10" }, { now })).toBe(true);
  expect(presentModel(model("old", { releasedAt: "2020-01-01", section: "latest", recommended: true }), { now }).section).toBe("recommended");
});

test("server promotion limits and superseded versions remain in More Models", () => {
  const current = presentModel(model("old-generation", { releasedAt: "2026-09-10", section: "more", isFeatured: true, superseded: true }), { now });
  expect(current.badges).toContain("NEW");
  expect(current.section).toBe("more");
});

test("Latest uses recency and Fast & Efficient uses the server value ranking", () => {
  const result = createModelSections([
    model("older", { section: "latest", releasedAt: "2026-09-01", rankings: { overall: 100 } }),
    model("newer", { section: "latest", releasedAt: "2026-09-14", rankings: { overall: 50 } }),
    model("pricey", { section: "efficient", rankings: { overall: 100, bestValue: 20 } }),
    model("value", { section: "efficient", rankings: { overall: 50, bestValue: 90 } }),
  ], { now });
  expect(result[0].models.map(({ id }) => id)).toEqual(["newer", "older"]);
  expect(result[1].models.map(({ id }) => id)).toEqual(["value", "pricey"]);
});

test("unknown models have neutral metadata and do not become coding recommendations by name", () => {
  const result = presentModel(model("famous-provider/frontier-v99"), { now });
  expect(result.section).toBe("more");
  expect(result.badges).toEqual([]);
  expect(result.creditUsage.label).toBe("Estimate on request");
  expect(result.contextWindow).toBeNull();
});

test("catalog filtering excludes unavailable, disabled and unpriced models without inventing entries", () => {
  const result = createModelSections([
    model("live"), model("disabled", { availability: "disabled" }),
    model("unpriced", { pricingConfigured: undefined }), model("removed", { status: "removed" }),
    model("private", { availableToPaid: false }), model("live"),
  ], { now });
  expect(result.flatMap(({ models }) => models.map(({ id }) => id))).toEqual(["live"]);
  expect(createModelSections([], { now })).toEqual([]);
});

test("ranking uses deterministic server dimensions rather than one universal order", () => {
  const input = [model("a", { rankings: { overall: 60, bestValue: 95 }, section: "recommended" }),
    model("b", { rankings: { overall: 90, bestValue: 50 }, section: "recommended" })];
  const ids = (list, rankBy) => createModelSections(list, { now, rankBy })[0].models.map(({ id }) => id);
  expect(ids(input, "overall")).toEqual(["b", "a"]);
  expect(ids([...input].reverse(), "overall")).toEqual(["b", "a"]);
  expect(ids(input, "bestValue")).toEqual(["a", "b"]);
});

test("search and filters use provided strengths, cost and context metadata", () => {
  const input = [model("useful", { strengths: ["Roblox debugging"], creditUsage: { level: "low" }, contextWindow: 1_000_000 }), model("other")];
  expect(createModelSections(input, { query: "debugging", filter: "low" })[0].models.map(({ id }) => id)).toEqual(["useful"]);
  expect(createModelSections(input, { filter: "context", provider: "absent" })).toEqual([]);
  expect(formatContextWindow(1_000_000)).toBe("1M tokens");
});

test("free model IDs cannot override live tier or pricing restrictions", () => {
  const currentFree = model("google/gemini-3.6-flash", { availableToFree: false });
  expect(isModelSelectable(currentFree, {})).toBe(false);
  expect(isModelSelectable({ ...currentFree, availableToFree: true }, {})).toBe(true);
  expect(isCatalogModelAvailable({ ...currentFree, pricingConfigured: false })).toBe(false);
});

test("subscription-specific model access remains disabled outside its permitted tier", () => {
  const teamOnly = model("team-only", { availableTiers: ["TEAM"] });
  expect(isModelSelectable(teamOnly, { isPremium: true, plan: "PRO" })).toBe(false);
  expect(isModelSelectable(teamOnly, { isPremium: true, plan: "TEAM" })).toBe(true);
  expect(isModelSelectable(teamOnly, { isPremium: true })).toBe(false);
});
