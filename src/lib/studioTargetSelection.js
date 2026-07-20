/**
 * Resume a parked Studio target selection.
 * Chat preference bind is best-effort — never block the resume API on Firestore deny.
 */
export async function resumeStudioTargetSelection({
  option,
  runId = null,
  bindPreference,
  selectTarget,
} = {}) {
  let bindError = null;
  let preference = null;
  if (typeof bindPreference === "function") {
    try {
      preference = await bindPreference(option);
    } catch (err) {
      bindError = err;
    }
  }
  if (!runId) {
    return { preference, bindError, result: null, resumed: false };
  }
  if (typeof selectTarget !== "function") {
    throw new Error("selectTarget is required when runId is set");
  }
  const result = await selectTarget(runId, option);
  return { preference, bindError, result, resumed: true };
}

export function isFirestorePermissionDenied(err) {
  return (
    err?.code === "permission-denied" ||
    /insufficient permissions/i.test(String(err?.message || ""))
  );
}
