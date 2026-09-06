import { v4 as uuidv4 } from "uuid";
import { createProjectBinding } from "./projectBindingsApi";

const pending = new Map();
const memoryKeys = new Map();
const storageKey = (uid) => `nexusrbx:draft-project:${uid}`;

export function resetDraftProject(uid) {
  memoryKeys.delete(uid);
  try { sessionStorage.removeItem(storageKey(uid)); } catch { /* Storage is optional. */ }
}

export function ensureDraftProject(uid, prompt) {
  if (pending.has(uid)) return pending.get(uid);
  let key = memoryKeys.get(uid);
  try { key ||= sessionStorage.getItem(storageKey(uid)); } catch { /* Storage is optional. */ }
  key ||= uuidv4();
  memoryKeys.set(uid, key);
  try { sessionStorage.setItem(storageKey(uid), key); } catch { /* Keep the in-memory key. */ }
  const title = String(prompt || "New project").replace(/\s+/g, " ").trim().slice(0, 80) || "New project";
  const request = createProjectBinding({ title, idempotencyKey: key }).then((response) => {
    if (!response?.project?.projectId) throw new Error("Your project could not be created. Try sending again.");
    return response.project;
  }).finally(() => pending.delete(uid));
  pending.set(uid, request);
  return request;
}
