/**
 * Whether an assistant message (or workspace snapshot) can be refined.
 */
export function messageHasRefineableFiles(message) {
  if (!message || typeof message !== "object") return false;
  if (Array.isArray(message.files) && message.files.length > 0) return true;
  if (typeof message.code === "string" && message.code.trim()) return true;
  if (Array.isArray(message.projectArtifact?.files) && message.projectArtifact.files.length > 0) {
    return true;
  }
  return false;
}

export function buildRefineTargetFromWorkspace(snapshot, fallbackMessage = null) {
  if (!snapshot || typeof snapshot !== "object") return fallbackMessage;
  if (!messageHasRefineableFiles(snapshot) && !messageHasRefineableFiles(fallbackMessage)) {
    return null;
  }
  return {
    ...(fallbackMessage && typeof fallbackMessage === "object" ? fallbackMessage : {}),
    title: snapshot.title || fallbackMessage?.title || "current project",
    files: Array.isArray(snapshot.files) && snapshot.files.length
      ? snapshot.files
      : fallbackMessage?.files,
    code: snapshot.code || fallbackMessage?.code,
    artifactId: snapshot.artifactId || snapshot.id || fallbackMessage?.artifactId,
    revision: snapshot.revision || fallbackMessage?.revision,
    classification: fallbackMessage?.classification || "project",
    jobId: fallbackMessage?.jobId || snapshot.jobId || null,
    projectId: snapshot.projectId || fallbackMessage?.projectId || null,
  };
}
