const USER_CANCELLATION_CODES = new Set([
  "user_cancelled",
  "user_canceled",
  "cancelled_by_user",
  "canceled_by_user",
]);

function normalizedToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isCancellationMessage(value) {
  return /^(?:generation\s+)?(?:was\s+)?cancel(?:led|ed)\s+by\s+(?:the\s+)?user[.!]?$/i.test(
    String(value || "").trim()
  );
}

/**
 * Accept cancellation only from an authoritative payload/error field. Generic
 * failures containing words such as "cancel" remain failures.
 */
export function isServerConfirmedUserCancellation(value, depth = 0, seen = null) {
  if (value == null || depth > 5) return false;
  if (typeof value === "string") {
    return USER_CANCELLATION_CODES.has(normalizedToken(value)) || isCancellationMessage(value);
  }
  if (typeof value !== "object") return false;
  const visited = seen || new WeakSet();
  if (visited.has(value)) return false;
  visited.add(value);

  for (const key of ["failureCode", "errorCode", "code", "reason", "cancellationReason"]) {
    if (USER_CANCELLATION_CODES.has(normalizedToken(value[key]))) return true;
  }
  for (const key of ["message", "errorMessage", "summary"]) {
    if (
      USER_CANCELLATION_CODES.has(normalizedToken(value[key]))
      || isCancellationMessage(value[key])
    ) return true;
  }
  for (const key of ["error", "result", "payload", "metadata", "run", "terminalDetails", "taskResult"]) {
    if (isServerConfirmedUserCancellation(value[key], depth + 1, visited)) return true;
  }
  return false;
}

export function normalizeAuthoritativeRunStatus(status, evidence = null) {
  const normalized = normalizedToken(status);
  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    USER_CANCELLATION_CODES.has(normalized) ||
    isServerConfirmedUserCancellation(evidence)
  ) {
    return "canceled";
  }
  if (["succeeded", "completed", "done"].includes(normalized)) return "completed";
  if (["failed", "blocked", "iteration_limit", "timed_out"].includes(normalized)) return "failed";
  return null;
}
