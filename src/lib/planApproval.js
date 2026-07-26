const PLAN_APPROVAL_RE = /^(start|just start|start now|get started|start build|build it|just do it|go ahead|proceed|implement( that| the)? plan|approved|approve|yes,?\s*(build|proceed|go ahead))[\s.!]*$/i;

export function isExplicitPlanApproval(value) {
  return PLAN_APPROVAL_RE.test(String(value || "").replace(/\s+/g, " ").trim());
}
