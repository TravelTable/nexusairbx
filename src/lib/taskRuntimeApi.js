import { authedFetch } from "./billing";
import FEATURE_FLAGS from "./featureFlags";

const TASKS_BASE = "/api/tasks";

const SAFE_ERROR_MESSAGES = Object.freeze({
  TASK_RUNTIME_DISABLED: "The durable task runtime is not enabled for this environment.",
  AUTH_REQUIRED: "Sign in to continue this task.",
  FORBIDDEN: "You do not have access to this task.",
  TASK_NOT_FOUND: "This task could not be found.",
  NOT_FOUND: "This task could not be found.",
  VALIDATION_FAILED: "The task request is incomplete or invalid.",
  TASK_VALIDATION_FAILED: "The task request is incomplete or invalid.",
  TASK_CONFLICT: "This task changed while the request was being processed. Refresh its progress and try again.",
  OPERATION_CONFLICT: "This task is already being updated. Refresh its progress before trying again.",
  RATE_LIMITED: "Too many task requests are in progress. Wait a moment and try again.",
  NETWORK_FAILURE: "Task progress could not be reached. Your saved task will reconnect automatically.",
  TIMEOUT: "The task operation timed out. Its saved progress can be resumed safely.",
  AUTHENTICATION_FAILED: "Sign in again before continuing this task.",
  PERMISSION_DENIED: "You do not have permission to continue this task.",
  CAPABILITY_UNSUPPORTED: "This task needs a capability that is not supported yet.",
  STUDIO_DISCONNECTED: "Reconnect Roblox Studio to continue this task.",
  STUDIO_SESSION_MISMATCH: "Reconnect the intended Roblox Studio session before continuing this task.",
  STUDIO_COMMAND_EXPIRED: "The Studio command expired before it could finish. Reconnect and retry the authorized step.",
  STUDIO_EXECUTION_FAILED: "Roblox Studio could not apply the requested change.",
  DUPLICATE_OPERATION: "This operation was already submitted. Refresh the saved task result before continuing.",
  IDEMPOTENCY_CONFLICT: "This request identity was already used for different work. Refresh before trying again.",
  FILE_CONFLICT: "A Studio file changed while this task was running. Review the latest version before retrying.",
  MANIFEST_MISMATCH: "The Studio project changed while this task was running. Refresh the project before continuing.",
  STALE_MANIFEST: "The saved project manifest is out of date. Refresh it before continuing.",
  IMAGE_GENERATION_FAILED: "The requested image could not be generated.",
  ASSET_GENERATION_FAILED: "The requested asset could not be generated.",
  ASSET_UPLOAD_FAILED: "The generated asset is saved, but its Roblox upload did not finish.",
  MODERATION_PENDING: "Roblox moderation is still pending. This task will continue when a result is available.",
  MODERATION_REJECTED: "Roblox moderation did not approve the uploaded asset.",
  BADGE_CREATION_FAILED: "The Roblox badge could not be created.",
  GAME_PASS_CREATION_FAILED: "The Roblox game pass could not be created.",
  EXTERNAL_API_FAILED: "An external service did not complete this task step.",
  BILLING_FAILED: "Billing could not authorize this task operation.",
  ENTITLEMENT_DENIED: "Your current plan does not include a capability required by this task.",
  TASK_STATE_FAILED: "The task stopped because its saved state could not be reconciled safely.",
  CHECKPOINT_FAILED: "The task stopped because its recovery checkpoint could not be verified.",
  VERIFICATION_FAILED: "The requested result could not be verified, so the task was not marked complete.",
  INTERNAL_CONSISTENCY_FAILED: "The task stopped because its saved state could not be verified safely.",
  UNKNOWN_FAILURE: "The task stopped because of an unexpected error.",
  STUDIO_REQUIRED: "Roblox Studio must be connected before this task can continue.",
  CAPABILITY_UNAVAILABLE: "A required capability is not available for this task.",
  TASK_ACTION_NOT_ALLOWED: "That action is not available for the task in its current state.",
  NETWORK_ERROR: "Task progress could not be reached. Your saved task will reconnect automatically.",
  STREAM_DISCONNECTED: "Live task progress was interrupted. Your saved task will reconnect automatically.",
});

function firstString(...values) {
  const value = values.find((entry) => (
    (typeof entry === "string" && entry.trim())
    || (typeof entry === "number" && Number.isFinite(entry))
  ));
  return value === undefined || value === null ? "" : String(value);
}

function safeUserMessage(...values) {
  const message = firstString(...values).trim();
  if (!message || message.startsWith("[") || message.startsWith("{")) return "";
  if (/\b(?:stack trace|exception)\b/i.test(message) || /(?:^|\n)\s*at\s+[\w$.<>]+\s*\(/.test(message)) return "";
  return message.slice(0, 500);
}

function finiteNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export class TaskRuntimeError extends Error {
  constructor(summary, {
    code = "TASK_RUNTIME_ERROR",
    status = null,
    requestId = null,
    retryable = false,
    retryAfterMs = null,
    recovery = null,
    details = null,
    traceId = null,
    operationId = null,
    affectedStepId = null,
    userActionRequired = false,
    independentStepsMayContinue = false,
    cause = null,
  } = {}) {
    super(summary || "The task request could not be completed.");
    this.name = "TaskRuntimeError";
    this.code = code;
    this.status = status;
    this.summary = this.message;
    this.requestId = requestId;
    this.retryable = Boolean(retryable);
    this.retryAfterMs = retryAfterMs;
    this.recovery = recovery;
    this.details = details;
    this.traceId = traceId;
    this.operationId = operationId;
    this.affectedStepId = affectedStepId;
    this.userActionRequired = Boolean(userActionRequired);
    this.independentStepsMayContinue = Boolean(independentStepsMayContinue);
    if (cause) this.cause = cause;
  }
}

function disabledError() {
  return new TaskRuntimeError(SAFE_ERROR_MESSAGES.TASK_RUNTIME_DISABLED, {
    code: "TASK_RUNTIME_DISABLED",
    status: 404,
    retryable: false,
  });
}

function ensureEnabled() {
  if (!FEATURE_FLAGS.newTaskRuntime) throw disabledError();
}

function validationError(message = SAFE_ERROR_MESSAGES.TASK_VALIDATION_FAILED) {
  return new TaskRuntimeError(message, {
    code: "TASK_VALIDATION_FAILED",
    status: 400,
    retryable: false,
  });
}

function idPath(value, label = "task ID") {
  const normalized = firstString(value).trim();
  if (!normalized) throw validationError(`A ${label} is required.`);
  return encodeURIComponent(normalized);
}

function retryAfterMs(response, envelope) {
  const explicit = finiteNumber(envelope?.retryAfterMs, envelope?.retry_after_ms);
  if (explicit !== null) return Math.max(0, explicit);
  const header = response?.headers?.get?.("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(header);
  return Number.isFinite(dateMs) ? Math.max(0, dateMs - Date.now()) : null;
}

function newMutationId() {
  const randomId = typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function"
    ? window.crypto.randomUUID()
    : null;
  if (randomId) return randomId;
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function errorFromEnvelope(data, response, fallbackMessage) {
  const root = asObject(data);
  const nested = asObject(root.error);
  const envelope = Object.keys(nested).length ? { ...root, ...nested } : root;
  const status = Number(response?.status) || finiteNumber(envelope.status) || null;
  let code = firstString(envelope.code, envelope.errorCode).trim().toUpperCase();
  if (!code && status === 401) code = "AUTH_REQUIRED";
  if (!code && status === 403) code = "FORBIDDEN";
  if (!code && status === 404) code = "TASK_NOT_FOUND";
  if (!code && status === 409) code = "TASK_CONFLICT";
  if (!code && status === 429) code = "RATE_LIMITED";
  if (!code) code = "TASK_RUNTIME_ERROR";

  const explicitlySafe = safeUserMessage(
    envelope.userMessage,
    envelope.safeMessage,
    envelope.userSummary
  ).trim();
  const summary = SAFE_ERROR_MESSAGES[code] || explicitlySafe || fallbackMessage;
  const retryable = typeof envelope.retryable === "boolean"
    ? envelope.retryable
    : status === 408 || status === 429 || (status !== null && status >= 500);

  return new TaskRuntimeError(summary, {
    code,
    status,
    requestId: firstString(
      envelope.requestId,
      envelope.request_id,
      response?.headers?.get?.("x-request-id")
    ) || null,
    retryable,
    retryAfterMs: retryAfterMs(response, envelope),
    recovery: envelope.recovery || root.recovery || null,
    details: envelope.details || root.details || null,
    traceId: firstString(envelope.traceId, envelope.trace_id) || null,
    operationId: firstString(envelope.operationId, envelope.operation_id) || null,
    affectedStepId: firstString(envelope.affectedStepId, envelope.affected_step_id) || null,
    userActionRequired: envelope.userActionRequired === true || envelope.user_action_required === true,
    independentStepsMayContinue:
      envelope.independentStepsMayContinue === true || envelope.independent_steps_may_continue === true,
  });
}

export function normalizeTaskRuntimeError(error, fallbackMessage = "The task request could not be completed.") {
  if (error instanceof TaskRuntimeError) return error;
  if (error?.name === "AbortError") return error;
  const code = firstString(error?.code).trim().toUpperCase() || "NETWORK_ERROR";
  const explicitlySafe = safeUserMessage(
    error?.userMessage,
    error?.safeMessage,
    error?.userSummary,
    error?.summary
  ).trim();
  const summary = SAFE_ERROR_MESSAGES[code]
    || explicitlySafe
    || (code === "NETWORK_ERROR" ? SAFE_ERROR_MESSAGES.NETWORK_ERROR : fallbackMessage);
  return new TaskRuntimeError(summary, {
    code,
    status: finiteNumber(error?.status),
    requestId: firstString(error?.requestId) || null,
    retryable: error?.retryable !== false,
    retryAfterMs: finiteNumber(error?.retryAfterMs),
    recovery: error?.recovery || null,
    details: error?.details || null,
    traceId: firstString(error?.traceId, error?.trace_id) || null,
    operationId: firstString(error?.operationId, error?.operation_id) || null,
    affectedStepId: firstString(error?.affectedStepId, error?.affected_step_id) || null,
    userActionRequired: error?.userActionRequired === true || error?.user_action_required === true,
    independentStepsMayContinue:
      error?.independentStepsMayContinue === true || error?.independent_steps_may_continue === true,
    cause: error,
  });
}

export function formatTaskRuntimeError(error, fallback = "The task request could not be completed.") {
  const normalized = normalizeTaskRuntimeError(error, fallback);
  if (normalized?.name === "AbortError") return "The task request was cancelled.";
  const message = SAFE_ERROR_MESSAGES[normalized.code] || safeUserMessage(normalized.summary) || fallback;
  const supportId = firstString(normalized.requestId).slice(0, 200);
  return supportId ? `${message} Support ID: ${supportId}` : message;
}

async function readJsonResponse(response, fallbackMessage) {
  const text = await response.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }
  if (!response.ok) throw errorFromEnvelope(data, response, fallbackMessage);
  return asObject(data);
}

async function request(path, {
  method = "GET",
  body,
  headers,
  idempotencyKey,
  requestId,
  ...init
} = {}, fallbackMessage = "The task request could not be completed.") {
  ensureEnabled();
  const normalizedMethod = String(method || "GET").toUpperCase();
  const mutationId = normalizedMethod === "GET" ? "" : firstString(requestId, idempotencyKey) || newMutationId();
  const requestHeaders = {
    Accept: "application/json",
    ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    ...(normalizedMethod === "GET" ? {} : { "Idempotency-Key": String(idempotencyKey || mutationId) }),
    ...(normalizedMethod === "GET" ? {} : { "X-Request-ID": String(requestId || mutationId) }),
    ...(headers || {}),
  };

  let response;
  try {
    response = await authedFetch(`${TASKS_BASE}${path}`, {
      method: normalizedMethod,
      noCache: normalizedMethod === "GET",
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      ...init,
    });
  } catch (error) {
    throw normalizeTaskRuntimeError(error, fallbackMessage);
  }
  return readJsonResponse(response, fallbackMessage);
}

function withQuery(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      if (value.length) query.set(key, value.join(","));
      return;
    }
    query.set(key, String(value));
  });
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

function responseOptions(payload, options = {}) {
  return {
    idempotencyKey: options.idempotencyKey || payload?.idempotencyKey,
    requestId: options.requestId || payload?.requestId,
  };
}

export function normalizeTask(rawTask = {}) {
  const task = asObject(rawTask.task || rawTask);
  return {
    ...task,
    taskId: firstString(task.taskId, task.id),
    status: firstString(task.status).toLowerCase(),
    currentStepId: firstString(task.currentStepId, task.currentStep?.stepId, task.currentStep?.id),
    eventSequence: finiteNumber(task.eventSequence, task.lastEventSequence, task.sequence) || 0,
    steps: asArray(task.steps),
  };
}

export function normalizeTaskEvent(rawEvent = {}, fallback = {}) {
  const wrapper = asObject(rawEvent);
  const event = Object.keys(asObject(wrapper.event)).length ? asObject(wrapper.event) : wrapper;
  const fallbackObject = typeof fallback === "object" ? fallback : { sequence: fallback };
  const payload = event.payload === undefined ? asObject(event.data) : event.payload;
  return {
    ...event,
    eventId: firstString(event.eventId, event.id, fallbackObject.id),
    taskId: firstString(event.taskId, payload?.taskId),
    sequence: finiteNumber(
      event.sequence,
      event.seq,
      event.eventSequence,
      fallbackObject.sequence,
      fallbackObject.id
    ) || 0,
    eventType: firstString(event.eventType, event.type, fallbackObject.eventType) || "task.event",
    eventVersion: finiteNumber(event.eventVersion, event.version) || 1,
    payload: payload === undefined ? {} : payload,
  };
}

function normalizeTaskResult(data) {
  const rawTask = asObject(data.task || data);
  const projectedSteps = data.steps || data.taskSteps;
  const projectedActions = data.allowedActions || data.authorizedActions || data.availableActions;
  return {
    ...data,
    task: normalizeTask({
      ...rawTask,
      ...(projectedSteps === undefined ? {} : { steps: projectedSteps }),
      ...(projectedActions === undefined || rawTask.allowedActions || rawTask.authorizedActions || rawTask.availableActions
        ? {}
        : { allowedActions: projectedActions }),
    }),
  };
}

export async function createTask(input = {}, options = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw validationError();
  const data = await request("", {
    method: "POST",
    body: input,
    ...responseOptions(input, options),
  }, "The task could not be started.");
  return normalizeTaskResult(data);
}

export async function listTasks(params = {}) {
  const data = await request(withQuery("", params), {}, "Tasks could not be loaded.");
  const items = data.tasks || data.items || data.results || [];
  return {
    ...data,
    tasks: asArray(items).map(normalizeTask),
    nextCursor: firstString(data.nextCursor, data.cursor, data.page?.nextCursor) || null,
  };
}

export async function getTask(taskId) {
  const data = await request(`/${idPath(taskId)}`, {}, "Task progress could not be loaded.");
  return normalizeTaskResult(data);
}

export async function getTaskEvents(taskId, { afterSequence = 0, limit, signal } = {}) {
  const path = withQuery(`/${idPath(taskId)}/events`, {
    afterSequence: Math.max(0, finiteNumber(afterSequence) || 0),
    limit,
  });
  const data = await request(path, { signal }, "Task progress events could not be loaded.");
  const items = data.events || data.items || data.results || [];
  const events = asArray(items)
    .map(normalizeTaskEvent)
    .sort((a, b) => a.sequence - b.sequence);
  return {
    ...data,
    events,
    lastSequence: Math.max(
      finiteNumber(data.lastSequence, data.eventSequence) || 0,
      ...events.map((event) => event.sequence)
    ),
    nextCursor: firstString(data.nextCursor, data.cursor) || null,
  };
}

function parseSseFrames(buffer, { flush = false } = {}) {
  const events = [];
  let rest = buffer;
  while (rest) {
    const boundary = rest.match(/\r?\n\r?\n/);
    if (!boundary || boundary.index === undefined) break;
    const raw = rest.slice(0, boundary.index);
    rest = rest.slice(boundary.index + boundary[0].length);
    events.push(raw);
  }
  if (flush && rest.trim()) {
    events.push(rest);
    rest = "";
  }
  return { frames: events, rest };
}

function decodeSseFrame(frame) {
  let eventType = "message";
  let id = "";
  const dataLines = [];
  String(frame || "").split(/\r?\n/).forEach((line) => {
    if (!line || line.startsWith(":")) return;
    const separator = line.indexOf(":");
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? "" : line.slice(separator + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") eventType = value || "message";
    if (field === "id") id = value;
    if (field === "data") dataLines.push(value);
  });
  if (!dataLines.length) return null;
  const text = dataLines.join("\n");
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    data = { safeMessage: "Live task progress contained an invalid event." };
  }
  return { eventType, id, data };
}

export async function streamTaskEvents(taskId, {
  afterSequence = 0,
  onEvent,
  signal,
} = {}) {
  ensureEnabled();
  const startingSequence = Math.max(0, finiteNumber(afterSequence) || 0);
  const path = withQuery(`/${idPath(taskId)}/events`, { afterSequence: startingSequence });
  let response;
  try {
    response = await authedFetch(`${TASKS_BASE}${path}`, {
      method: "GET",
      noCache: true,
      headers: { Accept: "text/event-stream" },
      signal,
    });
  } catch (error) {
    throw normalizeTaskRuntimeError(error, SAFE_ERROR_MESSAGES.STREAM_DISCONNECTED);
  }
  if (!response.ok) {
    await readJsonResponse(response, SAFE_ERROR_MESSAGES.STREAM_DISCONNECTED);
    throw new TaskRuntimeError(SAFE_ERROR_MESSAGES.STREAM_DISCONNECTED, {
      code: "STREAM_DISCONNECTED",
      retryable: true,
    });
  }
  if (!response.body?.getReader) {
    throw new TaskRuntimeError(SAFE_ERROR_MESSAGES.STREAM_DISCONNECTED, {
      code: "STREAM_DISCONNECTED",
      status: response.status || null,
      retryable: true,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastSequence = startingSequence;

  const deliverFrames = async (frames) => {
    for (const frame of frames) {
      const decoded = decodeSseFrame(frame);
      if (!decoded) continue;
      if (decoded.eventType === "error") {
        throw errorFromEnvelope(decoded.data, { status: 0, headers: response.headers }, SAFE_ERROR_MESSAGES.STREAM_DISCONNECTED);
      }
      const event = normalizeTaskEvent(decoded.data, {
        id: decoded.id,
        sequence: decoded.id,
        eventType: decoded.eventType === "message" ? undefined : decoded.eventType,
      });
      lastSequence = Math.max(lastSequence, event.sequence);
      await onEvent?.(event);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseFrames(buffer);
      buffer = parsed.rest;
      await deliverFrames(parsed.frames);
    }
    buffer += decoder.decode();
    const parsed = parseSseFrames(buffer, { flush: true });
    await deliverFrames(parsed.frames);
  } finally {
    reader.releaseLock?.();
  }
  return { lastSequence };
}

async function taskAction(taskId, action, payload = {}, options = {}, fallbackMessage) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw validationError();
  const data = await request(`/${idPath(taskId)}/${action}`, {
    method: "POST",
    body: payload,
    ...responseOptions(payload, options),
  }, fallbackMessage);
  return normalizeTaskResult(data);
}

export function cancelTask(taskId, payload = {}, options = {}) {
  return taskAction(taskId, "cancel", payload, options, "The task could not be cancelled.");
}

export function amendTask(taskId, payload = {}, options = {}) {
  const instruction = firstString(payload?.instruction).trim();
  const priceRobux = Number(payload?.priceRobux);
  const hasPrice = Number.isSafeInteger(priceRobux) && priceRobux >= 1;
  if (!instruction && !hasPrice) {
    return Promise.reject(validationError("An amendment instruction or confirmed Robux price is required."));
  }
  return taskAction(taskId, "amend", payload, options, "The task instructions could not be updated.");
}

export function approveTask(taskId, payload = {}, options = {}) {
  return taskAction(taskId, "approve", payload, options, "The task approval could not be recorded.");
}

export function retryTask(taskId, payload = {}, options = {}) {
  return taskAction(taskId, "retry", payload, options, "The task step could not be retried.");
}
