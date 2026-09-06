import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ConsoleLogger } from "nexusrbx-local-connector";
import { connectionLogSink } from "../src/connection-log.js";

test("connection logs retain at most three bounded files and redact before persistence", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "nexus-log-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const logger = new ConsoleLogger(false, connectionLogSink(directory, 200));
  logger.addSecret("private-session-value");
  for (let i = 0; i < 15; i++) logger.info("connection", { diagnostic: "private-session-value Bearer bearer-secret", i });
  const files = readdirSync(directory);
  assert.equal(files.length, 3);
  for (const name of files) {
    const file = join(directory, name);
    assert.ok(statSync(file).size <= 200);
    assert.doesNotMatch(readFileSync(file, "utf8"), /private-session-value|bearer-secret/);
  }
  assert.match(readFileSync(join(directory, "connection.log"), "utf8"), /"i":14/);
});

test("unwritable connection logs do not interrupt the session", () => {
  const logger = new ConsoleLogger(false, () => { throw new Error("disk full"); });
  assert.doesNotThrow(() => logger.warn("Still running"));
});
