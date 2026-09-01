/**
 * Chat-level Studio place binding helpers.
 * Canonical chat field: studioTargetPreference { targetId, placeId, label, updatedAt }.
 * Target IDs are opaque backend-emitted studio_target_* values — never invent session: IDs here.
 */
import { normalizeRobloxPlaceId } from "./robloxPlaceId";
import {
  buildStudioCapabilityRegistry,
  getStudioConnectionType,
  getStudioSessionId,
  isStudioSessionLive,
  STUDIO_CONNECTION_TYPES,
} from "./studioConnection";

function cleanOptional(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export function normalizeStudioTargetOption(option = {}) {
  const id = String(
    option.id || option.studioTargetId || option.targetId || ""
  ).trim();
  const placeIdRaw = option.placeId ?? option.targetPlaceId;
  const placeId = normalizeRobloxPlaceId(placeIdRaw);
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
    placeId,
    label,
    experienceName: String(option.experienceName || "").trim() || null,
    placeName: String(option.placeName || "").trim() || null,
    universeId: option.universeId == null || option.universeId === ""
      ? null
      : String(option.universeId).trim(),
    isUntitled: option.isUntitled === true || !placeId,
    pluginSessionId: option.pluginSessionId || null,
    ...(cleanOptional(option.mcpSessionId) ? { mcpSessionId: cleanOptional(option.mcpSessionId) } : {}),
    ...(cleanOptional(option.placeSignature || option.targetSignature || option.studio?.placeSignature)
      ? { placeSignature: cleanOptional(
          option.placeSignature || option.targetSignature || option.studio?.placeSignature
        ) }
      : {}),
    ...(cleanOptional(option.capabilitySnapshotId)
      ? { capabilitySnapshotId: cleanOptional(option.capabilitySnapshotId) }
      : {}),
    ...(option.observedAt != null ? { observedAt: option.observedAt } : {}),
    ...(option.capabilityRegistry && typeof option.capabilityRegistry === "object"
      ? { capabilityRegistry: option.capabilityRegistry }
      : {}),
    source: option.source || null,
    connectionType: option.connectionType || null,
  };
}

export function canBindStudioTargetToProject(option = {}) {
  const targetId = cleanOptional(option?.id || option?.studioTargetId || option?.targetId);
  const placeId = normalizeRobloxPlaceId(option?.placeId ?? option?.targetPlaceId);
  const universeId = cleanOptional(option?.universeId);
  return Boolean(targetId || (placeId && universeId));
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
  const placeId = normalizeRobloxPlaceId(identity.placeId);
  const universeId = identity.universeId == null || identity.universeId === ""
    ? null
    : String(identity.universeId).trim();
  const studioTargetId = String(identity.studioTargetId || identity.targetId || "").trim() || null;
  const studioTargetLabel = String(
    identity.studioTargetLabel || identity.label || title
  ).trim() || title;
  return {
    title,
    ...(placeId ? { defaultPlaceId: placeId, placeId } : {}),
    ...(universeId ? { universeId } : {}),
    ...(studioTargetId ? { studioTargetId } : {}),
    studioTargetLabel,
  };
}

export function findProjectByPlaceId(projects = [], placeId) {
  const wanted = normalizeRobloxPlaceId(placeId);
  if (!wanted) return null;
  const list = Array.isArray(projects) ? projects : [];
  return list.find((project) => {
    const projectPlace = String(
      project?.placeId || project?.defaultPlaceId || ""
    ).trim();
    return projectPlace === wanted;
  }) || null;
}

export function findProjectByStudioTargetId(projects = [], studioTargetId) {
  const wanted = String(studioTargetId || "").trim();
  if (!wanted) return null;
  const list = Array.isArray(projects) ? projects : [];
  return list.find((project) => (
    String(project?.studioTargetId || "").trim() === wanted
  )) || null;
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
      const sessionPlace = normalizeRobloxPlaceId(
        session?.studio?.placeId ?? session?.placeId
      );
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
  const prefPlaceId = normalizeRobloxPlaceId(selectedPlaceId);
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
      placeId: normalizeRobloxPlaceId(matched.placeId),
      universeId: matched.universeId || oauthFallback?.universeId || null,
      studioTargetId: matched.studioTargetId || matched.id,
      studioTargetLabel: matched.label || title,
      source: "studio",
      target: matched,
      options,
    };
  }

  const authoritativePluginTarget = options.length === 1 && (
    options[0].connectionType === STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE
    || options[0].source === "plugin"
    || Boolean(options[0].pluginSessionId)
  ) ? options[0] : null;
  if (authoritativePluginTarget) {
    const title = resolveGameTitleFromTarget(authoritativePluginTarget, oauthFallback);
    return {
      status: "ready",
      title,
      placeId: normalizeRobloxPlaceId(authoritativePluginTarget.placeId),
      universeId: authoritativePluginTarget.universeId || oauthFallback?.universeId || null,
      studioTargetId: authoritativePluginTarget.studioTargetId || authoritativePluginTarget.id,
      studioTargetLabel: authoritativePluginTarget.label || title,
      source: "studio",
      target: authoritativePluginTarget,
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
      placeId: normalizeRobloxPlaceId(oauthFallback.placeId),
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
  const sessions = Array.isArray(statusOrSnapshot.sessions) ? statusOrSnapshot.sessions : [];
  const fromTargeting = Array.isArray(targeting.targets)
    ? targeting.targets.map((rawTarget) => {
        const target = normalizeStudioTargetOption(rawTarget);
        if (!target) return null;
        const matchedSessions = sessions.filter((session) => {
          if (!isStudioSessionLive(session)) return false;
          const sessionTargetId = cleanOptional(
            session?.studioTargetId || session?.targetingTargetId || session?.studio?.targetId
          );
          if (sessionTargetId) return sessionTargetId === target.studioTargetId;
          const explicitSessionId = getStudioConnectionType(session) === STUDIO_CONNECTION_TYPES.MCP_LOCAL
            ? target.mcpSessionId
            : target.pluginSessionId;
          if (explicitSessionId) return getStudioSessionId(session) === explicitSessionId;
          const sessionPlaceId = normalizeRobloxPlaceId(session?.studio?.placeId ?? session?.placeId);
          return Boolean(target.placeId && sessionPlaceId === target.placeId);
        });
        const pluginSession = matchedSessions.find(
          (session) => getStudioConnectionType(session) === STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE
        );
        const mcpSession = matchedSessions.find(
          (session) => getStudioConnectionType(session) === STUDIO_CONNECTION_TYPES.MCP_LOCAL
        );
        const enriched = normalizeStudioTargetOption({
          ...target,
          pluginSessionId: target.pluginSessionId || getStudioSessionId(pluginSession),
          mcpSessionId: target.mcpSessionId || getStudioSessionId(mcpSession),
          placeSignature: target.placeSignature || cleanOptional(
            mcpSession?.placeSignature
            || mcpSession?.studio?.placeSignature
            || pluginSession?.placeSignature
            || pluginSession?.studio?.placeSignature
          ),
          observedAt: Math.max(
            Number(target.observedAt || 0),
            ...matchedSessions.map((session) => Number(session?.lastSeenAt || session?.observedAt || 0))
          ) || null,
        });
        return matchedSessions.length
          ? {
              ...enriched,
              capabilityRegistry: buildStudioCapabilityRegistry({ sessions, target: enriched }),
            }
          : enriched;
      }).filter(Boolean)
    : [];
  if (fromTargeting.length) return fromTargeting;

  // Fallback only when targeting payload is absent. Prefer opaque IDs from sessions
  // when present; never synthesize place: keys that diverge from backend IDs.
  const options = [];
  const seen = new Set();
  for (const session of sessions) {
    if (session?.live === false) continue;
    const opaqueId = String(session?.studioTargetId || session?.targetingTargetId || "").trim();
    if (!opaqueId || seen.has(opaqueId)) continue;
    seen.add(opaqueId);
    const rawPlaceId = session?.studio?.placeId ?? session?.placeId;
    const placeId = normalizeRobloxPlaceId(rawPlaceId);
    const experienceName = String(
      session?.studio?.experienceName || session?.experienceName || ""
    ).trim();
    const placeName = String(
      session?.studio?.placeName || session?.placeName || ""
    ).trim();
    options.push(normalizeStudioTargetOption({
      id: opaqueId,
      studioTargetId: opaqueId,
      placeId,
      experienceName: experienceName || null,
      placeName: placeName || null,
      universeId: session?.studio?.universeId ?? session?.universeId ?? null,
      label: experienceName || placeName || "Untitled Studio project",
      isUntitled: !placeId,
      pluginSessionId: session?.connectionType === "plugin_bridge" ? session.id : null,
      mcpSessionId: session?.connectionType === "mcp_local" ? session.id : null,
      placeSignature: session?.placeSignature || session?.studio?.placeSignature || null,
      observedAt: session?.lastSeenAt || null,
      connectionType: session?.connectionType || null,
      source: session?.connectionType === "plugin_bridge" ? "plugin" : "mcp",
    }));
  }
  return options.filter(Boolean).map((option) => ({
    ...option,
    capabilityRegistry: buildStudioCapabilityRegistry({ sessions, target: option }),
  }));
}

export function readChatStudioPreference(chatMeta = null) {
  const preference = chatMeta?.studioTargetPreference;
  if (!preference || typeof preference !== "object") return null;
  const targetId = String(preference.targetId || preference.studioTargetId || "").trim();
  const placeId = normalizeRobloxPlaceId(preference.placeId);
  const label = String(preference.label || "").trim() || "Untitled Studio project";
  if (!targetId && !placeId) return null;
  return {
    targetId: targetId || null,
    placeId,
    label,
    ...(cleanOptional(preference.universeId) ? { universeId: cleanOptional(preference.universeId) } : {}),
    ...(cleanOptional(preference.placeName) ? { placeName: cleanOptional(preference.placeName) } : {}),
    ...(cleanOptional(preference.pluginSessionId)
      ? { pluginSessionId: cleanOptional(preference.pluginSessionId) }
      : {}),
    ...(cleanOptional(preference.mcpSessionId) ? { mcpSessionId: cleanOptional(preference.mcpSessionId) } : {}),
    ...(cleanOptional(preference.placeSignature || preference.targetSignature)
      ? { placeSignature: cleanOptional(preference.placeSignature || preference.targetSignature) }
      : {}),
    ...(cleanOptional(preference.capabilitySnapshotId)
      ? { capabilitySnapshotId: cleanOptional(preference.capabilitySnapshotId) }
      : {}),
    ...(preference.observedAt != null ? { observedAt: preference.observedAt } : {}),
  };
}

export function buildStudioTargetPreference(option = {}) {
  const normalized = normalizeStudioTargetOption(option);
  if (!normalized) return null;
  return {
    targetId: normalized.studioTargetId || normalized.id,
    placeId: normalized.placeId,
    label: normalized.label,
    ...(normalized.universeId ? { universeId: normalized.universeId } : {}),
    ...(normalized.placeName ? { placeName: normalized.placeName } : {}),
    ...(normalized.pluginSessionId ? { pluginSessionId: normalized.pluginSessionId } : {}),
    ...(normalized.mcpSessionId ? { mcpSessionId: normalized.mcpSessionId } : {}),
    ...(normalized.placeSignature ? { placeSignature: normalized.placeSignature } : {}),
    ...(normalized.capabilitySnapshotId
      ? { capabilitySnapshotId: normalized.capabilitySnapshotId }
      : {}),
    ...(normalized.observedAt != null ? { observedAt: normalized.observedAt } : {}),
    ...(normalized.capabilityRegistry ? { capabilityRegistry: normalized.capabilityRegistry } : {}),
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

  const authoritativePluginTargets = liveOptions.filter((option) => (
    option?.connectionType === STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE
    || option?.source === "plugin"
    || Boolean(option?.pluginSessionId)
  ));
  if (authoritativePluginTargets.length === 1) {
    return { status: "ready", target: authoritativePluginTargets[0], options: liveOptions };
  }

  const pref = preference && typeof preference === "object" ? preference : null;
  const prefTargetId = String(pref?.targetId || pref?.studioTargetId || "").trim();
  const prefPlaceId = normalizeRobloxPlaceId(pref?.placeId);
  const matched = liveOptions.find((option) => prefTargetId
    ? option.id === prefTargetId || option.studioTargetId === prefTargetId
    : prefPlaceId && option.placeId && option.placeId === prefPlaceId
  );
  if (matched) {
    return { status: "ready", target: matched, options: liveOptions };
  }
  return { status: "needs_selection", options: liveOptions };
}

/**
 * Synchronously catch known Studio target issues before a chat operation is
 * admitted. Empty or disconnected target state is left to the async submit
 * path, which can refresh Studio status before deciding whether to block.
 */
export function evaluateStudioSubmissionPreflight({
  studioEnabled = false,
  connected = false,
  mode = "agent",
  preference = null,
  options = [],
} = {}) {
  const liveOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  const studioMode = ["agent", "debug"].includes(String(mode || "agent").toLowerCase());
  if (!studioEnabled || !connected || !studioMode || liveOptions.length === 0) {
    return { status: "pass" };
  }

  const gate = evaluateStudioPlaceGate({
    studioEnabled: true,
    connected: true,
    preference,
    options: liveOptions,
  });
  const selectedTargetCannotBind = gate.status === "ready"
    && !canBindStudioTargetToProject(gate.target);
  if (gate.status !== "needs_selection" && !selectedTargetCannotBind) {
    return { status: "pass", target: gate.target };
  }

  return {
    status: "blocked",
    reason: "needs_selection",
    message: "Choose which Studio place this chat should edit before sending.",
  };
}
