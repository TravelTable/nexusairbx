import { decisionActionLabel } from "./chatDecisionDisplay";

test("Studio inspection before an authorized build does not label the whole request read-only", () => {
  expect(decisionActionLabel({ action: "inspect", executionPolicy: "act", effectiveMode: "agent", scenarioId: "feature_build_request" }))
    .toBe("Inspecting before build");
});

test.each([
  { effectiveMode: "ask", executionPolicy: "read" },
  { effectiveMode: "agent", executionPolicy: "act", scenarioId: "studio_visibility" },
  { effectiveMode: "agent", executionPolicy: "act", scenarioId: "search_and_compare" },
])("genuine read-only inspection stays read-only: %o", (decision) => {
  expect(decisionActionLabel({ action: "inspect", ...decision })).toBe("Read-only");
});

test("unknown inspection permission does not imply a write", () => {
  expect(decisionActionLabel({ action: "inspect" })).toBe("Inspecting");
});
