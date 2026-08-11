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

const READ_COMMANDS = new Set([
  "get_project_manifest", "inspect_place", "inspect_instances", "read_instance",
  "read_properties", "read_script", "read_scripts", "search_project", "search_source",
  "get_selection", "get_studio_context", "get_output_logs", "collect_output",
]);

const MUTATION_COMMANDS = new Set([
  "apply_artifact", "create_script", "write_script", "patch_script", "rename_script",
  "move_script", "duplicate_script", "delete_script", "replace_in_files", "create_instance",
  "update_properties", "update_attributes", "update_tags", "rename_instance", "move_instance",
  "duplicate_instance", "delete_instance", "batch_operations", "restore_snapshot", "undo_last_batch",
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

function getSupportedStudioCommands(capabilities) {
  if (!capabilities || typeof capabilities !== "object") return [];
  if (Array.isArray(capabilities.commands)) {
    return [...new Set(capabilities.commands.map(String).filter(Boolean))];
  }
  if (!capabilities.commands || typeof capabilities.commands !== "object") return [];
  return Object.entries(capabilities.commands)
    .filter(([, detail]) => detail === true || detail?.available === true)
    .map(([command]) => command);
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
      workflowMode: "export_only",
      statusLabel: "Export only",
      statusTitle: connectorOnly
        ? "The local connector is running, but no Roblox Studio MCP server is available. Builds can still be exported for manual Studio import."
        : "No live Studio connection. Builds remain exportable as a placement-aware Project ZIP.",
      capabilityLabel: connectorOnly ? "MCP unavailable" : "Project ZIP ready",
    };
  }

  // Historical callers did not provide a type because the plugin used to be
  // the only Studio transport. Keep that path fully compatible.
  const selectedType = getStudioConnectionType({ connectionType });
  if (selectedType === STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE) {
    const supportedCapabilities = getSupportedStudioCapabilities(capabilities);
    const supportedCommands = getSupportedStudioCommands(capabilities);
    const canRead = supportedCapabilities.some((capability) => MCP_READ_CAPABILITIES.has(capability))
      || supportedCommands.some((command) => READ_COMMANDS.has(command));
    const canMutate = supportedCapabilities.some((capability) => MCP_MUTATION_CAPABILITIES.has(capability))
      || supportedCommands.some((command) => MUTATION_COMMANDS.has(command));
    const hasEvidence = supportedCapabilities.length > 0 || supportedCommands.length > 0;
    return {
      connectionType: selectedType,
      supportedCapabilities,
      supportedCommands,
      canUseAgent: hasEvidence,
      canRead,
      canMutate,
      canAutoPush: supportedCommands.includes("apply_artifact"),
      workflowMode: hasEvidence ? "plugin_live" : "export_only",
      statusLabel: "Studio · Plugin",
      statusTitle: hasEvidence
        ? "Roblox Studio is connected through the NexusRBX plugin with verified advertised commands"
        : "The plugin is connected, but it has not advertised executable commands for the selected target",
      capabilityLabel: hasEvidence ? "Plugin tools verified" : "Plugin has no verified tools",
    };
  }

  const supportedCapabilities = getSupportedStudioCapabilities(capabilities);
  const supportedCommands = getSupportedStudioCommands(capabilities);
  const canRead = supportedCapabilities.some((capability) => MCP_READ_CAPABILITIES.has(capability))
    || supportedCommands.some((command) => READ_COMMANDS.has(command));
  const canMutate = supportedCapabilities.some((capability) => MCP_MUTATION_CAPABILITIES.has(capability))
    || supportedCommands.some((command) => MUTATION_COMMANDS.has(command));
  const hasEvidence = supportedCapabilities.length > 0 || supportedCommands.length > 0;
  let capabilityLabel = "MCP · Limited";
  if (supportedCapabilities.length === 0) capabilityLabel = "MCP · No tools";
  else if (canRead && canMutate) capabilityLabel = "MCP · Read + edit";
  else if (canRead) capabilityLabel = "MCP · Read only";
  else if (canMutate) capabilityLabel = "MCP · Edit tools";

  return {
    connectionType: selectedType,
    supportedCapabilities,
    supportedCommands,
    canUseAgent: hasEvidence,
    canRead,
    canMutate,
    // Managed artifact apply is a plugin protocol operation. A generic MCP
    // mutation capability must never silently stand in for it.
    canAutoPush: false,
    workflowMode: "mcp_live",
    statusLabel: "Studio · MCP",
    statusTitle: "Roblox Studio is connected through the selected local MCP session",
    capabilityLabel,
  };
}

export function getActiveStudioCapabilities(studio) {
  if (!studio?.connected) return null;
  const registry = studio?.placePreference?.capabilityRegistry;
  if (registry && typeof registry === "object") {
    const supported = new Set();
    (Array.isArray(registry.transports) ? registry.transports : []).forEach((transport) => {
      Object.entries(transport?.capabilities || {}).forEach(([capability, available]) => {
        if (available === true) supported.add(capability);
      });
    });
    return {
      supported: [...supported],
      commands: registry.commands || {},
      capabilitySnapshotId: registry.capabilitySnapshotId || null,
    };
  }
  const selectedSession = getSelectedStudioSession(studio);
  if (!selectedSession) return null;
  return {
    supported: getSupportedStudioCapabilities(selectedSession.capabilities),
    commands: Array.isArray(selectedSession.supportedCommands)
      ? selectedSession.supportedCommands
      : [],
  };
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
