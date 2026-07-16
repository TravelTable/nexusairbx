import assert from "node:assert/strict";
import test from "node:test";
import { ToolCatalog } from "../src/tool-catalog.js";
import type { DiscoveredTool, JsonObject } from "../src/types.js";

function tool(name: string, properties: JsonObject, required: string[]): DiscoveredTool {
  return { name, inputSchema: { type: "object", properties, required } };
}

const read = tool(
  "script_read",
  { target_file: { type: "string" }, datamodel_type: { type: "string", enum: ["Edit"] } },
  ["target_file", "datamodel_type"],
);
const search = tool(
  "script_search",
  { keywords: { type: "string" }, datamodel_type: { type: "string", enum: ["Edit"] } },
  ["keywords"],
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
    file_path: { type: "string" },
    datamodel_type: { type: "string", enum: ["Edit"] },
    edits: { type: "array", items: { type: "object", properties: { old_string: { type: "string" }, new_string: { type: "string" }, replace_all: { type: "boolean" } }, required: ["old_string", "new_string"] } },
  },
  ["file_path", "datamodel_type", "edits"],
);
const listStudios = tool("list_roblox_studios", {}, []);
const setStudio = tool("set_active_studio", { studio_id: { type: "string" } }, ["studio_id"]);
const targetTools = [listStudios, setStudio, state];
const targeted = (items: DiscoveredTool[]) => [...targetTools, ...items.filter((item) => item.name !== "get_studio_state")];

test("catalog enables only exact, schema-validated Nexus commands", () => {
  const catalog = new ToolCatalog(targeted([read, inspect, search, grep, state, output, sourceMutation]));
  assert.deepEqual(catalog.supportedCommands, [
    "collect_output",
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
    writeScript: false,
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
    args: { target_file: "game.ServerScriptService.Main", datamodel_type: "Edit" },
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
    args: { file_path: "game.ServerScriptService.Main", datamodel_type: "Edit", edits: [{ old_string: "old", new_string: "new", replace_all: false }] },
  });
});

test("insert_asset maps current optional fields without inventing schema keys", () => {
  const insert = tool("insert_asset", {
    assetId: { type: "string" },
    assetName: { type: "string" },
    type: { type: "string" },
    parentPath: { type: "string" },
  }, ["assetId"]);
  const catalog = new ToolCatalog(targeted([insert]));
  assert.deepEqual(catalog.makeInsertAssetArgs({ assetId: "123", assetName: "Tree", assetType: "Model", parentPath: "Workspace/Nexus" }), {
    toolName: "insert_asset",
    args: { assetId: "123", assetName: "Tree", type: "Model", parentPath: "Workspace/Nexus" },
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
  const catalog = new ToolCatalog(targeted([incompatible]));
  assert.equal(catalog.hasCommand("read_instance"), false);
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
  const catalog = new ToolCatalog(targeted([incompatible]));
  assert.equal(catalog.hasCommand("read_instance"), false);
  assert.equal(catalog.makeInspectArgs("game.Workspace.Part"), null);
});

test("wrong names, duplicate definitions, unknown required fields, and incompatible schemas fail closed", () => {
  const wrongCase = new ToolCatalog(targeted([{ ...read, name: "Script_Read" }, sourceMutation]));
  assert.equal(wrongCase.hasCommand("read_script"), false);

  const duplicate = new ToolCatalog(targeted([read, read, sourceMutation]));
  assert.equal(duplicate.hasCommand("read_script"), false);

  const extraRequired = tool(
    "script_read",
    {
      path: { type: "string" },
      datamodel_type: { type: "string", enum: ["Edit"] },
      unsafe: { type: "boolean" },
    },
    ["path", "datamodel_type", "unsafe"],
  );
  assert.equal(new ToolCatalog(targeted([extraRequired, sourceMutation])).hasCommand("read_script"), false);

  const wrongDatamodel = tool(
    "multi_edit",
    {
      file_path: { type: "string" },
      datamodel_type: { type: "string", enum: ["Play"] },
      edits: { type: "array", items: { type: "object", properties: { old_string: { type: "string" }, new_string: { type: "string" } }, required: ["old_string", "new_string"] } },
    },
    ["file_path", "datamodel_type", "edits"],
  );
  const wrongDatamodelCatalog = new ToolCatalog(targeted([read, wrongDatamodel]));
  assert.equal(wrongDatamodelCatalog.hasCommand("read_script"), true);
  assert.equal(wrongDatamodelCatalog.hasCommand("write_script"), false);
});

test("validated full-file line edits support guarded writes but not creation", () => {
  const lineMutation = tool(
    "multi_edit",
    {
      file_path: { type: "string" },
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
    ["file_path", "datamodel_type", "edits"],
  );
  const catalog = new ToolCatalog(targeted([read, lineMutation]));
  assert.equal(catalog.hasCommand("write_script"), true);
  assert.equal(catalog.hasCommand("patch_script"), true);
  assert.equal(catalog.hasCommand("create_script"), false);
  assert.deepEqual(catalog.makeMutationArgs("game.Script", "one\ntwo", "new"), {
    toolName: "multi_edit",
    args: {
      file_path: "game.Script",
      datamodel_type: "Edit",
      edits: [{ start_line: 1, end_line: 2, new_text: "new" }],
    },
  });
});
