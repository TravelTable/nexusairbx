import { AI_EVENTS } from "./aiEvents";

const STREAM_METRIC_EVENT = AI_EVENTS.STREAM_METRIC;

export function emitStreamMetric(type, payload = {}) {
  const metric = {
    type,
    ts: Date.now(),
    ...payload,
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STREAM_METRIC_EVENT, { detail: metric }));
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[stream-metric]", metric);
  }
}

export { STREAM_METRIC_EVENT };
