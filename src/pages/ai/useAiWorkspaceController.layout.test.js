import {
  PROJECT_SIDEBAR_DESKTOP_MIN_WIDTH,
  shouldOpenProjectSidebarByDefault,
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
});
