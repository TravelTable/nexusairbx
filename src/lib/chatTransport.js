// Browser APIs only. No React, Firebase, provider SDK, or new dependency.
function abortedError(signal) {
  if (signal?.reason instanceof Error) return signal.reason;
  const error = new Error("The operation was stopped.");
  error.name = "AbortError";
  return error;
}

export function checkAborted(signal) {
  if (signal?.aborted) throw abortedError(signal);
}

/** Also bounds operations whose implementation forgets to honour signal. */
function abortable(promise, signal) {
  return new Promise((resolve, reject) => {
    const onAbort = () => { cleanup(); reject(abortedError(signal)); };
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    signal?.addEventListener("abort", onAbort, { once: true });
    // Attach both handlers even when already aborted: late rejections are owned.
    Promise.resolve(promise).then(
      value => { cleanup(); resolve(value); },
      error => { cleanup(); reject(error); }
    );
    if (signal?.aborted) onAbort();
  });
}

export function abortableDelay(ms, signal) {
  checkAborted(signal);
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(abortedError(signal));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}

export function pendingOperationError(operationId) {
  return Object.assign(new Error(
    "The request is not confirmed yet and may still be running. "
    + "Reconnect to this same request before starting another attempt."
  ), {
    name: "OperationRecoveryPendingError",
    code: "OPERATION_RECOVERY_PENDING",
    category: "outcome_unknown",
    outcomeUnknown: true,
    operationId,
    status: 504,
  });
}

export async function withRequestDeadline(work, {
  signal, timeoutMs = 180000, timeoutError,
} = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("timeoutMs must be a positive finite number.");
  }
  checkAborted(signal);
  const controller = new AbortController();
  const onAbort = () => controller.abort(abortedError(signal));
  signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(timeoutError || Object.assign(
    new Error("The response timed out. Your saved prompt has not been removed."),
    { code: "CHAT_RESPONSE_TIMEOUT", status: 504 }
  )), timeoutMs);
  try {
    return await abortable(Promise.resolve().then(() => {
      checkAborted(controller.signal);
      return work(controller.signal);
    }), controller.signal);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

async function* decodedChunks(body, signal) {
  checkAborted(signal);
  if (!body || typeof body.getReader !== "function") {
    throw new Error("The response did not contain a readable stream.");
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let complete = false;
  try {
    while (true) {
      checkAborted(signal);
      const { done, value } = await abortable(reader.read(), signal);
      checkAborted(signal);
      if (done) {
        complete = true;
        const tail = decoder.decode();
        if (tail) yield tail;
        return;
      }
      const text = decoder.decode(value, { stream: true });
      if (text) yield text;
    }
  } finally {
    if (!complete) {
      // Cleanup must not wait forever on a broken transport's cancel promise.
      try { Promise.resolve(reader.cancel()).catch(() => {}); } catch (_) { /* closed */ }
    }
    try { reader.releaseLock(); } catch (_) { /* already released */ }
  }
}

export async function readTextStream(body, { signal, onText } = {}) {
  let full = "";
  for await (const chunk of decodedChunks(body, signal)) {
    full += chunk;
    onText?.(full);
  }
  checkAborted(signal);
  return full;
}

export async function readNdjsonStream(body, {
  signal, onEvent, maxEventChars = 16 * 1024 * 1024,
} = {}) {
  let buffer = "";
  const consume = async line => {
    if (!line.trim()) return;
    if (line.length > maxEventChars) throw new Error("The file response event is too large.");
    let event;
    try { event = JSON.parse(line); } catch (_) {
      throw Object.assign(new Error("The file response contained an invalid JSON event."), {
        code: "INVALID_STREAM_EVENT",
      });
    }
    checkAborted(signal);
    await onEvent?.(event);
  };
  for await (const chunk of decodedChunks(body, signal)) {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      await consume(line);
    }
    if (buffer.length > maxEventChars) throw new Error("The file response event is too large.");
  }
  await consume(buffer); // A final JSON event need not end in a newline.
  checkAborted(signal);
}

const PENDING = new Set([
  "pending", "accepted", "in_progress", "queued", "running",
  "retry_scheduled", "waiting_external",
]);

export async function waitForOperationResult({
  operationId, initialOperation, readOperation, signal,
  timeoutMs = 170000, pollMs = 500,
}) {
  if (typeof operationId !== "string" || !operationId.trim()) {
    throw new Error("The server did not return a request identity for recovery.");
  }
  if (typeof readOperation !== "function") throw new TypeError("readOperation is required.");
  return withRequestDeadline(async pollingSignal => {
    let operation = initialOperation || null;
    while (true) {
      checkAborted(pollingSignal);
      if (operation) {
        const status = String(operation.status || "").toLowerCase();
        if (status === "completed") return operation.result?.body ?? operation.result;
        if (status === "failed" || status === "cancelled") {
          throw Object.assign(new Error(operation.error?.message || "The request did not complete."), {
            code: operation.error?.code || "OPERATION_FAILED",
            status: operation.httpStatus || (status === "cancelled" ? 409 : 500),
            operationId,
          });
        }
        if (!PENDING.has(status)) {
          throw Object.assign(new Error("The server returned an unknown request status."), {
            code: "INVALID_OPERATION_STATUS", operationId,
          });
        }
        await abortableDelay(pollMs, pollingSignal);
      }
      try {
        const response = await abortable(readOperation(operationId, {
          signal: pollingSignal,
        }), pollingSignal);
        operation = response?.operation || null;
        if (!operation) await abortableDelay(pollMs, pollingSignal);
      } catch (error) {
        checkAborted(pollingSignal);
        const retryable = error?.name === "TypeError"
          || [408, 429, 500, 502, 503, 504].includes(Number(error?.status));
        if (!retryable) throw error;
        operation = null;
        await abortableDelay(pollMs, pollingSignal);
      }
    }
  }, { signal, timeoutMs, timeoutError: pendingOperationError(operationId) });
}

export async function assertResponseOk(response, fallback = "The request failed.") {
  if (response.ok) return;
  const text = await response.text().catch(() => "");
  let payload;
  try { payload = JSON.parse(text); } catch (_) { /* plain proxy response */ }
  const message = payload?.message || payload?.error?.message
    || (typeof payload?.error === "string" ? payload.error : null)
    || text.slice(0, 1000) || fallback;
  throw Object.assign(new Error(String(message)), {
    status: response.status, code: payload?.code || payload?.error?.code, payload,
  });
}

export async function readAskResponse(response, {
  operationId, readOperation, signal, onText, timeoutMs = 170000, pollMs = 500,
} = {}) {
  await assertResponseOk(response, "Ask request failed.");
  if (response.status !== 202) return readTextStream(response.body, { signal, onText });
  const accepted = await response.json();
  const canonicalOperationId = accepted?.operation?.operationId || operationId;
  const body = await waitForOperationResult({
    operationId: canonicalOperationId, initialOperation: accepted?.operation,
    readOperation, signal, timeoutMs, pollMs,
  });
  // This endpoint stores the completed text, not a serialized object to display.
  if (typeof body !== "string") {
    throw Object.assign(new Error("The recovered Ask response was not text."), {
      code: "INVALID_ASK_RESPONSE", operationId: canonicalOperationId,
    });
  }
  checkAborted(signal);
  onText?.(body);
  return body;
}
