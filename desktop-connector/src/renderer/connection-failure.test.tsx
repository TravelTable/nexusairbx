import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { McpUnavailableView } from "./App";
import type { CompanionSnapshot } from "../contracts";

it("shows the actual stale-client recovery steps and invokes Try Again", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const retry = vi.fn(async () => undefined);
  const snapshot = {
    state: "studio_mcp_unavailable", connectorVersion: "0.3.5", cloudHealth: "connected", runtimeHealth: "connected",
    connectionFailure: { code: "MCP_CLIENT_OUTDATED", stage: "studio_target", diagnostic: "Client proxy is out of date, restart to update" },
  } as CompanionSnapshot;
  try {
    await act(async () => root.render(<McpUnavailableView snapshot={snapshot} busy={false} retry={retry} />));
    expect(host.textContent).toContain("Restart or update Roblox Studio");
    expect(host.textContent).toContain("Save your experience");
    expect(host.textContent).not.toContain("Not Attached");
    const button = [...host.querySelectorAll("button")].find(item => item.textContent?.includes("Try Again"))!;
    await act(async () => button.click());
    expect(retry).toHaveBeenCalledTimes(1);
    await act(async () => root.render(<McpUnavailableView snapshot={snapshot} busy={true} retry={retry} />));
    expect(button.disabled).toBe(true);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
