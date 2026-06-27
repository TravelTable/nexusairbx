import {
  clearGenerationIntentsForTests,
  consumeGenerationIntent,
  createGenerationIntent,
  restoreGenerationIntent,
} from "./generationIntent";

describe("generationIntent", () => {
  beforeEach(() => {
    clearGenerationIntentsForTests();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-25T00:00:00.000Z"));
  });

  afterEach(() => {
    clearGenerationIntentsForTests();
    jest.useRealTimers();
  });

  test("rejects blank and whitespace-only prompts", () => {
    expect(() => createGenerationIntent({ prompt: "" })).toThrow("Type a prompt");
    expect(() => createGenerationIntent({ prompt: "   \n\t  " })).toThrow("Type a prompt");
  });

  test("stores and restores a long prompt without using the URL", () => {
    const prompt = `Build a detailed Roblox system.\n${"Use resilient state. ".repeat(500)}`;
    const intent = createGenerationIntent({ prompt, mode: "agent", source: "homepage" });

    expect(intent.prompt).toBe(prompt.trim());
    expect(intent.mode).toBe("agent");

    const restored = restoreGenerationIntent(intent.id);
    expect(restored.prompt).toBe(prompt.trim());
    expect(restored.source).toBe("homepage");
  });

  test("restores the active intent after a refresh in the same tab", () => {
    const intent = createGenerationIntent({ prompt: "Create a sci-fi HUD" });

    expect(restoreGenerationIntent()).toMatchObject({
      id: intent.id,
      prompt: "Create a sci-fi HUD",
    });
  });

  test("does not restore expired intents", () => {
    createGenerationIntent({ prompt: "Create a shop UI", ttlMs: 1000 });

    jest.advanceTimersByTime(1001);

    expect(restoreGenerationIntent()).toBeNull();
  });

  test("consumes an intent after auto-start so refresh does not duplicate it", () => {
    const intent = createGenerationIntent({ prompt: "Create a quest system" });

    expect(consumeGenerationIntent(intent.id)).toBe(true);
    expect(restoreGenerationIntent(intent.id)).toBeNull();
    expect(restoreGenerationIntent()).toBeNull();
  });
});
