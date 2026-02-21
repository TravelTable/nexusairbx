import { useCallback, useMemo, useState } from "react";

const MAX_QUEUE = 5;
const DEDUPE_WINDOW_MS = 2500;

function normalizeIncoming(incoming = {}, now = Date.now()) {
  return {
    id: incoming.id || `${now}_${Math.random().toString(36).slice(2, 8)}`,
    message: String(incoming.message || "").trim(),
    type: incoming.type || "info",
    duration: incoming.duration || 4000,
    cta: incoming.cta,
    secondary: incoming.secondary,
    createdAt: now,
    count: 1,
  };
}

export function enqueueToast(queue, incoming, now = Date.now()) {
  const next = normalizeIncoming(incoming, now);
  if (!next.message) return queue;

  const duplicateIndex = queue.findIndex((item) => {
    if (item.type !== next.type) return false;
    if (item.message !== next.message) return false;
    return now - item.createdAt < DEDUPE_WINDOW_MS;
  });

  if (duplicateIndex >= 0) {
    return queue.map((item, idx) =>
      idx === duplicateIndex
        ? {
            ...item,
            createdAt: now,
            count: Number(item.count || 1) + 1,
          }
        : item
    );
  }

  const merged = [...queue, next];
  if (merged.length <= MAX_QUEUE) return merged;
  return merged.slice(merged.length - MAX_QUEUE);
}

export function useAiNotifications() {
  const [queue, setQueue] = useState([]);

  const notify = useCallback((incoming) => {
    setQueue((prev) => enqueueToast(prev, incoming, Date.now()));
  }, []);

  const dismissToast = useCallback((id) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setQueue([]);
  }, []);

  const currentToast = useMemo(() => queue[0] || null, [queue]);

  return {
    notify,
    toasts: queue,
    currentToast,
    dismissToast,
    clearAllToasts,
  };
}

export default useAiNotifications;
