import { authedFetch } from "./billing";
import { readJsonResponse } from "./apiErrors";

async function request(path, init, fallbackMessage) {
  const response = await authedFetch(path, init);
  return readJsonResponse(response, fallbackMessage);
}

export async function generateAnimation(input) {
  const result = await request("/api/animations/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input || {}),
  }, "Animation generation failed.");
  return result.animation;
}

export async function refineAnimation(animationId, input) {
  const result = await request(`/api/animations/${encodeURIComponent(animationId)}/refinements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input || {}),
  }, "Animation refinement failed.");
  return result.animation;
}

export async function getAnimation(animationId) {
  const result = await request(`/api/animations/${encodeURIComponent(animationId)}`, {
    method: "GET",
    noCache: true,
  }, "Could not load the animation.");
  return result.animation;
}

export async function listAnimations({ limit = 20 } = {}) {
  return request(`/api/animations?limit=${encodeURIComponent(limit)}`, {
    method: "GET",
    noCache: true,
  }, "Could not load animations.");
}

export async function searchAnimationLibrary(query, { limit = 24 } = {}) {
  return request(`/api/animations/library/search?q=${encodeURIComponent(query || "")}&limit=${encodeURIComponent(limit)}`, {
    method: "GET",
    noCache: true,
  }, "Could not search the motion library.");
}

export async function sendAnimationToStudio(animationId, input) {
  return request(`/api/animations/${encodeURIComponent(animationId)}/send-to-studio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input || {}),
  }, "Could not send the animation to Roblox Studio.");
}

