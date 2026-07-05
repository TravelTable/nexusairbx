import {
  DEFAULT_SETTINGS,
  mergeSettingsPatch,
  normalizeSettings,
  sanitizeSettingsPatch,
} from "./settingsSchema";

describe("settingsSchema", () => {
  it("normalizes stale local settings with defaults and model aliases", () => {
    const settings = normalizeSettings({
      modelVersion: "deepseek-free",
      creativity: 12,
      robloxWritePolicy: { assetWrites: "disabled", unknown: "value" },
      unsupported: true,
    });

    expect(settings.modelVersion).toBe(DEFAULT_SETTINGS.modelVersion);
    expect(settings.creativity).toBe(1);
    expect(settings.robloxWritePolicy.assetWrites).toBe("disabled");
    expect(settings.robloxWritePolicy.universeWrites).toBe("approval_required");
    expect(settings.unsupported).toBeUndefined();
  });

  it("sanitizes valid partial patches without requiring full settings", () => {
    const { patch, invalidKeys } = sanitizeSettingsPatch({
      robloxAssetUploadsEnabled: true,
      useExamples: true,
      selectedExampleIds: ["ItemShopUI", "itemshopui", "", "Trading UI"],
      codingStandards: "Use typed Luau.",
    });

    expect(invalidKeys).toEqual([]);
    expect(patch).toEqual({
      robloxAssetUploadsEnabled: true,
      useExamples: true,
      selectedExampleIds: ["itemshopui", "trading ui"],
      codingStandards: "Use typed Luau.",
    });
  });

  it("rejects unknown keys and malformed values", () => {
    const { patch, invalidKeys } = sanitizeSettingsPatch({
      robloxAssetUploadsEnabled: "yes",
      selectedExampleIds: "all",
      surprise: true,
      creativity: 0.4,
    });

    expect(patch).toEqual({ creativity: 0.4 });
    expect(invalidKeys).toEqual(["robloxAssetUploadsEnabled", "selectedExampleIds", "surprise"]);
  });

  it("merges partial patches while preserving Roblox asset consent", () => {
    const merged = mergeSettingsPatch(
      { robloxAssetUploadsEnabled: true, useExamples: true, selectedExampleIds: ["itemshopui"], verbosity: "detailed" },
      { chatMode: "debug" }
    );

    expect(merged.robloxAssetUploadsEnabled).toBe(true);
    expect(merged.useExamples).toBe(true);
    expect(merged.selectedExampleIds).toEqual(["itemshopui"]);
    expect(merged.verbosity).toBe("detailed");
    expect(merged.chatMode).toBe("debug");
  });
});
