const STORAGE_KEY = "nexusrbx:pending-auth-action";
const COMPLETED_KEY = "nexusrbx:pending-auth-action-completed";
const DEFAULT_TTL_MS = 30 * 60 * 1000;
const COMPLETED_TTL_MS = 24 * 60 * 60 * 1000;

export const PENDING_AUTH_ACTIONS = Object.freeze({
  SAVE_PROJECT: "save_project",
  CONTINUE_EDITING: "continue_editing",
  RESTRICTED_GENERATION: "restricted_generation",
  CHAT_SUBMIT: "chat_submit",
  EXPORT_PROJECT: "export_project",
  PUSH_TO_STUDIO: "push_to_studio",
  UPGRADE_TO_AGENT_BUILD: "upgrade_to_agent_build",
  STUDIO_CONNECTION: "studio_connection",
  VERSION_HISTORY: "version_history",
});

const ACTION_LABELS = {
  [PENDING_AUTH_ACTIONS.SAVE_PROJECT]: "save your project",
  [PENDING_AUTH_ACTIONS.CONTINUE_EDITING]: "continue editing",
  [PENDING_AUTH_ACTIONS.RESTRICTED_GENERATION]: "generate another output",
  [PENDING_AUTH_ACTIONS.CHAT_SUBMIT]: "continue your chat",
  [PENDING_AUTH_ACTIONS.EXPORT_PROJECT]: "export your project",
  [PENDING_AUTH_ACTIONS.PUSH_TO_STUDIO]: "push to Studio",
  [PENDING_AUTH_ACTIONS.UPGRADE_TO_AGENT_BUILD]: "open Agent Build",
  [PENDING_AUTH_ACTIONS.STUDIO_CONNECTION]: "connect Studio",
  [PENDING_AUTH_ACTIONS.VERSION_HISTORY]: "use version history",
};

function storage() {
  if (typeof window === "undefined") return null;
  try {
    const s = window.localStorage;
    const probe = "__nexusrbx_pending_auth_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch (_) {
    return null;
  }
}

function now() {
  return Date.now();
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `pending_${Math.random().toString(36).slice(2)}_${now().toString(36)}`;
}

function safePath(value) {
  const text = String(value || "/ai").trim();
  if (!text.startsWith("/") || text.startsWith("//")) return "/ai";
  return text.slice(0, 160);
}

function normalizeAction(action = {}) {
  const createdAt = Number(action.createdAt || now());
  const expiresAt = Number(action.expiresAt || createdAt + DEFAULT_TTL_MS);
  const actionType = String(action.action || PENDING_AUTH_ACTIONS.RESTRICTED_GENERATION);
  return {
    id: String(action.id || createId()),
    action: actionType,
    returnPath: safePath(action.returnPath || "/ai"),
    workspace: action.workspace === "agent_build" ? "agent_build" : "quick_script",
    source: String(action.source || "auth_gate").slice(0, 80),
    status: ["pending", "in_progress", "completed"].includes(action.status) ? action.status : "pending",
    createdAt,
    expiresAt,
    inProgressAt: Number(action.inProgressAt || 0),
    payload: sanitizePayload(action.payload, actionType),
  };
}

function sanitizePendingChatAttachments(attachments = []) {
  if (!Array.isArray(attachments)) return [];
  return attachments.slice(0, 6).map((attachment) => {
    if (!attachment || typeof attachment !== "object") return null;
    const type = String(attachment.type || attachment.mimeType || "application/octet-stream")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    const isImage = Boolean(attachment.isImage || /^image\//i.test(type));
    const out = {
      name: String(attachment.name || attachment.fileName || "attachment")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160),
      type,
      isImage,
    };
    if (attachment.data != null) out.data = String(attachment.data).slice(0, 120000);
    return out;
  }).filter(Boolean);
}

function sanitizePayload(payload = {}, actionType = "") {
  const out = {};
  const allowed = [
    "quickScriptResultId",
    "quickScriptClaimAvailable",
    "studioConnected",
    "generatorMode",
    "promptCategory",
    "actionLabel",
    "resumedOutcome",
  ];
  for (const key of allowed) {
    const value = payload?.[key];
    if (value == null) continue;
    if (typeof value === "boolean") out[key] = value;
    else out[key] = String(value).replace(/\s+/g, " ").trim().slice(0, 120);
  }
  if (actionType === PENDING_AUTH_ACTIONS.CHAT_SUBMIT) {
    if (payload?.prompt != null) out.prompt = String(payload.prompt).slice(0, 12000);
    if (payload?.chatMode != null) out.chatMode = String(payload.chatMode).replace(/\s+/g, " ").trim().slice(0, 32);
    if (payload?.modelVersion != null) out.modelVersion = String(payload.modelVersion).replace(/\s+/g, " ").trim().slice(0, 80);
    const attachments = sanitizePendingChatAttachments(payload?.attachments);
    if (attachments.length) out.attachments = attachments;
  }
  return out;
}

function readRaw(key) {
  const s = storage();
  if (!s) return null;
  try {
    const parsed = JSON.parse(s.getItem(key) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
}

function writeRaw(key, value) {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}

export function actionLabel(actionType) {
  return ACTION_LABELS[actionType] || "resume your work";
}

export function createPendingAuthAction(action = {}) {
  const pending = normalizeAction(action);
  writeRaw(STORAGE_KEY, pending);
  return pending;
}

export function readPendingAuthAction({ includeExpired = false } = {}) {
  const pending = readRaw(STORAGE_KEY);
  if (!pending) return null;
  const normalized = normalizeAction(pending);
  if (!includeExpired && normalized.expiresAt <= now()) return null;
  return normalized;
}

export function consumeExpiredPendingAuthAction() {
  const pending = readPendingAuthAction({ includeExpired: true });
  if (!pending || pending.expiresAt > now()) return null;
  clearPendingAuthAction(pending.id);
  return { ...pending, expired: true };
}

export function markPendingAuthActionInProgress(id) {
  const pending = readPendingAuthAction();
  if (!pending || pending.id !== id || pending.status === "completed") return null;
  if (pending.status === "in_progress" && pending.inProgressAt && now() - pending.inProgressAt < 15000) {
    return null;
  }
  const next = { ...pending, status: "in_progress", inProgressAt: now() };
  writeRaw(STORAGE_KEY, next);
  return next;
}

export function completePendingAuthAction(id, result = {}) {
  const pending = readPendingAuthAction({ includeExpired: true });
  if (!pending || pending.id !== id) return false;
  const completed = {
    ...pending,
    status: "completed",
    completedAt: now(),
    result: sanitizePayload(result),
    expiresAt: now() + COMPLETED_TTL_MS,
  };
  writeRaw(COMPLETED_KEY, completed);
  clearPendingAuthAction(id);
  return true;
}

export function readCompletedPendingAuthAction() {
  const completed = readRaw(COMPLETED_KEY);
  if (!completed) return null;
  const expiresAt = Number(completed.expiresAt || 0);
  if (expiresAt <= now()) {
    try {
      storage()?.removeItem(COMPLETED_KEY);
    } catch (_) {}
    return null;
  }
  return completed;
}

export function clearCompletedPendingAuthAction(id = null) {
  const completed = readCompletedPendingAuthAction();
  if (id && completed?.id !== id) return false;
  try {
    storage()?.removeItem(COMPLETED_KEY);
    return true;
  } catch (_) {
    return false;
  }
}

export function clearPendingAuthAction(id = null) {
  const pending = readPendingAuthAction({ includeExpired: true });
  if (id && pending?.id !== id) return false;
  try {
    storage()?.removeItem(STORAGE_KEY);
    return true;
  } catch (_) {
    return false;
  }
}

export function getPendingAuthReturnPath(fallback = "/ai") {
  const pending = readPendingAuthAction({ includeExpired: true });
  return safePath(pending?.returnPath || fallback);
}

export function resetPendingAuthActionsForTests() {
  try {
    storage()?.removeItem(STORAGE_KEY);
    storage()?.removeItem(COMPLETED_KEY);
  } catch (_) {}
}
