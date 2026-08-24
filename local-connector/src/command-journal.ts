import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { ConnectorError } from "./errors.js";
import type { CommandReceiptStatus, JsonObject } from "./types.js";

const JOURNAL_VERSION = 1;
const DEFAULT_MAX_ENTRIES = 2_000;
const DEFAULT_MAX_TERMINAL_AGE_MS = 30 * 24 * 60 * 60 * 1_000;

export type CommandJournalStage = "received" | "started" | "terminal";
export type TerminalCommandReceiptStatus = Extract<
  CommandReceiptStatus,
  "succeeded" | "failed" | "outcome_unknown"
>;

export interface CommandJournalEntry {
  commandId: string;
  commandType: string;
  semanticInputHash: string;
  stage: CommandJournalStage;
  sessionId?: string;
  receiptId?: string;
  terminalStatus?: TerminalCommandReceiptStatus;
  result?: JsonObject;
  acknowledgedAt?: number;
  updatedAt: number;
}

export interface CommandJournalLike {
  get(commandId: string): Promise<CommandJournalEntry | null>;
  put(entry: CommandJournalEntry): Promise<CommandJournalEntry>;
  listPendingTerminalReceipts(sessionId: string): Promise<CommandJournalEntry[]>;
  markTerminalReceiptAcknowledged(
    commandId: string,
    receiptId: string,
    acknowledgedAt?: number,
  ): Promise<CommandJournalEntry>;
  ensureTerminalReceipt(
    commandId: string,
    receiptId: string,
    result: JsonObject,
  ): Promise<CommandJournalEntry>;
}

interface JournalDocument {
  version: number;
  entries: Record<string, CommandJournalEntry>;
}

export interface PersistentCommandJournalOptions {
  path?: string;
  maxEntries?: number;
  maxTerminalAgeMs?: number;
  now?: () => number;
}

/**
 * Durable command state for at-most-once MCP mutation execution.
 *
 * The journal deliberately stores no command payloads or connector credentials.
 * A terminal result is retained so a backend acknowledgement can be replayed
 * after a process restart without executing the Studio command again.
 */
export class PersistentCommandJournal implements CommandJournalLike {
  readonly path: string;
  readonly #maxEntries: number;
  readonly #maxTerminalAgeMs: number;
  readonly #now: () => number;
  #document: JournalDocument | null = null;
  #queue: Promise<void> = Promise.resolve();

  constructor(options: PersistentCommandJournalOptions = {}) {
    this.path = options.path ?? defaultCommandJournalPath();
    this.#maxEntries = positiveInteger(options.maxEntries, DEFAULT_MAX_ENTRIES);
    this.#maxTerminalAgeMs = positiveInteger(options.maxTerminalAgeMs, DEFAULT_MAX_TERMINAL_AGE_MS);
    this.#now = options.now ?? Date.now;
  }

  get(commandId: string): Promise<CommandJournalEntry | null> {
    return this.exclusive(async () => {
      const document = await this.load();
      const entry = document.entries[commandId];
      return entry ? cloneEntry(entry) : null;
    });
  }

  listPendingTerminalReceipts(sessionId: string): Promise<CommandJournalEntry[]> {
    return this.exclusive(async () => {
      const normalizedSessionId = requiredString(sessionId);
      const document = await this.load();
      return Object.values(document.entries)
        .filter((entry) => (
          entry.stage === "terminal" &&
          entry.sessionId === normalizedSessionId &&
          entry.receiptId !== undefined &&
          entry.acknowledgedAt === undefined
        ))
        .sort((left, right) => left.updatedAt - right.updatedAt)
        .map(cloneEntry);
    });
  }

  put(entry: CommandJournalEntry): Promise<CommandJournalEntry> {
    return this.exclusive(async () => {
      validateEntry(entry);
      const document = await this.load();
      const current = document.entries[entry.commandId];
      if (current && (
        current.commandType !== entry.commandType ||
        current.semanticInputHash !== entry.semanticInputHash
      )) {
        throw new ConnectorError(
          "COMMAND_JOURNAL_CONFLICT",
          "A command ID was reused with different semantic input.",
          { details: { commandId: entry.commandId } },
        );
      }
      if (current?.stage === "terminal") return cloneEntry(current);
      if (current && stageRank(current.stage) > stageRank(entry.stage)) return cloneEntry(current);

      document.entries[entry.commandId] = cloneEntry(entry);
      this.prune(document);
      await this.persist(document);
      return cloneEntry(document.entries[entry.commandId] ?? entry);
    });
  }

  markTerminalReceiptAcknowledged(
    commandId: string,
    receiptId: string,
    acknowledgedAt = this.#now(),
  ): Promise<CommandJournalEntry> {
    return this.exclusive(async () => {
      const normalizedCommandId = requiredString(commandId);
      const normalizedReceiptId = requiredString(receiptId);
      requiredTimestamp(acknowledgedAt);
      const document = await this.load();
      const current = document.entries[normalizedCommandId];
      if (
        !current ||
        current.stage !== "terminal" ||
        current.receiptId !== normalizedReceiptId
      ) {
        throw new ConnectorError(
          "COMMAND_JOURNAL_RECEIPT_MISMATCH",
          "The terminal command receipt does not match the durable safety journal.",
          { details: { commandId: normalizedCommandId } },
        );
      }
      if (current.acknowledgedAt !== undefined) return cloneEntry(current);

      const acknowledged = { ...current, acknowledgedAt };
      validateEntry(acknowledged);
      document.entries[normalizedCommandId] = acknowledged;
      this.prune(document);
      await this.persist(document);
      return cloneEntry(document.entries[normalizedCommandId] ?? acknowledged);
    });
  }

  ensureTerminalReceipt(
    commandId: string,
    receiptId: string,
    result: JsonObject,
  ): Promise<CommandJournalEntry> {
    return this.exclusive(async () => {
      const normalizedCommandId = requiredString(commandId);
      const normalizedReceiptId = requiredString(receiptId);
      if (!isJsonObject(result)) {
        throw new ConnectorError("COMMAND_JOURNAL_CORRUPT", "The terminal command receipt is invalid.");
      }
      const document = await this.load();
      const current = document.entries[normalizedCommandId];
      if (!current || current.stage !== "terminal") {
        throw new ConnectorError(
          "COMMAND_JOURNAL_RECEIPT_MISMATCH",
          "The terminal command receipt does not match the durable safety journal.",
          { details: { commandId: normalizedCommandId } },
        );
      }
      if (current.receiptId && current.receiptId !== normalizedReceiptId) {
        throw new ConnectorError(
          "COMMAND_JOURNAL_RECEIPT_MISMATCH",
          "The terminal command receipt conflicts with the durable safety journal.",
          { details: { commandId: normalizedCommandId } },
        );
      }
      const persistedResult = current.receiptId && current.result ? current.result : result;
      const migrated: CommandJournalEntry = {
        ...current,
        receiptId: current.receiptId ?? normalizedReceiptId,
        result: persistedResult,
        updatedAt: this.#now(),
      };
      validateEntry(migrated);
      document.entries[normalizedCommandId] = migrated;
      await this.persist(document);
      return cloneEntry(migrated);
    });
  }

  private async load(): Promise<JournalDocument> {
    if (this.#document) return this.#document;
    let raw: string;
    try {
      raw = await readFile(this.path, "utf8");
    } catch (error) {
      if (isMissingFile(error)) {
        this.#document = { version: JOURNAL_VERSION, entries: {} };
        return this.#document;
      }
      throw new ConnectorError("COMMAND_JOURNAL_READ_FAILED", "The command safety journal could not be read.", {
        cause: error,
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new ConnectorError(
        "COMMAND_JOURNAL_CORRUPT",
        "The command safety journal is corrupt; Studio mutations are paused.",
        { cause: error },
      );
    }
    if (!isRecord(parsed) || parsed.version !== JOURNAL_VERSION || !isRecord(parsed.entries)) {
      throw new ConnectorError(
        "COMMAND_JOURNAL_UNSUPPORTED",
        "The command safety journal has an unsupported format; Studio mutations are paused.",
      );
    }

    const entries: Record<string, CommandJournalEntry> = {};
    for (const [commandId, value] of Object.entries(parsed.entries)) {
      const entry = parseEntry(value);
      if (entry.commandId !== commandId) {
        throw new ConnectorError("COMMAND_JOURNAL_CORRUPT", "The command safety journal contains an invalid entry.");
      }
      entries[commandId] = entry;
    }
    this.#document = { version: JOURNAL_VERSION, entries };
    return this.#document;
  }

  private prune(document: JournalDocument): void {
    const now = this.#now();
    for (const [commandId, entry] of Object.entries(document.entries)) {
      const removableTerminal = entry.stage === "terminal" &&
        (entry.receiptId === undefined || entry.acknowledgedAt !== undefined);
      const retentionStartedAt = entry.acknowledgedAt ?? entry.updatedAt;
      if (removableTerminal && now - retentionStartedAt > this.#maxTerminalAgeMs) {
        delete document.entries[commandId];
      }
    }
    const entries = Object.values(document.entries);
    if (entries.length <= this.#maxEntries) return;
    const removable = entries
      .filter((entry) => (
        entry.stage === "terminal" &&
        (entry.receiptId === undefined || entry.acknowledgedAt !== undefined)
      ))
      .sort(
        (left, right) =>
          (left.acknowledgedAt ?? left.updatedAt) - (right.acknowledgedAt ?? right.updatedAt),
      );
    for (const entry of removable) {
      if (Object.keys(document.entries).length <= this.#maxEntries) break;
      delete document.entries[entry.commandId];
    }
  }

  private async persist(document: JournalDocument): Promise<void> {
    const directory = dirname(this.path);
    const temporaryPath = `${this.path}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const handle = await open(temporaryPath, "wx", 0o600);
      try {
        await handle.writeFile(`${JSON.stringify(document)}\n`, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporaryPath, this.path);
      // Windows does not support opening directories as file handles. The
      // flushed temporary file plus atomic rename still provides the strongest
      // portable guarantee available there.
      if (platform() !== "win32") {
        const directoryHandle = await open(directory, "r");
        try {
          await directoryHandle.sync();
        } finally {
          await directoryHandle.close();
        }
      }
    } catch (error) {
      await unlink(temporaryPath).catch(() => {});
      throw new ConnectorError(
        "COMMAND_JOURNAL_WRITE_FAILED",
        "The command safety journal could not be saved; the Studio command was not executed.",
        { cause: error },
      );
    }
  }

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.#queue;
    let release = (): void => {};
    this.#queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    return previous.then(operation).finally(release);
  }
}

export function defaultCommandJournalPath(): string {
  const override = process.env.NEXUSRBX_COMMAND_JOURNAL_PATH?.trim();
  if (override) return override;
  if (platform() === "darwin") {
    return join(homedir(), "Library", "Application Support", "NexusRBX Connector", "command-journal.json");
  }
  if (platform() === "win32") {
    const localAppData = process.env.LOCALAPPDATA?.trim();
    return join(localAppData || homedir(), "NexusRBX Connector", "command-journal.json");
  }
  const stateHome = process.env.XDG_STATE_HOME?.trim();
  return join(stateHome || join(homedir(), ".local", "state"), "nexusrbx-connector", "command-journal.json");
}

function parseEntry(value: unknown): CommandJournalEntry {
  if (!isRecord(value)) {
    throw new ConnectorError("COMMAND_JOURNAL_CORRUPT", "The command safety journal contains an invalid entry.");
  }
  const entry: CommandJournalEntry = {
    commandId: requiredString(value.commandId),
    commandType: requiredString(value.commandType),
    semanticInputHash: requiredHash(value.semanticInputHash),
    stage: requiredStage(value.stage),
    updatedAt: requiredTimestamp(value.updatedAt),
  };
  if (value.terminalStatus !== undefined) entry.terminalStatus = requiredTerminalStatus(value.terminalStatus);
  if (value.sessionId !== undefined) entry.sessionId = requiredString(value.sessionId);
  if (value.receiptId !== undefined) entry.receiptId = requiredString(value.receiptId);
  if (value.result !== undefined) {
    if (!isJsonObject(value.result)) {
      throw new ConnectorError("COMMAND_JOURNAL_CORRUPT", "The command safety journal contains an invalid result.");
    }
    entry.result = value.result;
  }
  if (value.acknowledgedAt !== undefined) entry.acknowledgedAt = requiredTimestamp(value.acknowledgedAt);
  validateEntry(entry);
  return entry;
}

function validateEntry(entry: CommandJournalEntry): void {
  requiredString(entry.commandId);
  requiredString(entry.commandType);
  requiredHash(entry.semanticInputHash);
  requiredStage(entry.stage);
  requiredTimestamp(entry.updatedAt);
  if (entry.stage === "terminal") {
    requiredTerminalStatus(entry.terminalStatus);
    if (!isJsonObject(entry.result)) {
      throw new ConnectorError("COMMAND_JOURNAL_CORRUPT", "A terminal command journal entry is missing its result.");
    }
    const hasSessionId = entry.sessionId !== undefined;
    const hasReceiptId = entry.receiptId !== undefined;
    if (hasSessionId !== hasReceiptId) {
      throw new ConnectorError(
        "COMMAND_JOURNAL_CORRUPT",
        "A terminal command journal entry has incomplete receipt identity.",
      );
    }
    if (hasSessionId) {
      requiredString(entry.sessionId);
      requiredString(entry.receiptId);
    }
    if (entry.acknowledgedAt !== undefined) {
      if (!hasReceiptId) {
        throw new ConnectorError(
          "COMMAND_JOURNAL_CORRUPT",
          "An acknowledged terminal command journal entry is missing receipt identity.",
        );
      }
      requiredTimestamp(entry.acknowledgedAt);
    }
  } else if (
    entry.terminalStatus !== undefined ||
    entry.result !== undefined ||
    entry.sessionId !== undefined ||
    entry.receiptId !== undefined ||
    entry.acknowledgedAt !== undefined
  ) {
    throw new ConnectorError("COMMAND_JOURNAL_CORRUPT", "A non-terminal command journal entry contains terminal data.");
  }
}

function cloneEntry(entry: CommandJournalEntry): CommandJournalEntry {
  return structuredClone(entry);
}

function stageRank(stage: CommandJournalStage): number {
  if (stage === "received") return 1;
  if (stage === "started") return 2;
  return 3;
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ConnectorError("COMMAND_JOURNAL_CORRUPT", "The command safety journal contains an invalid string.");
  }
  return value;
}

function requiredHash(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new ConnectorError("COMMAND_JOURNAL_CORRUPT", "The command safety journal contains an invalid semantic hash.");
  }
  return value.toLowerCase();
}

function requiredStage(value: unknown): CommandJournalStage {
  if (value !== "received" && value !== "started" && value !== "terminal") {
    throw new ConnectorError("COMMAND_JOURNAL_CORRUPT", "The command safety journal contains an invalid stage.");
  }
  return value;
}

function requiredTerminalStatus(value: unknown): TerminalCommandReceiptStatus {
  if (value !== "succeeded" && value !== "failed" && value !== "outcome_unknown") {
    throw new ConnectorError("COMMAND_JOURNAL_CORRUPT", "The command safety journal contains an invalid terminal status.");
  }
  return value;
}

function requiredTimestamp(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new ConnectorError("COMMAND_JOURNAL_CORRUPT", "The command safety journal contains an invalid timestamp.");
  }
  return value;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && (value ?? 0) > 0 ? (value as number) : fallback;
}

function isMissingFile(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function isJsonObject(value: unknown): value is JsonObject {
  return isRecord(value) && Object.values(value).every(isJsonValue);
}
