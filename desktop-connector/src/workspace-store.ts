import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type { JsonObject, LocalReceiptStore } from "nexusrbx-local-connector";
import type { EntityKind, EntityPage, EntityPageQuery, SyncChange, SyncReply, WorkspaceEntity } from "./workspace-contracts.js";

// This class is only loaded by the local worker. The renderer never receives SQL
// or filesystem access. Each account has a separate database directory.
export class WorkspaceStore implements LocalReceiptStore {
  readonly db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    const version = Number(this.db.prepare("PRAGMA user_version").get()?.user_version || 0);
    if (version > 2) { this.db.close(); throw new Error("This history was created by a newer NexusRBX version. Update the app to open it."); }
    if (version === 1 && path !== ":memory:") this.db.prepare("VACUUM INTO ?").run(`${path}.v1-${Date.now()}.backup`);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS entities (id TEXT PRIMARY KEY, kind TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS entity_kind ON entities(kind);
      CREATE INDEX IF NOT EXISTS entity_page ON entities(kind,deleted,COALESCE(json_extract(data,'$.createdAt'),0) DESC,id DESC);
      CREATE INDEX IF NOT EXISTS entity_conversation_page ON entities(kind,deleted,json_extract(data,'$.conversationId'),COALESCE(json_extract(data,'$.createdAt'),0) DESC,id DESC);
      CREATE INDEX IF NOT EXISTS entity_project_page ON entities(kind,deleted,json_extract(data,'$.projectId'),COALESCE(json_extract(data,'$.createdAt'),0) DESC,id DESC);
      CREATE TABLE IF NOT EXISTS outbox (sequence INTEGER PRIMARY KEY AUTOINCREMENT, operation_id TEXT UNIQUE NOT NULL, entity_id TEXT UNIQUE NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS commands (id TEXT PRIMARY KEY, hash TEXT NOT NULL, state TEXT NOT NULL, result TEXT);
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS inflight (operation_id TEXT PRIMARY KEY, entity_id TEXT UNIQUE NOT NULL, payload TEXT NOT NULL);
      PRAGMA user_version=2;`);
    for (const row of this.db.prepare("SELECT id FROM entities WHERE kind='run' AND deleted=0 AND json_extract(data,'$.status')='running' AND json_extract(data,'$.deviceId')=?").all(this.getMeta("deviceId"))) {
      const run = this.get(String(row.id))!;
      this.save("run", run.id, { ...run.data, status: "interrupted", error: "The application stopped. Resume this saved run after checking Studio." });
    }
  }
  transaction<T>(action: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = action(); this.db.exec("COMMIT"); return result; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  get(id: string): WorkspaceEntity | null {
    const row = this.db.prepare("SELECT * FROM entities WHERE id=?").get(id);
    return row ? { id: String(row.id), kind: row.kind as EntityKind, revision: Number(row.revision), data: JSON.parse(String(row.data)), deleted: Boolean(row.deleted) } : null;
  }
  list(kind: EntityKind): WorkspaceEntity[] {
    return this.db.prepare("SELECT id FROM entities WHERE kind=? AND deleted=0 ORDER BY COALESCE(json_extract(data,'$.createdAt'),0),rowid").all(kind).map(row => this.get(String(row.id))!);
  }
  page(query: EntityPageQuery): EntityPage {
    if (!query || !["conversation","message","plan","run","artifact","project","settings","plan_version"].includes(query.kind)) throw new Error("Invalid history kind.");
    const count = query.limit ?? 50;
    if (!Number.isInteger(count) || count < 1 || count > 200) throw new Error("Page size must be between 1 and 200.");
    const filters = ["kind=?", "deleted=0"]; const values: (string | number)[] = [query.kind];
    if (query.conflictsOnly === true) filters.push("json_type(data,'$.conflictOf')='text'");
    for (const key of ["conversationId", "projectId"] as const) {
      if (query[key] !== undefined) { if (typeof query[key] !== "string") throw new Error("Invalid history scope."); filters.push(`json_extract(data,'$.${key}')=?`); values.push(query[key]!); }
    }
    if (query.cursor) {
      let cursor;
      try { cursor = JSON.parse(Buffer.from(query.cursor, "base64url").toString()); } catch { throw new Error("Invalid history cursor."); }
      if (!Array.isArray(cursor) || cursor.length !== 2 || !Number.isFinite(cursor[0]) || typeof cursor[1] !== "string") throw new Error("Invalid history cursor.");
      filters.push("(COALESCE(json_extract(data,'$.createdAt'),0),id)<(?,?)"); values.push(cursor[0], cursor[1]);
    }
    const rows = this.db.prepare(`SELECT id FROM entities WHERE ${filters.join(" AND ")} ORDER BY COALESCE(json_extract(data,'$.createdAt'),0) DESC,id DESC LIMIT ?`).all(...values, count + 1);
    const entities = rows.slice(0, count).map(row => this.get(String(row.id))!);
    const last = entities.at(-1);
    return { entities, nextCursor: rows.length > count && last ? Buffer.from(JSON.stringify([last.data.createdAt ?? 0, last.id])).toString("base64url") : null };
  }
  private write(entity: WorkspaceEntity) {
    this.db.prepare("INSERT INTO entities VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,data=excluded.data,deleted=excluded.deleted")
      .run(entity.id, entity.kind, entity.revision, JSON.stringify(entity.data), Number(entity.deleted));
  }
  private enqueue(entity: WorkspaceEntity) {
    const change: SyncChange = { operationId: randomUUID(), entity, baseRevision: entity.revision };
    this.db.prepare("INSERT INTO outbox(operation_id,entity_id,payload) VALUES(?,?,?) ON CONFLICT(entity_id) DO UPDATE SET operation_id=excluded.operation_id,payload=excluded.payload")
      .run(change.operationId, entity.id, JSON.stringify(change));
  }
  save(kind: EntityKind, id: string, data: Record<string, unknown>, deleted = false) {
    return this.saveMany([{ kind, id, data, deleted }])[0]!;
  }
  saveMany(records: { kind: EntityKind; id: string; data: Record<string, unknown>; deleted?: boolean }[]) {
    return this.transaction(() => {
      return records.map(({ kind, id, data, deleted = false }) => {
        const previous = this.get(id);
        if (previous && previous.kind !== kind) throw new Error("Entity type cannot change.");
        const entity: WorkspaceEntity = { id, kind, revision: previous?.revision || 0, data, deleted };
        this.write(entity); this.enqueue(entity); return entity;
      });
    });
  }
  pending(): SyncChange[] {
    let bytes = 0;
    return this.db.prepare("SELECT payload FROM inflight UNION ALL SELECT payload FROM outbox WHERE entity_id NOT IN (SELECT entity_id FROM inflight) LIMIT 100").all().flatMap(row => {
      const text = String(row.payload); bytes += Buffer.byteLength(text);
      return bytes > 900_000 ? [] : [JSON.parse(text) as SyncChange];
    });
  }
  markSent(changes: SyncChange[]) {
    this.transaction(() => {
      for (const change of changes) this.db.prepare("INSERT INTO inflight VALUES(?,?,?) ON CONFLICT DO NOTHING").run(change.operationId, change.entity.id, JSON.stringify(change));
    });
  }
  acknowledge(reply: SyncReply) {
    this.transaction(() => {
      for (const ack of reply.acknowledged) {
        const row = this.db.prepare("SELECT entity_id FROM inflight WHERE operation_id=? UNION ALL SELECT entity_id FROM outbox WHERE operation_id=? LIMIT 1").get(ack.operationId, ack.operationId);
        if (!row) continue;
        this.db.prepare("UPDATE entities SET revision=? WHERE id=?").run(ack.revision, row.entity_id!);
        const pending = this.db.prepare("SELECT operation_id FROM outbox WHERE entity_id=?").get(row.entity_id!);
        if (pending?.operation_id === ack.operationId) this.db.prepare("DELETE FROM outbox WHERE operation_id=?").run(ack.operationId);
        else if (pending) this.enqueue(this.get(String(row.entity_id))!);
        this.db.prepare("DELETE FROM inflight WHERE operation_id=?").run(ack.operationId);
      }
      for (const conflict of reply.conflicts) {
        const pending = this.db.prepare("SELECT entity_id FROM inflight WHERE operation_id=? UNION ALL SELECT entity_id FROM outbox WHERE operation_id=? LIMIT 1").get(conflict.operationId, conflict.operationId);
        if (!pending) continue;
        const local = this.get(String(pending.entity_id));
        this.db.prepare("DELETE FROM outbox WHERE entity_id=?").run(pending.entity_id!);
        this.db.prepare("DELETE FROM inflight WHERE operation_id=?").run(conflict.operationId);
        if (local && !local.deleted) {
          const copy = { ...local, id: randomUUID(), revision: 0, data: { ...local.data, conflictOf: local.id, title: `${local.data.title || "Recovered edit"} (conflict copy)` } };
          this.write(copy); this.enqueue(copy);
        }
        this.write(conflict.entity);
      }
    });
  }
  applyRemote(entities: WorkspaceEntity[], cursor: string) {
    this.transaction(() => {
      for (const entity of entities) {
        const pending = this.db.prepare("SELECT 1 FROM outbox WHERE entity_id=?").get(entity.id);
        if (!pending && entity.revision > (this.get(entity.id)?.revision ?? -1)) this.write(entity);
      }
      this.setMeta("cursor", cursor);
    });
  }
  getMeta(key: string) { return String(this.db.prepare("SELECT value FROM meta WHERE key=?").get(key)?.value || ""); }
  setMeta(key: string, value: string) { this.db.prepare("INSERT INTO meta VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, value); }
  getCommand(id: string) {
    const row = this.db.prepare("SELECT * FROM commands WHERE id=?").get(id);
    return row ? { hash: String(row.hash), state: String(row.state), result: row.result ? JSON.parse(String(row.result)) as JsonObject : null } : null;
  }
  putCommand(id: string, hash: string, state: string, result: JsonObject | null) {
    this.db.prepare("INSERT INTO commands VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,result=excluded.result")
      .run(id, hash, state, result ? JSON.stringify(result) : null);
  }
  close() { this.db.close(); }
}
