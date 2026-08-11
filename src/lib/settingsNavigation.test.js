import { resolveSettingsTab } from "./settingsNavigation";

test("re-homes anonymous settings URLs to the only permitted section", () => {
  expect(resolveSettingsTab({
    allowedTabs: ["appearance"],
    requestedTab: "billing",
    currentTab: "billing",
    fallbackTab: "appearance",
  })).toBe("appearance");
});

test("re-homes an admin section when the claim is removed", () => {
  expect(resolveSettingsTab({
    allowedTabs: ["overview", "appearance", "ai"],
    requestedTab: "admin",
    currentTab: "admin",
    fallbackTab: "overview",
  })).toBe("overview");
});

test("keeps permitted URL and current sections stable", () => {
  expect(resolveSettingsTab({
    allowedTabs: ["overview", "appearance", "admin"],
    requestedTab: "admin",
    currentTab: "overview",
    fallbackTab: "overview",
  })).toBe("admin");

  expect(resolveSettingsTab({
    allowedTabs: ["overview", "appearance"],
    requestedTab: "unknown",
    currentTab: "appearance",
    fallbackTab: "overview",
  })).toBe("appearance");
});
