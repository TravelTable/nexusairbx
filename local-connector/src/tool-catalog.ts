import type { DiscoveredTool, JsonObject, StudioCapabilities } from "./types.js";
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
  | { kind: "text_edit"; editsKey: string; oldKey: string; newKey: string };

export interface MutationToolProfile {
  toolName: "multi_edit";
  pathKey: string;
  datamodelKey: string;
  encoding: MutationEncoding;
}

export class ToolCatalog {
  readonly #byName: Map<string, DiscoveredTool>;
  readonly readScript: PathToolProfile | null;
  readonly inspectInstance: InstanceToolProfile | null;
  readonly mutation: MutationToolProfile | null;
  readonly capabilities: StudioCapabilities;
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

    const commands = new Set<string>();
    if (this.readScript) {
      commands.add("read_script");
      commands.add("read_scripts");
    }
    if (this.inspectInstance) {
      commands.add("inspect_instances");
      commands.add("read_instance");
      commands.add("read_properties");
    }
    if (compileSearch(this.#byName.get("script_search"), ["query", "name"])) commands.add("search_project");
    if (compileSearch(this.#byName.get("script_grep"), ["pattern", "query"])) commands.add("search_source");
    if (compileNoInput(this.#byName.get("get_studio_state"))) commands.add("get_studio_context");
    if (compileNoInput(this.#byName.get("get_console_output"))) {
      commands.add("get_output_logs");
      commands.add("collect_output");
    }
    if (this.readScript && this.mutation) {
      commands.add("write_script");
      commands.add("patch_script");
      if (this.mutation.encoding.kind === "source") commands.add("create_script");
    }
    this.supportedCommands = [...commands].sort();
    this.capabilities = {
      ...EMPTY_CAPABILITIES,
      readProject:
        commands.has("search_project") || commands.has("search_source") || commands.has("inspect_instances"),
      readScript: this.readScript !== null,
      writeScript: commands.has("write_script"),
      patchScript: commands.has("patch_script"),
      outputLogs: commands.has("get_output_logs"),
    };
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
    const profile = compileSearch(tool, command === "search_project" ? ["query", "name"] : ["pattern", "query"]);
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
      { [profile.encoding.oldKey]: currentSource, [profile.encoding.newKey]: targetSource },
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
  const pathKey = findRequiredString(schema, ["path", "script_path", "scriptPath"]);
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

function compileMutation(tool: DiscoveredTool | undefined): MutationToolProfile | null {
  if (!tool || tool.name !== "multi_edit") return null;
  const schema = objectSchema(tool.inputSchema);
  if (!schema) return null;
  const pathKey = findRequiredString(schema, ["path", "script_path", "scriptPath"]);
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

  const oldKey = findRequiredString(itemSchema, ["old_text", "oldText"]);
  const newKey = findRequiredString(itemSchema, ["new_text", "newText"]);
  if (oldKey && newKey && requiredExactly(itemSchema.required, [oldKey, newKey])) {
    return {
      toolName: "multi_edit",
      pathKey,
      datamodelKey,
      encoding: { kind: "text_edit", editsKey, oldKey, newKey },
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
