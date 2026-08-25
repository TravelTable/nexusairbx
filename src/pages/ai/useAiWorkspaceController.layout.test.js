import {
  evaluateIntentAwareStudioSubmissionPreflight,
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

describe("AI workspace Studio-place gate", () => {
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

  test("still requires a Studio place for implementation requests", () => {
    expect(shouldRequireStudioPlaceSelection("Build a round system"))
      .toBe(true);
    expect(shouldRequireStudioPlaceSelection("Fix the inventory bug"))
      .toBe(true);
  });

  test("accepts opaque local targets and describes incomplete identities without requiring publication", () => {
    const localMessage = studioPlaceSelectionMessage([{
      id: "studio_target_local",
      label: "Local Arena",
      placeId: null,
      universeId: null,
    }]);
    expect(localMessage).toBe("Choose which Studio place this chat should edit before sending.");

    const incompleteMessage = studioPlaceSelectionMessage([{
      label: "Incomplete Studio project",
      placeId: "123",
      universeId: null,
    }]);
    expect(incompleteMessage).toContain("complete live identity");
    expect(incompleteMessage).not.toMatch(/publish/i);
    expect(studioPlaceSelectionMessage(null)).toContain("complete live identity");
  });
});
