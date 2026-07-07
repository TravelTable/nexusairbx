import { classifyUserIntent, isImplementationIntent } from "./intentClassifier";

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
    expect(classifyUserIntent("go ahead")).toBe("PLAN_APPROVAL");
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
  test("is true only for build/modify/refine", () => {
    expect(isImplementationIntent("BUILD_REQUEST")).toBe(true);
    expect(isImplementationIntent("MODIFICATION_REQUEST")).toBe(true);
    expect(isImplementationIntent("REFINEMENT")).toBe(true);
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
