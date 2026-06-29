import {
  submitHomepagePrompt,
  trackHomepagePromptStarted,
} from "./homepageActivation";
import { EXPERIMENT_IDS, resetExperimentsForTests } from "./experiments";

function createHarness(overrides = {}) {
  return {
    submittingRef: { current: false },
    navigate: jest.fn(),
    setError: jest.fn(),
    setLoading: jest.fn(),
    clearInput: jest.fn(),
    createIntent: jest.fn((payload) => ({
      id: "intent-123",
      mode: payload.mode,
      source: payload.source,
    })),
    trackEvent: jest.fn(),
    ...overrides,
  };
}

describe("homepageActivation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetExperimentsForTests();
    delete process.env.REACT_APP_EXPERIMENTS_DISABLED;
    delete process.env.REACT_APP_EXPERIMENT_SIGNUP_GATE_ENABLED;
    delete process.env.REACT_APP_EXPERIMENT_GENERATOR_DEFAULT_ENABLED;
    delete process.env.REACT_APP_EXPERIMENT_HOMEPAGE_CTA_ENABLED;
  });

  afterEach(() => {
    resetExperimentsForTests();
  });

  test("tracks prompt start once without prompt content", () => {
    const promptStartedRef = { current: false };
    const trackEvent = jest.fn();

    trackHomepagePromptStarted({
      value: "Create a private admin UI",
      promptStartedRef,
      trackEvent,
    });
    trackHomepagePromptStarted({
      value: "Create a private admin UI with more detail",
      promptStartedRef,
      trackEvent,
    });

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith("homepage_prompt_started", {
      surface: "homepage",
    });
    expect(JSON.stringify(trackEvent.mock.calls)).not.toContain("private admin UI");
  });

  test("tracks prompt start with a custom surface", () => {
    const promptStartedRef = { current: false };
    const trackEvent = jest.fn();

    trackHomepagePromptStarted({
      value: "Create a private admin UI",
      promptStartedRef,
      surface: "public_next_homepage",
      trackEvent,
    });

    expect(trackEvent).toHaveBeenCalledWith("homepage_prompt_started", {
      surface: "public_next_homepage",
    });
  });

  test("rejects blank and whitespace-only prompts before creating an intent", () => {
    const harness = createHarness();

    expect(submitHomepagePrompt({ ...harness, inputValue: "   " })).toEqual({
      status: "rejected",
    });

    expect(harness.createIntent).not.toHaveBeenCalled();
    expect(harness.navigate).not.toHaveBeenCalled();
    expect(harness.setError).toHaveBeenCalledWith("Describe what you want to build first.");
  });

  test("creates one intent and navigates with only the intent id", () => {
    const harness = createHarness();

    const result = submitHomepagePrompt({
      ...harness,
      inputValue: "Create a tycoon UI",
      method: "enter",
    });
    const duplicate = submitHomepagePrompt({
      ...harness,
      inputValue: "Create a tycoon UI",
      method: "enter",
    });

    expect(result).toEqual({ status: "started", intentId: "intent-123" });
    expect(duplicate).toEqual({ status: "ignored" });
    expect(harness.createIntent).toHaveBeenCalledTimes(1);
    expect(harness.createIntent).toHaveBeenCalledWith({
      prompt: "Create a tycoon UI",
      mode: "quick_script",
      source: "homepage",
    });
    expect(harness.navigate).toHaveBeenCalledWith("/ai", {
      state: { generationIntentId: "intent-123" },
    });
    expect(JSON.stringify(harness.navigate.mock.calls[0][1].state)).not.toContain("Create a tycoon UI");
    expect(harness.clearInput).toHaveBeenCalledTimes(1);
  });

  test("button submission uses the same intent flow", () => {
    const harness = createHarness();

    submitHomepagePrompt({
      ...harness,
      inputValue: "Create a round system",
      method: "button",
    });

    expect(harness.createIntent).toHaveBeenCalledTimes(1);
    expect(harness.navigate).toHaveBeenCalledWith("/ai", {
      state: { generationIntentId: "intent-123" },
    });
  });

  test("creates intents with custom public homepage source and surface", () => {
    const harness = createHarness();

    submitHomepagePrompt({
      ...harness,
      inputValue: "Create a round system",
      method: "button",
      surface: "public_next_homepage",
      source: "public_next_homepage",
    });

    expect(harness.createIntent).toHaveBeenCalledWith({
      prompt: "Create a round system",
      mode: "quick_script",
      source: "public_next_homepage",
    });
    expect(harness.trackEvent).toHaveBeenCalledWith(
      "homepage_prompt_submitted",
      expect.objectContaining({
        surface: "public_next_homepage",
      })
    );
    expect(harness.trackEvent).toHaveBeenCalledWith(
      "generation_intent_created",
      expect.objectContaining({
        source: "public_next_homepage",
        surface: "public_next_homepage",
      })
    );
  });

  test("supports a Next-style navigation adapter", () => {
    const assign = jest.fn();
    const harness = createHarness({
      navigate: (to) => assign(to),
    });

    submitHomepagePrompt({
      ...harness,
      inputValue: "Create a round system",
      surface: "public_next_homepage",
      source: "public_next_homepage",
    });

    expect(assign).toHaveBeenCalledWith("/ai");
  });

  test("complex homepage prompts are routed to Agent Build regardless of experiment defaults", () => {
    localStorage.setItem(
      `nexusrbx:experiments:force:${EXPERIMENT_IDS.GENERATOR_DEFAULT}`,
      "quick_script_default"
    );
    const harness = createHarness();

    const result = submitHomepagePrompt({
      ...harness,
      inputValue: "Build an inventory system with DataStore, RemoteEvents, server and client scripts",
      method: "button",
    });

    expect(result).toEqual({ status: "started", intentId: "intent-123" });
    expect(harness.createIntent).toHaveBeenCalledWith({
      prompt: "Build an inventory system with DataStore, RemoteEvents, server and client scripts",
      mode: "agent_build",
      source: "homepage",
    });
    expect(harness.trackEvent).toHaveBeenCalledWith(
      "homepage_prompt_submitted",
      expect.objectContaining({
        generator_mode: "agent_build",
      })
    );
  });

  test("suitable homepage prompts can use the Agent Build default variant", () => {
    localStorage.setItem(
      `nexusrbx:experiments:force:${EXPERIMENT_IDS.GENERATOR_DEFAULT}`,
      "agent_build_default"
    );
    const harness = createHarness();

    submitHomepagePrompt({
      ...harness,
      inputValue: "Make a sprint script",
      method: "button",
    });

    expect(harness.createIntent).toHaveBeenCalledWith({
      prompt: "Make a sprint script",
      mode: "agent_build",
      source: "homepage",
    });
  });


  test("failed navigation restores submission state and shows an error", () => {
    const harness = createHarness({
      navigate: jest.fn(() => {
        throw new Error("Navigation failed");
      }),
    });

    const result = submitHomepagePrompt({
      ...harness,
      inputValue: "Create a pet inventory",
      method: "button",
    });

    expect(result.status).toBe("failed");
    expect(harness.submittingRef.current).toBe(false);
    expect(harness.setLoading).toHaveBeenLastCalledWith(false);
    expect(harness.setError).toHaveBeenCalledWith("Navigation failed");
  });

  test("emits activation events without prompt content", () => {
    const harness = createHarness();

    submitHomepagePrompt({
      ...harness,
      inputValue: "Create a secret admin panel",
      method: "button",
    });

    const payload = JSON.stringify(harness.trackEvent.mock.calls);
    expect(payload).toContain("homepage_prompt_submitted");
    expect(payload).toContain("prompt_category");
    expect(payload).toContain("generation_intent_created");
    expect(payload).not.toContain("Create a secret admin panel");
  });
});
