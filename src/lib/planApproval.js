import { isExecutionFollowUp } from "./interactionPolicy";

// Recognition only. The caller still checks the selected mode, saved-plan
// identity, version/hash fence, project binding and server authorization.
export function isExplicitPlanApproval(value) {
  return isExecutionFollowUp(value);
}
