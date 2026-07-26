export const REWIND_MODES = Object.freeze({
  REPLACE: "replace",
  AFTER: "after",
});

export function messageCreatedAtMillis(message) {
  const value = message?.createdAt;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (Number.isFinite(value?.seconds)) {
    return (value.seconds * 1000) + Math.floor(Number(value.nanoseconds || 0) / 1_000_000);
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return Number.MAX_SAFE_INTEGER;
}

export function sortMessagesByCreatedAt(messages = []) {
  return [...messages].sort((a, b) => (
    messageCreatedAtMillis(a) - messageCreatedAtMillis(b)
  ));
}

export function mergeMessagesById(...messageSets) {
  const byId = new Map();
  messageSets.flat().forEach((message) => {
    if (message?.id) byId.set(message.id, message);
  });
  return sortMessagesByCreatedAt(Array.from(byId.values()));
}

/**
 * Partition an ordered transcript at a pivot message.
 * - replace: drop the pivot and everything after it
 * - after: keep the pivot, drop everything after it
 */
export function selectMessagesToRemove(orderedMessages, pivotId, mode = REWIND_MODES.AFTER) {
  const messages = Array.isArray(orderedMessages) ? orderedMessages : [];
  const normalizedMode = mode === REWIND_MODES.REPLACE
    ? REWIND_MODES.REPLACE
    : REWIND_MODES.AFTER;
  const pivotIndex = messages.findIndex((message) => message?.id === pivotId);
  if (pivotIndex < 0) {
    return {
      kept: messages,
      removed: [],
      pivotIndex: -1,
      pivot: null,
    };
  }
  if (normalizedMode === REWIND_MODES.REPLACE) {
    return {
      kept: messages.slice(0, pivotIndex),
      removed: messages.slice(pivotIndex),
      pivotIndex,
      pivot: messages[pivotIndex],
    };
  }
  return {
    kept: messages.slice(0, pivotIndex + 1),
    removed: messages.slice(pivotIndex + 1),
    pivotIndex,
    pivot: messages[pivotIndex],
  };
}

export function normalizeRewindMode(mode) {
  return mode === REWIND_MODES.REPLACE ? REWIND_MODES.REPLACE : REWIND_MODES.AFTER;
}

/** Edit (replace user) writes a new user turn; retry/assistant regenerate do not. */
export function shouldWriteUserMessageAfterRewind(mode, pivotRole) {
  return normalizeRewindMode(mode) === REWIND_MODES.REPLACE
    && String(pivotRole || "").toLowerCase() === "user";
}
