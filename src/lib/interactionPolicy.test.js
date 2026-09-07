import { isExecutionFollowUp, resolveTurnRoute, shouldUseConversationalRoute } from "./interactionPolicy";
import { classifyUserIntent } from "./intentClassifier";

test.each(["mate just start", "mate just fucking start", "build it", "continue", "finish it", "resume the build"])("Agent follow-up %s stays on execution path", prompt => {
  expect(isExecutionFollowUp(prompt)).toBe(true);
  expect(resolveTurnRoute({ mode: "agent", prompt, intent: classifyUserIntent(prompt) })).toBe("resume_or_execute");
  expect(resolveTurnRoute({ mode: "ask", prompt, intent: classifyUserIntent(prompt), hasSavedPlan: true })).toBe("answer");
});
test.each(["Assemble a weapon bench", "the shooting does not work", "Fix the shooting?", "Build a map?", "Do not delete the lobby but add a shooting range"])("Agent instruction %s never silently becomes Ask", prompt => {
  expect(shouldUseConversationalRoute(classifyUserIntent(prompt))).toBe(false);
});
test("explicit question and plan are one-turn overrides", () => {
  expect(resolveTurnRoute({mode:"agent",prompt:"why is this script slow?",intent:classifyUserIntent("why is this script slow?")})).toBe("answer");
  expect(resolveTurnRoute({mode:"agent",prompt:"plan this first",intent:classifyUserIntent("plan this first")})).toBe("plan");
});
test("informal approval cannot expand deletion scope", () => expect(isExecutionFollowUp("just fucking delete everything")).toBe(false));
test("explicit code explanation is classified independently of composer", () => expect(classifyUserIntent("Show the code for this script")).toBe("EXPLANATION_REQUEST"));
