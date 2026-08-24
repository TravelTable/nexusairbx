import {
  classifyExecutionIntent,
  classifyUserIntent,
  isImplementationIntent,
} from "./intentClassifier";

describe("classifyUserIntent", () => {
  test("classifies greetings", () => {
    expect(classifyUserIntent("hi")).toBe("GREETING");
    expect(classifyUserIntent("Hello!")).toBe("GREETING");
    expect(classifyUserIntent("good morning")).toBe("GREETING");
  });

  test("treats acknowledgements as general (non-build)", () => {
    expect(classifyUserIntent("ok")).toBe("GENERAL_QUESTION");
    expect(classifyUserIntent("thanks")).toBe("GENERAL_QUESTION");
    expect(classifyUserIntent("sounds good")).toBe("GENERAL_QUESTION");
  });

  test("classifies cancellations", () => {
    expect(classifyUserIntent("cancel")).toBe("CANCELLATION");
    expect(classifyUserIntent("never mind")).toBe("CANCELLATION");
  });

  test("classifies explicit plan approval", () => {
    expect(classifyUserIntent("start build")).toBe("PLAN_APPROVAL");
    expect(classifyUserIntent("just start")).toBe("PLAN_APPROVAL");
    expect(classifyUserIntent("start now")).toBe("PLAN_APPROVAL");
    expect(classifyUserIntent("go ahead")).toBe("PLAN_APPROVAL");
  });

  test("classifies short continuation commands as implementation intent", () => {
    expect(classifyUserIntent("continue")).toBe("CONTINUATION");
    expect(classifyUserIntent("apply it")).toBe("CONTINUATION");
  });

  test("classifies build requests", () => {
    expect(classifyUserIntent("make a coin shop system")).toBe("BUILD_REQUEST");
    expect(classifyUserIntent("build a leaderboard")).toBe("BUILD_REQUEST");
    expect(classifyUserIntent("please create an inventory")).toBe("BUILD_REQUEST");
  });

  test("classifies modification requests", () => {
    expect(classifyUserIntent("fix this error")).toBe("MODIFICATION_REQUEST");
    expect(classifyUserIntent("update the shop UI")).toBe("MODIFICATION_REQUEST");
    expect(classifyUserIntent("remove the debug logs")).toBe("MODIFICATION_REQUEST");
  });

  test("classifies questions/explanations", () => {
    expect(classifyUserIntent("how does DataStore work?")).toBe("EXPLANATION_REQUEST");
    expect(classifyUserIntent("explain remote events")).toBe("EXPLANATION_REQUEST");
    expect(classifyUserIntent("is this the right approach?")).toBe("EXPLANATION_REQUEST");
  });

  test("classifies brainstorming", () => {
    expect(classifyUserIntent("i'm thinking about a pet system")).toBe("BRAINSTORMING");
    expect(classifyUserIntent("what if we added trading")).toBe("BRAINSTORMING");
  });

  test("questions asking to build are not treated as build requests", () => {
    expect(classifyUserIntent("how would you build a shop?")).toBe("EXPLANATION_REQUEST");
  });

  test("empty prompt is ambiguous", () => {
    expect(classifyUserIntent("")).toBe("AMBIGUOUS");
    expect(classifyUserIntent("   ")).toBe("AMBIGUOUS");
  });
});

describe("isImplementationIntent", () => {
  test("is true for build, modification, refinement, and continuation", () => {
    expect(isImplementationIntent("BUILD_REQUEST")).toBe(true);
    expect(isImplementationIntent("MODIFICATION_REQUEST")).toBe(true);
    expect(isImplementationIntent("REFINEMENT")).toBe(true);
    expect(isImplementationIntent("CONTINUATION")).toBe(true);
  });

  test("is false for conversational intents", () => {
    expect(isImplementationIntent("GREETING")).toBe(false);
    expect(isImplementationIntent("GENERAL_QUESTION")).toBe(false);
    expect(isImplementationIntent("EXPLANATION_REQUEST")).toBe(false);
    expect(isImplementationIntent("BRAINSTORMING")).toBe(false);
    expect(isImplementationIntent("AMBIGUOUS")).toBe(false);
    expect(isImplementationIntent("PLAN_APPROVAL")).toBe(false);
    expect(isImplementationIntent("CANCELLATION")).toBe(false);
  });
});

describe("classifyExecutionIntent", () => {
  test("routes read-only Studio requests to inspection", () => {
    expect(classifyExecutionIntent("Inspect the current Studio project and list its scripts"))
      .toBe("inspect");
    expect(classifyExecutionIntent("What files can you see in Studio?"))
      .toBe("inspect");
    expect(classifyExecutionIntent("Explain the current Studio project"))
      .toBe("inspect");
    expect(classifyExecutionIntent("Review RemoteEvents", { studioEnabled: true }))
      .toBe("artifact_only");
    expect(classifyExecutionIntent("Review my plan", { studioEnabled: true }))
      .toBe("artifact_only");
    expect(classifyExecutionIntent("Show an example script"))
      .toBe("artifact_only");
    expect(classifyExecutionIntent("Explain how a ModuleScript works"))
      .toBe("artifact_only");
  });

  test("distinguishes live builds, fixes, playtests, and explicit artifact-only work", () => {
    expect(classifyExecutionIntent("Build a round system", { studioEnabled: true }))
      .toBe("live_build");
    expect(classifyExecutionIntent("Fix the shop script in Studio"))
      .toBe("live_fix");
    expect(classifyExecutionIntent("Playtest the current game"))
      .toBe("playtest");
    expect(classifyExecutionIntent("How do I run a test in Studio?"))
      .toBe("artifact_only");
    expect(classifyExecutionIntent("Generate code only; do not push to Studio", { studioEnabled: true }))
      .toBe("artifact_only");
    expect(classifyExecutionIntent(
      'Reply with exactly "AUDIT CHAT OK". Do not use Studio, create files, or create assets.'
    )).toBe("artifact_only");
    expect(classifyExecutionIntent("Answer without Studio and without changing any project files"))
      .toBe("artifact_only");
  });

  test("recognizes Quick Script as an explicit execution channel", () => {
    expect(classifyExecutionIntent("Put this in ServerScriptService", {
      studioEnabled: true,
      generatorMode: "quick_script",
    })).toBe("quick_script");
  });
});
