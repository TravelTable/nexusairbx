import { normalizeRobloxPlaceId } from "./robloxPlaceId";

export const STUDIO_CONNECTION_TYPES = Object.freeze({
  PLUGIN_BRIDGE: "plugin_bridge",
  MCP_LOCAL: "mcp_local",
});

export const MCP_CAPABILITY_LABELS = Object.freeze({
  readProject: "Read project",
  readScript: "Read scripts",
  writeScript: "Write scripts",
  patchScript: "Patch scripts",
  inspectSelection: "Inspect selection",
  outputLogs: "Read Output logs",
  playtest: "Run playtests",
  creatorStoreInsert: "Insert Creator Store assets",
  instanceMutation: "Edit instances",
  snapshots: "Create snapshots",
});

export const EXPECTED_STUDIO_PLUGIN_VERSION = "0.13.0-project-first";
export const EXPECTED_STUDIO_PROTOCOL_VERSION = "2026-07-30-script-context";

const LIVE_IDLE_MS = 45000;
const RUNNABLE_PLUGIN_COMPATIBILITY_STATES = new Set(["compatible", "degraded"]);

export function isRunnableStudioPluginCompatibility(status) {
  return RUNNABLE_PLUGIN_COMPATIBILITY_STATES.has(status);
}

export function getStudioSessionId(session) {
  return session?.sessionId || session?.id || null;
}

export function getStudioPlaceId(session) {
  const placeId = session?.placeId || session?.studioPlaceId || session?.studio?.placeId;
  return normalizeRobloxPlaceId(placeId);
}

export function getStudioConnectionType(session) {
  const raw =
    session?.connectionType ||
    session?.metadata?.connectionType ||
    session?.studio?.connectionType;
  return raw === STUDIO_CONNECTION_TYPES.MCP_LOCAL
    ? STUDIO_CONNECTION_TYPES.MCP_LOCAL
    : STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE;
}

function cleanIdentity(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function getStudioTargetId(session) {
  return cleanIdentity(
    session?.studioTargetId
    || session?.targetingTargetId
    || session?.studio?.studioTargetId
    || session?.studio?.targetId
  );
}

function getStudioUniverseId(session) {
  return cleanIdentity(session?.universeId ?? session?.studio?.universeId);
}

function sessionMatchesStudioTarget(session, target) {
  if (!session || !target) return false;
  const sessionId = cleanIdentity(getStudioSessionId(session));
  const connectionType = getStudioConnectionType(session);
  const explicitSessionId = connectionType === STUDIO_CONNECTION_TYPES.MCP_LOCAL
    ? cleanIdentity(target.mcpSessionId)
    : cleanIdentity(target.pluginSessionId);
  if (explicitSessionId) return sessionId === explicitSessionId;

  const wantedTargetId = cleanIdentity(target.studioTargetId || target.targetId || target.id);
  const sessionTargetId = getStudioTargetId(session);
  if (wantedTargetId && sessionTargetId) return wantedTargetId === sessionTargetId;

  // Only fall back to place identity when the transport has not supplied an
  // opaque target id. Once both sides have one it is authoritative.
  const wantedPlaceId = normalizeRobloxPlaceId(target.placeId ?? target.targetPlaceId);
  const sessionPlaceId = getStudioPlaceId(session);
  if (!wantedPlaceId || wantedPlaceId !== sessionPlaceId) return false;
  const wantedUniverseId = cleanIdentity(target.universeId);
  const sessionUniverseId = getStudioUniverseId(session);
  return !wantedUniverseId || !sessionUniverseId || wantedUniverseId === sessionUniverseId;
}

function normalizeAdvertisedCapabilities(session) {
  const raw = session?.capabilities;
  if (Array.isArray(raw)) {
    return Object.fromEntries(raw.map((capability) => [String(capability), true]));
  }
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(
    Object.entries(raw).map(([capability, available]) => [capability, available === true])
  );
}

/**
 * Build a transport-aware, target-scoped view of what Studio can execute now.
 * This is evidence for readiness, not an authority minted by the browser: a
 * server capabilitySnapshotId is preserved when supplied but never invented.
 */
export function buildStudioCapabilityRegistry({ sessions = [], target = null } = {}) {
  const matchingSessions = (Array.isArray(sessions) ? sessions : [])
    .filter((session) => isStudioSessionLive(session))
    .filter((session) => sessionMatchesStudioTarget(session, target));
  const transports = matchingSessions.map((session) => {
    const supportedCommands = Array.isArray(session?.supportedCommands)
      ? [...new Set(session.supportedCommands.map(String).filter(Boolean))].sort()
      : [];
    return {
      sessionId: cleanIdentity(getStudioSessionId(session)),
      connectionType: getStudioConnectionType(session),
      supportedCommands,
      capabilities: normalizeAdvertisedCapabilities(session),
      capabilityDetails: session?.capabilityDetails && typeof session.capabilityDetails === "object"
        ? session.capabilityDetails
        : {},
      observedAt: session?.lastSeenAt ?? session?.observedAt ?? null,
    };
  });

  const commandNames = [...new Set(transports.flatMap((transport) => transport.supportedCommands))].sort();
  const commands = Object.fromEntries(commandNames.map((command) => {
    const availableTransports = transports
      .filter((transport) => transport.supportedCommands.includes(command))
      .map(({ sessionId, connectionType }) => ({ sessionId, connectionType }));
    return [command, { available: true, transports: availableTransports }];
  }));
  const observedValues = transports
    .map((transport) => Number(transport.observedAt || 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  return {
    schemaVersion: 1,
    targetId: cleanIdentity(target?.studioTargetId || target?.targetId || target?.id),
    ...(cleanIdentity(target?.capabilitySnapshotId)
      ? { capabilitySnapshotId: cleanIdentity(target.capabilitySnapshotId) }
      : {}),
    observedAt: observedValues.length ? Math.max(...observedValues) : null,
    transports,
    commands,
  };
}

export function isStudioSessionLive(session, now = Date.now()) {
  if (!session || (session.status !== "connected" && session.status !== "degraded")) return false;
  if (getStudioConnectionType(session) === STUDIO_CONNECTION_TYPES.MCP_LOCAL) {
    if (session.mcpServerAvailable === false || session.serverAvailable === false) return false;
    if (session.connectorLive === false) return false;
  }
  if (session.live === true) return true;
  if (session.live === false) return false;
  const lastSeenAt = Number(session.lastSeenAt || session.connector?.lastSeenAt || 0);
  if (lastSeenAt > 0) return now - lastSeenAt <= LIVE_IDLE_MS;
  return session.status === "connected";
}

function capabilitySupported(session, capability) {
  if (!capability) return true;
  const capabilities = session?.capabilities;
  // Older MCP status responses did not advertise a capability set. Treat an
  // absent set as unknown/legacy-compatible; once a provider advertises the
  // set, an omitted or false capability is authoritative and must be blocked.
  if (capabilities == null) return true;
  if (Array.isArray(capabilities)) return capabilities.includes(capability);
  return capabilities?.[capability] === true;
}

function compareSessions(left, right) {
  const leftLive = isStudioSessionLive(left) ? 1 : 0;
  const rightLive = isStudioSessionLive(right) ? 1 : 0;
  if (leftLive !== rightLive) return rightLive - leftLive;
  return Number(right?.lastSeenAt || 0) - Number(left?.lastSeenAt || 0);
}

export function selectStudioSession(
  sessions = [],
  { connectionType = null, capability = null, liveOnly = true, compatibleOnly = false } = {}
) {
  return [...(Array.isArray(sessions) ? sessions : [])]
    .filter((session) => !connectionType || getStudioConnectionType(session) === connectionType)
    .filter((session) => capabilitySupported(session, capability))
    .filter((session) => !compatibleOnly || isRunnableStudioPluginCompatibility(
      session?.compatibility?.status
    ))
    .filter((session) => !liveOnly || isStudioSessionLive(session))
    .sort(compareSessions)[0] || null;
}

export function normalizeStudioPluginCompatibility(value = null) {
  const raw = value?.compatibility || value || {};
  const installedPluginVersion =
    raw.installedPluginVersion || value?.pluginVersion || value?.studio?.pluginVersion || null;
  const installedProtocolVersion =
    raw.installedProtocolVersion || value?.protocolVersion || value?.studio?.protocolVersion || null;
  const expectedPluginVersion = raw.expectedPluginVersion || EXPECTED_STUDIO_PLUGIN_VERSION;
  const expectedProtocolVersion = raw.expectedProtocolVersion || EXPECTED_STUDIO_PROTOCOL_VERSION;
  const allowedStatuses = ["compatible", "repairing", "degraded", "update_required", "unknown"];
  // Compatibility is server-owned. A missing or older backend response is
  // unknown, never evidence that the installed plugin needs reinstalling.
  const status = allowedStatuses.includes(raw.status) ? raw.status : "unknown";
  return {
    status,
    installedPluginVersion,
    installedProtocolVersion,
    expectedPluginVersion,
    expectedProtocolVersion,
    installedBuildIdentity: raw.installedBuildId || raw.installedBuildIdentity || value?.buildId || value?.buildIdentity || value?.studio?.buildId || value?.studio?.buildIdentity || null,
    expectedBuildIdentity: raw.expectedBuildId || raw.expectedBuildIdentity || null,
    acceptedRelease: typeof raw.acceptedRelease === "boolean" ? raw.acceptedRelease : null,
    currentRelease: typeof raw.currentRelease === "boolean" ? raw.currentRelease : null,
    reasonCode: raw.reasonCode || null,
    reasonCodes: Array.isArray(raw.reasonCodes)
      ? raw.reasonCodes
      : raw.reasonCode
        ? [raw.reasonCode]
        : [],
    reasons: Array.isArray(raw.reasons) ? raw.reasons : [],
    missingCommands: Array.isArray(raw.missingCommands) ? raw.missingCommands : [],
    missingCapabilities: Array.isArray(raw.missingCapabilities) ? raw.missingCapabilities : [],
  };
}

export function selectPluginStudioSession(sessions = [], options = {}) {
  return selectStudioSession(sessions, {
    ...options,
    connectionType: STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE,
  });
}

export function selectMcpStudioSession(sessions = [], options = {}) {
  return selectStudioSession(sessions, {
    ...options,
    connectionType: STUDIO_CONNECTION_TYPES.MCP_LOCAL,
  });
}

function collectSessions(status, fallbackType) {
  if (!status || typeof status !== "object") return [];
  const values = [
    ...(Array.isArray(status.sessions) ? status.sessions : []),
    status.session,
    status.connection,
  ].filter(Boolean);
  return values.map((session) => ({
    ...session,
    connectionType:
      session.connectionType ||
      session.metadata?.connectionType ||
      session.studio?.connectionType ||
      fallbackType,
  }));
}

function firstReportedBoolean(...values) {
  return values.find((value) => typeof value === "boolean");
}

function applyMcpTransportHealth(session, status, { preferSessionHealth = false } = {}) {
  const sessionConnectorHealth = [
    session?.connectorLive,
    session?.connector?.connected,
    session?.connector?.live,
  ];
  const aggregateConnectorHealth = [
    status?.connectorLive,
    status?.connectorDetected,
    status?.connectorConnected,
    status?.connector?.connected,
    status?.connector?.live,
  ];
  const sessionServerHealth = [
    session?.mcpServerAvailable,
    session?.serverAvailable,
    session?.studio?.mcpServerAvailable,
  ];
  const aggregateServerHealth = [
    status?.mcpServerAvailable,
    status?.mcpServerDetected,
    status?.mcpServerConnected,
    status?.serverConnected,
    status?.mcpServer?.connected,
    status?.mcpServer?.available,
  ];
  const connectorLive = firstReportedBoolean(
    ...(preferSessionHealth
      ? [...sessionConnectorHealth, ...aggregateConnectorHealth]
      : [...aggregateConnectorHealth, ...sessionConnectorHealth])
  );
  const mcpServerAvailable = firstReportedBoolean(
    ...(preferSessionHealth
      ? [...sessionServerHealth, ...aggregateServerHealth]
      : [...aggregateServerHealth, ...sessionServerHealth])
  );

  return {
    ...session,
    ...(typeof connectorLive === "boolean" ? { connectorLive } : {}),
    ...(typeof mcpServerAvailable === "boolean" ? { mcpServerAvailable } : {}),
  };
}

function dedupeSessions(sessions) {
  const seen = new Set();
  return sessions.filter((session, index) => {
    const id = getStudioSessionId(session);
    const key = id ? `${getStudioConnectionType(session)}:${id}` : `anonymous:${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function capabilitySummary(session) {
  const raw = session?.capabilities;
  if (!raw) return { supported: [], unavailable: [] };
  if (Array.isArray(raw)) return { supported: raw, unavailable: [] };
  return Object.entries(raw).reduce(
    (summary, [capability, available]) => {
      summary[available === true ? "supported" : "unavailable"].push(capability);
      return summary;
    },
    { supported: [], unavailable: [] }
  );
}

export function normalizeStudioConnectionSnapshot({ pluginStatus = null, mcpStatus = null } = {}) {
  const studioStatusSessions = collectSessions(pluginStatus, STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE)
    .map((session) => getStudioConnectionType(session) === STUDIO_CONNECTION_TYPES.MCP_LOCAL
      ? applyMcpTransportHealth(session, mcpStatus)
      : session);
  const mcpSessions = collectSessions(mcpStatus, STUDIO_CONNECTION_TYPES.MCP_LOCAL)
    // Dedicated MCP session records are scoped to one local connector. Keep
    // their health when an aggregate route reports a conflicting default.
    .map((session) => applyMcpTransportHealth(session, mcpStatus, { preferSessionHealth: true }));
  // The dedicated MCP status response is authoritative when both endpoints
  // report the same MCP session. This prevents a stale aggregate response from
  // making a connector-only state look fully connected.
  const sessions = dedupeSessions([...mcpSessions, ...studioStatusSessions]);
  const pluginSession = selectPluginStudioSession(sessions);
  const mcpSession = selectMcpStudioSession(sessions);
  const compatibility = normalizeStudioPluginCompatibility(
    pluginStatus?.compatibility || pluginSession
  );
  const compatiblePluginSession = pluginSession && isRunnableStudioPluginCompatibility(compatibility.status)
    ? { ...pluginSession, compatibility }
    : selectPluginStudioSession(sessions, { compatibleOnly: true });
  const chatSession = selectMcpStudioSession(sessions, { capability: "readProject" }) || compatiblePluginSession;
  const manifestSession = compatiblePluginSession;
  const latestMcpSession = mcpSession || selectMcpStudioSession(sessions, { liveOnly: false });
  const pluginConnected = Boolean(pluginSession);
  const pluginMutationReady = Boolean(
    pluginSession
    && isRunnableStudioPluginCompatibility(compatibility.status)
    && compatibility.currentRelease !== false
  );
  const mcpConnected = Boolean(mcpSession);
  const mcpExecutionReady = Boolean(
    mcpSession && (
      (Array.isArray(mcpSession.supportedCommands) && mcpSession.supportedCommands.length > 0) ||
      Object.values(normalizeAdvertisedCapabilities(mcpSession)).some(Boolean)
    )
  );
  const connectorDetected = firstReportedBoolean(
    latestMcpSession?.connectorLive,
    latestMcpSession?.connector?.connected,
    latestMcpSession?.connector?.live,
    mcpStatus?.connectorLive,
    mcpStatus?.connectorDetected,
    mcpStatus?.connectorConnected,
    mcpStatus?.connector?.connected,
    mcpStatus?.connector?.live
  ) === true;
  const mcpServerDetected = firstReportedBoolean(
    latestMcpSession?.mcpServerAvailable,
    latestMcpSession?.serverAvailable,
    latestMcpSession?.studio?.mcpServerAvailable,
    mcpStatus?.mcpServerAvailable,
    mcpStatus?.mcpServerDetected,
    mcpStatus?.mcpServerConnected,
    mcpStatus?.serverConnected,
    mcpStatus?.mcpServer?.connected,
    mcpStatus?.mcpServer?.available
  ) === true;
  const degraded = !mcpConnected && connectorDetected;
  // Preserve the legacy aggregate selection contract for callers that only
  // understand one session. Capability-aware consumers use chatSession and
  // manifestSession below, so they can still route around an unsupported
  // plugin without changing the long-standing plugin-first sessionId.
  const activeSession = pluginSession || chatSession || mcpSession;
  const capabilities = capabilitySummary(
    latestMcpSession?.capabilities ? latestMcpSession : { capabilities: mcpStatus?.capabilities }
  );
  const connectionState = pluginConnected && mcpConnected
    ? "both"
    : pluginConnected
      ? "plugin"
      : mcpConnected
        ? "mcp"
        : degraded
          ? "degraded"
          : "disconnected";
  const workflowMode = pluginConnected && mcpExecutionReady
    ? "hybrid_live"
    : pluginConnected
      ? "plugin_live"
      : mcpExecutionReady
        ? "mcp_live"
        : "export_only";
  const activePlaceName = String(
    activeSession?.studio?.placeName || activeSession?.placeName || ""
  ).trim();
  const activeSessionId = getStudioSessionId(activeSession);
  const reportedTargets = [
    ...(Array.isArray(pluginStatus?.targeting?.targets) ? pluginStatus.targeting.targets : []),
    ...(Array.isArray(mcpStatus?.targeting?.targets) ? mcpStatus.targeting.targets : []),
  ];
  const activeTarget = reportedTargets.find((target) => (
    [target?.sessionId, target?.pluginSessionId, target?.mcpSessionId].filter(Boolean).includes(activeSessionId)
  )) || null;
  const capabilityRegistry = activeTarget?.capabilityRegistry || (activeSession
    ? buildStudioCapabilityRegistry({
        sessions,
        target: {
          ...(getStudioConnectionType(activeSession) === STUDIO_CONNECTION_TYPES.MCP_LOCAL
            ? { mcpSessionId: activeSessionId }
            : { pluginSessionId: activeSessionId }),
        },
      })
    : null);
  const executionReady = pluginMutationReady || mcpExecutionReady;

  return {
    // Studio is one logical runtime. Each target-scoped provider contributes
    // only the commands it currently advertises.
    connected: pluginConnected || mcpConnected,
    transportConnected: pluginConnected || mcpConnected,
    executionReady,
    readinessState: executionReady
      ? "ready"
      : pluginConnected && compatibility.currentRelease === false
        ? "plugin_update_required"
        : (mcpConnected ? "capabilities_unavailable" : "disconnected"),
    activePlaceName: activePlaceName || null,
    sessionId: getStudioSessionId(activeSession),
    connectionType: activeSession ? getStudioConnectionType(activeSession) : null,
    targeting: pluginStatus?.targeting || mcpStatus?.targeting || null,
    activeSession,
    sessions,
    pluginSessions: sessions.filter(
      (session) => getStudioConnectionType(session) === STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE
    ),
    mcpSessions: sessions.filter(
      (session) => getStudioConnectionType(session) === STUDIO_CONNECTION_TYPES.MCP_LOCAL
    ),
    pluginSession,
    compatiblePluginSession,
    mcpSession,
    latestMcpSession,
    pluginConnected,
    mcpConnected,
    connectorDetected,
    connectorConnected: connectorDetected,
    mcpServerDetected,
    mcpServerConnected: mcpConnected && mcpServerDetected,
    degraded,
    connectionState,
    workflowMode,
    collaborators: Array.isArray(activeSession?.collaborators) ? activeSession.collaborators : [],
    capabilities,
    capabilityRegistry,
    compatibility,
    chatSession,
    manifestSession,
    transportSelection: pluginStatus?.transportSelection || {
      chatInspection: chatSession
        ? {
            sessionId: getStudioSessionId(chatSession),
            connectionType: getStudioConnectionType(chatSession),
          }
        : null,
      manifestCollection: manifestSession
        ? {
            sessionId: getStudioSessionId(manifestSession),
            connectionType: STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE,
          }
        : null,
    },
  };
}
