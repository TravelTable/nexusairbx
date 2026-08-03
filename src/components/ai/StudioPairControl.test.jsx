import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StudioPairControl, {
  computeStudioPairMenuPosition,
  getDesktopConnectorPairingLink,
  isStudioMcpAlreadyDisconnected,
  resolvePairingExpiry,
} from "./StudioPairControl";
import {
  disconnectStudioMcp,
  startStudioPairing,
  testStudioMcp,
} from "../../lib/studioBridgeApi";
import { normalizeStudioConnectionSnapshot } from "../../lib/studioConnection";

jest.mock("../../lib/studioBridgeApi", () => ({
  disconnectStudio: jest.fn(),
  disconnectStudioMcp: jest.fn(),
  startStudioMcpPairing: jest.fn(),
  startStudioPairing: jest.fn(),
  testStudioMcp: jest.fn(),
}));

describe("StudioPairControl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testStudioMcp.mockResolvedValue({ ok: true, connected: true });
    disconnectStudioMcp.mockResolvedValue({ ok: true });
  });

  test("treats a missing MCP session as already disconnected", () => {
    expect(isStudioMcpAlreadyDisconnected({ status: 404, code: "STUDIO_SESSION_NOT_FOUND" })).toBe(true);
    expect(isStudioMcpAlreadyDisconnected({ status: 500, code: "INTERNAL_ERROR" })).toBe(false);
  });

  test("anchors the menu under the trigger and caps its size", () => {
    const buttonRect = { left: 500, right: 620, top: 12, bottom: 44, width: 120, height: 32 };

    const fixed = computeStudioPairMenuPosition(buttonRect, {
      viewportWidth: 1280,
      viewportHeight: 800,
    });
    expect(fixed.strategy).toBe("fixed");
    expect(fixed.width).toBe(400);
    expect(fixed.left).toBe(220); // right-aligned to button.right
    expect(fixed.top).toBe(52);
    expect(fixed.maxHeight).toBeLessThanOrEqual(520);

    const absolute = computeStudioPairMenuPosition(buttonRect, {
      hostRect: { left: 0, top: 0, right: 1024, bottom: 640 },
      hostClientWidth: 1280,
      hostClientHeight: 800,
      hostScale: 0.8,
    });
    expect(absolute.strategy).toBe("absolute");
    expect(absolute.left).toBeCloseTo((620 / 0.8) - 400, 5);
    expect(absolute.top).toBeCloseTo((44 / 0.8) + 8, 5);
    expect(absolute.maxHeight).toBeLessThanOrEqual(520);
  });

  test("normalizes absolute and relative pairing expiries", () => {
    const now = 1_700_000_000_000;
    expect(resolvePairingExpiry({ expiresInSeconds: 60 }, now)).toBe(now + 60_000);
    expect(resolvePairingExpiry({ expiresInMs: 2_500 }, now)).toBe(now + 2_500);
    expect(resolvePairingExpiry({ expiresAt: 1_800_000_000 }, now)).toBe(1_800_000_000_000);
    expect(resolvePairingExpiry({}, now)).toBe(0);
  });

  test("creates a desktop companion link only for the desktop handoff", () => {
    expect(getDesktopConnectorPairingLink("abc-123", "?connector=desktop")).toBe("nexusrbx://connector/pair?code=abc-123");
    expect(getDesktopConnectorPairingLink("abc-123", "?connector=web")).toBeNull();
    expect(getDesktopConnectorPairingLink("", "?connector=desktop")).toBeNull();
  });

  test("generates and displays a one-time plugin pairing code", async () => {
    startStudioPairing.mockResolvedValue({ code: "abc123", expiresInSeconds: 60 });
    render(<StudioPairControl refresh={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Pair Studio/i }));
    fireEvent.click(screen.getByRole("button", { name: /Connect with plugin/i }));

    expect(await screen.findByText("ABC123")).toBeTruthy();
    expect(screen.getByText(/Expires in/i)).toBeTruthy();
    expect(startStudioPairing).toHaveBeenCalledTimes(1);
  });

  test("moves focus into the popup and restores it when Escape closes", async () => {
    render(<StudioPairControl refresh={jest.fn()} />);

    const trigger = screen.getByRole("button", { name: /Pair Studio/i });
    fireEvent.click(trigger);

    const pluginTab = screen.getByRole("tab", { name: /Studio Plugin/i });
    await waitFor(() => expect(document.activeElement).toBe(pluginTab));

    fireEvent.click(screen.getByRole("tab", { name: /Roblox Studio MCP/i }));
    expect(
      screen.getByRole("link", { name: /Local connector setup/i }).getAttribute("href")
    ).toBe("/docs/studio-plugin");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /Connect Roblox Studio/i })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  test("keeps connector and MCP health distinct and uses the exact MCP session", async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const notify = jest.fn();
    const connection = normalizeStudioConnectionSnapshot({
      mcpStatus: {
        // This is the real route shape during connector-only startup: the
        // aggregate defaults false while the selected session heartbeat is
        // already present.
        connectorLive: false,
        mcpServerAvailable: false,
        sessions: [{
          id: "mcp_degraded_1",
          connectionType: "mcp_local",
          status: "degraded",
          live: false,
          connectorLive: true,
          mcpServerAvailable: false,
          capabilities: { readProject: true, writeScript: false },
          lastSeenAt: Date.now(),
          connector: { connectorVersion: "1.2.3" },
          studio: { placeName: "Obstacle Course" },
        }],
      },
    });

    render(
      <StudioPairControl connection={connection} refresh={refresh} notify={notify} />
    );

    fireEvent.click(screen.getByRole("button", { name: /Studio · Check/i }));
    fireEvent.click(screen.getByRole("tab", { name: /Roblox Studio MCP/i }));

    expect(screen.getByText("Connector connected, Roblox Studio MCP not detected")).toBeTruthy();
    expect(screen.getByText("Read project")).toBeTruthy();
    expect(screen.getByText("Supported")).toBeTruthy();
    expect(screen.getByText("Write scripts")).toBeTruthy();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    expect(screen.getByText("Obstacle Course")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Test connection/i }));
    await waitFor(() => {
      expect(testStudioMcp).toHaveBeenCalledWith({ sessionId: "mcp_degraded_1" });
    });

    fireEvent.click(screen.getByRole("button", { name: /Disconnect MCP/i }));
    await waitFor(() => {
      expect(disconnectStudioMcp).toHaveBeenCalledWith({ sessionId: "mcp_degraded_1" });
    });
  });

  test("clears stale MCP UI state when the server session is already gone", async () => {
    disconnectStudioMcp.mockRejectedValue({
      status: 404,
      code: "STUDIO_SESSION_NOT_FOUND",
      message: "The selected MCP session was not found.",
    });
    const refresh = jest.fn().mockRejectedValue(new Error("status refresh failed"));
    const notify = jest.fn();
    const connection = normalizeStudioConnectionSnapshot({
      mcpStatus: {
        sessions: [{
          id: "mcp_stale_1",
          connectionType: "mcp_local",
          status: "connected",
          live: true,
          connectorLive: true,
          mcpServerAvailable: true,
          lastSeenAt: Date.now(),
        }],
      },
    });

    render(<StudioPairControl connection={connection} refresh={refresh} notify={notify} />);
    fireEvent.click(screen.getByRole("button", { name: /Studio · MCP/i }));
    fireEvent.click(screen.getByRole("tab", { name: /Roblox Studio MCP/i }));
    fireEvent.click(screen.getByRole("button", { name: /Disconnect MCP/i }));

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith({
        message: "Roblox Studio MCP disconnected",
        type: "success",
      });
    });
    expect(notify).not.toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
  });

  test("shows reinstall instructions only when the backend rejects the release", () => {
    const connection = normalizeStudioConnectionSnapshot({
      pluginStatus: {
        compatibility: {
          status: "update_required",
          reasonCode: "release_not_supported",
          reasonCodes: ["release_not_supported"],
          installedPluginVersion: "0.10.0-verified-decoupled",
          installedProtocolVersion: "2026-06-20-creator-store",
        },
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

    render(<StudioPairControl connection={connection} refresh={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Studio · Update/i }));

    expect(screen.getAllByText("Studio plugin update required").length).toBeGreaterThan(0);
    expect(screen.getByText(/This plugin release is no longer supported/i)).toBeTruthy();
    expect(screen.getByText(/NexusRBXStudioBridge\.plugin\.lua/i)).toBeTruthy();
    expect(screen.getByText("Full manifest").parentElement.textContent).toContain("Unavailable");
  });

  test("makes a missing Create Instance command recoverable without disconnecting", () => {
    const refresh = jest.fn();
    const connection = normalizeStudioConnectionSnapshot({
      pluginStatus: {
        compatibility: {
          status: "degraded",
          missingCommands: ["create_instance"],
          missingCapabilities: ["instanceMutation"],
        },
        sessions: [{
          id: "plugin_missing_create_instance",
          connectionType: "plugin_bridge",
          status: "connected",
          live: true,
        }],
      },
    });

    render(<StudioPairControl connection={connection} refresh={refresh} />);
    fireEvent.click(screen.getByRole("button", { name: /Studio · Limited/i }));

    expect(screen.getByText("Update Studio plugin to use Create Instance")).toBeTruthy();
    expect(screen.getByText(/current NexusRBXStudioBridge\.plugin\.lua artifact/i)).toBeTruthy();
    expect(screen.getByText(/other supported Studio features remain available/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /View install steps/i }).getAttribute("href")).toBe("/docs/installation");

    fireEvent.click(screen.getByRole("button", { name: /Refresh connection/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
