import {
  clearQuickScriptSession,
  extractExplicitQuickScriptPlacement,
  extractExplicitQuickScriptName,
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

  test("preserves backend validation without inventing a Script class or location", () => {
    const normalized = normalizeQuickScriptResult({
      title: "Unsafe legacy result",
      code: 'local player = game:GetService("Players").LocalPlayer',
      validation: {
        status: "blocked",
        requiredContext: "client",
        findings: [{
          code: "SCRIPT_CLASS_REQUIRED",
          severity: "error",
          explanation: "An explicit script class is required.",
          line: 1,
        }],
        adjustments: [],
      },
    });

    expect(normalized.scriptType).toBe("");
    expect(normalized.studioLocation).toBe("");
    expect(normalized.validation).toMatchObject({
      status: "blocked",
      requiredContext: "client",
      findings: [{ code: "SCRIPT_CLASS_REQUIRED", line: 1 }],
    });
  });

  test("preserves an explicit Quick Script placement from the user prompt", () => {
    expect(extractExplicitQuickScriptPlacement(
      "Create a Script and put it in ServerScriptService/NexusPipelineTest"
    )).toBe("ServerScriptService/NexusPipelineTest");
    expect(extractExplicitQuickScriptPlacement(
      "Place this LocalScript inside StarterPlayerScripts"
    )).toBe("StarterPlayer/StarterPlayerScripts");

    const normalized = normalizeQuickScriptResult({
      title: "Spin Script",
      scriptType: "Script",
      code: "print('spin')",
    }, "Put this in ServerScriptService/NexusPipelineTest");

    expect(normalized.studioLocation).toBe("ServerScriptService/NexusPipelineTest");
    expect(normalized.scriptType).toBe("Script");

    const conflictingModelPlacement = normalizeQuickScriptResult({
      title: "Spin Script",
      scriptType: "Script",
      code: "print('spin')",
      studioLocation: "Workspace",
    }, "Put this in ServerScriptService/NexusPipelineTest");

    expect(conflictingModelPlacement.studioLocation).toBe("ServerScriptService/NexusPipelineTest");
    expect(conflictingModelPlacement.targetPath).toBe("ServerScriptService/NexusPipelineTest");

    const named = normalizeQuickScriptResult({
      title: "Smooth Y-Axis Part Rotation",
      scriptType: "Script",
      code: "print('spin')",
    }, "Create one server Script named SpinScript for Workspace/NexusPipelineTest/Beacon.");
    expect(extractExplicitQuickScriptName(
      "Create one server Script named SpinScript for Workspace/NexusPipelineTest/Beacon."
    )).toBe("SpinScript");
    expect(named.studioLocation).toBe("Workspace/NexusPipelineTest/Beacon");
    expect(named.scriptName).toBe("SpinScript");
    expect(named.targetPath).toBe("Workspace/NexusPipelineTest/Beacon/SpinScript");
  });

  test("does not infer placement from a generic service mention", () => {
    expect(extractExplicitQuickScriptPlacement(
      "Explain when ServerScriptService should be used"
    )).toBe("");
  });
});
