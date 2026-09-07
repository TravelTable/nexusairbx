const { getRunPresentation } = require("./runPresentation");

/**
 * The response kind is attached by the server/submit coordinator, not the LLM.
 * Use the per-turn kind, never the currently selected composer mode: switching
 * to Agent must not rewrite or hide a previous Ask answer.
 */
function getMessageResponseKind(message) {
  const explicit = message?.responseKind || message?.metadata?.responseKind;
  if (explicit) return explicit;
  if (message?.planId || ["plan", "plan_approved", "clarification"].includes(message?.stage)) return "plan";
  // Legacy replay may carry its originating mode even when responseKind predates
  // the record. Never consult the current composer selection.
  const mode = String(message?.metadata?.mode || message?.mode || "").toLowerCase();
  if (["agent", "act", "debug"].includes(mode)) return "build";
  return mode === "plan" ? "plan" : "answer";
}

function projectAssistantMessage(message) {
  if (!message || message.role !== "assistant") return message;
  const kind = getMessageResponseKind(message);
  if (kind !== "build") return message;
  const publicPhase = message.publicPhase || message.metadata?.publicPhase || message.metadata?.runState || "";
  const presentation = getRunPresentation({
    taskId: message.taskId, runId: message.runId,
    status: publicPhase, completion: message.completion || message.metadata?.completion,
  });
  const pending = message.pending === true;
  const text = presentation?.label || (pending ? "Preparing your build." : "Open Build to check the saved output and run status.");
  const projected = {
    role: "assistant", responseKind: "build", content: text, explanation: text,
    pending, publicPhase, metadata: { responseKind: "build", publicPhase },
  };
  for (const key of ["id", "requestId", "operationId", "taskId", "runId", "chatId", "projectId", "createdAt", "updatedAt", "jobId", "agentId", "launchOperationId", "selectedMode", "resolvedTurnIntent"]) {
    if (message[key] !== undefined) projected[key] = message[key];
  }
  const completion = message.completion || message.metadata?.completion;
  if (completion) projected.completion = {
    canComplete: completion.canComplete === true,
    changesApplied: completion.changesApplied === true,
  };
  projected.artifactRefs = (Array.isArray(message.artifactRefs) ? message.artifactRefs : [])
    .filter(ref => typeof ref?.artifactId === "string" && typeof ref.revision === "string" && typeof ref.path === "string")
    .map(ref => ({ artifactId: ref.artifactId, revision: ref.revision, path: ref.path }));
  // Deliberately rebuild rather than spread: code, source, tool payloads,
  // reasoning, streamState and a model's raw content cannot reach Markdown.
  return projected;
}

module.exports = { getMessageResponseKind, projectAssistantMessage };
