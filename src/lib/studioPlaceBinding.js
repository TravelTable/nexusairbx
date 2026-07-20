/**
 * Chat-level Studio place binding helpers.
 * Canonical chat field: studioTargetPreference { targetId, placeId, label, updatedAt }.
 * Target IDs are opaque backend-emitted studio_target_* values — never invent session: IDs here.
 */

export function normalizeStudioTargetOption(option = {}) {
  const id = String(
    option.id || option.studioTargetId || option.targetId || ""
  ).trim();
  const placeIdRaw = option.placeId ?? option.targetPlaceId;
  const placeId = placeIdRaw == null || placeIdRaw === ""
    ? null
    : String(placeIdRaw).trim();
  const label = String(
    option.label ||
    option.displayName ||
    option.placeName ||
    option.name ||
    "Untitled Studio project"
  ).trim();
  if (!id) return null;
  return {
    id,
    studioTargetId: String(option.studioTargetId || id).trim(),
    placeId: placeId === "" ? null : placeId,
    label,
    isUntitled: option.isUntitled === true || placeId === "0" || !placeId,
    pluginSessionId: option.pluginSessionId || null,
    source: option.source || null,
    connectionType: option.connectionType || null,
  };
}

export function targetingOptionsFromStatus(statusOrSnapshot = {}) {
  const targeting = statusOrSnapshot.targeting || {};
  const fromTargeting = Array.isArray(targeting.targets)
    ? targeting.targets.map(normalizeStudioTargetOption).filter(Boolean)
    : [];
  if (fromTargeting.length) return fromTargeting;

  // Fallback only when targeting payload is absent. Prefer opaque IDs from sessions
  // when present; never synthesize place: keys that diverge from backend IDs.
  const sessions = Array.isArray(statusOrSnapshot.sessions) ? statusOrSnapshot.sessions : [];
  const options = [];
  const seen = new Set();
  for (const session of sessions) {
    if (session?.live === false) continue;
    const opaqueId = String(session?.studioTargetId || session?.targetingTargetId || "").trim();
    if (!opaqueId || seen.has(opaqueId)) continue;
    seen.add(opaqueId);
    const placeId = String(session?.studio?.placeId || session?.placeId || "").trim();
    options.push(normalizeStudioTargetOption({
      id: opaqueId,
      studioTargetId: opaqueId,
      placeId: placeId || "0",
      label: session?.studio?.placeName || session?.placeName || "Untitled Studio project",
      isUntitled: !placeId || placeId === "0",
      pluginSessionId: session?.connectionType === "plugin_bridge" ? session.id : null,
      connectionType: session?.connectionType || null,
      source: session?.connectionType === "plugin_bridge" ? "plugin" : "mcp",
    }));
  }
  return options.filter(Boolean);
}

export function readChatStudioPreference(chatMeta = null) {
  const preference = chatMeta?.studioTargetPreference;
  if (!preference || typeof preference !== "object") return null;
  const targetId = String(preference.targetId || preference.studioTargetId || "").trim();
  const placeIdRaw = preference.placeId;
  const placeId = placeIdRaw == null || placeIdRaw === ""
    ? null
    : String(placeIdRaw).trim();
  const label = String(preference.label || "").trim() || "Untitled Studio project";
  if (!targetId && !placeId) return null;
  return { targetId: targetId || null, placeId, label };
}

export function buildStudioTargetPreference(option = {}) {
  const normalized = normalizeStudioTargetOption(option);
  if (!normalized) return null;
  return {
    targetId: normalized.studioTargetId || normalized.id,
    placeId: normalized.placeId,
    label: normalized.label,
  };
}

/**
 * @returns {{ status: 'ready'|'needs_connect'|'needs_selection'|'auto_bind'|'needs_plugin', target?: object, options: object[] }}
 */
export function evaluateStudioPlaceGate({
  studioEnabled = false,
  connected = false,
  pluginConnected = null,
  requirePlugin = false,
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
  if (requirePlugin && pluginConnected === false) {
    return { status: "needs_plugin", options: liveOptions };
  }

  const pref = preference && typeof preference === "object" ? preference : null;
  const prefTargetId = String(pref?.targetId || pref?.studioTargetId || "").trim();
  const prefPlaceId = String(pref?.placeId || "").trim();
  const matched = liveOptions.find((option) => (
    (prefTargetId && (option.id === prefTargetId || option.studioTargetId === prefTargetId)) ||
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
