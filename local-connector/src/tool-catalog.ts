import type { CapabilityDetails, DiscoveredTool, JsonObject, StudioCapabilities } from "./types.js";
import { EMPTY_CAPABILITIES } from "./types.js";

export interface BasicToolAdapter {
  toolName: string;
  args: JsonObject;
}

export interface PathToolProfile {
  toolName: "script_read";
  pathKey: string;
  datamodelKey?: string;
}

export interface InstanceToolProfile {
  toolName: "inspect_instance";
  pathKey: string;
  datamodelKey?: string;
}

export type MutationEncoding =
  | { kind: "source"; sourceKey: string }
  | { kind: "line_edit"; editsKey: string; startKey: string; endKey: string; textKey: string }
  | { kind: "text_edit"; editsKey: string; oldKey: string; newKey: string; replaceAllKey?: string };

export interface MutationToolProfile {
  toolName: "multi_edit";
  pathKey: string;
  datamodelKey: string;
  encoding: MutationEncoding;
}

export interface AssetToolProfile {
  toolName: "insert_asset";
  assetIdKey: string;
  assetNameKey?: string;
  assetTypeKey?: string;
  parentPathKey?: string;
}

export class ToolCatalog {
  readonly #byName: Map<string, DiscoveredTool>;
  readonly readScript: PathToolProfile | null;
  readonly inspectInstance: InstanceToolProfile | null;
  readonly mutation: MutationToolProfile | null;
  readonly executeLuau: BasicToolAdapter | null;
  readonly insertAsset: AssetToolProfile | null;
  readonly startStopPlay: BasicToolAdapter | null;
  readonly listStudios: BasicToolAdapter | null;
  readonly setActiveStudio: BasicToolAdapter | null;
  readonly studioState: BasicToolAdapter | null;
  readonly capabilities: StudioCapabilities;
  readonly capabilityDetails: CapabilityDetails;
  readonly supportedCommands: string[];

  constructor(readonly tools: DiscoveredTool[]) {
    this.#byName = new Map();
    const duplicates = new Set<string>();
    for (const tool of tools) {
      if (this.#byName.has(tool.name)) duplicates.add(tool.name);
      else this.#byName.set(tool.name, tool);
    }
    // Duplicate definitions are ambiguous, so matching tools fail closed.
    for (const name of duplicates) this.#byName.delete(name);
    this.readScript = compileReadScript(this.#byName.get("script_read"));
    this.inspectInstance = compileInspectInstance(this.#byName.get("inspect_instance"));
    this.mutation = compileMutation(this.#byName.get("multi_edit"));
    this.executeLuau = compileExactTool(this.#byName.get("execute_luau"), ["code", "datamodel_type"]);
    this.insertAsset = compileInsertAsset(this.#byName.get("insert_asset"));
    this.startStopPlay = compileExactTool(this.#byName.get("start_stop_play"), ["is_start"]);
    this.listStudios = compileExactTool(this.#byName.get("list_roblox_studios"), []);
    this.setActiveStudio = compileExactTool(this.#byName.get("set_active_studio"), ["studio_id"]);
    this.studioState = compileExactTool(this.#byName.get("get_studio_state"), []);
    const targetToolsReady = Boolean(this.listStudios && this.setActiveStudio && this.studioState);

    const commands = new Set<string>();
    if (targetToolsReady && this.readScript) {
      commands.add("read_script");
      commands.add("read_scripts");
    }
    if (targetToolsReady && this.inspectInstance) {
      commands.add("inspect_instances");
      commands.add("read_instance");
      commands.add("read_properties");
    }
    if (targetToolsReady && compileSearch(this.#byName.get("script_search"), ["keywords", "query", "name"])) commands.add("search_project");
    if (targetToolsReady && compileSearch(this.#byName.get("script_grep"), ["pattern", "query"])) commands.add("search_source");
    if (targetToolsReady) commands.add("get_studio_context");
    if (targetToolsReady && compileNoInput(this.#byName.get("get_console_output"))) {
      commands.add("get_output_logs");
      commands.add("collect_output");
    }
    if (targetToolsReady && this.readScript && this.mutation) {
      commands.add("write_script");
      commands.add("patch_script");
    }
    if (targetToolsReady && this.executeLuau) {
      commands.add("create_script");
      commands.add("get_selection");
      for (const command of INSTANCE_COMMANDS) commands.add(command);
      for (const command of SNAPSHOT_COMMANDS) commands.add(command);
    }
    if (targetToolsReady && this.executeLuau && this.insertAsset) commands.add("insert_creator_store_asset");
    if (targetToolsReady && this.executeLuau && this.startStopPlay && compileNoInput(this.#byName.get("get_console_output"))) {
      for (const command of PLAYTEST_COMMANDS) commands.add(command);
    }
    this.supportedCommands = [...commands].sort();
    this.capabilities = {
      ...EMPTY_CAPABILITIES,
      readProject: commands.has("search_project"),
      readScript: commands.has("read_script") && commands.has("read_scripts"),
      writeScript: commands.has("create_script") && commands.has("write_script"),
      patchScript: commands.has("patch_script"),
      outputLogs: commands.has("get_output_logs") && commands.has("collect_output"),
      inspectSelection: commands.has("get_selection"),
      playtest: PLAYTEST_COMMANDS.every((command) => commands.has(command)),
      creatorStoreInsert: commands.has("insert_creator_store_asset"),
      instanceMutation: INSTANCE_COMMANDS.every((command) => commands.has(command)),
      snapshots: SNAPSHOT_COMMANDS.every((command) => commands.has(command)),
    };
    this.capabilityDetails = makeCapabilityDetails(this.capabilities, {
      readProject: { commands: ["search_project"], tools: ["script_search", ...TARGET_TOOLS] },
      readScript: { commands: ["read_script", "read_scripts"], tools: ["script_read", ...TARGET_TOOLS] },
      writeScript: { commands: ["create_script", "write_script"], tools: ["execute_luau", "script_read", "multi_edit", ...TARGET_TOOLS] },
      patchScript: { commands: ["patch_script"], tools: ["script_read", "multi_edit", ...TARGET_TOOLS] },
      inspectSelection: { commands: ["get_selection"], tools: ["execute_luau", ...TARGET_TOOLS] },
      outputLogs: { commands: ["get_output_logs", "collect_output"], tools: ["get_console_output", ...TARGET_TOOLS] },
      playtest: { commands: [...PLAYTEST_COMMANDS], tools: ["execute_luau", "start_stop_play", "get_studio_state", "get_console_output", ...TARGET_TOOLS] },
      creatorStoreInsert: { commands: ["insert_creator_store_asset"], tools: ["execute_luau", "insert_asset", ...TARGET_TOOLS] },
      instanceMutation: { commands: [...INSTANCE_COMMANDS], tools: ["execute_luau", ...TARGET_TOOLS] },
      snapshots: { commands: [...SNAPSHOT_COMMANDS], tools: ["execute_luau", ...TARGET_TOOLS] },
    }, this.#byName);
  }

  hasCommand(command: string): boolean {
    return this.supportedCommands.includes(command);
  }

  makeReadArgs(path: string): BasicToolAdapter | null {
    if (!this.readScript) return null;
    return {
      toolName: this.readScript.toolName,
      args: {
        [this.readScript.pathKey]: path,
        ...(this.readScript.datamodelKey === undefined ? {} : { [this.readScript.datamodelKey]: "Edit" }),
      },
    };
  }

  makeInspectArgs(path: string): BasicToolAdapter | null {
    if (!this.inspectInstance) return null;
    return {
      toolName: this.inspectInstance.toolName,
      args: {
        [this.inspectInstance.pathKey]: path,
        ...(this.inspectInstance.datamodelKey === undefined
          ? {}
          : { [this.inspectInstance.datamodelKey]: "Edit" }),
      },
    };
  }

  makeSearchArgs(command: "search_project" | "search_source", query: string): BasicToolAdapter | null {
    const tool = command === "search_project" ? this.#byName.get("script_search") : this.#byName.get("script_grep");
    const profile = compileSearch(tool, command === "search_project" ? ["keywords", "query", "name"] : ["pattern", "query"]);
    if (!profile) return null;
    return {
      toolName: profile.toolName,
      args: {
        [profile.queryKey]: query,
        ...(profile.datamodelKey === undefined ? {} : { [profile.datamodelKey]: "Edit" }),
      },
    };
  }

  makeNoInputArgs(command: "get_studio_context" | "get_output_logs" | "collect_output"): BasicToolAdapter | null {
    const name = command === "get_studio_context" ? "get_studio_state" : "get_console_output";
    return compileNoInput(this.#byName.get(name)) ? { toolName: name, args: {} } : null;
  }

  makeInsertAssetArgs(input: { assetId: string; assetName?: string; assetType?: string; parentPath?: string }): BasicToolAdapter | null {
    const profile = this.insertAsset;
    if (!profile) return null;
    return {
      toolName: profile.toolName,
      args: {
        [profile.assetIdKey]: input.assetId,
        ...(profile.assetNameKey && input.assetName ? { [profile.assetNameKey]: input.assetName } : {}),
        ...(profile.assetTypeKey && input.assetType ? { [profile.assetTypeKey]: input.assetType } : {}),
        ...(profile.parentPathKey && input.parentPath ? { [profile.parentPathKey]: input.parentPath } : {}),
      },
    };
  }

  makeMutationArgs(path: string, currentSource: string | null, targetSource: string): BasicToolAdapter | null {
    const profile = this.mutation;
    if (!profile) return null;
    const base: JsonObject = { [profile.pathKey]: path, [profile.datamodelKey]: "Edit" };
    if (profile.encoding.kind === "source") {
      base[profile.encoding.sourceKey] = targetSource;
      return { toolName: profile.toolName, args: base };
    }
    if (currentSource === null) return null;
    if (profile.encoding.kind === "line_edit") {
      base[profile.encoding.editsKey] = [
        {
          [profile.encoding.startKey]: 1,
          [profile.encoding.endKey]: Math.max(1, currentSource.split("\n").length),
          [profile.encoding.textKey]: targetSource,
        },
      ];
      return { toolName: profile.toolName, args: base };
    }
    base[profile.encoding.editsKey] = [
      {
        [profile.encoding.oldKey]: currentSource,
        [profile.encoding.newKey]: targetSource,
        ...(profile.encoding.replaceAllKey ? { [profile.encoding.replaceAllKey]: false } : {}),
      },
    ];
    return { toolName: profile.toolName, args: base };
  }
}

interface SearchProfile {
  toolName: string;
  queryKey: string;
  datamodelKey?: string;
}

function compileReadScript(tool: DiscoveredTool | undefined): PathToolProfile | null {
  if (!tool || tool.name !== "script_read") return null;
  const schema = objectSchema(tool.inputSchema);
  if (!schema) return null;
  const pathKey = findRequiredString(schema, ["target_file", "path", "script_path", "scriptPath"]);
  if (!pathKey) return null;
  const datamodelKey = findDatamodelKey(schema);
  const allowedRequired = new Set([pathKey, ...(datamodelKey ? [datamodelKey] : [])]);
  if (schema.required.some((key) => !allowedRequired.has(key))) return null;
  return { toolName: "script_read", pathKey, ...(datamodelKey ? { datamodelKey } : {}) };
}

function compileInspectInstance(tool: DiscoveredTool | undefined): InstanceToolProfile | null {
  if (!tool || tool.name !== "inspect_instance") return null;
  const schema = objectSchema(tool.inputSchema);
  if (!schema) return null;
  const pathKey = findRequiredString(schema, ["path", "instance_path", "instancePath"]);
  if (!pathKey) return null;
  const datamodelKey = findDatamodelKey(schema);
  const declaresDatamodel = ["datamodel_type", "datamodelType"].some((key) => key in schema.properties);
  if (declaresDatamodel && !datamodelKey) return null;
  const allowedRequired = new Set([pathKey, ...(datamodelKey ? [datamodelKey] : [])]);
  if (schema.required.some((key) => !allowedRequired.has(key))) return null;
  return { toolName: "inspect_instance", pathKey, ...(datamodelKey ? { datamodelKey } : {}) };
}

function compileSearch(tool: DiscoveredTool | undefined, queryCandidates: string[]): SearchProfile | null {
  if (!tool) return null;
  const schema = objectSchema(tool.inputSchema);
  if (!schema) return null;
  const queryKey = findRequiredString(schema, queryCandidates);
  if (!queryKey) return null;
  const datamodelKey = findDatamodelKey(schema);
  const allowedRequired = new Set([queryKey, ...(datamodelKey ? [datamodelKey] : [])]);
  if (schema.required.some((key) => !allowedRequired.has(key))) return null;
  return { toolName: tool.name, queryKey, ...(datamodelKey ? { datamodelKey } : {}) };
}

function compileNoInput(tool: DiscoveredTool | undefined): boolean {
  if (!tool) return false;
  const schema = objectSchema(tool.inputSchema);
  return schema !== null && schema.required.length === 0;
}

function compileInsertAsset(tool: DiscoveredTool | undefined): AssetToolProfile | null {
  if (!tool || tool.name !== "insert_asset") return null;
  const schema = objectSchema(tool.inputSchema);
  if (!schema) return null;
  const assetIdKey = findRequiredString(schema, ["assetId", "asset_id"]);
  if (!assetIdKey || schema.required.some((key) => key !== assetIdKey)) return null;
  const optionalString = (candidates: string[]) => candidates.find((key) => {
    const property = asRecord(schema.properties[key]);
    return property?.type === "string";
  });
  const assetNameKey = optionalString(["assetName", "asset_name"]);
  const assetTypeKey = optionalString(["type", "assetType", "asset_type"]);
  const parentPathKey = optionalString(["parentPath", "parent_path"]);
  return {
    toolName: "insert_asset",
    assetIdKey,
    ...(assetNameKey ? { assetNameKey } : {}),
    ...(assetTypeKey ? { assetTypeKey } : {}),
    ...(parentPathKey ? { parentPathKey } : {}),
  };
}

function compileMutation(tool: DiscoveredTool | undefined): MutationToolProfile | null {
  if (!tool || tool.name !== "multi_edit") return null;
  const schema = objectSchema(tool.inputSchema);
  if (!schema) return null;
  const pathKey = findRequiredString(schema, ["file_path", "path", "script_path", "scriptPath"]);
  const datamodelKey = findDatamodelKey(schema, true);
  if (!pathKey || !datamodelKey) return null;

  const sourceKey = findRequiredString(schema, ["source", "new_source", "newSource"]);
  if (sourceKey) {
    if (!requiredExactly(schema.required, [pathKey, datamodelKey, sourceKey])) return null;
    return { toolName: "multi_edit", pathKey, datamodelKey, encoding: { kind: "source", sourceKey } };
  }

  const editsKey = findRequiredArray(schema, ["edits"]);
  if (!editsKey || !requiredExactly(schema.required, [pathKey, datamodelKey, editsKey])) return null;
  const editsSchema = asRecord(schema.properties[editsKey]);
  const itemSchema = editsSchema ? objectSchema(asRecord(editsSchema.items)) : null;
  if (!itemSchema) return null;

  const startKey = findRequiredInteger(itemSchema, ["start_line", "startLine"]);
  const endKey = findRequiredInteger(itemSchema, ["end_line", "endLine"]);
  const textKey = findRequiredString(itemSchema, ["new_text", "newText", "replacement"]);
  if (startKey && endKey && textKey && requiredExactly(itemSchema.required, [startKey, endKey, textKey])) {
    return {
      toolName: "multi_edit",
      pathKey,
      datamodelKey,
      encoding: { kind: "line_edit", editsKey, startKey, endKey, textKey },
    };
  }

  const oldKey = findRequiredString(itemSchema, ["old_string", "old_text", "oldText"]);
  const newKey = findRequiredString(itemSchema, ["new_string", "new_text", "newText"]);
  const replaceAllKey = findOptionalBoolean(itemSchema, ["replace_all", "replaceAll"]);
  if (oldKey && newKey && requiredExactly(itemSchema.required, [oldKey, newKey])) {
    return {
      toolName: "multi_edit",
      pathKey,
      datamodelKey,
      encoding: { kind: "text_edit", editsKey, oldKey, newKey, ...(replaceAllKey ? { replaceAllKey } : {}) },
    };
  }
  return null;
}

interface ParsedObjectSchema {
  properties: Record<string, unknown>;
  required: string[];
}

function objectSchema(value: unknown): ParsedObjectSchema | null {
  const record = asRecord(value);
  if (!record || record.type !== "object") return null;
  const properties = asRecord(record.properties) ?? {};
  const required = record.required === undefined ? [] : record.required;
  if (!Array.isArray(required) || !required.every((key) => typeof key === "string")) return null;
  return { properties, required };
}

function findRequiredString(schema: ParsedObjectSchema, candidates: string[]): string | null {
  return findRequiredType(schema, candidates, ["string"]);
}

function findRequiredInteger(schema: ParsedObjectSchema, candidates: string[]): string | null {
  return findRequiredType(schema, candidates, ["integer", "number"]);
}

function findRequiredArray(schema: ParsedObjectSchema, candidates: string[]): string | null {
  return findRequiredType(schema, candidates, ["array"]);
}

function findOptionalBoolean(schema: ParsedObjectSchema, candidates: string[]): string | null {
  for (const key of candidates) {
    const property = asRecord(schema.properties[key]);
    if (property?.type === "boolean") return key;
  }
  return null;
}

function compileExactTool(tool: DiscoveredTool | undefined, required: string[]): BasicToolAdapter | null {
  if (!tool) return null;
  const schema = objectSchema(tool.inputSchema);
  if (!schema || !requiredExactly(schema.required, required)) return null;
  for (const key of required) {
    const property = asRecord(schema.properties[key]);
    if (!property) return null;
    if (key === "is_start" && property.type !== "boolean") return null;
    if (key !== "is_start" && property.type !== "string") return null;
    if (key === "datamodel_type" && Array.isArray(property.enum) && !property.enum.includes("Edit")) return null;
  }
  return { toolName: tool.name, args: {} };
}

const INSTANCE_COMMANDS = [
  "create_instance", "update_properties", "update_attributes", "update_tags", "rename_instance",
  "move_instance", "duplicate_instance", "delete_instance", "batch_operations",
] as const;
const SNAPSHOT_COMMANDS = ["create_snapshot", "restore_snapshot", "undo_last_batch"] as const;
const PLAYTEST_COMMANDS = ["run_test_service", "run_play_test", "stop_play_test"] as const;
const TARGET_TOOLS = ["list_roblox_studios", "set_active_studio", "get_studio_state"] as const;

function makeCapabilityDetails(
  capabilities: StudioCapabilities,
  requirements: Record<keyof StudioCapabilities, { commands: string[]; tools: string[] }>,
  tools: Map<string, DiscoveredTool>,
): CapabilityDetails {
  const verifiedAt = Date.now();
  return Object.fromEntries(Object.entries(requirements).map(([key, requirement]) => {
    const supported = capabilities[key as keyof StudioCapabilities];
    const missing = requirement.tools.filter((tool) => !tools.has(tool));
    return [key, {
      status: supported ? "supported" : "unavailable",
      reasonCode: supported ? "SELF_CHECK_PASSED" : missing.length ? "REQUIRED_TOOL_MISSING" : "SCHEMA_INCOMPATIBLE",
      requiredCommands: requirement.commands,
      requiredTools: requirement.tools,
      verifiedAt: supported ? verifiedAt : null,
    }];
  })) as CapabilityDetails;
}

function findRequiredType(schema: ParsedObjectSchema, candidates: string[], types: string[]): string | null {
  for (const key of candidates) {
    if (!schema.required.includes(key)) continue;
    const property = asRecord(schema.properties[key]);
    if (property && typeof property.type === "string" && types.includes(property.type)) return key;
  }
  return null;
}

function findDatamodelKey(schema: ParsedObjectSchema, required = false): string | null {
  for (const key of ["datamodel_type", "datamodelType"]) {
    if (required && !schema.required.includes(key)) continue;
    const property = asRecord(schema.properties[key]);
    if (!property || property.type !== "string") continue;
    if (Array.isArray(property.enum) && !property.enum.includes("Edit")) continue;
    return key;
  }
  return null;
}

function requiredExactly(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && actual.every((key) => expected.includes(key));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
