import {
  evaluateIntentAwareStudioSubmissionPreflight,
  isHandledPromptSubmissionError,
  PROJECT_SIDEBAR_DESKTOP_MIN_WIDTH,
  shouldCloseProjectSidebarOnViewportChange,
  shouldOpenProjectSidebarByDefault,
  shouldRequireStudioPlaceSelection,
  studioChatIdFromSearch,
  studioPlaceSelectionMessage,
} from "./useAiWorkspaceController";

describe("AI workspace project-sidebar defaults", () => {
  test("keeps the sidebar closed throughout the modal viewport range", () => {
    expect(PROJECT_SIDEBAR_DESKTOP_MIN_WIDTH).toBe(1200);
    expect(shouldOpenProjectSidebarByDefault(1025)).toBe(false);
    expect(shouldOpenProjectSidebarByDefault(1199)).toBe(false);
  });

  test("opens the persistent sidebar at desktop width", () => {
    expect(shouldOpenProjectSidebarByDefault(1200)).toBe(true);
    expect(shouldOpenProjectSidebarByDefault(1920)).toBe(true);
    expect(shouldOpenProjectSidebarByDefault(undefined)).toBe(false);
  });

  test("closes a persistent sidebar when the viewport crosses into modal layout", () => {
    expect(shouldCloseProjectSidebarOnViewportChange(1440, 1199)).toBe(true);
    expect(shouldCloseProjectSidebarOnViewportChange(1200, 375)).toBe(true);
    expect(shouldCloseProjectSidebarOnViewportChange(1199, 375)).toBe(false);
    expect(shouldCloseProjectSidebarOnViewportChange(1440, 1200)).toBe(false);
  });
});

describe("Studio conversation deep links", () => {
  test("opens the canonical Nexus chat named by the plugin handoff", () => {
    expect(studioChatIdFromSearch("?chat=chat_studio_123&source=studio")).toBe("chat_studio_123");
    expect(studioChatIdFromSearch("?source=studio")).toBe("");
  });
});

describe("AI workspace Studio transport gate", () => {
  test("does not block projectless conversation just because Studio is connected", () => {
    expect(shouldRequireStudioPlaceSelection(
      'Reply with exactly "AUDIT CHAT OK". Do not use Studio, create files, or create assets.'
    )).toBe(false);
    expect(shouldRequireStudioPlaceSelection("Explain how DataStore retries work"))
      .toBe(false);
    expect(evaluateIntentAwareStudioSubmissionPreflight({
      prompt: 'Reply with exactly "AUDIT CHAT OK". Do not use Studio, create files, or create assets.',
      studioEnabled: true,
      connected: true,
      mode: "agent",
      preference: null,
      options: [{ placeName: "Local.rbxl" }],
    })).toEqual({ status: "ready" });
  });

  test("still requires a live Studio transport for implementation requests", () => {
    expect(shouldRequireStudioPlaceSelection("Build a round system"))
      .toBe(true);
    expect(shouldRequireStudioPlaceSelection("Fix the inventory bug"))
      .toBe(true);
  });

  test("allows Ask and Plan but requires the authoritative plugin for implementation", () => {
    expect(studioPlaceSelectionMessage()).toBe("Connect Studio to apply changes.");
    expect(evaluateIntentAwareStudioSubmissionPreflight({
      prompt: "Build a round system", mode: "ask", connected: false,
    })).toEqual({ status: "ready" });
    expect(evaluateIntentAwareStudioSubmissionPreflight({
      prompt: "Build a round system", mode: "plan", connected: false,
    })).toEqual({ status: "ready" });
    expect(evaluateIntentAwareStudioSubmissionPreflight({
      prompt: "Build a round system", mode: "agent", connected: true, connectionType: "plugin_bridge",
    })).toEqual({ status: "ready" });
    expect(evaluateIntentAwareStudioSubmissionPreflight({
      prompt: "Build a round system", mode: "agent", connected: true, connectionType: "mcp_local",
    })).toEqual({ status: "blocked", message: "Connect Studio to apply changes." });
    expect(evaluateIntentAwareStudioSubmissionPreflight({
      prompt: "Build a round system", mode: "agent", connected: true, connectionType: "unknown",
    })).toEqual({ status: "blocked", message: "Connect Studio to apply changes." });
  });
});

describe("AI workspace prompt error handling", () => {
  test("consumes expected project and Studio action blocks at the UI boundary", () => {
    expect(isHandledPromptSubmissionError({ code: "STUDIO_LIVE_RUNTIME_REQUIRED" })).toBe(true);
    expect(isHandledPromptSubmissionError({ code: "PROJECT_REQUIRED" })).toBe(true);
    expect(isHandledPromptSubmissionError({ code: "INTERNAL_ERROR" })).toBe(false);
  });
});
