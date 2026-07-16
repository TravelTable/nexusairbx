const DEFAULT_INTERVAL_MS = 7_500;
const MIN_INTERVAL_MS = 5_000;
const MAX_INTERVAL_MS = 10_000;
const LOCK_LEASE_MS = 15_000;

function clampInterval(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_INTERVAL_MS;
  return Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, parsed));
}

export const CHAT_PROGRESS_PERSIST_INTERVAL_MS = clampInterval(
  process.env.REACT_APP_CHAT_PROGRESS_PERSIST_INTERVAL_MS
);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result, key) => {
    if (value[key] !== undefined) result[key] = stableValue(value[key]);
    return result;
  }, {});
}

function signatureFor(value) {
  const input = JSON.stringify(stableValue(value));
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function defaultStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch (_) {
    return null;
  }
}

function defaultLocks() {
  try {
    return typeof navigator !== "undefined" ? navigator.locks : null;
  } catch (_) {
    return null;
  }
}

async function withStorageLock({ storage, lockKey, now, action }) {
  if (!storage) return { acquired: true, result: await action() };
  const owner = `${now()}-${Math.random().toString(36).slice(2)}`;
  try {
    const existing = JSON.parse(storage.getItem(lockKey) || "null");
    if (existing?.expiresAt > now() && existing.owner !== owner) return { acquired: false };
    storage.setItem(lockKey, JSON.stringify({ owner, expiresAt: now() + LOCK_LEASE_MS }));
    const claimed = JSON.parse(storage.getItem(lockKey) || "null");
    if (claimed?.owner !== owner) return { acquired: false };
    try {
      return { acquired: true, result: await action() };
    } finally {
      const current = JSON.parse(storage.getItem(lockKey) || "null");
      if (current?.owner === owner) storage.removeItem(lockKey);
    }
  } catch (_) {
    return { acquired: true, result: await action() };
  }
}

export function createChatProgressPersistence({
  key,
  persist,
  intervalMs = CHAT_PROGRESS_PERSIST_INTERVAL_MS,
  storage = defaultStorage(),
  locks = defaultLocks(),
  now = () => Date.now(),
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = (timer) => clearTimeout(timer),
  onError = () => {},
} = {}) {
  if (!key || typeof persist !== "function") {
    throw new Error("Chat progress persistence requires a key and persist callback");
  }

  const safeInterval = clampInterval(intervalMs);
  const keyHash = signatureFor(key);
  const stateKey = `nexusrbx:chat-progress:value:${keyHash}`;
  const lockKey = `nexusrbx:chat-progress:lock:${keyHash}`;
  const lockName = `nexusrbx-chat-progress-${keyHash}`;
  let pending = null;
  let timer = null;
  let disposed = false;
  let lastPersistedAt = now();

  const schedule = (delay = Math.max(0, safeInterval - (now() - lastPersistedAt))) => {
    if (disposed || timer || !pending) return;
    timer = setTimer(() => {
      timer = null;
      flush().catch(onError);
    }, delay);
  };

  const runLocked = async (action) => {
    if (locks?.request) {
      const result = await locks.request(lockName, { mode: "exclusive" }, action);
      return { acquired: true, result };
    }
    return withStorageLock({ storage, lockKey, now, action });
  };

  const flush = async ({ force = false } = {}) => {
    if (disposed || !pending) return false;
    const elapsed = now() - lastPersistedAt;
    if (!force && elapsed < safeInterval) {
      schedule(safeInterval - elapsed);
      return false;
    }

    const payload = pending;
    pending = null;
    const signature = signatureFor(payload);
    const locked = await runLocked(async () => {
      try {
        const previous = JSON.parse(storage?.getItem(stateKey) || "null");
        if (previous?.signature === signature) return false;
      } catch (_) {
        // Persistence still proceeds if cross-tab state is unavailable.
      }
      await persist(payload);
      try {
        storage?.setItem(stateKey, JSON.stringify({ signature, persistedAt: now() }));
      } catch (_) {
        // A successful Firestore write must not be treated as failed due to storage.
      }
      return true;
    });

    if (!locked.acquired) {
      pending = { ...payload, ...(pending || {}) };
      schedule(250);
      return false;
    }
    if (locked.result) lastPersistedAt = now();
    if (pending) schedule();
    return Boolean(locked.result);
  };

  const queue = (progress) => {
    if (disposed || !progress || typeof progress !== "object") return;
    pending = { ...(pending || {}), ...progress };
    schedule();
  };

  const cancel = () => {
    disposed = true;
    pending = null;
    if (timer) clearTimer(timer);
    timer = null;
  };

  return { cancel, flush, queue };
}

