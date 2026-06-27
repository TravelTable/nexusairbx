import {
  EXPERIMENT_IDS,
  chooseHomepageGeneratorMode,
  getExperimentAnalyticsProperties,
  getExperimentRequestHeaders,
  getExperimentVariant,
  getHomepageCtaCopy,
  resetExperimentsForTests,
  shouldGateFirstValueBeforeSignup,
} from "./experiments";

const originalEnv = { ...process.env };

describe("experiments", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    localStorage.clear();
    sessionStorage.clear();
    resetExperimentsForTests();
  });

  afterEach(() => {
    resetExperimentsForTests();
    process.env = { ...originalEnv };
  });

  test("uses default variants when experiments are disabled by environment", () => {
    process.env.REACT_APP_EXPERIMENTS_DISABLED = "true";
    localStorage.setItem(
      `nexusrbx:experiments:force:${EXPERIMENT_IDS.GENERATOR_DEFAULT}`,
      "agent_build_default"
    );

    expect(getExperimentVariant(EXPERIMENT_IDS.SIGNUP_GATE)).toBe("post_value_signup");
    expect(getExperimentVariant(EXPERIMENT_IDS.GENERATOR_DEFAULT)).toBe("quick_script_default");
    expect(getExperimentVariant(EXPERIMENT_IDS.HOMEPAGE_CTA)).toBe("generate_with_ai");
    expect(chooseHomepageGeneratorMode("Make a sprint script")).toBe("quick_script");
    expect(getHomepageCtaCopy()).toBe("Generate with AI");
  });

  test("supports a local kill switch without changing stored variants", () => {
    localStorage.setItem(
      `nexusrbx:experiments:force:${EXPERIMENT_IDS.HOMEPAGE_CTA}`,
      "script_oriented"
    );
    expect(getHomepageCtaCopy()).toBe("Generate Roblox Script");

    localStorage.setItem("nexusrbx:experiments:disabled", "true");

    expect(getHomepageCtaCopy()).toBe("Generate with AI");
  });

  test("allows forced variants for operationally controlled tests", () => {
    localStorage.setItem(
      `nexusrbx:experiments:force:${EXPERIMENT_IDS.SIGNUP_GATE}`,
      "pre_value_signup"
    );
    localStorage.setItem(
      `nexusrbx:experiments:force:${EXPERIMENT_IDS.GENERATOR_DEFAULT}`,
      "agent_build_default"
    );
    localStorage.setItem(
      `nexusrbx:experiments:force:${EXPERIMENT_IDS.HOMEPAGE_CTA}`,
      "script_oriented"
    );

    expect(shouldGateFirstValueBeforeSignup()).toBe(true);
    expect(chooseHomepageGeneratorMode("Make a shop button script")).toBe("agent_build");
    expect(getHomepageCtaCopy()).toBe("Generate Roblox Script");
  });

  test("never forces clearly complex prompts into Quick Script", () => {
    localStorage.setItem(
      `nexusrbx:experiments:force:${EXPERIMENT_IDS.GENERATOR_DEFAULT}`,
      "quick_script_default"
    );

    expect(
      chooseHomepageGeneratorMode(
        "Build an inventory system with DataStore, RemoteEvents, ModuleScripts, server and client scripts"
      )
    ).toBe("agent_build");
  });

  test("exposes privacy-safe analytics properties and request headers", () => {
    const properties = getExperimentAnalyticsProperties();
    const headers = getExperimentRequestHeaders();
    const variants = JSON.parse(headers["X-Nexus-Experiment-Variants"]);

    expect(properties.experiment_signup_gate).toBe("post_value_signup");
    expect(properties.experiment_generator_default).toBe("quick_script_default");
    expect(properties.experiment_homepage_cta).toBe("generate_with_ai");
    expect(properties.experiment_variant).toContain("signup_gate:post_value_signup");
    expect(variants).toEqual({
      signup_gate: "post_value_signup",
      generator_default: "quick_script_default",
      homepage_cta: "generate_with_ai",
    });
  });
});
