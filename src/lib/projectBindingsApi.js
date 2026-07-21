import { authedFetch } from "./billing";
import { readJsonResponse } from "./apiErrors";

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
  const res = await authedFetch(`/api/project-bindings/${encodeURIComponent(projectId)}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonResponse(res, "Failed to load project");
}

export async function deleteProjectBinding(projectId) {
  const res = await authedFetch(`/api/project-bindings/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
  return readJsonResponse(res, "Failed to delete game project");
}
