import { authedFetch } from "./billing";

function endpoint(scope, suffix = "", reference = {}) {
  if (!scope?.taskId || !scope?.chatId || !scope?.projectId) throw new Error("A bound build is required.");
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ chatId: scope.chatId, projectId: scope.projectId, runId: scope.runId, ...reference })) {
    if (value) query.set(key, value);
  }
  return `/api/tasks/${encodeURIComponent(scope.taskId)}/build-workspace${suffix}?${query}`;
}

async function read(url, { signal } = {}) {
  const response = await authedFetch(url, { method: "GET", noCache: true, signal });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result?.error?.userMessage || result?.userMessage || "Saved build outputs could not be loaded. Retry the connection.");
    error.status = response.status;
    error.code = result?.error?.code || result?.code;
    throw error;
  }
  return result;
}

export function getBuildWorkspaceSnapshot(scope, options) {
  return read(endpoint(scope), options);
}

export async function readBuildWorkspaceFile(scope, reference, options) {
  if (!["artifactId", "revision", "path"].every(key => typeof reference?.[key] === "string" && reference[key])) {
    throw new Error("An exact saved file reference is required.");
  }
  const result = await read(endpoint(scope, "/file", reference), options);
  if (typeof result.source !== "string" || result.revision !== reference.revision) throw new Error("The saved file revision does not match the requested version.");
  return result;
}
