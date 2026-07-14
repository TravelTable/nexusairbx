import assert from "node:assert/strict";
import test from "node:test";
import { ToolCatalog } from "../src/tool-catalog.js";
import type { DiscoveredTool, JsonObject } from "../src/types.js";

function tool(name: string, properties: JsonObject, required: string[]): DiscoveredTool {
  return { name, inputSchema: { type: "object", properties, required } };
}

const read = tool(
  "script_read",
  { path: { type: "string" }, datamodel_type: { type: "string", enum: ["Edit"] } },
  ["path", "datamodel_type"],
);
const search = tool(
  "script_search",
  { query: { type: "string" }, datamodel_type: { type: "string", enum: ["Edit"] } },
  ["query"],
);
const grep = tool("script_grep", { pattern: { type: "string" } }, ["pattern"]);
const state = tool("get_studio_state", {}, []);
const output = tool("get_console_output", {}, []);
const inspect = tool(
  "inspect_instance",
  { path: { type: "string" }, datamodel_type: { type: "string", enum: ["Edit"] } },
  ["path", "datamodel_type"],
);
const sourceMutation = tool(
  "multi_edit",
  {
    path: { type: "string" },
    datamodel_type: { type: "string", enum: ["Edit"] },
    source: { type: "string" },
  },
  ["path", "datamodel_type", "source"],
);

test("catalog enables only exact, schema-validated Nexus commands", () => {
  const catalog = new ToolCatalog([read, inspect, search, grep, state, output, sourceMutation]);
  assert.deepEqual(catalog.supportedCommands, [
    "collect_output",
    "create_script",
    "get_output_logs",
    "get_studio_context",
    "inspect_instances",
    "patch_script",
    "read_instance",
    "read_properties",
    "read_script",
    "read_scripts",
    "search_project",
    "search_source",
    "write_script",
  ]);
  assert.deepEqual(catalog.capabilities, {
    readProject: true,
    readScript: true,
    writeScript: true,
    patchScript: true,
    inspectSelection: false,
    outputLogs: true,
    playtest: false,
    creatorStoreInsert: false,
    instanceMutation: false,
    snapshots: false,
  });
  assert.deepEqual(catalog.makeReadArgs("game.ServerScriptService.Main"), {
    toolName: "script_read",
    args: { path: "game.ServerScriptService.Main", datamodel_type: "Edit" },
  });
  assert.deepEqual(catalog.makeInspectArgs("game.Workspace.Part"), {
    toolName: "inspect_instance",
    args: { path: "game.Workspace.Part", datamodel_type: "Edit" },
  });
  assert.deepEqual(catalog.makeSearchArgs("search_source", "RemoteEvent"), {
    toolName: "script_grep",
    args: { pattern: "RemoteEvent" },
  });
  assert.deepEqual(catalog.makeMutationArgs("game.ServerScriptService.Main", "old", "new"), {
    toolName: "multi_edit",
    args: { path: "game.ServerScriptService.Main", datamodel_type: "Edit", source: "new" },
  });
});

test("inspect_instance fails closed on an unknown required argument", () => {
  const incompatible = tool(
    "inspect_instance",
    {
      path: { type: "string" },
      datamodel_type: { type: "string", enum: ["Edit"] },
      execute: { type: "boolean" },
    },
    ["path", "datamodel_type", "execute"],
  );
  const catalog = new ToolCatalog([incompatible]);
  assert.deepEqual(catalog.supportedCommands, []);
  assert.equal(catalog.makeInspectArgs("game.Workspace.Part"), null);
});

test("inspect_instance fails closed when a declared datamodel excludes Edit mode", () => {
  const incompatible = tool(
    "inspect_instance",
    {
      path: { type: "string" },
      datamodel_type: { type: "string", enum: ["Client", "Server"] },
    },
    ["path"],
  );
  const catalog = new ToolCatalog([incompatible]);
  assert.deepEqual(catalog.supportedCommands, []);
  assert.equal(catalog.makeInspectArgs("game.Workspace.Part"), null);
});

test("wrong names, duplicate definitions, unknown required fields, and incompatible schemas fail closed", () => {
  const wrongCase = new ToolCatalog([{ ...read, name: "Script_Read" }, sourceMutation]);
  assert.deepEqual(wrongCase.supportedCommands, []);

  const duplicate = new ToolCatalog([read, read, sourceMutation]);
  assert.deepEqual(duplicate.supportedCommands, []);

  const extraRequired = tool(
    "script_read",
    {
      path: { type: "string" },
      datamodel_type: { type: "string", enum: ["Edit"] },
      unsafe: { type: "boolean" },
    },
    ["path", "datamodel_type", "unsafe"],
  );
  assert.deepEqual(new ToolCatalog([extraRequired, sourceMutation]).supportedCommands, []);

  const wrongDatamodel = tool(
    "multi_edit",
    {
      path: { type: "string" },
      datamodel_type: { type: "string", enum: ["Play"] },
      source: { type: "string" },
    },
    ["path", "datamodel_type", "source"],
  );
  assert.deepEqual(new ToolCatalog([read, wrongDatamodel]).supportedCommands, ["read_script", "read_scripts"]);
});

test("validated full-file line edits support guarded writes but not creation", () => {
  const lineMutation = tool(
    "multi_edit",
    {
      path: { type: "string" },
      datamodel_type: { type: "string", enum: ["Edit"] },
      edits: {
        type: "array",
        items: {
          type: "object",
          properties: {
            start_line: { type: "integer" },
            end_line: { type: "integer" },
            new_text: { type: "string" },
          },
          required: ["start_line", "end_line", "new_text"],
        },
      },
    },
    ["path", "datamodel_type", "edits"],
  );
  const catalog = new ToolCatalog([read, lineMutation]);
  assert.equal(catalog.hasCommand("write_script"), true);
  assert.equal(catalog.hasCommand("patch_script"), true);
  assert.equal(catalog.hasCommand("create_script"), false);
  assert.deepEqual(catalog.makeMutationArgs("game.Script", "one\ntwo", "new"), {
    toolName: "multi_edit",
    args: {
      path: "game.Script",
      datamodel_type: "Edit",
      edits: [{ start_line: 1, end_line: 2, new_text: "new" }],
    },
  });
});
