/* global globalThis */

export const CHAT_OPERATION_STATUS = Object.freeze({
  PREPARING: "Preparing",
  RUNNING: "Running",
  QUEUED: "Queued",
  STOPPING: "Stopping",
  STOPPED: "Stopped",
  RESTORING: "Restoring",
  FAILED: "Failed",
});

function createOperationId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `chat-operation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isAbortError(error) {
  return error?.name === "AbortError" || error?.code === "ABORT_ERR";
}

function publicOperation(operation) {
  if (!operation) return null;
  return {
    id: operation.id,
    chatId: operation.chatId,
    type: operation.type,
    status: operation.status,
    prompt: operation.prompt,
    attachments: operation.attachments,
    runId: operation.runId || null,
    checkpointMetadata: operation.checkpointMetadata || null,
    createdAt: operation.createdAt,
    error: operation.error || null,
  };
}

function createSlot() {
  return {
    active: null,
    queue: [],
    paused: false,
    lastStatus: null,
    stopPromise: null,
  };
}

function attachOperationPromise(operation) {
  operation.promise = new Promise((resolve, reject) => {
    operation.resolve = resolve;
    operation.reject = reject;
  });
  // Most admissions are intentionally fire-and-forget from React event
  // handlers. Keep a rejected operation observable to explicit callers
  // without surfacing a global unhandled rejection.
  operation.promise.catch(() => {});
  return operation;
}

function createFailedRetry(operation, error) {
  return attachOperationPromise({
    ...operation,
    id: createOperationId(),
    status: CHAT_OPERATION_STATUS.FAILED,
    abortController: new AbortController(),
    createdAt: Date.now(),
    error: String(error?.message || error || "Unable to start the request"),
    retryOf: operation.id,
    cancelStarted: false,
    settled: false,
    promise: null,
    resolve: null,
    reject: null,
  });
}

/**
 * Synchronous admission authority for chat work. The coordinator owns the
 * AbortController before any asynchronous preparation begins, so Stop can
 * fence every lifecycle stage and stale completions cannot claim the slot.
 */
export class ChatOperationCoordinator {
  constructor() {
    this.slots = new Map();
    this.listeners = new Set();
    this.consumedDrafts = new Map();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    this.listeners.forEach((listener) => listener());
  }

  getSlot(chatId) {
    const key = String(chatId || "draft");
    if (!this.slots.has(key)) this.slots.set(key, createSlot());
    return this.slots.get(key);
  }

  snapshot(chatId) {
    const slot = this.getSlot(chatId);
    return {
      active: publicOperation(slot.active),
      queue: slot.queue.map(publicOperation),
      paused: slot.paused,
      lastStatus: slot.lastStatus,
      isBusy: Boolean(slot.active),
    };
  }

  admit(spec = {}, executor) {
    const chatId = String(spec.chatId || "draft");
    const draftRevision = spec.draftRevision == null
      ? null
      : String(spec.draftRevision);
    const consumedKey = draftRevision ? `${chatId}:${draftRevision}` : null;
    const consumed = consumedKey ? this.consumedDrafts.get(consumedKey) : null;
    if (consumed) {
      return { operation: publicOperation(consumed), duplicate: true, promise: consumed.promise };
    }

    const operation = {
      id: String(spec.id || createOperationId()),
      chatId,
      type: String(spec.type || "submit"),
      status: CHAT_OPERATION_STATUS.QUEUED,
      prompt: String(spec.prompt || ""),
      attachments: Array.isArray(spec.attachments) ? spec.attachments : [],
      runId: spec.runId || null,
      abortController: new AbortController(),
      checkpointMetadata: spec.checkpointMetadata || null,
      createdAt: spec.createdAt || Date.now(),
      executor,
      onCancel: spec.onCancel,
      retainOnFailure: spec.retainOnFailure === true,
      consumedKey,
      cancelStarted: false,
      settled: false,
      promise: null,
      resolve: null,
      reject: null,
    };
    attachOperationPromise(operation);

    if (consumedKey) {
      this.consumedDrafts.set(consumedKey, operation);
      if (this.consumedDrafts.size > 500) {
        this.consumedDrafts.delete(this.consumedDrafts.keys().next().value);
      }
    }

    const slot = this.getSlot(chatId);
    if (slot.active) {
      if (spec.interrupt === true) {
        slot.queue.unshift(operation);
        this.emit();
        void this.stop(chatId, { resumeOperationId: operation.id });
      } else {
        slot.queue.push(operation);
        this.emit();
      }
    } else {
      this.start(chatId, operation);
    }

    return { operation: publicOperation(operation), duplicate: false, promise: operation.promise };
  }

  start(chatId, operation) {
    const slot = this.getSlot(chatId);
    if (slot.active || !operation) return false;
    const queuedIndex = slot.queue.indexOf(operation);
    if (queuedIndex >= 0) slot.queue.splice(queuedIndex, 1);
    slot.active = operation;
    operation.status = operation.type === "restore"
      ? CHAT_OPERATION_STATUS.RESTORING
      : CHAT_OPERATION_STATUS.PREPARING;
    operation.error = null;
    slot.lastStatus = operation.status;
    this.emit();

    Promise.resolve()
      .then(() => operation.executor?.({
        operationId: operation.id,
        chatId: operation.chatId,
        signal: operation.abortController.signal,
        isOwner: () => this.getSlot(operation.chatId).active === operation,
        setRunId: (runId) => this.update(operation.chatId, operation.id, { runId }),
        update: (patch) => this.update(operation.chatId, operation.id, patch),
        rekey: (nextChatId) => this.rekey(operation.chatId, nextChatId),
      }))
      .then(
        (result) => this.settle(operation, null, result),
        (error) => this.settle(operation, error)
      );
    return true;
  }

  settle(operation, error, result) {
    if (operation.settled) return;
    operation.settled = true;
    this.releaseConsumed(operation);
    const slot = this.getSlot(operation.chatId);
    const ownsSlot = slot.active === operation;
    const wasStopping = operation.status === CHAT_OPERATION_STATUS.STOPPING;

    if (error) {
      if (!wasStopping) {
        operation.error = isAbortError(error) ? null : String(error?.message || error);
        operation.status = isAbortError(error)
          ? CHAT_OPERATION_STATUS.STOPPED
          : CHAT_OPERATION_STATUS.FAILED;
      }
      if (ownsSlot && !wasStopping && operation.status === CHAT_OPERATION_STATUS.FAILED) {
        slot.paused = true;
        if (operation.retainOnFailure) {
          slot.queue.unshift(createFailedRetry(operation, error));
        }
      }
      operation.reject(error);
    } else {
      operation.resolve(result);
    }

    // Stop owns the visible transition and will fence the slot after server
    // cancellation settles.
    if (!ownsSlot || wasStopping) return;

    slot.active = null;
    slot.lastStatus = error ? operation.status : null;
    this.emit();
    if (!error && !slot.paused) this.drain(operation.chatId);
  }

  update(chatId, operationId, patch = {}) {
    const slot = this.getSlot(chatId);
    const operation = slot.active?.id === operationId
      ? slot.active
      : slot.queue.find((entry) => entry.id === operationId);
    if (!operation) return false;
    if (patch.status) operation.status = patch.status;
    if (Object.prototype.hasOwnProperty.call(patch, "runId")) operation.runId = patch.runId;
    if (Object.prototype.hasOwnProperty.call(patch, "checkpointMetadata")) {
      operation.checkpointMetadata = patch.checkpointMetadata;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "error")) operation.error = patch.error;
    if (slot.active === operation) slot.lastStatus = operation.status;
    this.emit();
    return true;
  }

  async stop(chatId, options = {}) {
    const slot = this.getSlot(chatId);
    if (slot.stopPromise) return slot.stopPromise;
    const operation = slot.active;
    slot.paused = true;
    if (!operation) {
      slot.lastStatus = CHAT_OPERATION_STATUS.STOPPED;
      this.emit();
      return false;
    }

    operation.status = CHAT_OPERATION_STATUS.STOPPING;
    slot.lastStatus = CHAT_OPERATION_STATUS.STOPPING;
    operation.abortController.abort();
    this.emit();

    slot.stopPromise = Promise.resolve()
      .then(async () => {
        if (!operation.cancelStarted) {
          operation.cancelStarted = true;
          await operation.onCancel?.(publicOperation(operation));
        }
      })
      .finally(() => {
        // Fence first. Any late stream chunks or cleanup callbacks now fail
        // the ownership check even if the underlying transport lingers.
        if (slot.active === operation) slot.active = null;
        operation.status = CHAT_OPERATION_STATUS.STOPPED;
        this.releaseConsumed(operation);
        slot.lastStatus = CHAT_OPERATION_STATUS.STOPPED;
        slot.stopPromise = null;
        this.emit();

        const resumeId = options.resumeOperationId;
        if (resumeId) {
          const next = slot.queue.find((entry) => entry.id === resumeId);
          if (next) this.start(chatId, next);
        }
      });
    return slot.stopPromise;
  }

  drain(chatId) {
    const slot = this.getSlot(chatId);
    if (slot.active || slot.paused || !slot.queue.length) return false;
    return this.start(chatId, slot.queue[0]);
  }

  resume(chatId) {
    const slot = this.getSlot(chatId);
    slot.paused = false;
    slot.lastStatus = null;
    this.emit();
    return this.drain(chatId);
  }

  pause(chatId, status = null) {
    const slot = this.getSlot(chatId);
    slot.paused = true;
    if (status) slot.lastStatus = status;
    this.emit();
  }

  sendNext(chatId) {
    const slot = this.getSlot(chatId);
    if (slot.active || !slot.queue.length) return false;
    return this.start(chatId, slot.queue[0]);
  }

  removeQueued(chatId, operationId) {
    const slot = this.getSlot(chatId);
    const index = slot.queue.findIndex((entry) => entry.id === operationId);
    if (index < 0) return false;
    const [operation] = slot.queue.splice(index, 1);
    operation.status = CHAT_OPERATION_STATUS.STOPPED;
    this.releaseConsumed(operation);
    operation.resolve({ removed: true });
    this.emit();
    return true;
  }

  rekey(currentChatId, nextChatId) {
    const previousKey = String(currentChatId || "draft");
    const nextKey = String(nextChatId || previousKey);
    if (previousKey === nextKey) return nextKey;
    const previous = this.getSlot(previousKey);
    const next = this.getSlot(nextKey);
    const nextIsEmpty = !next.active
      && next.queue.length === 0
      && !next.stopPromise
      && next.lastStatus == null;
    if (nextIsEmpty) {
      [previous.active, ...previous.queue].filter(Boolean).forEach((operation) => {
        operation.chatId = nextKey;
      });
      this.slots.set(nextKey, previous);
      this.slots.delete(previousKey);
      this.emit();
      return nextKey;
    }
    if (previous.active && !next.active) next.active = previous.active;
    next.queue.push(...previous.queue);
    next.paused = previous.paused || next.paused;
    next.lastStatus = previous.lastStatus || next.lastStatus;
    next.stopPromise = next.stopPromise || previous.stopPromise;
    [next.active, ...next.queue].filter(Boolean).forEach((operation) => {
      operation.chatId = nextKey;
    });
    this.slots.delete(previousKey);
    this.emit();
    return nextKey;
  }

  hydrate(spec = {}) {
    const chatId = String(spec.chatId || "draft");
    const slot = this.getSlot(chatId);
    if (slot.active) return publicOperation(slot.active);
    const operation = {
      id: String(spec.id || `hydrated:${spec.runId || createOperationId()}`),
      chatId,
      type: String(spec.type || "submit"),
      status: spec.status || CHAT_OPERATION_STATUS.RUNNING,
      prompt: String(spec.prompt || ""),
      attachments: [],
      runId: spec.runId || null,
      abortController: new AbortController(),
      checkpointMetadata: spec.checkpointMetadata || null,
      createdAt: spec.createdAt || Date.now(),
      onCancel: spec.onCancel,
      hydrated: true,
      cancelStarted: false,
      settled: false,
      promise: Promise.resolve(),
    };
    slot.active = operation;
    slot.lastStatus = operation.status;
    this.emit();
    return publicOperation(operation);
  }

  reconcile(chatId, { runId, status } = {}) {
    const slot = this.getSlot(chatId);
    const operation = slot.active;
    if (!operation?.hydrated || (runId && operation.runId !== runId)) return false;

    const normalized = String(status || "").toLowerCase();
    const succeeded = normalized === "succeeded" || normalized === "completed";
    const cancelled = normalized === "cancelled" || normalized === "canceled";
    const failed = [
      "failed",
      "blocked",
      "iteration_limit",
      "timed_out",
    ].includes(normalized);
    if (!succeeded && !cancelled && !failed) return false;

    slot.active = null;
    operation.settled = true;
    operation.status = succeeded
      ? CHAT_OPERATION_STATUS.STOPPED
      : (cancelled ? CHAT_OPERATION_STATUS.STOPPED : CHAT_OPERATION_STATUS.FAILED);
    slot.paused = !succeeded;
    slot.lastStatus = succeeded ? null : operation.status;
    this.emit();
    if (succeeded) this.drain(chatId);
    return true;
  }

  releaseConsumed(operation) {
    const consumedKey = operation?.consumedKey;
    if (consumedKey && this.consumedDrafts.get(consumedKey) === operation) {
      this.consumedDrafts.delete(consumedKey);
    }
  }
}

export default ChatOperationCoordinator;
