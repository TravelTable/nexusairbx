export const COMPANION_RELEASE_PATH = "/connector";
export const COMPANION_RELEASE_BASE_URL = "https://nexusairbx.vercel.app/connector";
export const COMPANION_MANIFEST_URL = `${COMPANION_RELEASE_PATH}/latest.json`;

const TRUSTED_COMPANION_RELEASE_BASE_URLS = Object.freeze([
  COMPANION_RELEASE_BASE_URL,
  // Existing signed manifests use the original custom download host. Keep it
  // trusted while routing the actual file through the working same-origin proxy.
  "https://downloads.nexusrbx.com/connector",
]);

export const COMPANION_DOWNLOADS = Object.freeze({
  mac: Object.freeze({
    platform: "mac",
    manifestKey: "macos",
    label: "Download for macOS",
    detail: "Universal — Intel and Apple Silicon",
    extension: ".dmg",
    verification: "developer_id_notarized",
    architectures: Object.freeze(["x64", "arm64"]),
  }),
  windows: Object.freeze({
    platform: "windows",
    manifestKey: "windows",
    label: "Download for Windows",
    detail: "Windows 10/11 — 64-bit",
    extension: ".exe",
    verification: "unsigned",
    architectures: Object.freeze(["x64"]),
  }),
});

export function detectCompanionPlatform({ userAgent = "", platform = "" } = {}) {
  const fingerprint = `${platform} ${userAgent}`.toLowerCase();
  if (/windows|win32|win64/.test(fingerprint)) return "windows";
  if (/macintosh|mac os|macintel|darwin/.test(fingerprint)) return "mac";
  return null;
}

export function getPreferredCompanionDownload(environment = {}) {
  const platform = detectCompanionPlatform(environment);
  return platform ? COMPANION_DOWNLOADS[platform] : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePlatform(value, definition, version, downloadBaseUrl) {
  if (!value || typeof value !== "object") throw new Error("missing_platform");
  const url = typeof value.url === "string" ? value.url : "";
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (_) {
    throw new Error("invalid_download_url");
  }
  const trustedBase = TRUSTED_COMPANION_RELEASE_BASE_URLS.some((baseUrl) => {
    const allowedBase = new URL(`${baseUrl}/`);
    return parsedUrl.protocol === "https:"
      && parsedUrl.origin === allowedBase.origin
      && parsedUrl.pathname.startsWith(allowedBase.pathname);
  });
  const expectedSuffix = definition.platform === "mac" ? "macOS.dmg" : "Windows.exe";
  const expectedFilename = `NexusRBX-Connector-${version}-${expectedSuffix}`;
  const actualFilename = parsedUrl.pathname.split("/").pop() || "";
  const expectedPattern = new RegExp(`^${escapeRegExp(expectedFilename)}$`);
  if (!trustedBase || !expectedPattern.test(actualFilename) || parsedUrl.search || parsedUrl.hash) {
    throw new Error("invalid_download_url");
  }

  const architectures = Array.isArray(value.architectures) ? value.architectures : [];
  if (
    architectures.length !== definition.architectures.length ||
    !definition.architectures.every((architecture) => architectures.includes(architecture))
  ) {
    throw new Error("invalid_architectures");
  }
  if (!Number.isSafeInteger(value.size) || value.size <= 0) throw new Error("invalid_size");
  if (value.verification !== definition.verification) throw new Error("invalid_verification");
  if (typeof value.sha256 !== "string" || !/^[a-f\d]{64}$/i.test(value.sha256)) {
    throw new Error("invalid_checksum");
  }

  return Object.freeze({
    ...definition,
    url: downloadBaseUrl ? `${downloadBaseUrl.replace(/\/$/, "")}/${actualFilename}` : parsedUrl.href,
    size: value.size,
    sha256: value.sha256.toLowerCase(),
    architectures: Object.freeze([...architectures]),
  });
}

export function normalizeCompanionManifest(value, { downloadBaseUrl } = {}) {
  if (!value || typeof value !== "object") throw new Error("invalid_manifest");
  if (typeof value.version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value.version)) {
    throw new Error("invalid_version");
  }
  if (typeof value.publishedAt !== "string" || !Number.isFinite(Date.parse(value.publishedAt))) {
    throw new Error("invalid_published_at");
  }

  return Object.freeze({
    version: value.version,
    publishedAt: value.publishedAt,
    platforms: Object.freeze({
      mac: normalizePlatform(value.platforms?.macos, COMPANION_DOWNLOADS.mac, value.version, downloadBaseUrl),
      windows: normalizePlatform(value.platforms?.windows, COMPANION_DOWNLOADS.windows, value.version, downloadBaseUrl),
    }),
  });
}

export async function fetchCompanionManifest({ fetchImpl, signal } = {}) {
  const request = fetchImpl || (typeof fetch === "function" ? fetch : null);
  if (typeof request !== "function") throw new Error("fetch_unavailable");
  const response = await request(COMPANION_MANIFEST_URL, {
    method: "GET",
    cache: "no-store",
    credentials: "omit",
    signal,
  });
  if (!response?.ok) throw new Error("manifest_unavailable");
  return normalizeCompanionManifest(await response.json(), { downloadBaseUrl: COMPANION_RELEASE_PATH });
}

export function formatCompanionFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes >= 100 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
}
