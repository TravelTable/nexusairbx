import {
  clearQuickScriptSession,
  loadQuickScriptSession,
  normalizeQuickScriptResult,
  quickScriptResultToAgentPrompt,
  saveQuickScriptSession,
} from "./quickScriptSession";

describe("quickScriptSession", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    clearQuickScriptSession();
  });

  test("persists prompt and completed result for refresh recovery", () => {
    saveQuickScriptSession({
      generatorMode: "quick_script",
      prompt: "Make a touch damage script",
      status: "succeeded",
      result: {
        title: "Touch Damage",
        scriptType: "Script",
        studioLocation: "ServerScriptService",
        code: "print('damage')",
      },
    });

    expect(loadQuickScriptSession()).toMatchObject({
      generatorMode: "quick_script",
      prompt: "Make a touch damage script",
      status: "succeeded",
      result: {
        title: "Touch Damage",
        code: "print('damage')",
      },
    });
  });

  test("builds Agent Build upgrade context without losing original request or code", () => {
    const context = quickScriptResultToAgentPrompt("Make a shop button", {
      title: "Shop Button",
      scriptType: "LocalScript",
      studioLocation: "StarterGui",
      setup: ["Put it under the button."],
      testing: ["Click the button in Play mode."],
      code: "print('shop')",
    });

    expect(context).toContain("Original prompt:");
    expect(context).toContain("Make a shop button");
    expect(context).toContain("Shop Button");
    expect(context).toContain("print('shop')");
    expect(context).toContain("Agent Build may ask clarifying questions");
  });

  test("unwraps malformed Quick Script results that embed the full JSON blob in code", () => {
    const payload = {
      title: "Checkpoint HUD",
      scriptType: "LocalScript",
      studioLocation: "StarterPlayer/StarterPlayerScripts",
      setup: ["Place in StarterPlayerScripts."],
      testing: ["Toggle flight in Play mode."],
      code: 'local Players = game:GetService("Players")\nprint("fly")',
    };
    const normalized = normalizeQuickScriptResult({
      ...payload,
      code: JSON.stringify(payload),
    });

    expect(normalized.title).toBe("Checkpoint HUD");
    expect(normalized.code).toContain("Players");
    expect(normalized.code).not.toContain('"scriptType"');
  });

  test("parses unparsed Quick Script JSON text into a usable result", () => {
    const normalized = normalizeQuickScriptResult(JSON.stringify({
      title: "Touch Damage",
      scriptType: "Script",
      studioLocation: "ServerScriptService",
      code: 'print("damage")',
    }));

    expect(normalized.title).toBe("Touch Damage");
    expect(normalized.code).toBe('print("damage")');
  });
});
