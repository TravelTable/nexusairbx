const PLAN_APPROVAL_RE = /^(start build|build it|go ahead|proceed|implement( that| the)? plan|approved|approve|yes,?\s*(build|proceed|go ahead))[\s.!]*$/i;

export function isExplicitPlanApproval(value) {
  return PLAN_APPROVAL_RE.test(String(value || "").replace(/\s+/g, " ").trim());
}
