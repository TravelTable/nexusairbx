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
    option.experienceName ||
    option.placeName ||
    option.gameName ||
    option.name ||
    "Untitled Studio project"
  ).trim();
  if (!id) return null;
  return {
    id,
    studioTargetId: String(option.studioTargetId || id).trim(),
    placeId: placeId === "" ? null : placeId,
    label,
    experienceName: String(option.experienceName || "").trim() || null,
    placeName: String(option.placeName || "").trim() || null,
    universeId: option.universeId == null || option.universeId === ""
      ? null
      : String(option.universeId).trim(),
    isUntitled: option.isUntitled === true || placeId === "0" || !placeId,
    pluginSessionId: option.pluginSessionId || null,
    source: option.source || null,
    connectionType: option.connectionType || null,
  };
}

/**
 * Resolve a user-facing game title from a Studio target and optional OAuth fallback.
 * Preference: experienceName → placeName → label → oauth title → "Untitled game".
 */
export function resolveGameTitleFromTarget(option = {}, oauthFallback = null) {
  const candidates = [
    option?.experienceName,
    option?.placeName,
    option?.gameName,
    option?.label,
    option?.displayName,
    option?.name,
    oauthFallback?.title,
    oauthFallback?.universeName,
    oauthFallback?.experienceName,
    oauthFallback?.placeName,
  ];
  for (const value of candidates) {
    const title = String(value || "").trim();
    if (title && !/^untitled(\s+(studio\s+)?(project|game|experience))?$/i.test(title)) {
      return title.slice(0, 120);
    }
    if (title) return title.slice(0, 120);
  }
  return "Untitled game";
}

/**
 * Build a durable project-binding create/upsert payload from a resolved game identity.
 */
export function buildProjectBindingPayloadFromIdentity(identity = {}) {
  const title = String(identity.title || "").trim() || "Untitled game";
  const placeId = identity.placeId == null || identity.placeId === ""
    ? null
    : String(identity.placeId).trim();
  const universeId = identity.universeId == null || identity.universeId === ""
    ? null
    : String(identity.universeId).trim();
  const studioTargetId = String(identity.studioTargetId || identity.targetId || "").trim() || null;
  const studioTargetLabel = String(
    identity.studioTargetLabel || identity.label || title
  ).trim() || title;
  return {
    title,
    ...(placeId && placeId !== "0" ? { defaultPlaceId: placeId, placeId } : {}),
    ...(universeId ? { universeId } : {}),
    ...(studioTargetId ? { studioTargetId } : {}),
    studioTargetLabel,
  };
}

export function findProjectByPlaceId(projects = [], placeId) {
  const wanted = String(placeId || "").trim();
  if (!wanted || wanted === "0") return null;
  const list = Array.isArray(projects) ? projects : [];
  return list.find((project) => {
    const projectPlace = String(
      project?.placeId || project?.defaultPlaceId || ""
    ).trim();
    return projectPlace === wanted;
  }) || null;
}

/**
 * Resolve which game the user should work on from live Studio status.
 *
 * @returns {{
 *   status: 'ready'|'needs_selection'|'needs_connect'|'oauth'|'draft',
 *   title: string,
 *   placeId: string|null,
 *   universeId: string|null,
 *   studioTargetId: string|null,
 *   studioTargetLabel: string|null,
 *   source: 'studio'|'oauth'|'draft',
 *   target?: object,
 *   options: object[],
 * }}
 */
export function resolveGameIdentityFromStudioStatus(statusOrSnapshot = {}, {
  selectedTargetId = null,
  selectedPlaceId = null,
  oauthFallback = null,
} = {}) {
  const options = targetingOptionsFromStatus(statusOrSnapshot).map((option) => {
    // Prefer richer names from live sessions when targeting only has a generic label.
    const sessions = Array.isArray(statusOrSnapshot?.sessions) ? statusOrSnapshot.sessions : [];
    const match = sessions.find((session) => {
      const opaqueId = String(session?.studioTargetId || session?.targetingTargetId || "").trim();
      const sessionPlace = String(session?.studio?.placeId || session?.placeId || "").trim();
      return (opaqueId && (opaqueId === option.id || opaqueId === option.studioTargetId))
        || (sessionPlace && option.placeId && sessionPlace === option.placeId);
    });
    const experienceName = String(
      match?.studio?.experienceName
      || match?.experienceName
      || option.experienceName
      || ""
    ).trim() || null;
    const placeName = String(
      match?.studio?.placeName
      || match?.placeName
      || option.placeName
      || ""
    ).trim() || null;
    const universeId = option.universeId
      || (match?.studio?.universeId != null ? String(match.studio.universeId).trim() : null)
      || (match?.universeId != null ? String(match.universeId).trim() : null)
      || null;
    const title = resolveGameTitleFromTarget({
      ...option,
      experienceName,
      placeName,
    });
    return {
      ...option,
      experienceName,
      placeName,
      universeId,
      label: title,
    };
  });

  const prefTargetId = String(selectedTargetId || "").trim();
  const prefPlaceId = String(selectedPlaceId || "").trim();
  // An opaque target id is authoritative when present. Falling back to a
  // matching place id after that target disappeared can silently move a write
  // to another Studio session that happens to have the same place open.
  const matched = options.find((option) => prefTargetId
    ? option.id === prefTargetId || option.studioTargetId === prefTargetId
    : prefPlaceId && option.placeId && option.placeId === prefPlaceId
  ) || null;

  if (matched) {
    const title = resolveGameTitleFromTarget(matched, oauthFallback);
    return {
      status: "ready",
      title,
      placeId: matched.placeId && matched.placeId !== "0" ? matched.placeId : null,
      universeId: matched.universeId || oauthFallback?.universeId || null,
      studioTargetId: matched.studioTargetId || matched.id,
      studioTargetLabel: matched.label || title,
      source: "studio",
      target: matched,
      options,
    };
  }

  if (options.length > 0) {
    return {
      status: "needs_selection",
      title: "Untitled game",
      placeId: null,
      universeId: oauthFallback?.universeId || null,
      studioTargetId: null,
      studioTargetLabel: null,
      source: "draft",
      options,
    };
  }

  const oauthTitle = resolveGameTitleFromTarget({}, oauthFallback);
  if (oauthFallback && (oauthFallback.title || oauthFallback.universeName || oauthFallback.placeId || oauthFallback.universeId)) {
    return {
      status: "oauth",
      title: oauthTitle,
      placeId: oauthFallback.placeId ? String(oauthFallback.placeId).trim() : null,
      universeId: oauthFallback.universeId ? String(oauthFallback.universeId).trim() : null,
      studioTargetId: null,
      studioTargetLabel: oauthTitle,
      source: "oauth",
      options: [],
    };
  }

  return {
    status: "needs_connect",
    title: "Untitled game",
    placeId: null,
    universeId: null,
    studioTargetId: null,
    studioTargetLabel: null,
    source: "draft",
    options: [],
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
    const experienceName = String(
      session?.studio?.experienceName || session?.experienceName || ""
    ).trim();
    const placeName = String(
      session?.studio?.placeName || session?.placeName || ""
    ).trim();
    options.push(normalizeStudioTargetOption({
      id: opaqueId,
      studioTargetId: opaqueId,
      placeId: placeId || "0",
      experienceName: experienceName || null,
      placeName: placeName || null,
      universeId: session?.studio?.universeId ?? session?.universeId ?? null,
      label: experienceName || placeName || "Untitled Studio project",
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
 * A live target is never inferred from the number of options. The user must
 * explicitly bind a target before Studio writes are enabled.
 *
 * @returns {{ status: 'ready'|'needs_connect'|'needs_selection'|'needs_plugin', target?: object, options: object[] }}
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
  const matched = liveOptions.find((option) => prefTargetId
    ? option.id === prefTargetId || option.studioTargetId === prefTargetId
    : prefPlaceId && option.placeId && option.placeId === prefPlaceId
  );
  if (matched) {
    return { status: "ready", target: matched, options: liveOptions };
  }
  return { status: "needs_selection", options: liveOptions };
}
