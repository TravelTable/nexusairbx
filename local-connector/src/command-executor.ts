import { createHash } from "node:crypto";
import { ConnectorError, asConnectorError } from "./errors.js";
import { ToolCatalog } from "./tool-catalog.js";
import { FixedRoutineRunner } from "./fixed-routines.js";
import type { JsonObject, JsonValue, McpClientLike, StudioCommand, ToolCallResult } from "./types.js";

const MAX_PATH_CHARS = 2_048;
const MAX_SOURCE_CHARS = 1_000_000;
const MAX_OUTPUT_CHARS = 256_000;
const MAX_READ_BATCH = 20;
// backend/server.js accepts JSON request bodies up to 2 MiB. Leave enough room
// for the acknowledgement envelope and JSON metadata around the command result.
const MAX_COMMAND_RESULT_BYTES = 1_500_000;
const SNAPSHOT_BATCH_COMMANDS = new Set([
  "create_script", "create_instance", "update_properties", "update_attributes", "update_tags",
  "rename_instance", "move_instance", "duplicate_instance", "delete_instance",
]);

export class CommandExecutor {
  #catalog: ToolCatalog;
  readonly #routines: FixedRoutineRunner;

  constructor(
    private readonly mcp: McpClientLike,
    catalog: ToolCatalog,
  ) {
    this.#catalog = catalog;
    this.#routines = new FixedRoutineRunner(mcp);
  }

  updateCatalog(catalog: ToolCatalog): void {
    this.#catalog = catalog;
  }

  async execute(command: StudioCommand, signal?: AbortSignal): Promise<JsonObject> {
    try {
      const result = await this.executeSupported(command, signal);
      assertCommandResultFits(result);
      return result;
    } catch (error) {
      return failureResult(command, asConnectorError(error));
    }
  }

  private async executeSupported(command: StudioCommand, signal?: AbortSignal): Promise<JsonObject> {
    if (!this.#catalog.hasCommand(command.type)) return unsupportedResult(command);
    switch (command.type) {
      case "read_script":
        return await this.readOne(command, requireSingleReadPath(command.payload), signal);
      case "read_scripts":
        return await this.readMany(command, signal);
      case "inspect_instances":
      case "read_instance":
      case "read_properties":
        return await this.inspect(command, signal);
      case "search_project":
      case "search_source":
        return await this.search(command, signal);
      case "get_studio_context":
      case "get_output_logs":
      case "collect_output":
        return await this.noInput(command, signal);
      case "write_script":
      case "patch_script":
        return await this.mutateScript(command, signal);
      case "get_selection":
      case "create_instance":
      case "update_properties":
      case "update_attributes":
      case "update_tags":
      case "rename_instance":
      case "move_instance":
      case "duplicate_instance":
      case "delete_instance":
      case "create_snapshot":
      case "restore_snapshot":
      case "undo_last_batch":
      case "run_test_service":
        return await this.runFixedRoutine(command, signal);
      case "create_script":
        return await this.createScript(command, signal);
      case "batch_operations":
        return await this.runBatch(command, signal);
      case "insert_creator_store_asset":
        return await this.insertCreatorStoreAsset(command, signal);
      case "run_play_test":
      case "stop_play_test":
        return await this.runPlaytest(command, signal);
      default:
        return unsupportedResult(command);
    }
  }

  private async runFixedRoutine(command: StudioCommand, signal?: AbortSignal): Promise<JsonObject> {
    if (command.type === "run_test_service" && command.payload.confirmed !== true && command.payload.explicitConfirmation !== true) {
      throw new ConnectorError("PLAYTEST_CONFIRMATION_REQUIRED", "TestService execution requires explicit confirmation.");
    }
    const data = await this.#routines.run(command.type, command.payload, signal);
    // Snapshot creation writes connector-owned state into the place and advances
    // its signature, even though it does not alter the selected user instance.
    const mutation = command.type !== "get_selection";
    return successBase(command, mutation, {
      operation: command.type,
      ...data,
      ...(mutation ? { verificationChecks: [{ type: "routine_envelope_and_state", passed: true }] } : {}),
    });
  }

  private async createScript(command: StudioCommand, signal?: AbortSignal): Promise<JsonObject> {
    const path = requirePath(command.payload, "path");
    const source = requireBoundedString(command.payload, "source", 0, MAX_SOURCE_CHARS);
    if ((await this.tryReadSource(path, signal)).source !== null) {
      throw new ConnectorError("SCRIPT_ALREADY_EXISTS", `The target script already exists: ${path}`);
    }
    const data = await this.#routines.run("create_script", command.payload, signal);
    let actualSource: string;
    try { actualSource = await this.readSource(path, signal); }
    catch (error) {
      return await this.rollbackRoutineMutation(data, "The script was created but its post-write read failed.", error);
    }
    if (actualSource !== source) return await this.rollbackRoutineMutation(data, "The created script source did not match after rereading it.");
    return successBase(command, true, {
      operation: command.type, ...data, affectedPaths: [path], resultingHashes: { [path]: sha256(actualSource) },
      hashAlgorithm: "sha256", verificationChecks: [{ type: "source_exact_match", path, passed: true }],
    });
  }

  private async runBatch(command: StudioCommand, signal?: AbortSignal): Promise<JsonObject> {
    const operations = command.payload.operations;
    if (!Array.isArray(operations) || operations.length < 1 || operations.length > 50) {
      throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "batch_operations requires 1-50 operations.");
    }
    const nestedCommands: StudioCommand[] = [];
    const claimedPaths: string[] = [];
    for (const raw of operations) {
      if (!isRecord(raw) || typeof raw.type !== "string" || !isRecord(raw.payload) || raw.type === "batch_operations") {
        throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "A batch operation is malformed.");
      }
      if (!SNAPSHOT_BATCH_COMMANDS.has(raw.type) || !this.#catalog.hasCommand(raw.type)) {
        throw new ConnectorError("MCP_TOOL_UNAVAILABLE", `Batch command unavailable for snapshot-safe execution: ${raw.type}`);
      }
      const nested = { id: `${command.id}:${nestedCommands.length}`, type: raw.type, payload: raw.payload as JsonObject };
      this.#routines.validate(nested.type, nested.payload);
      for (const path of batchMutationFootprint(nested)) {
        if (claimedPaths.some((claimed) => pathsOverlap(claimed, path))) {
          throw new ConnectorError("BATCH_PATH_OVERLAP", `Atomic batch operations overlap at ${path}.`);
        }
        claimedPaths.push(path);
      }
      nestedCommands.push(nested);
    }
    const results: JsonValue[] = [];
    const snapshots: JsonValue[] = [];
    try {
      for (const nested of nestedCommands) {
        const result = await this.executeSupported(nested, signal);
        if (result.success !== true || result.verified !== true) throw new ConnectorError("BATCH_OPERATION_FAILED", `Batch operation failed: ${nested.type}`);
        if (!Array.isArray(result.snapshots) || result.snapshots.length < 1) throw new ConnectorError("ROUTINE_RESULT_INVALID", `Batch operation omitted snapshots: ${nested.type}`);
        snapshots.push(...result.snapshots);
        results.push(result);
      }
      await this.#routines.run("record_last_batch", { snapshots: snapshots.slice().reverse() }, signal);
    } catch (error) {
      const cause = asConnectorError(error);
      const innerRollbackUnverified = cause.code === "ROLLBACK_FAILED" || cause.code === "BATCH_ROLLBACK_FAILED";
      const failedOperationSnapshots = Array.isArray(cause.details?.snapshots) ? cause.details.snapshots : [];
      if (command.payload.atomic !== false && snapshots.length > 0) {
        let rollback: JsonObject;
        try {
          rollback = await this.#routines.run("restore_snapshot", { snapshots: snapshots.slice().reverse() });
        } catch (rollbackError) {
          const rollbackCause = asConnectorError(rollbackError);
          throw new ConnectorError("BATCH_ROLLBACK_FAILED", "The batch failed and its rollback could not be verified.", {
            details: { causeCode: cause.code, rollbackCode: rollbackCause.code, snapshots, failedOperationSnapshots },
            cause: rollbackCause,
          });
        }
        if (innerRollbackUnverified) {
          throw new ConnectorError("BATCH_ROLLBACK_FAILED", "A batch operation failed compensation; prior operations were restored but the current operation remains unverified.", {
            details: { causeCode: cause.code, snapshots, failedOperationSnapshots, priorRollback: rollback },
            cause,
          });
        }
        throw new ConnectorError("BATCH_ROLLED_BACK", "The batch failed and every applied mutation was restored.", {
          details: { causeCode: cause.code, snapshots, rollback },
          cause,
        });
      }
      if (snapshots.length > 0) {
        throw new ConnectorError("BATCH_PARTIAL_APPLY", "A non-atomic batch failed after one or more mutations were applied.", {
          details: { causeCode: cause.code, snapshots, failedOperationSnapshots, completedOperations: results.length },
          cause,
        });
      }
      if (innerRollbackUnverified) {
        throw new ConnectorError("BATCH_ROLLBACK_FAILED", "A batch operation failed and its compensation could not be verified.", {
          details: { causeCode: cause.code, failedOperationSnapshots },
          cause,
        });
      }
      throw cause;
    }
    return successBase(command, true, { operation: command.type, results, snapshots, verificationChecks: [{ type: "batch_complete", passed: true }] });
  }

  private async rollbackRoutineMutation(data: JsonObject, message: string, cause?: unknown): Promise<never> {
    const snapshots = Array.isArray(data.snapshots) ? data.snapshots : [];
    try {
      const rollback = await this.#routines.run("restore_snapshot", { snapshots: snapshots.slice().reverse() });
      throw new ConnectorError("APPLY_ROLLED_BACK", message, { details: { snapshots, rollback }, cause });
    } catch (rollbackError) {
      if (rollbackError instanceof ConnectorError && rollbackError.code === "APPLY_ROLLED_BACK") throw rollbackError;
      const rollbackCause = asConnectorError(rollbackError);
      throw new ConnectorError("ROLLBACK_FAILED", `${message} Rollback could not be verified.`, {
        details: { snapshots, rollbackCode: rollbackCause.code },
        cause: rollbackCause,
      });
    }
  }

  private async insertCreatorStoreAsset(command: StudioCommand, signal?: AbortSignal): Promise<JsonObject> {
    const assetId = requireBoundedString(command.payload, "assetId", 1, 40);
    if (!/^\d{1,40}$/.test(assetId)) throw new ConnectorError("ASSET_ID_INVALID", "Creator Store assetId must be numeric.");
    const assetType = typeof command.payload.assetType === "string" ? command.payload.assetType : "Model";
    if (!new Set(["Model", "Mesh"]).has(assetType)) throw new ConnectorError("ASSET_TYPE_NOT_ALLOWED", "Only reviewed Model and Mesh assets may be inserted.");
    const targetParentPath = requirePath(command.payload, "targetParentPath");
    if (!/^(?:game\/)?(?:Workspace|ReplicatedStorage|ServerStorage)(?:\/|$)/.test(targetParentPath)) {
      throw new ConnectorError("DESTINATION_NOT_ALLOWED", "Creator Store assets may only be placed in an approved service.");
    }
    if (/^(?:game\/)?ServerStorage\/NexusMCP(?:Snapshots|State|Receipts|Quarantine)(?:\/|$)/i.test(targetParentPath)) {
      throw new ConnectorError("DESTINATION_NOT_ALLOWED", "Connector-owned ServerStorage state cannot be an asset destination.");
    }
    const nonce = sha256(`${command.id}:${assetId}`).slice(0, 24);
    const prepared = await this.#routines.run("prepare_asset_quarantine", { nonce }, signal);
    if (isRecord(prepared.existingReceipt)) {
      return successBase(command, true, { operation: command.type, receipt: prepared.existingReceipt, idempotentReplay: true, verificationChecks: [{ type: "idempotent_receipt", passed: true }] });
    }
    const quarantinePath = requireBoundedString(prepared, "path", 1, 500);
    try {
      const insertion = this.#catalog.makeInsertAssetArgs({
        assetId,
        assetName: typeof command.payload.assetName === "string" ? command.payload.assetName.slice(0, 100) : "",
        assetType,
        parentPath: quarantinePath,
      });
      if (!insertion) throw new ConnectorError("MCP_TOOL_UNAVAILABLE", "The discovered insert_asset schema is incompatible.");
      const inserted = await this.mcp.callTool(insertion.toolName, insertion.args, signal);
      assertToolSucceeded(inserted);
      const data = await this.#routines.run("finalize_asset_quarantine", {
        quarantinePath, targetParentPath, assetId, nonce,
        requestedName: typeof command.payload.requestedName === "string" ? command.payload.requestedName.slice(0, 100) : "",
        anchoredPolicy: typeof command.payload.anchoredPolicy === "string" ? command.payload.anchoredPolicy : "anchor_all",
        collisionPolicy: typeof command.payload.collisionPolicy === "string" ? command.payload.collisionPolicy : "no_collide",
      }, signal);
      return successBase(command, true, { operation: command.type, ...data, verificationChecks: [{ type: "quarantine_scan_and_destination", passed: true }] });
    } catch (error) {
      await this.#routines.run("discard_asset_quarantine", { quarantinePath }, signal).catch(() => undefined);
      throw error;
    }
  }

  private async runPlaytest(command: StudioCommand, signal?: AbortSignal): Promise<JsonObject> {
    if (command.payload.confirmed !== true && command.payload.explicitConfirmation !== true) {
      throw new ConnectorError("PLAYTEST_CONFIRMATION_REQUIRED", "Playtesting requires explicit confirmation.");
    }
    const starting = command.type === "run_play_test";
    const maxDuration = Math.min(120, Math.max(1, Number(command.payload.maxDurationSeconds || 30)));
    const deadline = Date.now() + maxDuration * 1_000;
    let enteredPlay = false;
    let targetModeObserved = false;
    let consoleOutput: JsonValue = null;
    let cleanupVerified = false;
    let controlReturned = false;
    let primaryFailure: ConnectorError | null = null;
    try {
      try {
        await this.mcp.callTool("start_stop_play", { is_start: starting }, signal).then(assertToolSucceeded);
        controlReturned = true;
      } catch (error) {
        const cause = asConnectorError(error);
        const observedPlaying = await this.tryPlayingState(signal);
        primaryFailure = new ConnectorError(
          "PLAYTEST_CONTROL_UNAVAILABLE",
          starting
            ? "Roblox Studio MCP could not start Play mode. Automated play control is disabled for this connector session; use Studio's Play button for this run."
            : "Roblox Studio MCP could not stop Play mode. Stop the session in Roblox Studio before continuing.",
          {
            details: {
              reasonCode: "STUDIO_MCP_PLAY_CONTROL_FAILED",
              providerTool: "start_stop_play",
              providerCode: cause.code,
              requestedMode: starting ? "Play" : "Edit",
              observedMode: observedPlaying === null ? "Unknown" : observedPlaying ? "Play" : "Edit",
              controlRetrySuppressed: true,
              manualAction: starting ? "start_play_in_studio" : "stop_play_in_studio",
            },
            cause,
          },
        );
      }
      if (primaryFailure === null) {
        while (Date.now() < deadline) {
          const playing = await this.isPlaying(signal);
          if (starting ? playing : !playing) {
            targetModeObserved = true;
            enteredPlay = playing;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        if (!targetModeObserved) {
          primaryFailure = new ConnectorError(
            "PLAYTEST_TIMEOUT",
            starting
              ? "Studio did not enter play mode before the timeout."
              : "Studio did not return to Edit mode before the timeout.",
          );
        } else {
          if (!starting) cleanupVerified = true;
          consoleOutput = normalizeToolOutput(await this.mcp.callTool("get_console_output", {}, signal));
        }
      }
    } catch (error) {
      primaryFailure = asConnectorError(error);
    } finally {
      if (starting) {
        const cleanupSignal = AbortSignal.timeout(5_000);
        const playingBeforeCleanup = await this.tryPlayingState(cleanupSignal);
        // A failed start request that is still confirmed in Edit mode must not
        // be followed by a second control request. The installed StudioMCP can
        // leave start_stop_play busy after timing out; an immediate stop then
        // compounds the provider failure without improving safety.
        const shouldRequestStop = controlReturned || enteredPlay || playingBeforeCleanup === true;
        if (shouldRequestStop) {
          await this.mcp.callTool("start_stop_play", { is_start: false }, cleanupSignal).then(assertToolSucceeded).catch(() => undefined);
          const cleanupDeadline = Date.now() + 5_000;
          while (Date.now() < cleanupDeadline) {
            if (!await this.isPlaying(cleanupSignal).catch(() => true)) { cleanupVerified = true; break; }
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        } else if (playingBeforeCleanup === false) {
          cleanupVerified = true;
        }
      }
    }
    if (primaryFailure !== null) {
      if (starting && !cleanupVerified) {
        throw new ConnectorError(
          "PLAYTEST_CLEANUP_FAILED",
          "Automated play control failed and Studio could not be confirmed back in Edit mode. Stop the session in Roblox Studio before continuing.",
          {
            details: {
              reasonCode: "STUDIO_MCP_PLAY_CLEANUP_UNVERIFIED",
              causeCode: primaryFailure.code,
              manualAction: "stop_play_in_studio",
            },
            cause: primaryFailure,
          },
        );
      }
      throw primaryFailure;
    }
    if (!cleanupVerified) throw new ConnectorError("PLAYTEST_CLEANUP_FAILED", "Studio could not be confirmed back in Edit mode.");
    return successBase(command, true, { operation: command.type, enteredPlayMode: enteredPlay, cleanupVerified, consoleOutput, verificationChecks: [{ type: "studio_mode_transition", passed: true }, { type: "edit_mode_cleanup", passed: cleanupVerified }] });
  }

  private async tryPlayingState(signal?: AbortSignal): Promise<boolean | null> {
    try {
      return await this.isPlaying(signal);
    } catch {
      return null;
    }
  }

  private async isPlaying(signal?: AbortSignal): Promise<boolean> {
    const output = normalizeToolOutput(await this.mcp.callTool("get_studio_state", {}, signal));
    const state = (typeof output === "string" ? output : JSON.stringify(output)).toLowerCase();
    return /\b(play|playing|running|client|server)\b/.test(state) && !/\bedit\b/.test(state);
  }

  private async readOne(command: StudioCommand, path: string, signal?: AbortSignal): Promise<JsonObject> {
    const source = await this.readSource(path, signal);
    const sourceHash = sha256(source);
    return successBase(command, false, {
      operation: command.type,
      affectedPaths: [path],
      source,
      sourceHash,
      hashAlgorithm: "sha256",
      resultingHashes: { [path]: sourceHash },
    });
  }

  private async readMany(command: StudioCommand, signal?: AbortSignal): Promise<JsonObject> {
    const rawPaths = command.payload.paths;
    if (!Array.isArray(rawPaths) || rawPaths.length === 0 || rawPaths.length > MAX_READ_BATCH) {
      throw new ConnectorError("COMMAND_PAYLOAD_INVALID", `read_scripts requires 1-${MAX_READ_BATCH} paths.`);
    }
    const paths = rawPaths.map((value) => validatePath(value));
    const scripts: JsonValue[] = [];
    for (const path of paths) {
      const source = await this.readSource(path, signal);
      scripts.push({ path, source, sourceHash: sha256(source), hashAlgorithm: "sha256" });
    }
    return successBase(command, false, { operation: command.type, affectedPaths: paths, scripts });
  }

  private async inspect(command: StudioCommand, signal?: AbortSignal): Promise<JsonObject> {
    const incompatibility = inspectionIncompatibility(command);
    if (incompatibility) return unsupportedResult(command, incompatibility);

    const paths = inspectionPaths(command);
    const instances: JsonValue[] = [];
    for (const path of paths) {
      const adapter = this.#catalog.makeInspectArgs(path);
      if (!adapter) return unsupportedResult(command);
      const result = await this.mcp.callTool(adapter.toolName, adapter.args, signal);
      const inspection = extractInspection(result, path);
      instances.push(shapeInspection(inspection, path, command));
    }
    return successBase(command, false, { operation: command.type, affectedPaths: paths, instances });
  }

  private async search(command: StudioCommand, signal?: AbortSignal): Promise<JsonObject> {
    const query = requireBoundedString(command.payload, "query", 1, 2_048);
    const adapter = this.#catalog.makeSearchArgs(command.type as "search_project" | "search_source", query);
    if (!adapter) return unsupportedResult(command);
    const result = await this.mcp.callTool(adapter.toolName, adapter.args, signal);
    const output = normalizeToolOutput(result);
    return successBase(command, false, { operation: command.type, output });
  }

  private async noInput(command: StudioCommand, signal?: AbortSignal): Promise<JsonObject> {
    const adapter = this.#catalog.makeNoInputArgs(command.type as "get_studio_context" | "get_output_logs" | "collect_output");
    if (!adapter) return unsupportedResult(command);
    const result = await this.mcp.callTool(adapter.toolName, adapter.args, signal);
    const output = normalizeToolOutput(result);
    return successBase(command, false, { operation: command.type, output });
  }

  private async mutateScript(command: StudioCommand, signal?: AbortSignal): Promise<JsonObject> {
    const path = requirePath(command.payload, "path");
    const preRead = await this.tryReadSource(path, signal);
    const currentSource = preRead.source;
    const expectedSourceHash = optionalString(command.payload.expectedSourceHash);

    if (currentSource === null && command.type !== "create_script") {
      throw new ConnectorError("SCRIPT_NOT_FOUND", `The target script does not exist: ${path}`);
    }
    if (currentSource !== null && command.type === "create_script" && command.payload.allowOverwrite !== true) {
      throw new ConnectorError("SCRIPT_ALREADY_EXISTS", `The target script already exists: ${path}`);
    }
    if (currentSource !== null) {
      if (!expectedSourceHash) {
        throw new ConnectorError("EXPECTED_SOURCE_HASH_REQUIRED", "Editing an existing Studio script requires expectedSourceHash.");
      }
      if (!matchesSourceHash(currentSource, expectedSourceHash)) {
        throw new ConnectorError("SOURCE_CONFLICT", "The script changed after NexusRBX read it.", {
          retryable: true,
          details: { path, expectedSourceHash, actualSourceHash: sha256(currentSource), hashAlgorithm: "sha256" },
        });
      }
    } else if (expectedSourceHash) {
      throw new ConnectorError("SOURCE_CONFLICT", "The script expected by NexusRBX no longer exists.", {
        retryable: true,
        details: { path, expectedSourceHash },
      });
    }

    const targetSource = this.buildTargetSource(command, currentSource);
    const mutation = this.#catalog.makeMutationArgs(path, currentSource, targetSource);
    if (!mutation) return unsupportedResult(command);

    let toolResult: ToolCallResult;
    try {
      // Mutating MCP calls are deliberately never retried: a timeout has an unknown outcome.
      toolResult = await this.mcp.callTool(mutation.toolName, mutation.args, signal);
      assertToolSucceeded(toolResult);
    } catch (error) {
      throw new ConnectorError("APPLY_UNVERIFIED", "The Studio edit could not be verified; its outcome may be unknown.", {
        retryable: false,
        details: { path, verificationRequired: true },
        cause: error,
      });
    }

    let actualSource: string;
    try {
      actualSource = await this.readSource(path, signal);
    } catch (error) {
      throw new ConnectorError("APPLY_UNVERIFIED", "The Studio edit completed but the post-change read failed.", {
        details: { path, verificationRequired: true },
        cause: error,
      });
    }
    if (actualSource !== targetSource) {
      throw new ConnectorError("APPLY_UNVERIFIED", "The Studio edit did not match the requested source after rereading it.", {
        details: { path, expectedResultHash: sha256(targetSource), actualResultHash: sha256(actualSource) },
      });
    }
    const resultingHash = sha256(actualSource);
    return successBase(command, true, {
      operation: command.type,
      affectedPaths: [path],
      previousHashes: currentSource === null ? {} : { [path]: sha256(currentSource) },
      resultingHashes: { [path]: resultingHash },
      hashAlgorithm: "sha256",
      verificationChecks: [{ type: "source_exact_match", path, passed: true }],
      output: normalizeToolOutput(toolResult),
    });
  }

  private buildTargetSource(command: StudioCommand, currentSource: string | null): string {
    if (command.type === "create_script" || command.type === "write_script") {
      return requireBoundedString(command.payload, "source", 0, MAX_SOURCE_CHARS);
    }
    if (typeof command.payload.source === "string") {
      return requireBoundedString(command.payload, "source", 0, MAX_SOURCE_CHARS);
    }
    if (currentSource === null) throw new ConnectorError("SCRIPT_NOT_FOUND", "The target script does not exist.");
    const rawPatches = command.payload.patches;
    if (!Array.isArray(rawPatches) || rawPatches.length === 0 || rawPatches.length > 100) {
      throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "patch_script requires source or 1-100 deterministic replacements.");
    }
    let source = currentSource;
    for (const rawPatch of rawPatches) {
      if (!isRecord(rawPatch)) throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "A script replacement is malformed.");
      const find = requireBoundedString(rawPatch, "find", 1, MAX_SOURCE_CHARS);
      const replacement = requireBoundedString(rawPatch, "replace", 0, MAX_SOURCE_CHARS);
      if (!source.includes(find)) throw new ConnectorError("PATCH_TARGET_MISSING", "A patch target was not found in the current source.");
      source = rawPatch.all === true ? source.split(find).join(replacement) : source.replace(find, replacement);
      if (source.length > MAX_SOURCE_CHARS) throw new ConnectorError("SOURCE_TOO_LARGE", "The patched source exceeds the connector limit.");
    }
    return source;
  }

  private async readSource(path: string, signal?: AbortSignal): Promise<string> {
    const adapter = this.#catalog.makeReadArgs(path);
    if (!adapter) throw new ConnectorError("MCP_TOOL_UNAVAILABLE", "Roblox Studio MCP does not expose a validated script-read capability.");
    const result = await this.mcp.callTool(adapter.toolName, adapter.args, signal);
    assertToolSucceeded(result);
    return extractSource(result);
  }

  private async tryReadSource(path: string, signal?: AbortSignal): Promise<{ source: string | null }> {
    try {
      return { source: await this.readSource(path, signal) };
    } catch (error) {
      if (error instanceof ConnectorError && error.code === "SCRIPT_NOT_FOUND") return { source: null };
      throw error;
    }
  }
}

function extractSource(result: ToolCallResult): string {
  const structured = asRecord(result.structuredContent);
  if (structured) {
    for (const key of ["source", "script_source", "scriptSource"]) {
      if (typeof structured[key] === "string") return validateSource(structured[key]);
    }
    const script = asRecord(structured.script);
    if (script) {
      for (const key of ["source", "content"]) {
        if (typeof script[key] === "string") return validateSource(script[key]);
      }
    }
  }
  const texts = contentTexts(result.content);
  if (texts.length === 1) {
    const text = texts[0] ?? "";
    try {
      const parsed: unknown = JSON.parse(text);
      const record = asRecord(parsed);
      if (record) {
        for (const key of ["source", "script_source", "scriptSource"]) {
          if (typeof record[key] === "string") return validateSource(record[key]);
        }
      }
    } catch {
      return validateSource(decodeNumberedSourceText(text));
    }
    return validateSource(decodeNumberedSourceText(text));
  }
  throw new ConnectorError("MCP_RESPONSE_MALFORMED", "Roblox Studio MCP did not return readable script source.");
}

function decodeNumberedSourceText(text: string): string {
  const lines = text.split("\n");
  const decoded: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    // StudioMCP uses U+2192 between display-only line numbers and source.
    // Accept the historical mojibake sequence as well for older server builds.
    const match = /^\s*(\d+)(?:\u2192|\u00e2\u2020\u2019)(.*)$/.exec(lines[index] ?? "");
    if (!match || Number(match[1]) !== index + 1) return text;
    decoded.push(match[2] ?? "");
  }
  return decoded.join("\n");
}

function extractInspection(result: ToolCallResult, requestedPath: string): JsonObject {
  assertToolSucceeded(result);
  let value: unknown = result.structuredContent;
  if (!isRecord(value)) {
    const texts = contentTexts(result.content);
    if (texts.length === 0) {
      throw new ConnectorError("MCP_RESPONSE_MALFORMED", "Roblox Studio MCP did not return structured instance data.");
    }
    try {
      value = JSON.parse(texts.join("\n"));
    } catch {
      throw new ConnectorError("MCP_RESPONSE_MALFORMED", "Roblox Studio MCP instance output was not valid JSON.");
    }
  }

  let record = asRecord(value);
  if (!record) {
    throw new ConnectorError("MCP_RESPONSE_MALFORMED", "Roblox Studio MCP instance output was not a JSON object.");
  }
  for (const key of ["instance", "result", "data"]) {
    const nested = asRecord(record[key]);
    if (nested) {
      record = nested;
      break;
    }
  }
  if (Array.isArray(record.instances) && record.instances.length === 1) {
    const nested = asRecord(record.instances[0]);
    if (nested) record = nested;
  }
  if (!isJsonValue(record)) {
    throw new ConnectorError("MCP_RESPONSE_MALFORMED", "Roblox Studio MCP instance output contained non-JSON values.");
  }
  if (Buffer.byteLength(JSON.stringify(record), "utf8") > MAX_OUTPUT_CHARS) {
    throw new ConnectorError("MCP_RESPONSE_TOO_LARGE", "Roblox Studio MCP instance output exceeds the connector limit.");
  }
  return { ...record, path: typeof record.path === "string" ? record.path : requestedPath };
}

function shapeInspection(inspection: JsonObject, path: string, command: StudioCommand): JsonObject {
  const shaped: JsonObject = { ...inspection, path };
  if (command.payload.includeProperties === false) deleteKnownKeys(shaped, ["properties", "Properties"]);
  if (command.payload.includeAttributes === false) deleteKnownKeys(shaped, ["attributes", "Attributes"]);
  deleteKnownKeys(shaped, ["tags", "Tags", "children", "Children", "descendants", "Descendants"]);
  if (command.type === "inspect_instances" && command.payload.includeSourceHash === false) {
    deleteKnownKeys(shaped, ["sourceHash", "source_hash"]);
  }

  const requested = command.payload.properties;
  if (command.type === "read_properties" && Array.isArray(requested) && requested.length > 0) {
    const requestedNames = requested.map((value) => validatePropertyName(value));
    const key = isRecord(shaped.properties) ? "properties" : isRecord(shaped.Properties) ? "Properties" : null;
    if (!key) {
      throw new ConnectorError(
        "MCP_RESPONSE_MALFORMED",
        "Roblox Studio MCP did not return a property map that can be safely filtered.",
      );
    }
    const propertyMap = shaped[key] as JsonObject;
    shaped[key] = Object.fromEntries(
      requestedNames.filter((name) => Object.hasOwn(propertyMap, name)).map((name) => [name, propertyMap[name] as JsonValue]),
    );
  }
  return shaped;
}

function inspectionPaths(command: StudioCommand): string[] {
  if (command.type !== "inspect_instances" && typeof command.payload.path === "string") {
    return [validatePath(command.payload.path)];
  }
  const rawPaths = command.payload.paths;
  if (!Array.isArray(rawPaths) || rawPaths.length === 0 || rawPaths.length > MAX_READ_BATCH) {
    throw new ConnectorError(
      "COMMAND_PAYLOAD_INVALID",
      `${command.type} requires 1-${MAX_READ_BATCH} Studio instance paths.`,
    );
  }
  return rawPaths.map((value) => validatePath(value));
}

function inspectionIncompatibility(command: StudioCommand): string | null {
  if (command.payload.includeTags !== false) {
    return "Official inspect_instance does not guarantee CollectionService tags; retry with includeTags=false or use the NexusRBX Studio Plugin.";
  }
  if (command.payload.includeChildren === true) {
    return "Official inspect_instance does not guarantee NexusRBX's exact child-record contract; retry with includeChildren=false or use the NexusRBX Studio Plugin.";
  }
  if (command.type === "inspect_instances" && command.payload.includeSourceHash !== false) {
    return "Official inspect_instance does not guarantee NexusRBX source hashes; retry with includeSourceHash=false or use the NexusRBX Studio Plugin.";
  }
  return null;
}

function validatePropertyName(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 120 || /[\0\r\n]/.test(value)) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "A requested Studio property name is invalid.");
  }
  return value;
}

function deleteKnownKeys(record: JsonObject, keys: string[]): void {
  for (const key of keys) delete record[key];
}

function normalizeToolOutput(result: ToolCallResult): JsonValue {
  assertToolSucceeded(result);
  if (isJsonValue(result.structuredContent)) return boundJson(result.structuredContent);
  const texts = contentTexts(result.content);
  const text = texts.join("\n");
  if (text.length > MAX_OUTPUT_CHARS) return `${text.slice(0, MAX_OUTPUT_CHARS)}…[truncated]`;
  return text;
}

function assertToolSucceeded(result: ToolCallResult): void {
  if (result.isError !== true) return;
  const message = contentTexts(result.content).join(" ").slice(0, 1_024);
  if (/not found|does not exist|missing script/i.test(message)) {
    throw new ConnectorError("SCRIPT_NOT_FOUND", message || "The Studio script was not found.");
  }
  throw new ConnectorError("MCP_TOOL_ERROR", message || "Roblox Studio MCP reported a tool error.");
}

function contentTexts(content: unknown): string[] {
  if (!Array.isArray(content)) return [];
  return content
    .map((entry) => (isRecord(entry) && entry.type === "text" && typeof entry.text === "string" ? entry.text : null))
    .filter((entry): entry is string => entry !== null);
}

function successBase(command: StudioCommand, verified: boolean, extra: JsonObject): JsonObject {
  return {
    success: true,
    ok: true,
    commandId: command.id,
    ...(command.runId === undefined ? {} : { runId: command.runId }),
    ...(command.stepId === undefined ? {} : { stepId: command.stepId }),
    operation: command.type,
    retryable: false,
    verified,
    ...extra,
  };
}

function assertCommandResultFits(result: JsonObject): void {
  if (Buffer.byteLength(JSON.stringify(result), "utf8") > MAX_COMMAND_RESULT_BYTES) {
    throw new ConnectorError(
      "COMMAND_RESULT_TOO_LARGE",
      "The Studio command result is too large to acknowledge safely. Read fewer or smaller scripts.",
      { details: { maxBytes: MAX_COMMAND_RESULT_BYTES } },
    );
  }
}

export function unsupportedResult(command: StudioCommand, message?: string): JsonObject {
  return {
    success: false,
    ok: false,
    commandId: command.id,
    operation: command.type,
    unsupported: true,
    retryable: false,
    verified: false,
    error: {
      code: "MCP_TOOL_UNAVAILABLE",
      message:
        message ??
        "Roblox Studio MCP does not expose the required capability with a validated schema. Use the NexusRBX Studio Plugin for this command.",
      retryable: false,
    },
  };
}

function failureResult(command: StudioCommand, error: ConnectorError): JsonObject {
  return {
    success: false,
    ok: false,
    commandId: command.id,
    operation: command.type,
    retryable: error.retryable,
    verified: false,
    error: {
      code: error.code,
      message: error.message.slice(0, 1_024),
      retryable: error.retryable,
      ...(error.details === undefined ? {} : { details: error.details }),
    },
  };
}

export function sha256(source: string): string {
  return createHash("sha256").update(source, "utf8").digest("hex");
}

export function nexusStableHash(source: string): string {
  let hash = 2_166_136_261;
  for (const byte of Buffer.from(source, "utf8")) {
    hash ^= byte;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function matchesSourceHash(source: string, expected: string): boolean {
  const normalized = expected.trim().toLowerCase();
  return normalized === sha256(source) || normalized === nexusStableHash(source);
}

function batchMutationFootprint(command: StudioCommand): string[] {
  const source = requirePath(command.payload, "path");
  if (command.type === "rename_instance") {
    const name = typeof command.payload.newName === "string"
      ? command.payload.newName
      : requireBoundedString(command.payload, "name", 1, 160);
    const parent = source.replace(/\/[^/]+$/, "");
    return [source, `${parent}/${name}`];
  }
  if (command.type === "move_instance") {
    if (typeof command.payload.newPath === "string") return [source, requirePath(command.payload, "newPath")];
    const parent = requirePath(command.payload, "newParentPath").replace(/\/$/, "");
    const name = source.split("/").at(-1) || "";
    return [source, `${parent}/${name}`];
  }
  if (command.type === "duplicate_instance") return [requirePath(command.payload, "newPath")];
  return [source];
}

function pathsOverlap(left: string, right: string): boolean {
  const normalize = (value: string): string => value.replace(/^game\//i, "").replace(/\/$/, "").toLowerCase();
  const a = normalize(left);
  const b = normalize(right);
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function requirePath(record: JsonObject, key: string): string {
  return validatePath(record[key]);
}

function requireSingleReadPath(record: JsonObject): string {
  if (typeof record.path === "string") return validatePath(record.path);
  if (!Array.isArray(record.paths) || record.paths.length !== 1) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "read_script requires exactly one Studio script path.");
  }
  return validatePath(record.paths[0]);
}

function validatePath(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_PATH_CHARS || /[\0\r\n]/.test(value)) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "A valid Studio script path is required.");
  }
  return value;
}

function requireBoundedString(record: Record<string, unknown> | JsonObject, key: string, minimum: number, maximum: number): string {
  const value = record[key];
  if (typeof value !== "string" || value.length < minimum || value.length > maximum) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", `${key} must be a string from ${minimum} to ${maximum} characters.`);
  }
  return value;
}

function optionalString(value: JsonValue | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function validateSource(source: string): string {
  if (source.length > MAX_SOURCE_CHARS) throw new ConnectorError("MCP_RESPONSE_TOO_LARGE", "Studio script source exceeds the connector limit.");
  return source;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function boundJson(value: JsonValue): JsonValue {
  const serialized = JSON.stringify(value);
  if (serialized.length <= MAX_OUTPUT_CHARS) return value;
  return `${serialized.slice(0, MAX_OUTPUT_CHARS)}…[truncated]`;
}
