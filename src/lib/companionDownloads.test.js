import {
  COMPANION_MANIFEST_URL,
  detectCompanionPlatform,
  fetchCompanionManifest,
  formatCompanionFileSize,
  normalizeCompanionManifest,
} from "./companionDownloads";

const manifest = {
  version: "0.1.0",
  publishedAt: "2026-07-14T10:00:00.000Z",
  platforms: {
    macos: {
      url: "https://downloads.nexusrbx.com/connector/NexusRBX-Connector-0.1.0-macOS.dmg",
      architectures: ["x64", "arm64"],
      size: 104857600,
      sha256: "a".repeat(64),
    },
    windows: {
      url: "https://downloads.nexusrbx.com/connector/NexusRBX-Connector-0.1.0-Windows.exe",
      architectures: ["x64"],
      size: 94371840,
      sha256: "b".repeat(64),
    },
  },
};

describe("companion downloads", () => {
  test.each([
    [{ platform: "MacIntel" }, "mac"],
    [{ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)" }, "mac"],
    [{ platform: "Win32" }, "windows"],
    [{ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }, "windows"],
    [{ platform: "Linux x86_64" }, null],
  ])("detects the supported desktop platform", (environment, expected) => {
    expect(detectCompanionPlatform(environment)).toBe(expected);
  });

  test("accepts a complete public manifest", () => {
    const normalized = normalizeCompanionManifest(manifest);
    expect(normalized.platforms.mac.url).toMatch(/\.dmg$/);
    expect(normalized.platforms.windows.url).toMatch(/\.exe$/);
    expect(formatCompanionFileSize(normalized.platforms.mac.size)).toBe("100 MB");
  });

  test.each([
    ["a missing platform", { ...manifest, platforms: { macos: manifest.platforms.macos } }],
    ["an off-domain URL", { ...manifest, platforms: { ...manifest.platforms, windows: { ...manifest.platforms.windows, url: "https://example.com/installer.exe" } } }],
    ["a wrong extension", { ...manifest, platforms: { ...manifest.platforms, windows: { ...manifest.platforms.windows, url: "https://downloads.nexusrbx.com/connector/installer.zip" } } }],
    ["an invalid checksum", { ...manifest, platforms: { ...manifest.platforms, macos: { ...manifest.platforms.macos, sha256: "bad" } } }],
  ])("rejects %s", (_, candidate) => {
    expect(() => normalizeCompanionManifest(candidate)).toThrow();
  });

  test("fetches without credentials and validates before returning", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => manifest });
    const result = await fetchCompanionManifest({ fetchImpl });
    expect(result.version).toBe("0.1.0");
    expect(fetchImpl).toHaveBeenCalledWith(COMPANION_MANIFEST_URL, expect.objectContaining({ credentials: "omit", cache: "no-store" }));
  });

  test("fails closed when the feed is unavailable", async () => {
    await expect(fetchCompanionManifest({ fetchImpl: jest.fn().mockResolvedValue({ ok: false }) })).rejects.toThrow("manifest_unavailable");
  });
});
