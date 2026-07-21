import {
  getActiveStudioCapabilities,
  isCurrentPluginAutoPushAuthorized,
  resolveStudioControlAccess,
  selectedStudioSupportsCommand,
} from "./studioControlAccess";

const livePlugin = (id = "plugin_live") => ({
  id,
  connectionType: "plugin_bridge",
  status: "connected",
  live: true,
});

describe("Studio agent control access", () => {
  test("keeps an offline workspace export-only instead of requiring a plugin", () => {
    expect(resolveStudioControlAccess({ connected: false })).toMatchObject({
      workflowMode: "export_only",
      canUseAgent: false,
      canRead: false,
      canMutate: false,
      statusLabel: "Export only",
      capabilityLabel: "Project ZIP ready",
    });
  });

  test("keeps the live plugin path fully capable", () => {
    expect(resolveStudioControlAccess({
      connected: true,
      connectionType: "plugin_bridge",
    })).toMatchObject({
      canUseAgent: true,
      canRead: true,
      canMutate: true,
      canAutoPush: true,
      workflowMode: "plugin_live",
      statusLabel: "Studio · Plugin",
    });
  });

  test("labels an MCP session from only its explicitly supported tools", () => {
    expect(resolveStudioControlAccess({
      connected: true,
      connectionType: "mcp_local",
      capabilities: { supported: ["readProject"], unavailable: ["writeScript"] },
    })).toMatchObject({
      supportedCapabilities: ["readProject"],
      canUseAgent: true,
      canRead: true,
      canMutate: false,
      canAutoPush: false,
      workflowMode: "mcp_live",
      statusLabel: "Studio · MCP",
      capabilityLabel: "MCP · Read only",
    });
  });

  test("does not present an MCP connection without discovered tools as usable", () => {
    expect(resolveStudioControlAccess({
      connected: true,
      connectionType: "mcp_local",
      capabilities: null,
    })).toMatchObject({
      canUseAgent: false,
      canRead: false,
      canMutate: false,
      canAutoPush: false,
      capabilityLabel: "MCP · No tools",
    });
  });

  test("reads capabilities and commands only from the exact selected MCP session", () => {
    const selected = {
      id: "mcp_selected",
      connectionType: "mcp_local",
      status: "connected",
      live: true,
      connectorLive: true,
      mcpServerAvailable: true,
      capabilities: { readProject: true },
      supportedCommands: ["read_script"],
    };
    const other = {
      ...selected,
      id: "mcp_other",
      capabilities: { writeScript: true },
      supportedCommands: ["get_project_manifest"],
    };
    const studio = {
      connected: true,
      connectionType: "mcp_local",
      sessionId: selected.id,
      // Deliberately make the wrong session active to catch aggregate/fallback
      // capability leaks.
      activeSession: other,
      sessions: [other, selected],
    };

    expect(getActiveStudioCapabilities(studio)).toEqual({ readProject: true });
    expect(selectedStudioSupportsCommand(studio, "read_script")).toBe(true);
    expect(selectedStudioSupportsCommand(studio, "get_project_manifest")).toBe(false);

    expect(getActiveStudioCapabilities({ ...studio, sessionId: "stale_id" })).toBeNull();
    expect(selectedStudioSupportsCommand(
      { ...studio, sessionId: "stale_id" },
      "get_project_manifest"
    )).toBe(false);
  });

  test("authorizes Auto Push only for the selected, currently live plugin ID", () => {
    const pluginSession = livePlugin();
    const authorized = {
      connected: true,
      connectionType: "plugin_bridge",
      sessionId: pluginSession.id,
      activeSession: pluginSession,
      pluginConnected: true,
      mcpConnected: false,
      pluginSession,
      lastAuthorizedSessionId: pluginSession.id,
    };

    expect(isCurrentPluginAutoPushAuthorized(authorized)).toBe(true);
    expect(isCurrentPluginAutoPushAuthorized({
      ...authorized,
      lastAuthorizedSessionId: "stale_plugin_id",
    })).toBe(false);
    expect(isCurrentPluginAutoPushAuthorized({
      ...authorized,
      connectionType: "mcp_local",
      sessionId: "mcp_selected",
      mcpConnected: true,
    })).toBe(false);
    expect(isCurrentPluginAutoPushAuthorized({
      ...authorized,
      pluginSession: { ...pluginSession, live: false },
    })).toBe(false);
  });
});
