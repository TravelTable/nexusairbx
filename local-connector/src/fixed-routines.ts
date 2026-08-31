import { randomBytes } from "node:crypto";
import { ConnectorError } from "./errors.js";
import type { JsonObject, JsonValue, McpClientLike, ToolCallResult } from "./types.js";

const ROUTINE_VERSION = 1;
const MAX_ROUTINE_INPUT_BYTES = 256_000;
const MAX_ROUTINE_OUTPUT_BYTES = 512_000;
const SAFE_CLASSES = new Set([
  "Folder", "Model", "Part", "WedgePart", "TrussPart", "SpawnLocation", "Attachment", "Motor6D", "WeldConstraint",
  "ScreenGui", "SurfaceGui", "BillboardGui", "Frame",
  "TextLabel", "TextButton", "TextBox", "ImageLabel", "ImageButton", "ScrollingFrame", "UIListLayout",
  "UIGridLayout", "UIPadding", "UICorner", "UIStroke", "StringValue", "BoolValue", "NumberValue", "IntValue",
  "ObjectValue", "Configuration", "Script", "LocalScript", "ModuleScript",
]);
const SAFE_PROPERTIES = new Set([
  "Anchored", "CanCollide", "CanTouch", "CanQuery", "Transparency", "Reflectance", "Material", "Color",
  "BrickColor", "Size", "Position", "Orientation", "CFrame", "PivotOffset", "Massless", "CastShadow", "Shape",
  "CollisionGroup", "Value", "Enabled", "Visible", "Text", "TextColor3", "TextTransparency", "BackgroundColor3",
  "BackgroundTransparency", "Image", "ImageColor3", "ImageTransparency", "AnchorPoint", "LayoutOrder", "ZIndex",
  "ResetOnSpawn", "IgnoreGuiInset", "AutomaticSize", "CanvasSize", "ScrollingDirection", "Padding", "CornerRadius",
  "Thickness", "ApplyStrokeMode", "FillDirection", "HorizontalAlignment", "VerticalAlignment", "SortOrder",
]);
const TEST_PROFILES = new Set(["smoke", "project_smoke", "testservice_run"]);
const ROUTINE_COMMANDS = new Set([
  "get_selection", "create_script", "create_instance", "update_properties", "update_attributes", "update_tags",
  "rename_instance", "move_instance", "duplicate_instance", "delete_instance", "batch_operations", "create_snapshot",
  "restore_snapshot", "undo_last_batch", "prepare_asset_quarantine", "finalize_asset_quarantine", "run_test_service",
  "discard_asset_quarantine", "record_last_batch",
]);

export class FixedRoutineRunner {
  constructor(private readonly mcp: McpClientLike) {}

  validate(operation: string, payload: JsonObject): void {
    if (!ROUTINE_COMMANDS.has(operation)) throw new ConnectorError("ROUTINE_UNAVAILABLE", "The requested connector routine is not audited.");
    validatePayload(operation, payload);
  }

  async run(operation: string, payload: JsonObject, signal?: AbortSignal): Promise<JsonObject> {
    this.validate(operation, payload);
    const nonce = randomBytes(16).toString("hex");
    const input = JSON.stringify({ version: ROUTINE_VERSION, nonce, operation, payload });
    if (Buffer.byteLength(input, "utf8") > MAX_ROUTINE_INPUT_BYTES) {
      throw new ConnectorError("COMMAND_PAYLOAD_TOO_LARGE", "The connector routine input exceeds its limit.");
    }
    const code = `${ROUTINE_SOURCE}\nreturn __nexus_run(${JSON.stringify(input)})`;
    const result = await this.mcp.callTool("execute_luau", { code, datamodel_type: "Edit" }, signal);
    const envelope = parseEnvelope(result);
    if (envelope.version !== ROUTINE_VERSION || envelope.nonce !== nonce) {
      throw new ConnectorError("ROUTINE_ENVELOPE_INVALID", "The Studio routine response failed nonce validation.");
    }
    if (envelope.ok !== true) {
      throw new ConnectorError(
        typeof envelope.code === "string" ? envelope.code : "ROUTINE_FAILED",
        typeof envelope.message === "string" ? envelope.message : "The Studio routine failed.",
        { ...(isObject(envelope.data) ? { details: envelope.data } : {}) },
      );
    }
    const data = isObject(envelope.data) ? envelope.data : { value: toJson(envelope.data) };
    validateRoutineResult(operation, data);
    return data;
  }
}

function validatePayload(operation: string, payload: JsonObject): void {
  for (const forbidden of ["code", "luau", "sourceCode", "sourceText", "executable"]) {
    if (forbidden in payload) throw new ConnectorError("EXECUTABLE_INPUT_FORBIDDEN", "Connector routines do not accept executable input.");
  }
  for (const key of ["path", "newPath", "newParentPath", "targetParentPath", "quarantinePath"]) {
    const value = payload[key];
    if (value !== undefined) validatePath(value);
  }
  if (payload.paths !== undefined) {
    if (!Array.isArray(payload.paths) || payload.paths.length < 1 || payload.paths.length > 500) {
      throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "paths must contain 1-500 Studio paths.");
    }
    const uniquePaths = new Set<string>();
    for (const path of payload.paths) {
      validateMutablePath(path);
      const normalizedPath = path as string;
      if ([...uniquePaths].some((existing) => studioPathsOverlap(existing, normalizedPath))) {
        throw new ConnectorError("SNAPSHOT_PATH_OVERLAP", "Snapshot paths must not duplicate or contain one another.");
      }
      uniquePaths.add(normalizedPath);
    }
  }
  if (payload.snapshots !== undefined) validateSnapshotRefs(payload.snapshots);
  if (payload.createParents === true) {
    throw new ConnectorError("CREATE_PARENTS_UNSUPPORTED", "Connector mutations require the destination parent to exist before the snapshot is taken.");
  }
  if (payload.targetParentPath !== undefined && connectorInternalPath(String(payload.targetParentPath))) {
    throw new ConnectorError("DESTINATION_NOT_ALLOWED", "Connector-owned ServerStorage state cannot be an asset destination.");
  }
  if (operation === "create_instance" || operation === "create_script") {
    const className = String(payload.className || (operation === "create_script" ? "ModuleScript" : "Folder"));
    if (!SAFE_CLASSES.has(className)) throw new ConnectorError("CLASS_NOT_ALLOWED", `Class is not allowed: ${className}`);
  }
  for (const key of ["name", "newName", "requestedName"]) {
    if (payload[key] !== undefined) validateName(payload[key], key);
  }
  for (const key of ["tags", "add", "remove", "set"]) {
    if (payload[key] !== undefined && payload[key] !== null) validateStringArray(payload[key], key, 120, 120);
  }
  if (payload.source !== undefined && (typeof payload.source !== "string" || Buffer.byteLength(payload.source, "utf8") > MAX_ROUTINE_INPUT_BYTES)) {
    throw new ConnectorError("COMMAND_PAYLOAD_TOO_LARGE", "Script source exceeds the connector routine limit.");
  }
  if (payload.nonce !== undefined && (typeof payload.nonce !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(payload.nonce))) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "Routine nonce is invalid.");
  }
  if (payload.snapshotId !== undefined && (typeof payload.snapshotId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(payload.snapshotId))) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "snapshotId is invalid.");
  }
  for (const field of ["properties", "attributes", "values"]) {
    const values = payload[field];
    if (values === undefined) continue;
    if (!isObject(values) || Object.keys(values).length > 120) throw new ConnectorError("COMMAND_PAYLOAD_INVALID", `${field} is invalid.`);
    for (const [key, value] of Object.entries(values)) {
      if (!/^[A-Za-z_][A-Za-z0-9_]{0,79}$/.test(key) || ["Parent", "Source", "Archivable"].includes(key) || (field === "properties" && !SAFE_PROPERTIES.has(key))) {
        throw new ConnectorError("FIELD_NOT_ALLOWED", `Field is not allowed: ${key}`);
      }
      if (!isSafeValue(value)) throw new ConnectorError("VALUE_NOT_ALLOWED", `${field}.${key} is not a supported bounded Studio value.`);
    }
  }
  if (operation === "run_test_service") {
    const profile = String(payload.profile || payload.profileId || "");
    if (!TEST_PROFILES.has(profile)) throw new ConnectorError("TEST_PROFILE_INVALID", "The named test profile is not audited by this connector version.");
  }
  const pathRequired = new Set([
    "create_script", "create_instance", "update_properties", "update_attributes", "update_tags",
    "rename_instance", "move_instance", "duplicate_instance", "delete_instance",
  ]);
  if (pathRequired.has(operation) && payload.path === undefined) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", `${operation} requires path.`);
  }
  if (pathRequired.has(operation)) validateMutablePath(payload.path as JsonValue);
  if (payload.newPath !== undefined) validateMutablePath(payload.newPath);
  if (payload.newParentPath !== undefined && connectorInternalPath(String(payload.newParentPath))) {
    throw new ConnectorError("DESTINATION_NOT_ALLOWED", "Connector-owned ServerStorage state cannot be a mutation destination.");
  }
  if (operation === "create_snapshot" && payload.paths === undefined) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "create_snapshot requires 1-500 paths.");
  }
  if ((operation === "restore_snapshot" || operation === "record_last_batch") && payload.snapshots === undefined) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", `${operation} requires 1-500 snapshot references.`);
  }
  if (operation === "undo_last_batch" && payload.snapshots !== undefined) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "undo_last_batch restores the connector's recorded batch and does not accept caller-supplied snapshots.");
  }
  if (operation === "rename_instance" && payload.newName === undefined && payload.name === undefined) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "rename_instance requires newName.");
  }
  if (operation === "move_instance") {
    const destinations = Number(payload.newPath !== undefined) + Number(payload.newParentPath !== undefined);
    if (destinations !== 1) throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "move_instance requires exactly one of newPath or newParentPath.");
  }
  if (operation === "duplicate_instance" && payload.newPath === undefined) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "duplicate_instance requires newPath.");
  }
  if (operation === "duplicate_instance" && typeof payload.path === "string" && typeof payload.newPath === "string") {
    const source = payload.path.replace(/^game\//i, "").replace(/\/$/, "").toLowerCase();
    const destination = payload.newPath.replace(/^game\//i, "").replace(/\/$/, "").toLowerCase();
    if (destination.startsWith(`${source}/`)) {
      throw new ConnectorError("DESTINATION_INVALID", "duplicate_instance cannot place a clone inside its source tree.");
    }
  }
  if (operation === "update_properties" && payload.properties === undefined) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "update_properties requires properties.");
  }
  if (operation === "update_attributes" && payload.attributes === undefined && payload.values === undefined) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "update_attributes requires attributes.");
  }
  if (operation === "update_tags" && payload.set === undefined && payload.add === undefined && payload.remove === undefined) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "update_tags requires set, add, or remove.");
  }
}

function validateSnapshotRefs(value: JsonValue): void {
  if (!Array.isArray(value) || value.length < 1 || value.length > 500) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "snapshots must contain 1-500 bounded references.");
  }
  const paths = new Set<string>();
  for (const ref of value) {
    if (!isObject(ref)) throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "Snapshot reference is malformed.");
    if (ref.path === undefined) throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "Snapshot path is missing.");
    validateMutablePath(ref.path);
    const path = ref.path as string;
    if ([...paths].some((existing) => studioPathsOverlap(existing, path))) {
      throw new ConnectorError("SNAPSHOT_PATH_OVERLAP", "Snapshot references must not duplicate or contain one another.");
    }
    paths.add(path);
    if (typeof ref.snapshotId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(ref.snapshotId)) {
      throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "Snapshot reference id is invalid.");
    }
    for (const key of ["preHash", "postHash"]) {
      if (ref[key] !== undefined && (typeof ref[key] !== "string" || ref[key].length > 128)) {
        throw new ConnectorError("COMMAND_PAYLOAD_INVALID", `Snapshot ${key} is invalid.`);
      }
    }
  }
}

function validateRoutineResult(operation: string, data: JsonObject): void {
  const invalid = (message: string): never => { throw new ConnectorError("ROUTINE_RESULT_INVALID", message); };
  const requireObjects = (value: JsonValue | undefined, field: string, allowEmpty = false): JsonObject[] => {
    if (!Array.isArray(value) || (!allowEmpty && value.length < 1) || value.some((item) => !isObject(item))) {
      return invalid(`The Studio routine returned invalid ${field}.`);
    }
    return value as JsonObject[];
  };
  const requirePathHashReceipts = (value: JsonValue | undefined, field: string): JsonObject[] => {
    const receipts = requireObjects(value, field);
    for (const receipt of receipts) {
      if (typeof receipt.path !== "string" || receipt.path.length < 1 || typeof receipt.resultingHash !== "string" || receipt.resultingHash.length < 1) {
        invalid(`The Studio routine returned an incomplete ${field} receipt.`);
      }
    }
    return receipts;
  };
  const requireSnapshots = (): JsonObject[] => {
    const snapshots = requireObjects(data.snapshots, "snapshots");
    validateSnapshotRefs(snapshots);
    for (const snapshot of snapshots) {
      if (typeof snapshot.preHash !== "string" || snapshot.preHash.length < 1 || typeof snapshot.postHash !== "string" || snapshot.postHash.length < 1) {
        invalid("The Studio routine returned an incomplete snapshot receipt.");
      }
    }
    return snapshots;
  };

  if (operation === "get_selection") {
    requireObjects(data.instances, "selection", true);
    return;
  }
  if (operation === "create_snapshot") {
    const snapshots = requireSnapshots();
    if (data.snapshotCount !== snapshots.length) invalid("The Studio routine returned an inconsistent snapshot count.");
    return;
  }
  if (operation === "restore_snapshot" || operation === "undo_last_batch") {
    const restored = requirePathHashReceipts(data.restored, "restore");
    if (data.restoredCount !== restored.length) invalid("The Studio routine returned an inconsistent restore count.");
    if (operation === "undo_last_batch" && data.lastBatchCleared !== true) invalid("The Studio routine did not confirm that the recorded batch was consumed.");
    return;
  }
  if (operation === "record_last_batch") {
    if (typeof data.storedCount !== "number" || !Number.isInteger(data.storedCount) || data.storedCount < 1 ||
      typeof data.pinnedCount !== "number" || !Number.isInteger(data.pinnedCount) || data.pinnedCount < 1 || data.pinnedCount > data.storedCount) {
      invalid("The Studio routine did not persist and pin the batch receipt.");
    }
    return;
  }
  if (operation === "run_test_service") {
    if (data.passed !== true) invalid("The Studio test routine did not report a passing result.");
    return;
  }
  if (operation === "prepare_asset_quarantine") {
    if (!isObject(data.existingReceipt) && (typeof data.path !== "string" || data.path.length < 1)) invalid("The Studio routine did not return a quarantine path or existing receipt.");
    return;
  }
  if (operation === "discard_asset_quarantine") {
    if (data.removed !== true) invalid("The Studio routine did not confirm quarantine cleanup.");
    return;
  }
  if (operation === "finalize_asset_quarantine") {
    if (!isObject(data.instance) || !isObject(data.receipt) || typeof data.resultingHash !== "string" || data.resultingHash.length < 1) invalid("The Studio routine returned an incomplete asset receipt.");
    return;
  }
  if (["create_script", "create_instance", "update_properties", "update_attributes", "update_tags", "rename_instance", "move_instance", "duplicate_instance", "delete_instance"].includes(operation)) {
    const snapshots = requireSnapshots();
    if (typeof data.resultingHash !== "string" || data.resultingHash.length < 1) invalid("The Studio routine did not return a resulting state hash.");
    if (!snapshots.some((snapshot) => snapshot.postHash === data.resultingHash)) invalid("The Studio routine snapshot does not attest the resulting state.");
    if (operation === "delete_instance") {
      if (data.verified !== true || data.resultingHash !== "missing") invalid("The Studio routine did not verify deletion.");
    } else if (!isObject(data.instance) || typeof data.instance.path !== "string" || data.instance.path.length < 1) {
      invalid("The Studio routine did not return the changed instance receipt.");
    }
  }
}

function validateName(value: JsonValue, field: string): void {
  if (typeof value !== "string" || value.length < 1 || value.length > 160 || /[\/\\\u0000-\u001f]/.test(value)) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", `${field} is invalid.`);
  }
}

function validateStringArray(value: JsonValue, field: string, maxItems: number, maxLength: number): void {
  if (!Array.isArray(value) || value.length > maxItems || value.some((item) => typeof item !== "string" || item.length < 1 || item.length > maxLength || /[\u0000-\u001f]/.test(item))) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", `${field} is invalid.`);
  }
}

function validatePath(value: JsonValue): void {
  if (typeof value !== "string" || value.length < 1 || value.length > 500 || value.includes("..") || value.includes("\\")) {
    throw new ConnectorError("PATH_INVALID", "Studio paths must be bounded slash-separated paths.");
  }
  const parts = value.replace(/^game\//i, "").split("/");
  if (parts.some((part) => !part || part.length > 100 || /[\u0000-\u001f]/.test(part))) {
    throw new ConnectorError("PATH_INVALID", "Studio path contains an invalid segment.");
  }
}

function validateMutablePath(value: JsonValue): void {
  validatePath(value);
  const normalized = normalizeStudioPath(value as string);
  if (!normalized.includes("/") || connectorInternalPath(normalized)) {
    throw new ConnectorError("PATH_NOT_ALLOWED", "Connector mutations and snapshots cannot target a service root or connector-owned state.");
  }
}

function normalizeStudioPath(value: string): string {
  return value.trim().replace(/\\/g, "/").replace(/^game\//i, "").replace(/\/+$/, "");
}

function studioPathsOverlap(left: string, right: string): boolean {
  const a = normalizeStudioPath(left);
  const b = normalizeStudioPath(right);
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function connectorInternalPath(value: string): boolean {
  return /^ServerStorage\/NexusMCP(?:Snapshots|State|Receipts|Quarantine)(?:\/|$)/i.test(normalizeStudioPath(value));
}

function isSafeValue(value: JsonValue): boolean {
  return value === null || typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1e12) ||
    (typeof value === "string" && value.length <= 8_000) || isTypedValue(value);
}

function isTypedValue(value: JsonValue): boolean {
  if (!isObject(value) || typeof value.$type !== "string") return false;
  const finite = (...keys: string[]) => keys.every((key) => typeof value[key] === "number" && Number.isFinite(value[key]) && Math.abs(value[key] as number) <= 1e9);
  switch (value.$type) {
    case "Vector2": return finite("x", "y");
    case "Vector3": case "Color3": return finite("x", "y", "z");
    case "UDim": return finite("scale", "offset");
    case "UDim2": return finite("xScale", "xOffset", "yScale", "yOffset");
    case "CFrame": return finite("x", "y", "z") && ["rx", "ry", "rz"].every((key) => value[key] === undefined || finite(key));
    case "NumberRange": return finite("min", "max");
    case "Enum": return typeof value.enumType === "string" && /^[A-Za-z][A-Za-z0-9]{0,60}$/.test(value.enumType) && typeof value.name === "string" && /^[A-Za-z][A-Za-z0-9]{0,60}$/.test(value.name);
    default: return false;
  }
}

function parseEnvelope(result: ToolCallResult): Record<string, unknown> {
  if (result.isError) throw new ConnectorError("ROUTINE_TOOL_FAILED", "Roblox Studio rejected the connector routine.");
  let value: unknown = result.structuredContent;
  if (isObject(value) && isObject(value.result)) value = value.result;
  if (!isObject(value)) {
    const texts = Array.isArray(result.content)
      ? result.content.flatMap((item) => isObject(item) && typeof item.text === "string" ? [item.text] : [])
      : [];
    const text = texts.join("\n").trim();
    if (!text || Buffer.byteLength(text, "utf8") > MAX_ROUTINE_OUTPUT_BYTES) {
      throw new ConnectorError("ROUTINE_ENVELOPE_INVALID", "The Studio routine returned an invalid response.");
    }
    try { value = JSON.parse(text); } catch { throw new ConnectorError("ROUTINE_ENVELOPE_INVALID", "The Studio routine response was not JSON."); }
  }
  if (!isObject(value) || Buffer.byteLength(JSON.stringify(value), "utf8") > MAX_ROUTINE_OUTPUT_BYTES) {
    throw new ConnectorError("ROUTINE_ENVELOPE_INVALID", "The Studio routine envelope is malformed or oversized.");
  }
  return value;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toJson(value: unknown): JsonValue {
  return value === null || ["string", "number", "boolean"].includes(typeof value) ? value as JsonValue : null;
}

// This source is connector-owned and versioned. Only a JSON string produced above is interpolated.
const ROUTINE_SOURCE = String.raw`
local HttpService = game:GetService("HttpService")
local CollectionService = game:GetService("CollectionService")
local Selection = game:GetService("Selection")
local ServerStorage = game:GetService("ServerStorage")
local TestService = game:GetService("TestService")
local INTERNAL_PREFIX = "_NexusMCP_"
local function pathOf(inst)
  local parts = {}
  while inst and inst ~= game do table.insert(parts, 1, inst.Name); inst = inst.Parent end
  return table.concat(parts, "/")
end
local function resolve(path)
  local current = game
  for part in string.gmatch(string.gsub(path or "", "^game/", ""), "[^/]+") do
    current = current:FindFirstChild(part)
    if not current then return nil end
  end
  return current
end
local function canonicalRoutinePath(path)
  local raw = tostring(path or ""):gsub("\\", "/"):gsub("/+$", "")
  if string.lower(string.sub(raw, 1, 5)) == "game/" then raw = string.sub(raw, 6) end
  local inst = resolve(raw)
  return inst and pathOf(inst) or raw
end
local function pathsOverlap(left, right)
  local a, b = canonicalRoutinePath(left), canonicalRoutinePath(right)
  return a == b or string.sub(a, 1, #b + 1) == b .. "/" or string.sub(b, 1, #a + 1) == a .. "/"
end
local function assertNonOverlappingPaths(paths)
  local checked = {}
  for _, path in ipairs(paths) do
    local canonical = canonicalRoutinePath(path)
    for _, prior in ipairs(checked) do if pathsOverlap(prior, canonical) then error("SNAPSHOT_PATH_OVERLAP: " .. prior .. " and " .. canonical) end end
    table.insert(checked, canonical)
  end
  return checked
end
local function parentAndName(path, createParents)
  local parts = string.split(string.gsub(path or "", "^game/", ""), "/")
  local leaf = table.remove(parts)
  local current = game
  for _, part in ipairs(parts) do
    local child = current:FindFirstChild(part)
    if not child and createParents then child = Instance.new("Folder"); child.Name = part; child.Parent = current end
    if not child then return nil, nil end
    current = child
  end
  return current, leaf
end
local function rootFolder(name)
  local root = ServerStorage:FindFirstChild(name)
  if root and not root:IsA("Folder") then error("INTERNAL_STATE_COLLISION: " .. name) end
  if not root then root = Instance.new("Folder"); root.Name = name; root.Parent = ServerStorage end
  return root
end
local function decodeValue(value)
  if type(value) ~= "table" or type(value["$type"]) ~= "string" then return value end
  local kind = value["$type"]
  if kind == "Vector2" then return Vector2.new(value.x, value.y) end
  if kind == "Vector3" then return Vector3.new(value.x, value.y, value.z) end
  if kind == "Color3" then return Color3.new(value.x, value.y, value.z) end
  if kind == "UDim" then return UDim.new(value.scale, value.offset) end
  if kind == "UDim2" then return UDim2.new(value.xScale, value.xOffset, value.yScale, value.yOffset) end
  if kind == "CFrame" then return CFrame.new(value.x, value.y, value.z) * CFrame.Angles(math.rad(value.rx or 0), math.rad(value.ry or 0), math.rad(value.rz or 0)) end
  if kind == "NumberRange" then return NumberRange.new(value.min, value.max) end
  if kind == "Enum" then
    local enum = Enum[value.enumType]; if not enum or not enum[value.name] then error("Invalid enum value") end
    return enum[value.name]
  end
  error("Unsupported typed value")
end
local function encodeValue(value)
  local kind = typeof(value)
  local function numberText(number) return string.format("%.17g", number) end
  if kind == "nil" then return "nil" end
  if kind == "string" then return "string:" .. HttpService:JSONEncode(value) end
  if kind == "number" then return "number:" .. numberText(value) end
  if kind == "boolean" then return value and "boolean:true" or "boolean:false" end
  if kind == "Vector2" then return "Vector2:" .. numberText(value.X) .. "," .. numberText(value.Y) end
  if kind == "Vector3" then return "Vector3:" .. numberText(value.X) .. "," .. numberText(value.Y) .. "," .. numberText(value.Z) end
  if kind == "Color3" then return "Color3:" .. numberText(value.R) .. "," .. numberText(value.G) .. "," .. numberText(value.B) end
  if kind == "CFrame" then local values = { value:GetComponents() }; for index, component in ipairs(values) do values[index] = numberText(component) end; return "CFrame:" .. table.concat(values, ",") end
  if kind == "UDim" then return "UDim:" .. numberText(value.Scale) .. "," .. numberText(value.Offset) end
  if kind == "UDim2" then return "UDim2:" .. numberText(value.X.Scale) .. "," .. numberText(value.X.Offset) .. "," .. numberText(value.Y.Scale) .. "," .. numberText(value.Y.Offset) end
  if kind == "BrickColor" then return "BrickColor:" .. tostring(value.Number) .. ":" .. value.Name end
  if kind == "NumberRange" then return "NumberRange:" .. numberText(value.Min) .. "," .. numberText(value.Max) end
  if kind == "EnumItem" then return tostring(value) end
  if kind == "Instance" then return "Instance:" .. value.ClassName .. ":" .. pathOf(value) end
  return kind .. ":" .. HttpService:JSONEncode(tostring(value))
end
local HASH_PROPERTIES = {
  "Anchored", "CanCollide", "CanTouch", "CanQuery", "Transparency", "Reflectance", "Material", "Color",
  "BrickColor", "Size", "Position", "Orientation", "CFrame", "PivotOffset", "Massless", "CastShadow", "Shape",
  "CollisionGroup", "Value", "Enabled", "Visible", "Text", "TextColor3", "TextTransparency", "BackgroundColor3",
  "BackgroundTransparency", "Image", "ImageColor3", "ImageTransparency", "AnchorPoint", "LayoutOrder", "ZIndex",
  "ResetOnSpawn", "IgnoreGuiInset", "AutomaticSize", "CanvasSize", "ScrollingDirection", "Padding", "CornerRadius",
  "Thickness", "ApplyStrokeMode", "FillDirection", "HorizontalAlignment", "VerticalAlignment", "SortOrder",
}
local function hash(inst)
  if not inst then return "missing" end
  local items = { inst }
  for _, child in ipairs(inst:GetDescendants()) do table.insert(items, child) end
  table.sort(items, function(a, b) return pathOf(a) < pathOf(b) end)
  local chunks = {}
  for _, item in ipairs(items) do
    table.insert(chunks, pathOf(item) .. "|" .. item.ClassName)
    for _, property in ipairs(HASH_PROPERTIES) do
      local ok, value = pcall(function() return item[property] end)
      if ok then table.insert(chunks, property .. "=" .. encodeValue(value)) end
    end
    if item:IsA("LuaSourceContainer") then table.insert(chunks, "Source=" .. item.Source) end
    local keys = {}; for key in pairs(item:GetAttributes()) do if string.sub(key, 1, #INTERNAL_PREFIX) ~= INTERNAL_PREFIX then table.insert(keys, key) end end
    table.sort(keys); for _, key in ipairs(keys) do table.insert(chunks, "A:" .. key .. "=" .. encodeValue(item:GetAttribute(key))) end
    local tags = CollectionService:GetTags(item); table.sort(tags); for _, tag in ipairs(tags) do table.insert(chunks, "T:" .. tag) end
  end
  local text = HttpService:JSONEncode(chunks)
  local h = 2166136261
  for i = 1, #text do h = bit32.bxor(h, string.byte(text, i)); h = (h * 16777619) % 4294967296 end
  return string.format("fnv1a32:%08x", h)
end
local function describe(inst)
  local attributes = {}; local count = 0
  for key, value in pairs(inst:GetAttributes()) do if count < 80 and string.sub(key, 1, #INTERNAL_PREFIX) ~= INTERNAL_PREFIX then attributes[key] = encodeValue(value); count += 1 end end
  local tags = CollectionService:GetTags(inst); table.sort(tags)
  return { path = pathOf(inst), name = inst.Name, className = inst.ClassName, attributes = attributes, tags = tags, childCount = #inst:GetChildren(), descendantCount = #inst:GetDescendants(), stateHash = hash(inst) }
end
local function desiredEncoding(value)
  return encodeValue(decodeValue(value))
end
local function hasTag(tags, expected)
  for _, tag in ipairs(tags or {}) do if tag == expected then return true end end
  return false
end
local function sameStringList(left, right)
  if #(left or {}) ~= #(right or {}) then return false end
  for index, value in ipairs(left or {}) do if value ~= right[index] then return false end end
  return true
end
local function semanticChecks(op, p, inst, sourcePath)
  local checks = {}
  local currentPath = inst and pathOf(inst) or tostring(sourcePath or p.path or "")
  local function addValueChecks(values, kind, reader)
    for key, expected in pairs(values or {}) do
      local expectedValue = desiredEncoding(expected)
      local readOk, actual = pcall(function() return reader(key) end)
      local actualValue = readOk and encodeValue(actual) or "read_error"
      table.insert(checks, { kind = kind, path = currentPath, key = key, expected = expectedValue, actual = actualValue, ok = readOk and actualValue == expectedValue })
    end
  end
  if op == "create_instance" then
    local expectedClass = tostring(p.className or "Folder")
    table.insert(checks, { kind = "instance_identity", path = currentPath, className = inst and inst.ClassName or "", expectedClassName = expectedClass, ok = inst ~= nil and currentPath == canonicalRoutinePath(p.path) and inst.ClassName == expectedClass })
    addValueChecks(p.properties, "property", function(key) return inst[key] end)
    addValueChecks(p.attributes, "attribute", function(key) return inst:GetAttribute(key) end)
    local actualTags = CollectionService:GetTags(inst); table.sort(actualTags)
    for _, tag in ipairs(p.tags or {}) do table.insert(checks, { kind = "tag", path = currentPath, key = tag, expected = true, actual = hasTag(actualTags, tag), ok = hasTag(actualTags, tag) }) end
  elseif op == "update_properties" then
    addValueChecks(p.properties, "property", function(key) return inst[key] end)
  elseif op == "update_attributes" then
    addValueChecks(p.attributes or p.values, "attribute", function(key) return inst:GetAttribute(key) end)
  elseif op == "update_tags" then
    local actualTags = CollectionService:GetTags(inst); table.sort(actualTags)
    if p.set then
      local expectedTags = table.clone(p.set); table.sort(expectedTags)
      table.insert(checks, { kind = "tag_set", path = currentPath, expected = expectedTags, actual = actualTags, ok = sameStringList(expectedTags, actualTags) })
    else
      for _, tag in ipairs(p.add or {}) do table.insert(checks, { kind = "tag", path = currentPath, key = tag, expected = true, actual = hasTag(actualTags, tag), ok = hasTag(actualTags, tag) }) end
      for _, tag in ipairs(p.remove or {}) do table.insert(checks, { kind = "tag", path = currentPath, key = tag, expected = false, actual = hasTag(actualTags, tag), ok = not hasTag(actualTags, tag) }) end
    end
  elseif op == "rename_instance" or op == "move_instance" then
    table.insert(checks, { kind = "path_transition", path = currentPath, previousPath = sourcePath, ok = inst ~= nil and currentPath ~= sourcePath and resolve(currentPath) == inst and resolve(sourcePath) == nil })
  elseif op == "duplicate_instance" then
    table.insert(checks, { kind = "instance_identity", path = currentPath, className = inst and inst.ClassName or "", ok = inst ~= nil and currentPath == canonicalRoutinePath(p.newPath) and resolve(currentPath) == inst })
  elseif op == "delete_instance" then
    table.insert(checks, { kind = "instance_absence", path = tostring(sourcePath or p.path or ""), ok = resolve(sourcePath or p.path) == nil })
  end
  return checks
end
local function applyValues(inst, values, attributes)
  local errors = {}
  for key, value in pairs(values or {}) do local ok, err = pcall(function() inst[key] = decodeValue(value) end); if not ok then table.insert(errors, { field = key, message = tostring(err) }) end end
  for key, value in pairs(attributes or {}) do local ok, err = pcall(function() inst:SetAttribute(key, decodeValue(value)) end); if not ok then table.insert(errors, { field = key, message = tostring(err) }) end end
  return errors
end
local function trimSnapshots(root)
  local children = {}
  for _, child in ipairs(root:GetChildren()) do
    if child:IsA("Folder") and child:GetAttribute(INTERNAL_PREFIX .. "PinnedLastBatch") ~= true then table.insert(children, child) end
  end
  table.sort(children, function(a, b) return (a:GetAttribute(INTERNAL_PREFIX .. "CreatedAt") or 0) < (b:GetAttribute(INTERNAL_PREFIX .. "CreatedAt") or 0) end)
  while #children > 100 do children[1]:Destroy(); table.remove(children, 1) end
end
local function createSnapshots(paths, snapshotId, shouldTrim)
  local canonicalPaths = assertNonOverlappingPaths(paths)
  local entries = {}
  for index, requestedPath in ipairs(canonicalPaths) do
    local inst = resolve(requestedPath)
    table.insert(entries, { index = index, inst = inst, actualPath = inst and pathOf(inst) or requestedPath })
  end
  local root = rootFolder("NexusMCPSnapshots")
  local folder = root:FindFirstChild(snapshotId)
  if folder then error("SNAPSHOT_ID_CONFLICT: " .. snapshotId) end
  folder = Instance.new("Folder"); folder.Name = snapshotId; folder:SetAttribute(INTERNAL_PREFIX .. "CreatedAt", DateTime.now().UnixTimestampMillis); folder.Parent = root
  local refs = {}
  for _, entry in ipairs(entries) do
    local inst, actualPath = entry.inst, entry.actualPath
    local record = Instance.new("Folder"); record.Name = tostring(entry.index); record:SetAttribute(INTERNAL_PREFIX .. "Path", actualPath); record:SetAttribute(INTERNAL_PREFIX .. "Existed", inst ~= nil)
    record:SetAttribute(INTERNAL_PREFIX .. "ParentPath", inst and inst.Parent and pathOf(inst.Parent) or string.match(actualPath, "^(.*)/[^/]+$") or "")
    record:SetAttribute(INTERNAL_PREFIX .. "Name", inst and inst.Name or string.match(actualPath, "([^/]+)$") or "")
    record.Parent = folder
    if inst then local clone = inst:Clone(); clone.Name = "Value"; clone.Parent = record end
    table.insert(refs, { snapshotId = snapshotId, path = actualPath, existed = inst ~= nil, preHash = hash(inst) })
  end
  if shouldTrim ~= false then trimSnapshots(root) end
  return refs
end
local function finishSnapshots(refs)
  for _, ref in ipairs(refs) do ref.postHash = hash(resolve(ref.path)) end
  return refs
end
local function findRecord(snapshotId, path)
  local root = ServerStorage:FindFirstChild("NexusMCPSnapshots"); local folder = root and root:FindFirstChild(snapshotId)
  if not folder then return nil end
  for _, record in ipairs(folder:GetChildren()) do if record:GetAttribute(INTERNAL_PREFIX .. "Path") == path then return record end end
  return nil
end
local function removeSnapshot(snapshotId)
  local root = ServerStorage:FindFirstChild("NexusMCPSnapshots"); local folder = root and root:FindFirstChild(snapshotId)
  if folder and folder:IsA("Folder") then folder:Destroy() end
end
local function planRestore(refs, force)
  if #refs < 1 then error("SNAPSHOTS_REQUIRED: at least one snapshot is required") end
  local refPaths = {}; for _, ref in ipairs(refs) do table.insert(refPaths, ref.path) end
  local canonicalPaths = assertNonOverlappingPaths(refPaths)
  local plans = {}
  for index, ref in ipairs(refs) do
    ref.path = canonicalPaths[index]
    local current = resolve(ref.path)
    if ref.postHash and force ~= true and hash(current) ~= ref.postHash then error("SNAPSHOT_CONFLICT: intervening edit detected at " .. ref.path) end
    local record = findRecord(ref.snapshotId, ref.path); if not record then error("SNAPSHOT_NOT_FOUND: " .. tostring(ref.snapshotId)) end
    local existed = record:GetAttribute(INTERNAL_PREFIX .. "Existed") == true
    local parent, stored = nil, nil
    if existed then
      parent = resolve(record:GetAttribute(INTERNAL_PREFIX .. "ParentPath")); if not parent then error("SNAPSHOT_PARENT_MISSING: " .. ref.path) end
      stored = record:FindFirstChild("Value"); if not stored then error("SNAPSHOT_VALUE_MISSING: " .. ref.path) end
    end
    table.insert(plans, { ref = ref, record = record, existed = existed, parent = parent, stored = stored })
  end
  return plans
end
local function applyRestorePlans(plans)
  local restored = {}
  for _, plan in ipairs(plans) do
    local ref, record = plan.ref, plan.record
    local current = resolve(ref.path)
    if current then current:Destroy() end
    if plan.existed then
      local clone = plan.stored:Clone(); clone.Name = record:GetAttribute(INTERNAL_PREFIX .. "Name"); clone.Parent = plan.parent
    end
    local resultingHash = hash(resolve(ref.path))
    if ref.preHash and resultingHash ~= ref.preHash then error("SNAPSHOT_RESTORE_UNVERIFIED: " .. ref.path) end
    table.insert(restored, { path = ref.path, resultingHash = resultingHash })
  end
  return restored
end
local function restoreSnapshots(refs, force, guardId)
  local plans = planRestore(refs, force)
  local guardRefs = nil
  if guardId then
    local paths = {}; for _, ref in ipairs(refs) do table.insert(paths, ref.path) end
    guardRefs = finishSnapshots(createSnapshots(paths, guardId, false))
  end
  local ok, result = pcall(function() return applyRestorePlans(plans) end)
  if ok then if guardId then removeSnapshot(guardId) end; return result end
  if guardRefs then
    local rollbackOk, rollbackResult = pcall(function() return applyRestorePlans(planRestore(guardRefs, true)) end)
    removeSnapshot(guardId)
    if not rollbackOk then error("ROLLBACK_FAILED: " .. tostring(result) .. " | restore guard failed: " .. tostring(rollbackResult)) end
  end
  error("SNAPSHOT_RESTORE_FAILED: " .. tostring(result))
end
local function recordLastBatch(refs)
  local root = rootFolder("NexusMCPState"); local value = root:FindFirstChild("LastBatch")
  if value and not value:IsA("StringValue") then error("INTERNAL_STATE_COLLISION: LastBatch") end
  if not value then value = Instance.new("StringValue"); value.Name = "LastBatch"; value.Parent = root end
  local snapshotRoot = rootFolder("NexusMCPSnapshots")
  local nextIds, nextFolders = {}, {}
  for _, ref in ipairs(refs) do
    if not nextIds[ref.snapshotId] then
      local folder = snapshotRoot:FindFirstChild(ref.snapshotId)
      if not folder or not folder:IsA("Folder") then error("SNAPSHOT_NOT_FOUND: " .. tostring(ref.snapshotId)) end
      nextIds[ref.snapshotId] = true; table.insert(nextFolders, folder)
    end
  end
  local priorRefs = nil
  if value.Value ~= "" then local decodedOk, decoded = pcall(function() return HttpService:JSONDecode(value.Value) end); if decodedOk and type(decoded) == "table" then priorRefs = decoded end end
  for _, folder in ipairs(nextFolders) do folder:SetAttribute(INTERNAL_PREFIX .. "PinnedLastBatch", true) end
  value.Value = HttpService:JSONEncode(refs)
  for _, ref in ipairs(priorRefs or {}) do
    if not nextIds[ref.snapshotId] then
      local folder = snapshotRoot:FindFirstChild(ref.snapshotId); if folder and folder:IsA("Folder") then folder:SetAttribute(INTERNAL_PREFIX .. "PinnedLastBatch", nil) end
    end
  end
  trimSnapshots(snapshotRoot)
  return #refs, #nextFolders
end
local function readLastBatch()
  local root = ServerStorage:FindFirstChild("NexusMCPState"); local value = root and root:FindFirstChild("LastBatch")
  if not value or not value:IsA("StringValue") or value.Value == "" then return nil end
  local refs = HttpService:JSONDecode(value.Value); if type(refs) ~= "table" or #refs < 1 then return nil end
  return refs
end
local function clearLastBatch()
  local root = ServerStorage:FindFirstChild("NexusMCPState"); local value = root and root:FindFirstChild("LastBatch")
  local refs = readLastBatch(); local snapshotRoot = ServerStorage:FindFirstChild("NexusMCPSnapshots")
  for _, ref in ipairs(refs or {}) do
    local folder = snapshotRoot and snapshotRoot:FindFirstChild(ref.snapshotId)
    if folder and folder:IsA("Folder") then folder:SetAttribute(INTERNAL_PREFIX .. "PinnedLastBatch", nil) end
  end
  if value then value:Destroy() end
  if snapshotRoot and snapshotRoot:IsA("Folder") then trimSnapshots(snapshotRoot) end
end
local function validateDestination(path)
  local root = string.match(string.gsub(path or "", "^game/", ""), "^[^/]+")
  return root == "Workspace" or root == "ReplicatedStorage" or root == "ServerStorage"
end
local function connectorInternalDestination(inst)
  if not inst then return false end
  for _, name in ipairs({ "NexusMCPSnapshots", "NexusMCPState", "NexusMCPReceipts", "NexusMCPQuarantine" }) do
    local root = ServerStorage:FindFirstChild(name)
    if root and (inst == root or inst:IsDescendantOf(root)) then return true end
  end
  return false
end
local function mutate(op, p, nonce)
  if op == "get_selection" then local out = {}; for i, inst in ipairs(Selection:Get()) do if i > 100 then break end; table.insert(out, describe(inst)) end; return { instances = out } end
  if op == "create_snapshot" then local refs = createSnapshots(p.paths or {}, p.snapshotId or nonce); return { snapshots = finishSnapshots(refs), snapshotCount = #refs } end
  if op == "restore_snapshot" then local restored = restoreSnapshots(p.snapshots or {}, p.force == true, nonce .. "_guard"); return { restored = restored, restoredCount = #restored } end
  if op == "record_last_batch" then local storedCount, pinnedCount = recordLastBatch(p.snapshots or {}); return { storedCount = storedCount, pinnedCount = pinnedCount } end
  if op == "undo_last_batch" then
    local refs = readLastBatch(); if not refs then error("NO_LAST_BATCH: no completed batch is recorded") end
    local restored = restoreSnapshots(refs, p.force == true, nonce .. "_guard"); clearLastBatch()
    return { restored = restored, restoredCount = #restored, lastBatchCleared = true }
  end
  if op == "prepare_asset_quarantine" then
    local receipts = rootFolder("NexusMCPReceipts"); local receipt = receipts:FindFirstChild(p.nonce)
    if receipt and receipt:IsA("StringValue") then return { existingReceipt = HttpService:JSONDecode(receipt.Value) } end
    local root = rootFolder("NexusMCPQuarantine"); local folder = root:FindFirstChild(p.nonce)
    if not folder then folder = Instance.new("Folder"); folder.Name = p.nonce; folder.Parent = root end
    return { path = pathOf(folder) }
  end
  if op == "discard_asset_quarantine" then local quarantine = resolve(p.quarantinePath); if quarantine then quarantine:Destroy() end; return { removed = true } end
  if op == "finalize_asset_quarantine" then
    local quarantine = resolve(p.quarantinePath); if not quarantine then error("Quarantine missing") end
    if not validateDestination(p.targetParentPath) then quarantine:Destroy(); error("DESTINATION_NOT_ALLOWED: destination policy refused") end
    local parent = resolve(p.targetParentPath)
    if not parent or connectorInternalDestination(parent) then quarantine:Destroy(); error("DESTINATION_NOT_ALLOWED: destination missing or connector-owned") end
    local children = quarantine:GetChildren(); if #children ~= 1 then quarantine:Destroy(); error("Inserted asset envelope invalid") end
    local asset = children[1]; local scanned = 1 + #asset:GetDescendants(); if scanned > 5000 then quarantine:Destroy(); error("Inserted asset exceeds scan limit") end
    if not (asset:IsA("Model") or asset:IsA("BasePart")) then quarantine:Destroy(); error("Inserted asset root is not a Model or Mesh") end
    local requestedName = p.requestedName ~= "" and p.requestedName or asset.Name
    if parent:FindFirstChild(requestedName) then quarantine:Destroy(); error("TARGET_EXISTS: destination already contains " .. requestedName) end
    local all = { asset }; for _, item in ipairs(asset:GetDescendants()) do table.insert(all, item) end
    local removed = 0
    for index = #all, 1, -1 do local item = all[index]
      if item:IsA("LuaSourceContainer") or item:IsA("RemoteEvent") or item:IsA("RemoteFunction") or item:IsA("BindableEvent") or item:IsA("BindableFunction") then item:Destroy(); removed += 1
      elseif item:IsA("BasePart") then if p.anchoredPolicy ~= "preserve" then item.Anchored = true end; if p.collisionPolicy ~= "preserve" then item.CanCollide = p.collisionPolicy == "collide" end end
    end
    asset.Name = requestedName; asset.Parent = parent; quarantine:Destroy()
    local receiptData = { assetId = p.assetId, path = pathOf(asset), nonce = p.nonce, scanned = scanned, removedUnsafe = removed, resultingHash = hash(asset) }
    local receipts = rootFolder("NexusMCPReceipts"); local receipt = Instance.new("StringValue"); receipt.Name = p.nonce; receipt.Value = HttpService:JSONEncode(receiptData); receipt.Parent = receipts
    return { instance = describe(asset), receipt = receiptData, resultingHash = receiptData.resultingHash }
  end
  if op == "run_test_service" then
    local profile = p.profile or p.profileId
    if profile == "smoke" then return { passed = true, profileId = profile, checks = { "studio_access" } } end
    if profile == "project_smoke" then return { passed = workspace ~= nil and game:GetService("ReplicatedStorage") ~= nil, profileId = profile, checks = { "workspace", "replicated_storage" } } end
    if profile == "testservice_run" then local ok, err = pcall(function() TestService:Run() end); if not ok then error("TEST_PROFILE_FAILED: " .. tostring(err)) end; return { passed = true, profileId = profile, checks = { "testservice_run" } } end
    error("Unknown test profile")
  end
  local snapshotPaths, context = {}, {}
  if op == "create_instance" or op == "create_script" then
    local parent, name = parentAndName(p.path, false); if not parent or not name then error("TARGET_PARENT_MISSING: target parent not found") end
    if connectorInternalDestination(parent) then error("DESTINATION_NOT_ALLOWED: connector-owned mutation destination") end
    if parent:FindFirstChild(name) then error("TARGET_EXISTS: destination already exists") end
    context.parent, context.name = parent, name
    snapshotPaths = { canonicalRoutinePath(p.path) }
  else
    local inst = resolve(p.path); if not inst then error("INSTANCE_NOT_FOUND: " .. tostring(p.path)) end
    context.inst, context.sourcePath = inst, pathOf(inst)
    if op == "rename_instance" then
      local name, parent = p.newName or p.name, inst.Parent
      if not parent then error("TARGET_PARENT_MISSING: source parent not found") end
      local destinationPath = pathOf(parent) .. "/" .. name
      if destinationPath == context.sourcePath then error("TARGET_EXISTS: source already has the requested name") end
      local existing = parent:FindFirstChild(name); if existing and existing ~= inst then error("TARGET_EXISTS: sibling already uses the requested name") end
      context.parent, context.name = parent, name
      snapshotPaths = { context.sourcePath, destinationPath }
    elseif op == "move_instance" then
      local parent, name
      if p.newPath then parent, name = parentAndName(p.newPath, false) else parent = resolve(p.newParentPath); name = inst.Name end
      if not parent or not name then error("TARGET_PARENT_MISSING: target parent not found") end
      if connectorInternalDestination(parent) then error("DESTINATION_NOT_ALLOWED: connector-owned mutation destination") end
      if parent == inst or parent:IsDescendantOf(inst) then error("DESTINATION_INVALID: cannot move an instance into itself") end
      local destinationPath = pathOf(parent) .. "/" .. name
      if destinationPath == context.sourcePath then error("TARGET_EXISTS: source and destination are identical") end
      local existing = parent:FindFirstChild(name); if existing and existing ~= inst then error("TARGET_EXISTS: destination already exists") end
      context.parent, context.name = parent, name
      snapshotPaths = { context.sourcePath, destinationPath }
    elseif op == "duplicate_instance" then
      local parent, name = parentAndName(p.newPath, false); if not parent or not name then error("TARGET_PARENT_MISSING: target parent not found") end
      if connectorInternalDestination(parent) then error("DESTINATION_NOT_ALLOWED: connector-owned mutation destination") end
      if parent == inst or parent:IsDescendantOf(inst) then error("DESTINATION_INVALID: cannot duplicate an instance into its own tree") end
      if parent:FindFirstChild(name) then error("TARGET_EXISTS: duplicate destination already exists") end
      context.parent, context.name = parent, name
      snapshotPaths = { pathOf(parent) .. "/" .. name }
    else snapshotPaths = { context.sourcePath } end
  end
  local refs = createSnapshots(snapshotPaths, nonce)
  local mutationStarted = false
  local ok, result = pcall(function()
    if op == "create_instance" or op == "create_script" then
      if context.parent:FindFirstChild(context.name) then error("PRECONDITION_CHANGED: destination changed after snapshot") end
      local created = Instance.new(p.className or (op == "create_script" and "ModuleScript" or "Folder")); created.Name = context.name
      local errors = applyValues(created, p.properties, p.attributes); if #errors > 0 then created:Destroy(); error(HttpService:JSONEncode(errors)) end
      if op == "create_script" then created.Source = tostring(p.source or "") end
      for _, tag in ipairs(p.tags or {}) do CollectionService:AddTag(created, tag) end
      mutationStarted = true; created.Parent = context.parent; return { instance = describe(created), resultingHash = hash(created), semanticChecks = op == "create_instance" and semanticChecks(op, p, created, nil) or nil }
    end
    local inst = context.inst
    if resolve(context.sourcePath) ~= inst then error("PRECONDITION_CHANGED: source changed after snapshot") end
    if op == "update_properties" then mutationStarted = true; local errors = applyValues(inst, p.properties, nil); if #errors > 0 then error(HttpService:JSONEncode(errors)) end
    elseif op == "update_attributes" then mutationStarted = true; local errors = applyValues(inst, nil, p.attributes or p.values); if #errors > 0 then error(HttpService:JSONEncode(errors)) end
    elseif op == "update_tags" then mutationStarted = true; if p.set then for _, tag in ipairs(CollectionService:GetTags(inst)) do CollectionService:RemoveTag(inst, tag) end; for _, tag in ipairs(p.set) do CollectionService:AddTag(inst, tag) end else for _, tag in ipairs(p.remove or {}) do CollectionService:RemoveTag(inst, tag) end; for _, tag in ipairs(p.add or {}) do CollectionService:AddTag(inst, tag) end end
    elseif op == "rename_instance" then
      local existing = context.parent:FindFirstChild(context.name)
      if existing and existing ~= inst then error("PRECONDITION_CHANGED: rename destination changed after snapshot") end
      mutationStarted = true; inst.Name = context.name
    elseif op == "move_instance" then
      if context.parent == inst or context.parent:IsDescendantOf(inst) then error("PRECONDITION_CHANGED: move destination changed after snapshot") end
      local existing = context.parent:FindFirstChild(context.name); if existing and existing ~= inst then error("PRECONDITION_CHANGED: move destination changed after snapshot") end
      mutationStarted = true; inst.Name = context.name; inst.Parent = context.parent
    elseif op == "duplicate_instance" then
      if context.parent == inst or context.parent:IsDescendantOf(inst) or context.parent:FindFirstChild(context.name) then error("PRECONDITION_CHANGED: duplicate destination changed after snapshot") end
      local clone = inst:Clone(); clone.Name = context.name; mutationStarted = true; clone.Parent = context.parent; inst = clone
    elseif op == "delete_instance" then
      mutationStarted = true; inst:Destroy(); local verified = resolve(context.sourcePath) == nil
      if not verified then error("DELETE_UNVERIFIED: target still resolves after deletion") end
      return { resultingHash = "missing", verified = true, semanticChecks = semanticChecks(op, p, nil, context.sourcePath) }
    else error("ROUTINE_UNAVAILABLE: unsupported mutation routine") end
    return { instance = describe(inst), resultingHash = hash(inst), semanticChecks = semanticChecks(op, p, inst, context.sourcePath) }
  end)
  if not ok and not mutationStarted then
    removeSnapshot(nonce)
    return { __nexusError = true, code = "MUTATION_NOT_APPLIED", message = tostring(result), rolledBack = false }
  end
  local finishOk, finishedOrError = pcall(function() return finishSnapshots(refs) end)
  local finished = finishOk and finishedOrError or refs
  if ok and finishOk then result.snapshots = finished; return result end
  if ok and not finishOk then result = "POST_STATE_HASH_FAILED: " .. tostring(finishedOrError) end
  local rollbackOk, rollbackResult = pcall(function() return restoreSnapshots(finished, true, nonce .. "_rollback_guard") end)
  if rollbackOk then
    return { __nexusError = true, code = "MUTATION_ROLLED_BACK", message = tostring(result), snapshots = finished, rollback = rollbackResult, rolledBack = true }
  end
  return { __nexusError = true, code = "ROLLBACK_FAILED", message = tostring(result), snapshots = finished, rollbackError = tostring(rollbackResult), rolledBack = false }
end
function __nexus_run(raw)
  local input = HttpService:JSONDecode(raw)
  local ok, data = pcall(function() return mutate(input.operation, input.payload, input.nonce) end)
  local message = tostring(data)
  local knownCodes = { "SNAPSHOT_CONFLICT", "SNAPSHOT_NOT_FOUND", "SNAPSHOT_ID_CONFLICT", "SNAPSHOT_PATH_OVERLAP", "SNAPSHOT_RESTORE_UNVERIFIED", "SNAPSHOT_RESTORE_FAILED", "SNAPSHOTS_REQUIRED", "NO_LAST_BATCH", "TEST_PROFILE_FAILED", "TARGET_EXISTS", "TARGET_PARENT_MISSING", "DESTINATION_INVALID", "DESTINATION_NOT_ALLOWED", "INSTANCE_NOT_FOUND", "INTERNAL_STATE_COLLISION", "PRECONDITION_CHANGED", "MUTATION_NOT_APPLIED", "ROLLBACK_FAILED", "ROUTINE_UNAVAILABLE" }
  local code = "ROUTINE_FAILED"; for _, candidate in ipairs(knownCodes) do if string.find(message, candidate, 1, true) then code = candidate; break end end
  local structuredFailure = ok and type(data) == "table" and data.__nexusError == true
  local envelope
  if structuredFailure then envelope = { version = 1, nonce = input.nonce, ok = false, code = data.code, message = data.message, data = data }
  elseif ok then envelope = { version = 1, nonce = input.nonce, ok = true, data = data }
  else envelope = { version = 1, nonce = input.nonce, ok = false, code = code, message = message } end
  return HttpService:JSONEncode(envelope)
end`;
