let mockCurrentUser = null;

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ currentUser: mockCurrentUser })),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(mockCurrentUser);
    return jest.fn();
  }),
}));

jest.mock("../firebase", () => ({
  initAnalytics: jest.fn(() => Promise.resolve({ app: "analytics" })),
}));

jest.mock("firebase/analytics", () => ({
  logEvent: jest.fn(),
  setUserId: jest.fn(),
  setUserProperties: jest.fn(),
}));

describe("productAnalytics", () => {
  let analytics;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = null;
    localStorage.clear();
    sessionStorage.clear();
    delete window.nexusAnalytics;
    delete window.__nexusAnalyticsEvents;
    analytics = require("./productAnalytics");
    analytics.resetProductAnalyticsForTests();
    localStorage.setItem("nexusrbx:analytics:debug", "true");
  });

  afterEach(() => {
    analytics.resetProductAnalyticsForTests();
    jest.resetModules();
  });

  test("emits anonymous browser events into the local debug inspector", async () => {
    await analytics.trackProductEvent("landing_page_view", { landing_page: "/" });

    const events = window.nexusAnalytics.events();
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("landing_page_view");
    expect(events[0].properties.anonymous_session_id).toMatch(/^sess_/);
    expect(analytics.getProductAnalyticsHeaders()["X-Nexus-Anonymous-User-Id"]).toMatch(/^anon_/);
  });

  test("attaches experiment assignments to browser events and request headers", async () => {
    await analytics.trackProductEvent("landing_page_view", { landing_page: "/" });

    const event = window.nexusAnalytics.events()[0];
    const headers = analytics.getProductAnalyticsHeaders();
    const variants = JSON.parse(headers["X-Nexus-Experiment-Variants"]);

    expect(event.properties.experiment_signup_gate).toBe("post_value_signup");
    expect(event.properties.experiment_generator_default).toBe("quick_script_default");
    expect(event.properties.experiment_homepage_cta).toBe("generate_with_ai");
    expect(event.properties.experiment_variant).toContain("signup_gate:post_value_signup");
    expect(variants).toEqual({
      signup_gate: "post_value_signup",
      generator_default: "quick_script_default",
      homepage_cta: "generate_with_ai",
    });
  });

  test("links the anonymous journey when an authenticated user appears", () => {
    analytics.resetProductAnalyticsForTests();
    mockCurrentUser = { uid: "user_123" };

    analytics.initProductAnalytics();

    const events = window.nexusAnalytics.events();
    expect(events.some((event) => event.event === "identity_linked")).toBe(true);
  });

  test("dedupes repeated events from rerenders", async () => {
    const first = await analytics.trackProductEvent("ai_workspace_viewed", {}, { dedupeKey: "page" });
    const second = await analytics.trackProductEvent("ai_workspace_viewed", {}, { dedupeKey: "page" });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(window.nexusAnalytics.events().filter((event) => event.event === "ai_workspace_viewed")).toHaveLength(1);
  });

  test("keeps prompt category but strips raw prompt, code, email, and project fields", () => {
    const result = analytics.validateProductEvent("prompt_submitted", {
      prompt: "Build my full idea",
      prompt_text: "Build my full idea",
      prompt_category: "gameplay",
      prompt_length: 18,
      source_code: "print('secret')",
      email: "person@example.com",
      project_name: "Secret Project",
    });

    expect(result.ok).toBe(true);
    expect(result.properties.prompt_category).toBe("gameplay");
    expect(result.properties.prompt_length).toBe(18);
    expect(JSON.stringify(result.properties)).not.toContain("Build my full idea");
    expect(JSON.stringify(result.properties)).not.toContain("print");
    expect(JSON.stringify(result.properties)).not.toContain("person@example.com");
    expect(JSON.stringify(result.properties)).not.toContain("Secret Project");
  });

  test("rejects server-confirmed events from normal client calls", async () => {
    const tracked = await analytics.trackProductEvent("purchase_completed", { subscription_plan: "pro" });

    expect(tracked).toBe(false);
    const rejected = window.nexusAnalytics.events().find((event) => event.event === "purchase_completed");
    expect(rejected.rejected).toBe("server_confirmed_only");
  });

  test("fails silently when provider delivery throws", async () => {
    localStorage.setItem("nexusrbx:analytics:debug", "false");
    const firebase = require("../firebase");
    firebase.initAnalytics.mockImplementationOnce(() => Promise.reject(new Error("provider unavailable")));

    await expect(analytics.trackProductEvent("signup_started", { method: "google" })).resolves.toBe(false);
  });
});
