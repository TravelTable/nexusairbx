import {
  getStudioConnectionType,
  getStudioSessionId,
  isRunnableStudioPluginCompatibility,
  isStudioSessionLive,
  selectPluginStudioSession,
  STUDIO_CONNECTION_TYPES,
} from "../../../lib/studioConnection";

const MCP_READ_CAPABILITIES = new Set([
  "readProject",
  "readScript",
  "inspectSelection",
  "outputLogs",
]);

const MCP_MUTATION_CAPABILITIES = new Set([
  "writeScript",
  "patchScript",
  "creatorStoreInsert",
  "instanceMutation",
]);

export function getSupportedStudioCapabilities(capabilities) {
  if (Array.isArray(capabilities)) {
    return [...new Set(capabilities.filter((capability) => typeof capability === "string" && capability))];
  }
  if (!capabilities || typeof capabilities !== "object") return [];

  const supported = Array.isArray(capabilities.supported)
    ? capabilities.supported.filter((capability) => typeof capability === "string" && capability)
    : [];
  const explicitFlags = Object.entries(capabilities)
    .filter(([, available]) => available === true)
    .map(([capability]) => capability);

  return [...new Set([...supported, ...explicitFlags])];
}

function getSelectedStudioSession(studio) {
  if (!studio?.connected) return null;
  const selectedSessionId = studio.sessionId || null;
  const candidates = [
    studio.activeSession,
    ...(Array.isArray(studio.sessions) ? studio.sessions : []),
    studio.pluginSession,
    studio.mcpSession,
  ].filter(Boolean);

  if (selectedSessionId) {
    const exactSession = candidates.find(
      (session) => getStudioSessionId(session) === selectedSessionId
    );
    // A stale selected ID must not inherit capabilities from whichever
    // session happens to be marked active. Capabilities are session-scoped.
    return exactSession || null;
  }

  return studio.activeSession || null;
}

export function resolveStudioControlAccess({
  connected = false,
  connectionType = null,
  connectionState = null,
  capabilities = null,
} = {}) {
  if (!connected) {
    const connectorOnly = connectionState === "degraded";
    return {
      connectionType: null,
      supportedCapabilities: [],
      canUseAgent: false,
      canRead: false,
      canMutate: false,
      canAutoPush: false,
      statusLabel: connectorOnly ? "Connector only" : "Offline",
      statusTitle: connectorOnly
        ? "The local connector is running, but no Roblox Studio MCP server is available"
        : "Pair the Studio plugin or connect a local MCP server",
      capabilityLabel: connectorOnly ? "MCP unavailable" : null,
    };
  }

  // Historical callers did not provide a type because the plugin used to be
  // the only Studio transport. Keep that path fully compatible.
  const selectedType = getStudioConnectionType({ connectionType });
  if (selectedType === STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE) {
    return {
      connectionType: selectedType,
      supportedCapabilities: [],
      canUseAgent: true,
      canRead: true,
      canMutate: true,
      canAutoPush: true,
      statusLabel: "Studio · Plugin",
      statusTitle: "Roblox Studio is connected through the NexusRBX plugin",
      capabilityLabel: null,
    };
  }

  const supportedCapabilities = getSupportedStudioCapabilities(capabilities);
  const canRead = supportedCapabilities.some((capability) => MCP_READ_CAPABILITIES.has(capability));
  const canMutate = supportedCapabilities.some((capability) => MCP_MUTATION_CAPABILITIES.has(capability));
  let capabilityLabel = "MCP · Limited";
  if (supportedCapabilities.length === 0) capabilityLabel = "MCP · No tools";
  else if (canRead && canMutate) capabilityLabel = "MCP · Read + edit";
  else if (canRead) capabilityLabel = "MCP · Read only";
  else if (canMutate) capabilityLabel = "MCP · Edit tools";

  return {
    connectionType: selectedType,
    supportedCapabilities,
    canUseAgent: supportedCapabilities.length > 0,
    canRead,
    canMutate,
    // Managed artifact apply is a plugin protocol operation. A generic MCP
    // mutation capability must never silently stand in for it.
    canAutoPush: false,
    statusLabel: "Studio · MCP",
    statusTitle: "Roblox Studio is connected through the selected local MCP session",
    capabilityLabel,
  };
}

export function getActiveStudioCapabilities(studio) {
  if (!studio?.connected || studio.connectionType !== STUDIO_CONNECTION_TYPES.MCP_LOCAL) return null;
  return getSelectedStudioSession(studio)?.capabilities ?? null;
}

export function selectedStudioSupportsCommand(studio, commandType) {
  if (!studio?.connected || !commandType) return false;
  if (commandType === "get_project_manifest") {
    const pluginSession =
      studio.manifestSession ||
      studio.compatiblePluginSession ||
      selectPluginStudioSession(studio.sessions, { compatibleOnly: true });
    const status = pluginSession?.compatibility?.status || studio.compatibility?.status;
    return Boolean(pluginSession && isStudioSessionLive(pluginSession) &&
      isRunnableStudioPluginCompatibility(status) &&
      (!Array.isArray(pluginSession.supportedCommands) ||
        pluginSession.supportedCommands.includes(commandType)));
  }
  const selectedSession = getSelectedStudioSession(studio);
  const selectedType = studio.connectionType || getStudioConnectionType(selectedSession || studio);

  // The plugin implements the versioned Studio protocol. MCP commands are
  // opt-in and must be discovered by exact command name.
  if (selectedType === STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE) {
    const status = selectedSession?.compatibility?.status || studio.compatibility?.status;
    const advertisedCommands = selectedSession?.supportedCommands || studio.pluginSession?.supportedCommands;
    return isRunnableStudioPluginCompatibility(status) &&
      (!Array.isArray(advertisedCommands) || advertisedCommands.includes(commandType));
  }
  if (selectedType !== STUDIO_CONNECTION_TYPES.MCP_LOCAL || !selectedSession) return false;

  return Array.isArray(selectedSession.supportedCommands) &&
    selectedSession.supportedCommands.includes(commandType);
}

export function isCurrentPluginAutoPushAuthorized(studio) {
  const pluginSession = studio?.pluginSession;
  const pluginSessionId = getStudioSessionId(pluginSession);
  const selectedSessionId =
    studio?.sessionId ||
    getStudioSessionId(studio?.activeSession) ||
    (studio?.pluginConnected && !studio?.mcpConnected ? pluginSessionId : null);
  const selectedConnectionType =
    studio?.connectionType ||
    getStudioConnectionType(studio?.activeSession || pluginSession || {});
  const authorizedSessionId = studio?.lastAuthorizedSessionId || null;

  return Boolean(
    studio?.pluginConnected &&
    pluginSession &&
    selectedConnectionType === STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE &&
    getStudioConnectionType(pluginSession) === STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE &&
    isStudioSessionLive(pluginSession) &&
    pluginSessionId &&
    selectedSessionId === pluginSessionId &&
    authorizedSessionId &&
    pluginSessionId === authorizedSessionId
  );
}
