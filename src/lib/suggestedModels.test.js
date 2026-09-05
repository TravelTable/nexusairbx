import { pickSuggestedModels } from "./suggestedModels";

const model = (overrides) => ({
  availableToPaid: true,
  pricingConfigured: true,
  recommendedFor: ["coding"],
  capabilities: ["coding", "reasoning", "tools"],
  ...overrides,
});

test("coding recommendations favor flagship models over economy variants", () => {
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

  expect(picked.map(({ id }) => id)).toEqual([
    "anthropic/claude-opus-5",
    "openai/gpt-5-mini",
    "google/gemini-3.6-flash",
  ]);
});

test("general-purpose models are excluded even when an old catalogue flags them recommended", () => {
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

  expect(picked.map(({ id }) => id)).toEqual(["openai/gpt-5.6-terra"]);
});
