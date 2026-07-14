import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
const dir = process.argv[2];
if (!dir) throw new Error("Release directory is required.");
const names = (await readdir(dir)).filter((name) => /\.(dmg|exe|zip|yml|blockmap)$/i.test(name)).sort();
const lines = await Promise.all(names.map(async (name) => `${createHash("sha256").update(await readFile(join(dir, name))).digest("hex")}  ${name}`));
await writeFile(join(dir, "checksums.txt"), `${lines.join("\n")}\n`);
