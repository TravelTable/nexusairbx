import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  PersistentCommandJournal,
  type CommandJournalEntry,
} from "../src/command-journal.js";
import { ConnectorError } from "../src/errors.js";

const HASH = "a".repeat(64);

function entry(
  stage: CommandJournalEntry["stage"],
  overrides: Partial<CommandJournalEntry> = {},
): CommandJournalEntry {
  return {
    commandId: "command-1",
    commandType: "write_script",
    semanticInputHash: HASH,
    stage,
    updatedAt: Date.now(),
    ...overrides,
  };
}

test("command journal survives restart and replays an atomic terminal record", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nexusrbx-command-journal-"));
  const path = join(directory, "journal.json");
  try {
    const firstProcess = new PersistentCommandJournal({ path });
    await firstProcess.put(entry("received"));
    await firstProcess.put(entry("started"));
    await firstProcess.put(entry("terminal", {
      sessionId: "session",
      receiptId: "receipt-1",
      terminalStatus: "outcome_unknown",
      result: {
        success: false,
        verified: false,
        receiptId: "receipt-1",
        error: { code: "MCP_REQUEST_TIMEOUT", message: "Reconcile before retrying." },
      },
    }));

    const secondProcess = new PersistentCommandJournal({ path });
    const restored = await secondProcess.get("command-1");
    assert.equal(restored?.stage, "terminal");
    assert.equal(restored?.terminalStatus, "outcome_unknown");
    assert.deepEqual(restored?.result?.error, {
      code: "MCP_REQUEST_TIMEOUT",
      message: "Reconcile before retrying.",
    });
    assert.deepEqual(
      (await secondProcess.listPendingTerminalReceipts("session")).map(({ commandId }) => commandId),
      ["command-1"],
    );
    const acknowledged = await secondProcess.markTerminalReceiptAcknowledged(
      "command-1",
      "receipt-1",
    );
    assert.equal(typeof acknowledged.acknowledgedAt, "number");
    assert.deepEqual(await secondProcess.listPendingTerminalReceipts("session"), []);

    const document = JSON.parse(await readFile(path, "utf8")) as {
      version: number;
      entries: Record<string, unknown>;
    };
    assert.equal(document.version, 1);
    assert.equal(Object.keys(document.entries).length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("command journal is monotonic and rejects command ID reuse", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nexusrbx-command-journal-"));
  const path = join(directory, "journal.json");
  try {
    const journal = new PersistentCommandJournal({ path });
    await journal.put(entry("started"));

    const staleWrite = await journal.put(entry("received"));
    assert.equal(staleWrite.stage, "started");
    assert.equal((await journal.get("command-1"))?.stage, "started");

    await assert.rejects(
      journal.put(entry("received", { semanticInputHash: "b".repeat(64) })),
      (error: unknown) => error instanceof ConnectorError && error.code === "COMMAND_JOURNAL_CONFLICT",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("unacknowledged terminal receipts are never pruned", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nexusrbx-command-journal-"));
  const path = join(directory, "journal.json");
  const now = 10_000;
  try {
    const journal = new PersistentCommandJournal({
      path,
      maxEntries: 1,
      maxTerminalAgeMs: 1,
      now: () => now,
    });
    await journal.put(entry("terminal", {
      sessionId: "session",
      receiptId: "receipt-1",
      terminalStatus: "succeeded",
      result: { success: true, receiptId: "receipt-1" },
      updatedAt: 1,
    }));
    await journal.put(entry("received", {
      commandId: "command-2",
      commandType: "read_script",
      updatedAt: now,
    }));

    assert.equal((await journal.get("command-1"))?.receiptId, "receipt-1");
    assert.equal((await journal.listPendingTerminalReceipts("session")).length, 1);

    await journal.markTerminalReceiptAcknowledged("command-1", "receipt-1", now);
    assert.equal(await journal.get("command-1"), null);
    assert.equal((await journal.get("command-2"))?.stage, "received");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("command journal fails closed when persisted state is corrupt", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nexusrbx-command-journal-"));
  const path = join(directory, "journal.json");
  try {
    await writeFile(path, "{\"version\":1,\"entries\":", "utf8");
    const journal = new PersistentCommandJournal({ path });
    await assert.rejects(
      journal.get("command-1"),
      (error: unknown) => error instanceof ConnectorError && error.code === "COMMAND_JOURNAL_CORRUPT",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
