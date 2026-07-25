import { authedFetch } from "./billing";
import { readJsonResponse } from "./apiErrors";

export const PROJECT_RESOLUTION_STATES = Object.freeze({
  READY: "ready",
  OWNED_INCOMPLETE: "owned_incomplete",
  LEGACY_OWNED: "legacy_owned",
  MISSING: "missing",
});

export function projectBindingRecoveryMessage(result) {
  if (result?.state === PROJECT_RESOLUTION_STATES.OWNED_INCOMPLETE) {
    return "This project is yours, but its Studio connection needs to be reconnected or reselected before Studio changes can run.";
  }
  if (result?.state === PROJECT_RESOLUTION_STATES.LEGACY_OWNED) {
    return "This legacy project is yours. Planning can continue, but reconnect Studio before applying changes.";
  }
  return null;
}

export async function listProjectBindings({ limit = 50 } = {}) {
  const res = await authedFetch(`/api/project-bindings?limit=${encodeURIComponent(limit)}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonResponse(res, "Failed to list projects");
}

export async function createProjectBinding(payload = {}) {
  const res = await authedFetch("/api/project-bindings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJsonResponse(res, "Failed to create project");
}

/**
 * Upsert a workspace project for a Roblox place/game identity.
 * Reuses an existing binding when placeId already exists for this user.
 */
export async function findOrCreateProjectBinding(payload = {}) {
  const res = await authedFetch("/api/project-bindings/find-or-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJsonResponse(res, "Failed to open project");
}

export async function getProjectBinding(projectId) {
  const normalizedProjectId = String(projectId || "").trim();
  if (!normalizedProjectId) {
    return {
      ok: true,
      state: PROJECT_RESOLUTION_STATES.MISSING,
      project: null,
      recoveryAction: null,
    };
  }

  const res = await authedFetch(
    `/api/project-bindings/${encodeURIComponent(normalizedProjectId)}`,
    {
      method: "GET",
      noCache: true,
    }
  );

  // Stale chat/project ids are common after deletes or legacy sessions. Treat
  // missing bindings as a soft miss so plan/agent can continue without a binding.
  if (res.status === 404) {
    return {
      ok: true,
      state: PROJECT_RESOLUTION_STATES.MISSING,
      project: null,
      recoveryAction: null,
      projectId: normalizedProjectId,
    };
  }

  return readJsonResponse(res, "Failed to load project");
}

export async function deleteProjectBinding(projectId) {
  const res = await authedFetch(`/api/project-bindings/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
  return readJsonResponse(res, "Failed to delete game project");
}
