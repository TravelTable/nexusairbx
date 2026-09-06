const ACTION_LABELS = Object.freeze({
  execute: "Building",
  stage_for_review: "Preparing review",
  recover: "Recovering",
  clarify: "Needs input",
  block: "Blocked",
  refuse: "Blocked",
  answer: "Read-only",
  plan: "Planning",
});

export function decisionActionLabel(decision, fallback = "Deciding") {
  if (decision?.action === "inspect") {
    const readOnly = decision.executionPolicy === "read"
      || decision.effectiveMode === "ask"
      || ["studio_visibility", "search_and_compare", "script_explanation", "workflow_guidance"].includes(decision.scenarioId);
    if (readOnly) return "Read-only";
    return decision.executionPolicy === "act" ? "Inspecting before build" : "Inspecting";
  }
  return ACTION_LABELS[decision?.action] || fallback;
}
