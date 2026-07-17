import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StudioPairControl, { getDesktopConnectorPairingLink, resolvePairingExpiry } from "./StudioPairControl";
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
});
