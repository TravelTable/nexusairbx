import { render, screen } from "@testing-library/react";

import DownloadsContent from "./DownloadsContent";
import { trackProductEvent } from "../../lib/productAnalytics";

const fs = require("fs");
const path = require("path");
const downloadsCss = fs.readFileSync(
  path.join(__dirname, "DownloadsLedger.module.css"),
  "utf8",
);

jest.mock("../../lib/productAnalytics", () => ({
  trackProductEvent: jest.fn(() => Promise.resolve()),
}));

describe("DownloadsContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("is a plugin page that sends people to the Creator Store", () => {
    render(<DownloadsContent />);

    expect(screen.getByRole("heading", { level: 1, name: "NexusRBX Ai" })).toBeTruthy();
    const pluginLink = screen.getByRole("link", { name: "Open in Studio" });
    expect(pluginLink.getAttribute("href")).toBe("https://create.roblox.com/store/asset/83865885181263/NexusRBX-Ai");
    expect(pluginLink.getAttribute("target")).toBe("_blank");
    expect(document.body.innerHTML).not.toMatch(/\/studio-plugin\/NexusRBXStudioBridge\.rbxmx/);
    expect(screen.getByRole("heading", { level: 2, name: "Install" })).toBeTruthy();
    expect(screen.getByText("Open the listing")).toBeTruthy();
    expect(screen.getByText("Add it to your account")).toBeTruthy();
    expect(screen.getByText("Open it beside the place")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Install steps" }).getAttribute("href")).toBe("#install");
    expect(screen.queryByRole("heading", { name: /Connector/i })).toBeNull();
  });

  test("tracks the public page view without connector or credential data", () => {
    render(<DownloadsContent />);

    expect(trackProductEvent).toHaveBeenCalledWith("downloads_page_viewed", {}, expect.any(Object));
    expect(trackProductEvent).not.toHaveBeenCalledWith(
      "connector_platform_detected",
      expect.anything(),
      expect.anything(),
    );
    expect(JSON.stringify(trackProductEvent.mock.calls)).not.toMatch(/token|pairing|session/i);
  });

  test("keeps the store action out of the pill component language", () => {
    const primaryRule = downloadsCss.match(/[.]primary\s*\{([^}]*)\}/s)?.[1];

    expect(primaryRule).toBeTruthy();
    expect(primaryRule).toMatch(/border-radius:\s*8px\s*;/);
    expect(primaryRule).not.toMatch(/radius-pill|9999px|9999rem/i);
  });
});
