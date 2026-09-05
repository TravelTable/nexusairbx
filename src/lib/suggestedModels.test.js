import { isFlagshipCodingModel, pickSuggestedModels } from "./suggestedModels";

const model = (overrides) => ({
  availableToPaid: true,
  pricingConfigured: true,
  recommendedFor: ["coding"],
  capabilities: ["coding", "reasoning", "tools"],
  ...overrides,
});

test("coding recommendations contain flagship models only", () => {
  const picked = pickSuggestedModels([
    model({
      id: "google/gemini-3.6-flash",
      name: "Gemini 3.6 Flash",
      recommendationScore: 62,
    }),
    model({
      id: "anthropic/claude-opus-5",
      name: "Claude Opus 5",
      recommendationScore: 101,
    }),
    model({
      id: "openai/gpt-5-mini",
      name: "GPT-5 mini",
      recommendationScore: 65,
    }),
  ], 3);

  expect(picked.map(({ id }) => id)).toEqual(["anthropic/claude-opus-5"]);
});

test("recognizes current frontier coding families without admitting balanced or economy variants", () => {
  [
    "openai/gpt-6-astra",
    "openai/gpt-5.6-sol",
    "openai/gpt-5.3-codex",
    "anthropic/claude-fable-5.1",
    "anthropic/claude-opus-5",
    "anthropic/claude-sonnet-5",
    "google/gemini-3.1-pro-preview",
  ].forEach((id) => expect(isFlagshipCodingModel({ id })).toBe(true));

  [
    "openai/gpt-5.6-terra",
    "openai/gpt-5-mini",
    "google/gemini-3.6-flash",
  ].forEach((id) => expect(isFlagshipCodingModel({ id })).toBe(false));
});

test("general-purpose and balanced models are excluded even when an old catalogue flags them recommended", () => {
  const picked = pickSuggestedModels([
    model({ id: "openai/gpt-5.6-terra", name: "GPT-5.6 Terra", recommendationScore: 99 }),
    {
      id: "example/general-model",
      name: "General Model",
      availableToPaid: true,
      pricingConfigured: true,
      recommended: true,
      recommendationScore: 999,
      recommendedFor: ["general"],
      capabilities: ["vision"],
    },
  ], 5);

  expect(picked).toEqual([]);
});
