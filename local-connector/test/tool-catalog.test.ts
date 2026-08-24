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
const executeLuau = tool(
  "execute_luau",
  { code: { type: "string" }, datamodel_type: { type: "string", enum: ["Edit"] } },
  ["code", "datamodel_type"],
);
const targetTools = [listStudios, setStudio, state];
const targeted = (items: DiscoveredTool[]) => [...targetTools, ...items.filter((item) => item.name !== "get_studio_state")];
const withStudioId = (value: DiscoveredTool): DiscoveredTool => ({
  ...value,
  inputSchema: {
    ...(value.inputSchema as JsonObject),
    properties: { ...((value.inputSchema.properties as JsonObject) ?? {}), studio_id: { type: "string" } },
    required: [...((value.inputSchema.required as string[]) ?? []), "studio_id"],
  },
});
const currentTargeted = (items: DiscoveredTool[]) => [
  listStudios,
  withStudioId(state),
  ...items.filter((item) => item.name !== "get_studio_state").map(withStudioId),
];

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
  assert.deepEqual(catalog.makeReadArgs("ServerScriptService/Nested/Main"), {
    toolName: "script_read",
    args: { target_file: "game.ServerScriptService.Nested.Main", datamodel_type: "Edit" },
  });
  assert.deepEqual(catalog.makeInspectArgs("game.Workspace.Part"), {
    toolName: "inspect_instance",
    args: { path: "game.Workspace.Part", datamodel_type: "Edit" },
  });
  assert.deepEqual(catalog.makeInspectArgs("Workspace/Folder/Part"), {
    toolName: "inspect_instance",
    args: { path: "game.Workspace.Folder.Part", datamodel_type: "Edit" },
  });
  assert.deepEqual(catalog.makeSearchArgs("search_source", "RemoteEvent"), {
    toolName: "script_grep",
    args: { pattern: "RemoteEvent" },
  });
  assert.deepEqual(catalog.makeMutationArgs("game.ServerScriptService.Main", "old", "new"), {
    toolName: "multi_edit",
    args: { file_path: "game.ServerScriptService.Main", datamodel_type: "Edit", edits: [{ old_string: "old", new_string: "new", replace_all: false }] },
  });
  assert.deepEqual(catalog.makeMutationArgs("ServerScriptService/Nested/Main", "old", "new"), {
    toolName: "multi_edit",
    args: { file_path: "game.ServerScriptService.Nested.Main", datamodel_type: "Edit", edits: [{ old_string: "old", new_string: "new", replace_all: false }] },
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
    args: { assetId: "123", assetName: "Tree", type: "Model", parentPath: "game.Workspace.Nexus" },
  });
});

test("catalog accepts current Studio MCP schemas with a required per-call studio id", () => {
  const catalog = new ToolCatalog(currentTargeted([read, inspect, search, grep, state, output, sourceMutation]));
  assert.equal(catalog.perCallStudioTargeting, true);
  assert.equal(catalog.setActiveStudio?.toolName, "set_active_studio");
  assert.equal(catalog.hasCommand("read_script"), true);
  assert.equal(catalog.hasCommand("write_script"), true);
  assert.equal(catalog.hasCommand("get_output_logs"), true);
  assert.equal(catalog.capabilityDetails.readScript.status, "supported");
  assert.equal(catalog.capabilityDetails.readScript.requiredTools.includes("set_active_studio"), false);
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

test("create_script is advertised only when both its fixed routine and readback dependency validate", () => {
  const routineOnly = new ToolCatalog(targeted([executeLuau]));
  assert.equal(routineOnly.hasCommand("create_script"), false);

  const routineWithReadback = new ToolCatalog(targeted([executeLuau, read]));
  assert.equal(routineWithReadback.hasCommand("create_script"), true);
});

test("runtime command suppression preserves safe tools and explains the failed playtest capability", () => {
  const startStop = tool("start_stop_play", { is_start: { type: "boolean" } }, ["is_start"]);
  const catalog = new ToolCatalog(targeted([executeLuau, output, startStop]), {
    disabledCommands: ["run_play_test", "stop_play_test"],
    capabilityReasonCodes: { playtest: "RUNTIME_SELF_CHECK_FAILED" },
  });

  assert.equal(catalog.hasCommand("run_test_service"), true);
  assert.equal(catalog.hasCommand("run_play_test"), false);
  assert.equal(catalog.hasCommand("stop_play_test"), false);
  assert.equal(catalog.capabilities.playtest, false);
  assert.equal(catalog.capabilityDetails.playtest.reasonCode, "RUNTIME_SELF_CHECK_FAILED");
});
