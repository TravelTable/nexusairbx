export const AI_EVENTS = Object.freeze({
  START_DRAFT: "nexus:startDraft",
  OPEN_CODE_DRAWER: "nexus:openCodeDrawer",
  SAVE_SCRIPT: "nexus:saveScript",
  APPLY_CODE_PATCH: "nexus:applyCodePatch",
  UI_GENERATED: "nexus:uiGenerated",
  OPEN_CHAT: "nexus:openChat",
  STREAM_METRIC: "nexus:streamMetric",
});

export function emitAiEvent(eventName, detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function onAiEvent(eventName, handler) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
}
