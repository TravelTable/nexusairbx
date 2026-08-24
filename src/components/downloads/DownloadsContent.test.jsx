import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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

function setPlatform(value, userAgent = value) {
  Object.defineProperty(window.navigator, "platform", { configurable: true, value });
  Object.defineProperty(window.navigator, "userAgent", { configurable: true, value: userAgent });
}

describe("DownloadsContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform("MacIntel", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
  });

  afterEach(() => {
    delete global.fetch;
  });

  test("recommends the visitor platform and keeps the alternate installer one click away", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => releaseManifest });
    render(<DownloadsContent />);

    const macDownload = await screen.findByRole("link", { name: "Download macOS (Universal)" });
    expect(macDownload.getAttribute("href")).toBe("/connector/NexusRBX-Connector-0.1.0-macOS.dmg");
    expect(screen.getByText("Detected for this machine").closest("article")?.textContent).toContain("macOS");
    expect(screen.getAllByText("v0.1.0").length).toBeGreaterThan(0);
    expect(screen.getByText("Apple Silicon (M1 or newer)")).toBeTruthy();
    expect(screen.getByText("Intel Mac")).toBeTruthy();
    expect(screen.getByText(/Only the current verified release is offered/)).toBeTruthy();
    expect(screen.getByText("Developer ID signed and Apple notarized")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "View Windows (64-bit) download" }));
    const windowsDownload = screen.getByRole("link", { name: "Download Windows (64-bit)" });
    expect(windowsDownload.getAttribute("href")).toBe("/connector/NexusRBX-Connector-0.1.0-Windows.exe");
    expect(screen.getByText("Intel or AMD x64 PC")).toBeTruthy();
    expect(screen.getAllByText(/Unknown publisher/).length).toBeGreaterThan(0);
    expect(screen.getByText(/downloads updates in the background/)).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledWith(
      "/connector/latest.json",
      expect.objectContaining({ credentials: "omit", cache: "no-store" })
    );
  });

  test("keeps every installer disabled when the feed is unavailable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline"));
    render(<DownloadsContent />);

    expect((await screen.findByRole("alert")).textContent).toContain("Downloads temporarily unavailable");
    await waitFor(() => expect(screen.getByRole("button", { name: "macOS (Universal) unavailable" }).disabled).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "View Windows (64-bit) download" }));
    expect(screen.getByRole("button", { name: "Windows (64-bit) unavailable" }).disabled).toBe(true);
    expect(screen.queryByRole("link", { name: /Download for/i })).toBeNull();
  });

  test("tracks only the public page and detected platform before a download", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline"));
    setPlatform("Win32", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
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
