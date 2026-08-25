#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const pluginRoot = path.resolve(__dirname, "..");
const outputPath = path.join(pluginRoot, "NexusRBXStudioBridge.plugin.lua");

const sources = [
  "src/config.lua",
  "src/ui/components.lua",
  "src/net/httpClient.lua",
  "src/net/chatClient.lua",
  "src/studio/serialization.lua",
  "src/studio/path.lua",
  "src/studio/snapshot.lua",
  "src/ui/PluginHeader.lua",
  "src/ui/ChatMessage.lua",
  "src/ui/Composer.lua",
  "src/ui/ToolActivity.lua",
  "src/ui/BridgePanel.lua",
  "src/commands/readTools.lua",
  "src/studio/targetIntegrity.lua",
  "src/commands/validation.lua",
  "src/commands/writeTools.lua",
  "src/commands/nativeModel.lua",
  "src/commands/importedAsset.lua",
  "src/commands/registry.lua",
  "src/Main.server.lua",
];

const SERVICE_NAMES = [
  "HttpService",
  "AssetService",
  "ChangeHistoryService",
  "CollectionService",
  "ScriptEditorService",
  "ReplicatedStorage",
  "ServerScriptService",
  "ServerStorage",
  "StarterGui",
  "StarterPlayer",
  "Workspace",
  "Lighting",
  "Selection",
];

const WRAPPED_SOURCES = new Set([
  "src/net/httpClient.lua",
  "src/net/chatClient.lua",
  "src/studio/serialization.lua",
  "src/studio/path.lua",
  "src/studio/snapshot.lua",
  "src/ui/PluginHeader.lua",
  "src/ui/ChatMessage.lua",
  "src/ui/Composer.lua",
  "src/ui/ToolActivity.lua",
  "src/ui/BridgePanel.lua",
  "src/commands/readTools.lua",
  "src/studio/targetIntegrity.lua",
  "src/commands/validation.lua",
  "src/commands/writeTools.lua",
  "src/commands/nativeModel.lua",
  "src/commands/importedAsset.lua",
  "src/commands/registry.lua",
  "src/Main.server.lua",
]);

const MODULE_EXPORTS = {
  "src/net/chatClient.lua": [
    "studioChatEncoded",
    "studioChatBootstrap",
    "studioChatCreateConversation",
    "studioChatLoadMessages",
    "studioChatSendMessage",
    "studioChatReadEvents",
    "studioChatCancelRun",
    "studioChatApproveRun",
    "studioChatUndoRun",
  ],
  "src/ui/PluginHeader.lua": ["nexusHeaderButton", "createNexusPluginHeader"],
  "src/ui/ChatMessage.lua": [
    "nexusChatAddCorner",
    "nexusChatAddPadding",
    "createNexusChatMessage",
    "updateNexusChatMessage",
    "nexusChatNearBottom",
    "scrollNexusChatToBottom",
  ],
  "src/ui/Composer.lua": ["nexusComposerRounded", "nexusComposerButton", "createNexusComposer"],
  "src/ui/ToolActivity.lua": ["friendlyStudioActivity"],
  "src/ui/BridgePanel.lua": [
    "setStatus",
    "setLast",
    "setBusy",
    "setActive",
    "setRun",
    "setProgress",
    "pushActivity",
    "showToast",
    "setHealth",
    "setPollingPulse",
    "showApprovalGate",
    "hideApprovalGate",
    "waitForApproval",
    "getApprovalModeEnabledExport",
    "handleSessionExpired",
    "applying",
    "pairButton",
    "codeBox",
    "pullButton",
    "restoreButton",
    "disconnectButton",
    "confirmRestoreButton",
    "cancelRestoreButton",
    "approvalToggleButton",
    "approvalConfirmButton",
    "approvalDeclineButton",
    "refreshControls",
    "runSetupCheck",
    "showOnboarding",
    "hideOnboarding",
    "checkSetupButton",
    "onboardingDismissButton",
    "showRestoreConfirmation",
    "hideRestoreConfirmation",
    "updateSnapshotLabel",
    "widget",
    "toggleButton",
    "healthLabel",
    "progressLabel",
    "feedEmptyLabel",
    "approvalCopy",
    "playtestLogsButton",
    "playtestStrip",
    "setButtonEnabled",
    "collaboratorsLabel",
    "updateCollaborators",
    "setMcpCompanionStatus",
    "setConnectionDiagnostics",
    "bootstrapStudioConversation",
    "refreshStudioSelection",
  ],
  "src/studio/serialization.lua": [
    "SCRIPT_CLASSES",
    "ensureManagedId",
    "stableHash",
    "nowMs",
    "readManagedId",
    "attributesOf",
    "propertyHash",
    "scriptHash",
    "verifyExpectedScriptHash",
    "propertiesOf",
	"safePropertyValue",
    "structuredUnsupported",
    "lastBatchSnapshots",
    "AGENT_ARTIFACT_ID_ATTRIBUTE",
    "AGENT_FILE_ID_ATTRIBUTE",
    "CREATABLE_CLASSES",
    "NATIVE_MODEL_LIMITS",
    "NATIVE_CLASSES",
    "NATIVE_BASE_PART_CLASSES",
    "NATIVE_CONSTRAINT_CLASSES",
    "NATIVE_LIGHT_CLASSES",
    "NATIVE_PROPERTY_ALLOWLIST",
    "NATIVE_REFERENCE_FIELDS",
    "escapePattern",
    "escapeReplacement",
  ],
  "src/net/httpClient.lua": ["request", "getToken", "setToken", "jsonEncode", "getLastLatencyMs", "pingHealth"],
  "src/studio/path.lua": [
    "fullPath",
    "resolvePath",
    "readScriptSource",
    "writeScriptSource",
    "getStarterPlayerScripts",
    "splitPath",
    "rootFromParts",
    "ensureParent",
    "safeSetProperty",
	"ASSET_REFERENCE_TARGETS",
	"safeSetAssetReference",
	"safeRestoreAssetReference",
  ],
  "src/studio/snapshot.lua": [
    "snapshotInstance",
    "appendSnapshotTree",
    "appendMissingPathSnapshots",
    "beginRecording",
    "finishRecording",
    "restoreSnapshots",
    "rollbackMutation",
    "snapshotStateHash",
    "createOrReplaceInstance",
  ],
  "src/commands/readTools.lua": [
    "getInspectionRoots",
    "inspectPlace",
    "listChildren",
    "inspectInstances",
    "searchProject",
    "searchSource",
    "readScript",
    "writeScript",
    "readInstance",
    "readProperties",
    "getSelectionTool",
    "computePlaceSignature",
    "serializeFlat",
    "ScriptContextGuard",
    // Defined in readTools but required by registry.lua TOOL_HANDLERS.
    // Exporting them from writeTools left the handlers nil and dropped
    // create_instance / delete_instance from plugin attestation.
    "createInstanceTool",
    "deleteInstanceTool",
  ],
  "src/studio/targetIntegrity.lua": [
    "getStudioConnectorId",
    "refreshStudioPlaceGeneration",
    "currentStudioTargetAttestation",
    "recordStudioFreshness",
    "updateStudioServerTarget",
    "clearStudioServerTarget",
    "getStudioTargetReadiness",
    "validateCommandStudioTarget",
    "publishStudioConnectionDiagnostics",
  ],
  "src/commands/validation.lua": [
    "runProjectValidation",
    "collectDiagnostics",
    "collectOutput",
    "getServiceRoot",
  ],
  "src/commands/writeTools.lua": [
    "applyArtifact",
    "getStudioContext",
    "patchScript",
    "renameInstanceTool",
    "moveInstanceTool",
    "duplicateInstanceTool",
    "createScript",
    "deleteScript",
    "updateProperties",
	"applyAssetReference",
    "updateAttributes",
    "updateTags",
    "replaceInFiles",
    "createSnapshotTool",
    "parseLuau",
    "runSmokeCheck",
    "ensureCleanFolder",
    "validateLuauSource",
    "classNameForKind",
  ],
  "src/commands/nativeModel.lua": [
    "buildNativeModel",
    "inspectNativeModel",
    "applyNativeModelPatch",
  ],
  "src/commands/importedAsset.lua": ["ImportedAsset"],
  "src/commands/registry.lua": [
    "pullOnce",
    "executeCommand",
    "ack",
    "TOOL_HANDLERS",
    "getPluginAttestation",
    "getStoredCommandReceipt",
    "storeCommandReceipt",
    "reconcileStoredCommandReceipt",
  ],
  "src/Main.server.lua": [],
};

const SHARED_TOP_LEVEL_LOCALS = ["localSnapshots", "updateSnapshotLabel"];

// BridgePanel exposes a large set of bindings to Main.server.lua. Keeping all
// of them as locals makes every later module inherit their live registers and
// pushes Luau over its hard 200-register limit. Script globals are isolated to
// this plugin script, so use that environment for this one register-heavy API.
const SCRIPT_GLOBAL_EXPORT_MODULES = new Set(["src/ui/BridgePanel.lua"]);

const header = [
  "-- NexusRBX Studio Bridge",
  "-- Generated by roblox-plugin/build/bundle-plugin.js.",
  "-- Edit files under roblox-plugin/src/ and rebuild this install artifact.",
  "",
].join("\n");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function promoteExports(content, exports) {
  let next = content;
  for (const name of exports) {
    next = next.replace(new RegExp(`^local function ${escapeRegExp(name)}\\(`, "m"), `${name} = function(`);
    next = next.replace(new RegExp(`^function ${escapeRegExp(name)}\\(`, "m"), `${name} = function(`);
    next = next.replace(new RegExp(`^local ${escapeRegExp(name)} =`, "m"), `${name} =`);
  }
  return next;
}

function wrapModule(relativePath, content) {
  const exports = MODULE_EXPORTS[relativePath] || [];
  if (!WRAPPED_SOURCES.has(relativePath) || exports.length === 0) {
    return content;
  }
  const promoted = promoteExports(content, exports);
  if (SCRIPT_GLOBAL_EXPORT_MODULES.has(relativePath)) {
    return ["do", promoted, "end"].join("\n");
  }
  return [`local ${exports.join(", ")}`, "do", promoted, "end"].join("\n");
}

function longBracketAt(source, offset) {
  if (source[offset] !== "[") {
    return null;
  }
  let cursor = offset + 1;
  while (source[cursor] === "=") {
    cursor += 1;
  }
  if (source[cursor] !== "[") {
    return null;
  }
  return {
    close: `]${"=".repeat(cursor - offset - 1)}]`,
    contentStart: cursor + 1,
  };
}

function copyLongBracket(source, offset) {
  const bracket = longBracketAt(source, offset);
  if (!bracket) {
    return null;
  }
  const closeAt = source.indexOf(bracket.close, bracket.contentStart);
  return closeAt === -1 ? source.length : closeAt + bracket.close.length;
}

function followedByAssignment(source, offset) {
  let cursor = offset;
  while (cursor < source.length && /[\t\r\n ]/.test(source[cursor])) {
    cursor += 1;
  }
  return source[cursor] === "=" && source[cursor + 1] !== "=";
}

/**
 * Rewrites unqualified Roblox service globals in Lua/Luau code without
 * touching data. The generated plugin embeds user-facing text, path strings,
 * source snippets, and comments, so a text-wide replacement changes runtime
 * behavior (for example, `"Workspace/Foo"` must remain a canonical path).
 */
function rewriteLuaServiceIdentifiers(source) {
  const serviceNames = new Set(SERVICE_NAMES);
  const chunks = [];
  let cursor = 0;
  let lastCodeToken = null;

  while (cursor < source.length) {
    const char = source[cursor];

    if (char === "-" && source[cursor + 1] === "-") {
      const longCommentEnd = copyLongBracket(source, cursor + 2);
      if (longCommentEnd !== null) {
        chunks.push(source.slice(cursor, longCommentEnd));
        cursor = longCommentEnd;
        continue;
      }
      const lineEnd = source.indexOf("\n", cursor + 2);
      const end = lineEnd === -1 ? source.length : lineEnd;
      chunks.push(source.slice(cursor, end));
      cursor = end;
      continue;
    }

    if (char === '"' || char === "'") {
      const quote = char;
      const start = cursor;
      cursor += 1;
      while (cursor < source.length) {
        if (source[cursor] === "\\") {
          cursor = Math.min(source.length, cursor + 2);
        } else if (source[cursor] === quote) {
          cursor += 1;
          break;
        } else {
          cursor += 1;
        }
      }
      chunks.push(source.slice(start, cursor));
      lastCodeToken = "literal";
      continue;
    }

    const longStringEnd = copyLongBracket(source, cursor);
    if (longStringEnd !== null) {
      chunks.push(source.slice(cursor, longStringEnd));
      cursor = longStringEnd;
      lastCodeToken = "literal";
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      const start = cursor;
      cursor += 1;
      while (cursor < source.length && /[A-Za-z0-9_]/.test(source[cursor])) {
        cursor += 1;
      }
      const identifier = source.slice(start, cursor);
      const isQualifiedField = lastCodeToken === "." || lastCodeToken === ":";
      const isAssignmentTarget = followedByAssignment(source, cursor);
      chunks.push(
        serviceNames.has(identifier) && !isQualifiedField && !isAssignmentTarget
          ? `Services.${identifier}`
          : identifier,
      );
      lastCodeToken = identifier;
      continue;
    }

    if (/\s/.test(char)) {
      chunks.push(char);
      cursor += 1;
      continue;
    }

    if (char === "." && source[cursor + 1] === ".") {
      const token = source[cursor + 2] === "." ? "..." : "..";
      chunks.push(token);
      cursor += token.length;
      lastCodeToken = token;
      continue;
    }

    chunks.push(char);
    cursor += 1;
    lastCodeToken = char;
  }

  return chunks.join("");
}

function rewriteServices(bundle) {
  const configEnd = bundle.indexOf("-- END src/config.lua");
  if (configEnd === -1) {
    throw new Error("Missing config section in bundled plugin");
  }
  const prefix = bundle.slice(0, configEnd);
  return prefix + rewriteLuaServiceIdentifiers(bundle.slice(configEnd));
}

const body = sources
  .map((relativePath) => {
    const absolutePath = path.join(pluginRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Missing plugin source file: ${relativePath}`);
    }
    const content = fs.readFileSync(absolutePath, "utf8").trimEnd();
    const moduleBody = wrapModule(relativePath, content);
    return [`-- BEGIN ${relativePath}`, moduleBody, `-- END ${relativePath}`, ""].join("\n");
  })
  .join("\n");

const bundled = header + body;
let output = rewriteServices(bundled);
const configEndMarker = "-- END src/config.lua";
const configEnd = output.indexOf(configEndMarker);
if (configEnd === -1) {
  throw new Error("Missing config section in bundled plugin");
}
const sharedPreamble = [
  "",
  "-- Shared cross-module state (declared before snapshot.lua uses it)",
  `local ${SHARED_TOP_LEVEL_LOCALS.join(", ")}`,
  "localSnapshots = {}",
  "",
].join("\n");
output = output.slice(0, configEnd + configEndMarker.length) + sharedPreamble + output.slice(configEnd + configEndMarker.length);
const localCount = (output.match(/^local /gm) || []).length;
// This is a deliberately conservative proxy for Luau's register allocator.
// Roblox currently rejects a chunk once 200 local registers are live; bundled
// export declarations can contain multiple names on one line, so leave enough
// headroom for those names and compiler temporaries instead of building right up
// to the runtime ceiling.
const MAX_TOP_LEVEL_LOCAL_STATEMENTS = 160;

if (localCount > MAX_TOP_LEVEL_LOCAL_STATEMENTS) {
  throw new Error(
    `Bundled plugin is too close to Luau's local register limit: ${localCount} > ${MAX_TOP_LEVEL_LOCAL_STATEMENTS}`,
  );
}

if (require.main === module) {
  fs.writeFileSync(outputPath, output, "utf8");
  console.log(
    `Bundled ${sources.length} source files into ${path.relative(process.cwd(), outputPath)} (${localCount} top-level locals)`,
  );
}

module.exports = {
  rewriteLuaServiceIdentifiers,
  rewriteServices,
};
