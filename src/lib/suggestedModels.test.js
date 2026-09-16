import { isFlagshipCodingModel, isSuggestedModelId, pickSuggestedModels, suggestedModelRank } from "./suggestedModels";

const model = (id, overrides = {}) => ({ id, name: id, availableToPaid: true, pricingConfigured: true, ...overrides });

test("recommendations follow live metadata across providers and generations", () => {
  const picked = pickSuggestedModels([
    model("new-provider/new-generation", { recommended: true, rankings: { overall: 80 } }),
    model("openai/gpt-5-mini", { recommended: true, rankings: { overall: 70 } }),
    model("anthropic/claude-opus-5", { rankings: { overall: 90 } }),
  ]);
  expect(picked.map(({ id }) => id)).toEqual(["new-provider/new-generation", "openai/gpt-5-mini"]);
  expect(isSuggestedModelId("new-provider/new-generation")).toBe(true);
  expect(suggestedModelRank("openai/gpt-5-mini")).toBe(1);
});

test("frontier designation requires metadata rather than model-name inference", () => {
  expect(isFlagshipCodingModel({ id: "openai/gpt-6-astra" })).toBe(false);
  expect(isFlagshipCodingModel({ id: "example/latest", badges: ["FRONTIER"] })).toBe(true);
});

test("missing pricing and unavailable recommendations are omitted", () => {
  expect(pickSuggestedModels([
    model("disabled", { recommended: true, availability: "disabled" }),
    model("unpriced", { recommended: true, pricingConfigured: false }),
    model("not-for-paid", { recommended: true, availableToPaid: false }),
  ])).toEqual([]);
});
