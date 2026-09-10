import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { join } from "node:path";
const HASH = /^[a-f0-9]{64}$/;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export class WorkspaceFiles {
  constructor(private directory: string) { mkdirSync(directory, { recursive: true }); }
  private path(hash: string) { if (!HASH.test(hash)) throw new Error("Invalid file hash."); return join(this.directory, hash); }
  put(input: Uint8Array, expected?: string) {
    const bytes = Buffer.from(input);
    if (bytes.length > MAX_FILE_BYTES) throw new Error("Files must be at most 10 MiB.");
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (expected && expected !== hash) throw new Error("The downloaded file failed its integrity check.");
    const path = this.path(hash);
    if (!existsSync(path)) { writeFileSync(`${path}.partial`, bytes, { mode: 0o600 }); renameSync(`${path}.partial`, path); }
    return { hash, bytes: bytes.length };
  }
  get(hash: string): Buffer | null {
    const path = this.path(hash); if (!existsSync(path)) return null;
    const bytes = readFileSync(path);
    if (createHash("sha256").update(bytes).digest("hex") !== hash) throw new Error("The local file failed its integrity check.");
    return bytes;
  }
}
