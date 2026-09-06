/** Mode checks for shortcuts that run before the main submission router. */
export function mayResumeBuild(mode) {
  return ["agent", "debug"].includes(String(mode || "").trim().toLowerCase());
}

/** A reviewed plan can be approved from Plan, but never from read-only Ask. */
export function mayApprovePlan(mode) {
  return ["plan", "agent", "debug"].includes(String(mode || "").trim().toLowerCase());
}

/** Plan attachments must reach the planner, not the file-editing endpoint. */
export function mayUseAttachmentExecutor(mode) {
  return mayResumeBuild(mode);
}
