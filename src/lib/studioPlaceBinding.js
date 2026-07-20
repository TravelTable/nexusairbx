/**
 * Chat-level Studio place binding helpers.
 * Canonical chat field: studioTargetPreference { targetId, placeId, label, updatedAt }.
 */

export function normalizeStudioTargetOption(option = {}) {
  const id = String(option.id || option.targetId || option.studioTargetId || "").trim();
  const placeId = String(option.placeId || option.targetPlaceId || "").trim() || null;
  const label = String(
    option.label || option.displayName || option.placeName || option.name || "Untitled Studio project"
  ).trim();
  if (!id) return null;
  return { id, placeId, label };
}

export function targetingOptionsFromStatus(statusOrSnapshot = {}) {
  const targeting = statusOrSnapshot.targeting || {};
  const fromTargeting = Array.isArray(targeting.targets)
    ? targeting.targets.map(normalizeStudioTargetOption).filter(Boolean)
    : [];
  if (fromTargeting.length) return fromTargeting;

  // Fallback: synthesize options from live sessions when targeting is absent.
  const sessions = Array.isArray(statusOrSnapshot.sessions) ? statusOrSnapshot.sessions : [];
  const byPlace = new Map();
  for (const session of sessions) {
    if (session?.live === false) continue;
    const placeId = String(session?.studio?.placeId || session?.placeId || "").trim();
    if (!placeId || placeId === "0") continue;
    if (byPlace.has(placeId)) continue;
    const label = String(
      session?.studio?.placeName || session?.placeName || `Place ${placeId}`
    ).trim();
    byPlace.set(placeId, {
      id: `place:${placeId}`,
      placeId,
      label,
    });
  }
  return [...byPlace.values()];
}

export function readChatStudioPreference(chatMeta = null) {
  const preference = chatMeta?.studioTargetPreference;
  if (!preference || typeof preference !== "object") return null;
  const targetId = String(preference.targetId || "").trim();
  const placeId = String(preference.placeId || "").trim() || null;
  const label = String(preference.label || "").trim() || "Untitled Studio project";
  if (!targetId && !placeId) return null;
  return { targetId: targetId || null, placeId, label };
}

export function buildStudioTargetPreference(option = {}) {
  const normalized = normalizeStudioTargetOption(option);
  if (!normalized) return null;
  return {
    targetId: normalized.id,
    placeId: normalized.placeId,
    label: normalized.label,
  };
}

/**
 * @returns {{ status: 'ready'|'needs_connect'|'needs_selection'|'auto_bind', target?: object, options: object[] }}
 */
export function evaluateStudioPlaceGate({
  studioEnabled = false,
  connected = false,
  preference = null,
  options = [],
} = {}) {
  const liveOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  if (!studioEnabled) {
    return { status: "ready", options: liveOptions };
  }
  if (!connected || liveOptions.length === 0) {
    return { status: "needs_connect", options: liveOptions };
  }

  const pref = preference && typeof preference === "object" ? preference : null;
  const prefTargetId = String(pref?.targetId || "").trim();
  const prefPlaceId = String(pref?.placeId || "").trim();
  const matched = liveOptions.find((option) => (
    (prefTargetId && option.id === prefTargetId) ||
    (prefPlaceId && option.placeId && option.placeId === prefPlaceId)
  ));
  if (matched) {
    return { status: "ready", target: matched, options: liveOptions };
  }
  if (liveOptions.length === 1) {
    return { status: "auto_bind", target: liveOptions[0], options: liveOptions };
  }
  return { status: "needs_selection", options: liveOptions };
}
