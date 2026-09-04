import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const repositoryDirectory = fileURLToPath(new URL("../..", import.meta.url));

async function readPackage(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, `file://${repositoryDirectory}/`), "utf8"));
}

const [desktopPackage, localPackage, versionSource] = await Promise.all([
  readPackage("desktop-connector/package.json"),
  readPackage("local-connector/package.json"),
  readFile(new URL("../../local-connector/src/version.ts", import.meta.url), "utf8"),
]);

const sourceVersion = versionSource.match(/CONNECTOR_VERSION\s*=\s*["']([^"']+)["']/)?.[1];
const sourceProtocol = versionSource.match(/CONNECTOR_PROTOCOL_VERSION\s*=\s*["']([^"']+)["']/)?.[1];
const expectedVersion = desktopPackage.version;
const releaseProtocols = new Map([
  ["0.2.11", "2026-07-17-mcp-parity"],
  ["0.2.12", "2026-07-17-mcp-parity"],
  ["0.2.13", "2026-07-17-mcp-parity"],
  ["0.2.14", "2026-07-17-mcp-parity"],
  ["0.2.15", "2026-07-17-mcp-parity"],
  ["0.2.16", "2026-07-17-mcp-parity"],
  ["0.2.17", "2026-07-17-mcp-parity"],
  ["0.3.0", "2026-07-17-mcp-parity"],
  ["0.3.1", "2026-07-17-mcp-parity"],
]);
const expectedProtocol = releaseProtocols.get(expectedVersion);
if (!sourceVersion || localPackage.version !== expectedVersion || sourceVersion !== expectedVersion) {
  throw new Error(`Connector version mismatch: desktop=${expectedVersion}, local=${localPackage.version}, runtime=${sourceVersion ?? "missing"}.`);
}
if (!expectedProtocol || sourceProtocol !== expectedProtocol) {
  throw new Error(`Connector protocol mismatch for ${expectedVersion}: expected=${expectedProtocol ?? "unmapped"}, runtime=${sourceProtocol ?? "missing"}.`);
}

const releaseTag = process.env.GITHUB_REF_TYPE === "tag" ? process.env.GITHUB_REF_NAME : process.env.NEXUSRBX_RELEASE_TAG;
if (releaseTag && releaseTag !== `connector-v${expectedVersion}`) {
  throw new Error(`Release tag mismatch: expected connector-v${expectedVersion}, received ${releaseTag}.`);
}

console.log(`Connector release version verified: ${expectedVersion} (${sourceProtocol}).`);
