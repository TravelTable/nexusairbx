/** A plan lifecycle run and an execution Task are different resources. */
export function executionTaskFromResult(result) {
  return result?.task || result?.execution?.task || null;
}

export function executionTaskIdFromResult(result) {
  const task = executionTaskFromResult(result);
  const id = task?.taskId || task?.id || result?.taskId
    || result?.execution?.taskId
    || result?.lifecycle?.run?.runtime?.taskId
    || result?.run?.runtime?.taskId;
  return typeof id === "string" ? id.trim() : "";
}

export function executionStatusFromResult(result) {
  const task = executionTaskFromResult(result);
  const status = String(task?.status || result?.status
    || result?.lifecycle?.run?.status || result?.run?.status || "").toLowerCase();
  switch (status) {
    case "succeeded":
    case "completed": return "succeeded";
    case "failed":
    case "cancelled":
    case "running":
    case "verifying":
    case "paused": return status;
    case "blocked_studio": return "waiting_studio";
    case "waiting_user": return "waiting_user";
    case "blocked": return "blocked";
    case "waiting_external":
    case "retry_scheduled":
    case "compensating": return "running";
    default: return "queued";
  }
}
