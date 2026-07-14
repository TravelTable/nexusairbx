import { createHash } from "node:crypto";
import { ConnectorError, asConnectorError } from "./errors.js";
import { ToolCatalog } from "./tool-catalog.js";
import type { JsonObject, JsonValue, McpClientLike, StudioCommand, ToolCallResult } from "./types.js";

const MAX_PATH_CHARS = 2_048;
const MAX_SOURCE_CHARS = 1_000_000;
const MAX_OUTPUT_CHARS = 256_000;
const MAX_READ_BATCH = 20;
// backend/server.js accepts JSON request bodies up to 2 MiB. Leave enough room
// for the acknowledgement envelope and JSON metadata around the command result.
const MAX_COMMAND_RESULT_BYTES = 1_500_000;

export class CommandExecutor {
  #catalog: ToolCatalog;

  constructor(
    private readonly mcp: McpClientLike,
    catalog: ToolCatalog,
  ) {
    this.#catalog = catalog;
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
      case "create_script":
      case "write_script":
      case "patch_script":
        return await this.mutateScript(command, signal);
      default:
        return unsupportedResult(command);
    }
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
      return validateSource(text);
    }
    return validateSource(text);
  }
  throw new ConnectorError("MCP_RESPONSE_MALFORMED", "Roblox Studio MCP did not return readable script source.");
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
