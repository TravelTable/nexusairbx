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
    expect(normalized.platforms.mac.verification).toBe("developer_id_notarized");
    expect(normalized.platforms.windows.verification).toBe("unsigned");
    expect(formatCompanionFileSize(normalized.platforms.mac.size)).toBe("100 MB");
  });

  test("accepts manifests published with the stable Vercel release origin", () => {
    const stableManifest = {
      ...manifest,
      platforms: {
        macos: { ...manifest.platforms.macos, url: manifest.platforms.macos.url.replace("downloads.nexusrbx.com", "nexusairbx.vercel.app") },
        windows: { ...manifest.platforms.windows, url: manifest.platforms.windows.url.replace("downloads.nexusrbx.com", "nexusairbx.vercel.app") },
      },
    };
    expect(normalizeCompanionManifest(stableManifest).platforms.windows.url).toContain("nexusairbx.vercel.app");
  });

  test.each([
    ["a missing platform", { ...manifest, platforms: { macos: manifest.platforms.macos } }],
    ["an off-domain URL", { ...manifest, platforms: { ...manifest.platforms, windows: { ...manifest.platforms.windows, url: "https://example.com/installer.exe" } } }],
    ["a wrong extension", { ...manifest, platforms: { ...manifest.platforms, windows: { ...manifest.platforms.windows, url: "https://downloads.nexusrbx.com/connector/installer.zip" } } }],
    ["a mismatched release version", { ...manifest, platforms: { ...manifest.platforms, windows: { ...manifest.platforms.windows, url: "https://downloads.nexusrbx.com/connector/NexusRBX-Connector-9.9.9-Windows.exe" } } }],
    ["a URL with query parameters", { ...manifest, platforms: { ...manifest.platforms, windows: { ...manifest.platforms.windows, url: `${manifest.platforms.windows.url}?source=untrusted` } } }],
    ["an invalid checksum", { ...manifest, platforms: { ...manifest.platforms, macos: { ...manifest.platforms.macos, sha256: "bad" } } }],
    ["an invalid verification claim", { ...manifest, platforms: { ...manifest.platforms, windows: { ...manifest.platforms.windows, verification: "authenticode_signed" } } }],
  ])("rejects %s", (_, candidate) => {
    expect(() => normalizeCompanionManifest(candidate)).toThrow();
  });

  test("fetches without credentials and validates before returning", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => manifest });
    const result = await fetchCompanionManifest({ fetchImpl });
    expect(result.version).toBe("0.1.0");
    expect(result.platforms.mac.url).toBe("/connector/NexusRBX-Connector-0.1.0-macOS.dmg");
    expect(result.platforms.windows.url).toBe("/connector/NexusRBX-Connector-0.1.0-Windows.exe");
    expect(fetchImpl).toHaveBeenCalledWith(COMPANION_MANIFEST_URL, expect.objectContaining({ credentials: "omit", cache: "no-store" }));
  });

  test("fails closed when the feed is unavailable", async () => {
    await expect(fetchCompanionManifest({ fetchImpl: jest.fn().mockResolvedValue({ ok: false }) })).rejects.toThrow("manifest_unavailable");
  });
});
