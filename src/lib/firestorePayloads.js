import { getMessageResponseKind, projectAssistantMessage } from "./assistantMessageProjection";
import { normalizeChatAttachments } from "./chatAttachments";
import { normalizeRobloxPlaceId } from "./robloxPlaceId";

const MAX_VALUE_DEPTH = 8;
const MAX_OBJECT_KEYS = 80;
const MAX_ARRAY_ITEMS = 100;
const MAX_STRING_LENGTH = 30_000;

function cleanText(value, limit) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().slice(0, limit);
  return normalized || null;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function sanitizeFirestoreValue(value, depth = 0) {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (depth >= MAX_VALUE_DEPTH) return null;
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((entry) => sanitizeFirestoreValue(entry, depth + 1))
      .filter((entry) => entry !== undefined);
  }
  // Firestore sentinels, Timestamps, and other SDK-owned values must retain
  // their prototypes. They are already validated by the SDK.
  if (!isPlainObject(value)) return value;

  const sanitized = {};
  Object.entries(value).slice(0, MAX_OBJECT_KEYS).forEach(([key, entry]) => {
    const next = sanitizeFirestoreValue(entry, depth + 1);
    if (next !== undefined) sanitized[key] = next;
  });
  return sanitized;
}

export function sanitizeClarificationQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions
    .filter(Boolean)
    .map((question) => {
      if (typeof question === "string") return cleanText(question, 2_000);
      if (!isPlainObject(question)) return null;
      const sanitized = sanitizeFirestoreValue(question);
      if (!sanitized || Object.keys(sanitized).length === 0) return null;
      return sanitized;
    })
    .filter(Boolean)
    .slice(0, 3);
}

export function sanitizeStudioTargetPreference(target) {
  if (!target || typeof target !== "object") return null;
  const targetId = cleanText(target.targetId ?? target.studioTargetId ?? target.id, 200);
  const placeId = normalizeRobloxPlaceId(target.placeId ?? target.targetPlaceId, 80);
  if (!targetId && !placeId) return null;

  const label = cleanText(target.label ?? target.displayName, 160);
  const sanitized = {
    ...(targetId ? { targetId } : {}),
    ...(placeId ? { placeId } : {}),
    ...(label ? { label } : {}),
  };
  if (target.updatedAt !== undefined && target.updatedAt !== null) {
    sanitized.updatedAt = target.updatedAt;
  }
  return Object.freeze(sanitized);
}

function sanitizePersistedTargeting(targeting) {
  if (!targeting || typeof targeting !== "object") return undefined;
  const projectId = cleanText(targeting.projectId, 128);
  const studioTarget = sanitizeStudioTargetPreference(targeting.studioTarget);
  return {
    ...(projectId ? { projectId } : {}),
    studioConnected: targeting.studioConnected === true,
    ...(studioTarget ? { studioTarget } : {}),
  };
}

export function sanitizeTranscriptMessagePayload(payload = {}) {
  // The transcript is a public channel. Keep durable identity/recovery fields,
  // but never store executor source or provider diagnostics here.
  const isBuild = (payload.role === "assistant" || (!payload.role && payload.metadata?.mode))
    && getMessageResponseKind(payload) === "build";
  const publicPayload = isBuild ? projectAssistantMessage({ ...payload, role: "assistant" }) : payload;
  if (isBuild) {
    for (const key of ["stage", "status", "error", "errorCode", "artifactId", "revision", "versionNumber", "queuePosition", "isAutoExecuting", "lastSeq", "lastStreamCursor", "streamCursor", "resultUrl"]) {
      if (payload[key] !== undefined) publicPayload[key] = payload[key];
    }
    for (const key of ["mode", "runState", "launchRecoveryVersion", "streamCursor", "lastSeq", "lastStreamCursor", "resultUrl"]) {
      if (payload.metadata?.[key] !== undefined) publicPayload.metadata[key] = payload.metadata[key];
    }
  }
  const sanitized = sanitizeFirestoreValue(publicPayload);
  if (!sanitized || typeof sanitized !== "object") return {};
  // Full user requests are authoritative input, not a classifier hint. Do not
  // truncate them using the generic small-document string budget.
  if (payload.role === "user" && typeof payload.content === "string") sanitized.content = payload.content;

  if (!isBuild && Object.prototype.hasOwnProperty.call(payload, "questions")) {
    sanitized.questions = sanitizeClarificationQuestions(payload.questions);
  }
  if (!isBuild && Object.prototype.hasOwnProperty.call(payload, "attachments")) {
    sanitized.attachments = normalizeChatAttachments(payload.attachments, {
      limit: 16,
      dataLimit: 120_000,
    });
  }
  if (Object.prototype.hasOwnProperty.call(payload, "studioTarget")) {
    const studioTarget = sanitizeStudioTargetPreference(payload.studioTarget);
    if (studioTarget) sanitized.studioTarget = studioTarget;
    else delete sanitized.studioTarget;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "targeting")) {
    const targeting = sanitizePersistedTargeting(payload.targeting);
    if (targeting) sanitized.targeting = targeting;
    else delete sanitized.targeting;
  }
  return sanitized;
}

export function sanitizeChatWritePayload(payload = {}) {
  const sanitized = sanitizeFirestoreValue(payload);
  if (!sanitized || typeof sanitized !== "object") return {};
  if (Object.prototype.hasOwnProperty.call(payload, "studioTargetPreference")) {
    const target = sanitizeStudioTargetPreference(payload.studioTargetPreference);
    if (target) sanitized.studioTargetPreference = target;
    else sanitized.studioTargetPreference = null;
  }
  return sanitized;
}
