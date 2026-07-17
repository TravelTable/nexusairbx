import {
  getStudioConnectionType,
  normalizeStudioConnectionSnapshot,
  selectPluginStudioSession,
  STUDIO_CONNECTION_TYPES,
} from "./studioConnection";

describe("studio connection selection", () => {
  test("treats historical sessions without a type as plugin bridge sessions", () => {
    const session = { id: "legacy", status: "connected", live: true };
    expect(getStudioConnectionType(session)).toBe(STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE);
    expect(selectPluginStudioSession([session])).toBe(session);
  });

  test("does not treat a local connector heartbeat as a live MCP server", () => {
    const snapshot = normalizeStudioConnectionSnapshot({
      mcpStatus: {
        sessions: [{
          id: "connector_only",
          connectionType: "mcp_local",
          status: "degraded",
          live: false,
          connectorLive: true,
          mcpServerAvailable: false,
        }],
      },
    });

    expect(snapshot.connected).toBe(false);
    expect(snapshot.mcpConnected).toBe(false);
    expect(snapshot.connectorDetected).toBe(true);
    expect(snapshot.connectionState).toBe("degraded");
  });

  test("keeps selected-session connector health when the route aggregate defaults false", () => {
    const snapshot = normalizeStudioConnectionSnapshot({
      mcpStatus: {
        connectorLive: false,
        mcpServerAvailable: false,
        sessions: [{
          id: "connector_route_shape",
          connectionType: "mcp_local",
          status: "degraded",
          live: false,
          connectorLive: true,
          mcpServerAvailable: false,
        }],
      },
    });

    expect(snapshot.connected).toBe(false);
    expect(snapshot.connectorDetected).toBe(true);
    expect(snapshot.mcpServerDetected).toBe(false);
    expect(snapshot.degraded).toBe(true);
    expect(snapshot.connectionState).toBe("degraded");
    expect(snapshot.latestMcpSession.connectorLive).toBe(true);
  });

  test("top-level MCP health overrides a stale green session", () => {
    const snapshot = normalizeStudioConnectionSnapshot({
      pluginStatus: {
        sessions: [{
          id: "stale_green",
          connectionType: "mcp_local",
          status: "connected",
          live: true,
          connectorLive: true,
          mcpServerAvailable: true,
        }],
      },
      mcpStatus: {
        connectorLive: true,
        mcpServerAvailable: false,
        sessions: [],
      },
    });

    expect(snapshot.connected).toBe(false);
    expect(snapshot.mcpConnected).toBe(false);
    expect(snapshot.connectorDetected).toBe(true);
    expect(snapshot.mcpServerDetected).toBe(false);
    expect(snapshot.connectionState).toBe("degraded");
    expect(snapshot.latestMcpSession.mcpServerAvailable).toBe(false);
  });

  test("keeps both exact sessions and chooses the plugin for legacy consumers", () => {
    const snapshot = normalizeStudioConnectionSnapshot({
      pluginStatus: { sessions: [{ id: "plugin", status: "connected", live: true }] },
      mcpStatus: {
        sessions: [{
          id: "mcp",
          connectionType: "mcp_local",
          status: "connected",
          live: true,
          connectorLive: true,
          mcpServerAvailable: true,
        }],
      },
    });

    expect(snapshot.connectionState).toBe("both");
    expect(snapshot.sessionId).toBe("plugin");
    expect(snapshot.pluginSession.id).toBe("plugin");
    expect(snapshot.mcpSession.id).toBe("mcp");
  });

  test("selects a live MCP session when it is the only transport", () => {
    const snapshot = normalizeStudioConnectionSnapshot({
      mcpStatus: {
        sessions: [{
          id: "mcp",
          connectionType: "mcp_local",
          status: "connected",
          live: true,
          connectorLive: true,
          mcpServerAvailable: true,
          capabilities: { readProject: true, writeScript: false },
        }],
      },
    });

    expect(snapshot.connected).toBe(true);
    expect(snapshot.connectionType).toBe("mcp_local");
    expect(snapshot.capabilities.supported).toEqual(["readProject"]);
    expect(snapshot.capabilities.unavailable).toEqual(["writeScript"]);
  });

  test("uses top-level MCP health and capability fields as a status fallback", () => {
    const snapshot = normalizeStudioConnectionSnapshot({
      mcpStatus: {
        connectorLive: true,
        mcpServerAvailable: false,
        capabilities: { inspectSelection: true, playtest: false },
      },
    });

    expect(snapshot.connectorDetected).toBe(true);
    expect(snapshot.mcpServerDetected).toBe(false);
    expect(snapshot.connectionState).toBe("degraded");
    expect(snapshot.capabilities.supported).toEqual(["inspectSelection"]);
    expect(snapshot.capabilities.unavailable).toEqual(["playtest"]);
  });

  test("uses MCP for chat and a compatible plugin for full manifests", () => {
    const snapshot = normalizeStudioConnectionSnapshot({
      pluginStatus: {
        sessions: [{
          id: "plugin_manifest",
          connectionType: "plugin_bridge",
          status: "connected",
          live: true,
          studio: {
            pluginVersion: "0.10.2-target-integrity",
            protocolVersion: "2026-07-17-target-integrity",
          },
        }],
      },
      mcpStatus: {
        sessions: [{
          id: "mcp_chat",
          connectionType: "mcp_local",
          status: "connected",
          live: true,
          connectorLive: true,
          mcpServerAvailable: true,
          capabilities: { readProject: true },
        }],
      },
    });

    expect(snapshot.chatSession.id).toBe("mcp_chat");
    expect(snapshot.manifestSession.id).toBe("plugin_manifest");
    expect(snapshot.transportSelection.chatInspection.connectionType).toBe("mcp_local");
    expect(snapshot.transportSelection.manifestCollection.connectionType).toBe("plugin_bridge");
    expect(snapshot.compatibility.status).toBe("compatible");
  });

  test("rejects a stale plugin from manifest selection", () => {
    const snapshot = normalizeStudioConnectionSnapshot({
      pluginStatus: {
        sessions: [{
          id: "plugin_stale",
          connectionType: "plugin_bridge",
          status: "connected",
          live: true,
          studio: {
            pluginVersion: "0.10.0-verified-decoupled",
            protocolVersion: "2026-06-20-creator-store",
          },
        }],
      },
    });

    expect(snapshot.manifestSession).toBeNull();
    expect(snapshot.compatibility).toEqual({
      status: "update_required",
      installedPluginVersion: "0.10.0-verified-decoupled",
      installedProtocolVersion: "2026-06-20-creator-store",
      expectedPluginVersion: "0.10.2-target-integrity",
      expectedProtocolVersion: "2026-07-17-target-integrity",
    });
  });
});
