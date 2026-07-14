import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("Release directory is required.");

const releaseRoot = resolve(dir);
const checksumFile = await readFile(join(releaseRoot, "checksums.txt"), "utf8");
const entries = checksumFile.trim().split("\n").filter(Boolean);

if (entries.length === 0) throw new Error("checksums.txt does not contain any release artifacts.");

for (const entry of entries) {
  const match = entry.match(/^([a-f0-9]{64}) {2}(.+)$/i);
  if (!match) throw new Error(`Invalid checksum entry: ${entry}`);

  const [, expected, name] = match;
  const artifactPath = resolve(releaseRoot, name);
  if (!artifactPath.startsWith(`${releaseRoot}${sep}`)) throw new Error(`Unsafe artifact path: ${name}`);

  const actual = createHash("sha256").update(await readFile(artifactPath)).digest("hex");
  if (actual !== expected.toLowerCase()) throw new Error(`Checksum mismatch for ${name}`);
}

console.log(`Verified ${entries.length} release artifact checksum${entries.length === 1 ? "" : "s"}.`);
