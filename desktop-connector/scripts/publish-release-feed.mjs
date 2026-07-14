import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const [dir] = process.argv.slice(2);
const uploadBase = process.env.NEXUSRBX_RELEASE_FEED_URL?.replace(/\/$/, "");
const publicBase = (process.env.NEXUSRBX_PUBLIC_RELEASE_BASE_URL || "https://downloads.nexusrbx.com/connector").replace(/\/$/, "");
const token = process.env.NEXUSRBX_RELEASE_FEED_TOKEN;

if (!dir || !uploadBase || !token) {
  throw new Error("Release directory, NEXUSRBX_RELEASE_FEED_URL, and NEXUSRBX_RELEASE_FEED_TOKEN are required.");
}
if (!uploadBase.startsWith("https://") || !publicBase.startsWith("https://")) {
  throw new Error("Release upload and public feed URLs must use HTTPS.");
}

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const version = packageJson.version;
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error("Connector package version is invalid.");

const contentTypes = {
  ".blockmap": "application/octet-stream",
  ".dmg": "application/x-apple-diskimage",
  ".exe": "application/vnd.microsoft.portable-executable",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".zip": "application/zip",
};
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
const STABLE_CACHE = "public, max-age=300, must-revalidate";

function checksum(body) {
  return createHash("sha256").update(body).digest("hex");
}

async function publish(name, body, cacheControl) {
  const response = await fetch(`${uploadBase}/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "access-control-allow-origin": "*",
      "cache-control": cacheControl,
      "content-type": contentTypes[extname(name).toLowerCase()] || "application/octet-stream",
      "x-checksum-sha256": checksum(body),
    },
    body,
  });
  if (!response.ok) throw new Error(`Could not publish ${name}: ${response.status}`);
}

const names = (await readdir(dir))
  .filter((name) => /\.(dmg|exe|zip|yml|blockmap|txt)$/i.test(name))
  .sort();
const macInstallers = names.filter((name) => name.toLowerCase().endsWith(".dmg"));
const windowsInstallers = names.filter((name) => name.toLowerCase().endsWith(".exe"));
if (macInstallers.length !== 1 || windowsInstallers.length !== 1) {
  throw new Error("A release must contain exactly one macOS .dmg and one Windows .exe installer.");
}

// Read and validate the complete release before the first remote write.
const bodies = new Map(await Promise.all(names.map(async (name) => [name, await readFile(join(dir, name))])));
for (const [name, body] of bodies) {
  if (body.length === 0) throw new Error(`${name} is empty.`);
}

const macBody = bodies.get(macInstallers[0]);
const windowsBody = bodies.get(windowsInstallers[0]);
const versioned = {
  macos: `NexusRBX-Connector-${version}-macOS.dmg`,
  windows: `NexusRBX-Connector-${version}-Windows.exe`,
};

// Versioned files are written first. The existing latest.json remains a valid
// rollback point until every new stable object has been uploaded successfully.
for (const [name, body] of bodies) {
  if (/^latest(?:-mac)?\.yml$/i.test(name) || name === "checksums.txt") continue;
  await publish(name, body, IMMUTABLE_CACHE);
}
await publish(versioned.macos, macBody, IMMUTABLE_CACHE);
await publish(versioned.windows, windowsBody, IMMUTABLE_CACHE);

// Auto-updater metadata and human-friendly aliases are intentionally short-lived.
for (const [name, body] of bodies) {
  if (/^latest(?:-mac)?\.yml$/i.test(name) || name === "checksums.txt") await publish(name, body, STABLE_CACHE);
}
const stableAliases = [
  ["NexusRBX-Connector-macOS.dmg", macBody],
  ["NexusRBX-Connector-Windows.exe", windowsBody],
  // Compatibility aliases retained for this release.
  ["NexusRBX-Companion-macOS.dmg", macBody],
  ["NexusRBX-Companion-Windows.exe", windowsBody],
];
for (const [name, body] of stableAliases) await publish(name, body, STABLE_CACHE);

// The public manifest is the final write and therefore the release commit point.
const latest = Buffer.from(`${JSON.stringify({
  version,
  publishedAt: new Date().toISOString(),
  platforms: {
    macos: {
      url: `${publicBase}/${versioned.macos}`,
      architectures: ["x64", "arm64"],
      size: macBody.length,
      sha256: checksum(macBody),
    },
    windows: {
      url: `${publicBase}/${versioned.windows}`,
      architectures: ["x64"],
      size: windowsBody.length,
      sha256: checksum(windowsBody),
    },
  },
}, null, 2)}\n`);
await publish("latest.json", latest, STABLE_CACHE);

console.log(`Published NexusRBX Connector ${version} for macOS and Windows.`);
