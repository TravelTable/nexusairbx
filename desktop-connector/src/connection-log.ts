import { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

/** Receives already-redacted lines from ConsoleLogger, serially in the main process. */
export function connectionLogSink(directory: string, maxBytes = 1_000_000): (line: string) => void {
  const current = join(directory, "connection.log");
  const previous = join(directory, "connection.1.log");
  const oldest = join(directory, "connection.2.log");
  return (line) => {
    mkdirSync(directory, { recursive: true });
    const entry = Buffer.from(`${new Date().toISOString()} ${line}\n`).subarray(0, maxBytes);
    if (existsSync(current) && statSync(current).size + entry.length > maxBytes) {
      rmSync(oldest, { force: true });
      if (existsSync(previous)) renameSync(previous, oldest);
      renameSync(current, previous);
    }
    appendFileSync(current, entry, { mode: 0o600 });
  };
}
