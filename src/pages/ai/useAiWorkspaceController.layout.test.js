import {
  PROJECT_SIDEBAR_DESKTOP_MIN_WIDTH,
  shouldCloseProjectSidebarOnViewportChange,
  shouldOpenProjectSidebarByDefault,
  shouldRequireStudioPlaceSelection,
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

describe("AI workspace Studio-place gate", () => {
  test("does not block projectless conversation just because Studio is connected", () => {
    expect(shouldRequireStudioPlaceSelection(
      'Reply with exactly "AUDIT CHAT OK". Do not use Studio, create files, or create assets.'
    )).toBe(false);
    expect(shouldRequireStudioPlaceSelection("Explain how DataStore retries work"))
      .toBe(false);
  });

  test("still requires a Studio place for implementation requests", () => {
    expect(shouldRequireStudioPlaceSelection("Build a round system"))
      .toBe(true);
    expect(shouldRequireStudioPlaceSelection("Fix the inventory bug"))
      .toBe(true);
  });
});
