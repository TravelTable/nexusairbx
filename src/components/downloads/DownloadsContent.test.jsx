import { render, screen, waitFor } from "@testing-library/react";

import DownloadsContent from "./DownloadsContent";
import { trackProductEvent } from "../../lib/productAnalytics";

jest.mock("../../lib/productAnalytics", () => ({
  trackProductEvent: jest.fn(() => Promise.resolve()),
}));

const releaseManifest = {
  version: "0.1.0",
  publishedAt: "2026-07-14T10:00:00.000Z",
  platforms: {
    macos: {
      url: "https://downloads.nexusrbx.com/connector/NexusRBX-Connector-0.1.0-macOS.dmg",
      architectures: ["x64", "arm64"],
      verification: "developer_id_notarized",
      size: 104857600,
      sha256: "a".repeat(64),
    },
    windows: {
      url: "https://downloads.nexusrbx.com/connector/NexusRBX-Connector-0.1.0-Windows.exe",
      architectures: ["x64"],
      verification: "unsigned",
      size: 94371840,
      sha256: "b".repeat(64),
    },
  },
};

function setPlatform(value) {
  Object.defineProperty(window.navigator, "platform", { configurable: true, value });
}

describe("DownloadsContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform("MacIntel");
  });

  afterEach(() => {
    delete global.fetch;
  });

  test("recommends the visitor platform and enables both verified installers", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => releaseManifest });
    render(<DownloadsContent />);

    const macDownload = await screen.findByRole("link", { name: "Download for macOS" });
    const windowsDownload = screen.getByRole("link", { name: "Download for Windows" });
    expect(macDownload.getAttribute("href")).toBe(releaseManifest.platforms.macos.url);
    expect(windowsDownload.getAttribute("href")).toBe(releaseManifest.platforms.windows.url);
    expect(screen.getByText("Recommended").closest("article")?.textContent).toContain("macOS");
    expect(screen.getByText("Developer ID signed and Apple notarized")).toBeTruthy();
    expect(screen.getByText(/Unknown publisher/)).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledWith(
      "https://downloads.nexusrbx.com/connector/latest.json",
      expect.objectContaining({ credentials: "omit", cache: "no-store" })
    );
  });

  test("keeps every installer disabled when the feed is unavailable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline"));
    render(<DownloadsContent />);

    expect((await screen.findByRole("alert")).textContent).toContain("Downloads temporarily unavailable");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "macOS unavailable" }).disabled).toBe(true);
      expect(screen.getByRole("button", { name: "Windows unavailable" }).disabled).toBe(true);
    });
    expect(screen.queryByRole("link", { name: /Download for/i })).toBeNull();
  });

  test("tracks only the public page and detected platform before a download", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline"));
    setPlatform("Win32");
    render(<DownloadsContent />);
    await screen.findByRole("alert");

    expect(trackProductEvent).toHaveBeenCalledWith("downloads_page_viewed", {}, expect.any(Object));
    expect(trackProductEvent).toHaveBeenCalledWith(
      "connector_platform_detected",
      { platform: "windows" },
      expect.any(Object)
    );
    expect(JSON.stringify(trackProductEvent.mock.calls)).not.toMatch(/token|pairing|session/i);
  });
});
