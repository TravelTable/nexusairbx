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

export async function getProjectBinding(projectId) {
  const res = await authedFetch(`/api/project-bindings/${encodeURIComponent(projectId)}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonResponse(res, "Failed to load project");
}
