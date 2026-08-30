import { DEFAULT_SETTINGS, mergeSettingsPatch, normalizeSettings, sanitizeSettingsPatch } from "./settingsSchema";

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

  it("preserves an explicit current GPT-5 mini selection", () => {
    expect(normalizeSettings({ modelVersion: "openai/gpt-5-mini" }).modelVersion).toBe("openai/gpt-5-mini");
    expect(sanitizeSettingsPatch({ modelVersion: "openai/gpt-5-mini" })).toEqual({
      patch: { modelVersion: "openai/gpt-5-mini" },
      invalidKeys: [],
    });
  });

  it("sanitizes valid partial patches without requiring full settings", () => {
    const { patch, invalidKeys } = sanitizeSettingsPatch({
      theme: "light",
      robloxAssetUploadsEnabled: true,
      useExamples: true,
      selectedExampleIds: ["ItemShopUI", "itemshopui", "", "Trading UI"],
      codingStandards: "Use typed Luau.",
    });

    expect(invalidKeys).toEqual([]);
    expect(patch).toEqual({
      theme: "light",
      robloxAssetUploadsEnabled: true,
      useExamples: true,
      selectedExampleIds: ["itemshopui", "trading ui"],
      codingStandards: "Use typed Luau.",
    });
  });

  it("defaults appearance to system and rejects unsupported themes", () => {
    expect(DEFAULT_SETTINGS.theme).toBe("system");
    expect(normalizeSettings({}).theme).toBe("system");
    expect(normalizeSettings({ theme: "dark" }).theme).toBe("dark");
    expect(normalizeSettings({ theme: "light" }).theme).toBe("light");

    expect(sanitizeSettingsPatch({ theme: "turquoise" })).toEqual({
      patch: {},
      invalidKeys: ["theme"],
    });
  });

  it("preserves the persisted game-wizard preference used by chat runtime", () => {
    expect(DEFAULT_SETTINGS.enableGameWizard).toBe(true);
    expect(normalizeSettings({ enableGameWizard: false }).enableGameWizard).toBe(false);
    expect(sanitizeSettingsPatch({ enableGameWizard: false })).toEqual({
      patch: { enableGameWizard: false },
      invalidKeys: [],
    });
  });

  it("keeps the Animate workspace hidden unless explicitly enabled", () => {
    expect(DEFAULT_SETTINGS.animateWorkspaceEnabled).toBe(false);
    expect(normalizeSettings({}).animateWorkspaceEnabled).toBe(false);
    expect(sanitizeSettingsPatch({ animateWorkspaceEnabled: true })).toEqual({
      patch: { animateWorkspaceEnabled: true },
      invalidKeys: [],
    });
  });

  it("persists a bounded active workspace project identity", () => {
    expect(normalizeSettings({ activeProjectId: " project-1 " }).activeProjectId).toBe("project-1");
    expect(sanitizeSettingsPatch({ activeProjectId: null })).toEqual({
      patch: { activeProjectId: null },
      invalidKeys: [],
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
      {
        robloxAssetUploadsEnabled: true,
        useExamples: true,
        selectedExampleIds: ["itemshopui"],
        verbosity: "detailed",
      },
      { chatMode: "ask" }
    );

    expect(merged.robloxAssetUploadsEnabled).toBe(true);
    expect(merged.useExamples).toBe(true);
    expect(merged.selectedExampleIds).toEqual(["itemshopui"]);
    expect(merged.verbosity).toBe("detailed");
    expect(merged.chatMode).toBe("ask");
  });

  it("migrates an obsolete Debug preference to Agent", () => {
    expect(normalizeSettings({ chatMode: "debug" }).chatMode).toBe("agent");
  });
});
