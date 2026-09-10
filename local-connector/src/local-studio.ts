import { randomUUID } from "node:crypto";
import { CommandExecutor, sha256 } from "./command-executor.js";
import { ConnectorError } from "./errors.js";
import { StudioTargetManager } from "./studio-targeting.js";
import { ToolCatalog } from "./tool-catalog.js";
import { FixedRoutineRunner } from "./fixed-routines.js";
import type { JsonObject, McpClientLike, StudioCommand } from "./types.js";

export interface LocalReceiptStore {
  getCommand(id: string): { hash: string; state: string; result: JsonObject | null } | null;
  putCommand(id: string, hash: string, state: string, result: JsonObject | null): void;
}

// No backend client is accepted here. Local command delivery cannot accidentally
// fall back to Firestore, even when the cloud gateway or sync service is down.
export class LocalStudio {
  private catalog: ToolCatalog | null = null;
  private executor: CommandExecutor | null = null;
  private targets: StudioTargetManager | null = null;
  private tail: Promise<unknown> = Promise.resolve();
  private connected = false;
  private dirty = true;

  constructor(private mcp: McpClientLike, private receipts: LocalReceiptStore) {
    mcp.onToolsChanged(() => { this.dirty = true; });
    mcp.onDisconnect(() => { this.connected = false; this.dirty = true; });
  }

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const pending = this.tail.then(fn, fn);
    this.tail = pending.catch(() => undefined);
    return pending;
  }

  private async discover(signal?: AbortSignal): Promise<void> {
    if (!this.connected) { await this.mcp.connect(signal); this.connected = true; this.dirty = true; }
    if (!this.dirty) return;
    this.catalog = new ToolCatalog(await this.mcp.listTools(signal));
    const previous = this.targets?.desiredStudioId;
    this.targets = new StudioTargetManager(this.mcp, this.catalog.executeLuau !== null, this.catalog.perCallStudioTargeting);
    this.targets.desiredStudioId = previous ?? null;
    this.executor = new CommandExecutor(this.mcp, this.catalog);
    this.dirty = false;
  }

  inspect(studioId?: string, signal?: AbortSignal) {
    return this.serial(async () => {
      await this.discover(signal);
      if (studioId !== undefined) this.targets!.desiredStudioId = studioId || null;
      await this.targets!.refresh(signal);
      return { ...this.targets!.metadata(), supportedCommands: this.catalog!.supportedCommands };
    });
  }

  execute(type: string, payload: JsonObject, options: { id?: string; studioId: string; signal?: AbortSignal; expectedTarget?: { placeId: string; universeId: string; placeName: string }; expectedPlaceSignature?: string }) {
    return this.serial(async () => {
      options.signal?.throwIfAborted();
      const id = options.id || randomUUID();
      const hash = sha256(JSON.stringify({ type, payload, studioId: options.studioId }));
      const previous = this.receipts.getCommand(id);
      if (previous) {
        if (previous.hash !== hash) throw new ConnectorError("COMMAND_ID_CONFLICT", "This command ID belongs to different input.");
        if (previous.state === "terminal" && previous.result) return previous.result;
        throw new ConnectorError("OUTCOME_UNKNOWN", "The previous command was interrupted. Inspect Studio before continuing; it will not be replayed.");
      }
      await this.discover(options.signal);
      this.targets!.desiredStudioId = options.studioId;
      await this.targets!.refresh(options.signal);
      const identity = this.targets!.metadata();
      if (options.expectedTarget && ["placeId", "universeId", "placeName"].some(key => String(identity[key as keyof typeof identity]) !== options.expectedTarget![key as keyof typeof options.expectedTarget])) {
        throw new ConnectorError("STUDIO_PROJECT_CHANGED", "This Studio window now contains a different project. The saved run cannot change its target.");
      }
      if (options.expectedPlaceSignature && identity.placeSignature !== options.expectedPlaceSignature) throw new ConnectorError("STUDIO_PROJECT_CHANGED", "Studio changed while the model was thinking. Inspect the changes before resuming.");
      if (!this.targets!.targetIdentityComplete || identity.activeStudioId !== options.studioId) {
        throw new ConnectorError("STUDIO_TARGET_SELECTION_REQUIRED", "Select an available Studio window before running tools.");
      }
      const command: StudioCommand = {
        id, type, payload,
        expectedStudioWindowId: options.studioId,
        expectedPlaceId: identity.placeId, expectedUniverseId: identity.universeId,
        expectedPlaceSignature: identity.placeSignature,
      };
      this.receipts.putCommand(id, hash, "started", null);
      try {
        const result = await this.targets!.withCommandTarget(command, async () => {
          if (["write_script", "patch_script"].includes(type)) {
            if (!this.catalog!.hasCommand("create_snapshot")) throw new ConnectorError("SNAPSHOT_UNAVAILABLE", "This Studio connection cannot snapshot script edits.");
            const snapshot = await this.executor!.execute({ ...command, id: `${id}:snapshot`, type: "create_snapshot", payload: { paths: [payload.path!] } }, options.signal);
            if (!snapshot.ok || !Array.isArray(snapshot.snapshots) || snapshot.snapshots.length === 0) throw new ConnectorError("SNAPSHOT_FAILED", "The script snapshot could not be verified. No edit was attempted.");
            // Save the snapshot receipt before sending the source mutation.
            this.receipts.putCommand(`${id}:snapshot`, hash, "terminal", snapshot);
            const applied = await this.executor!.execute(command, options.signal);
            if (!applied.ok || applied.verified !== true) return { ...applied, snapshots: snapshot.snapshots };
            const finalized = await new FixedRoutineRunner(this.mcp).run("finalize_snapshots", { snapshots: snapshot.snapshots }, options.signal);
            this.receipts.putCommand(`${id}:snapshot`, hash, "terminal", finalized);
            return { ...applied, snapshots: finalized.snapshots! };
          }
          const result = await this.executor!.execute(command, options.signal);
          if (result.ok && result.verified === true && type !== "create_snapshot" && Array.isArray(result.snapshots) && result.snapshots.length) {
            await new FixedRoutineRunner(this.mcp).run("record_last_batch", { snapshots: result.snapshots }, options.signal);
          }
          return result;
        }, options.signal);
        // Readback in CommandExecutor verifies content; this second check fences
        // a Studio window/place switch that occurred while the call was running.
        await this.targets!.attestCommandTarget(command, options.signal);
        this.receipts.putCommand(id, hash, "terminal", result);
        return result;
      } catch (error) {
        this.receipts.putCommand(id, hash, "outcome_unknown", null);
        throw error;
      }
    });
  }

  async close() { await this.tail; await this.mcp.disconnect(); this.connected = false; }
}
