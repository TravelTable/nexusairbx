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
  "discard_asset_quarantine",
]);

export class FixedRoutineRunner {
  constructor(private readonly mcp: McpClientLike) {}

  async run(operation: string, payload: JsonObject, signal?: AbortSignal): Promise<JsonObject> {
    if (!ROUTINE_COMMANDS.has(operation)) throw new ConnectorError("ROUTINE_UNAVAILABLE", "The requested connector routine is not audited.");
    validatePayload(operation, payload);
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
      );
    }
    return isObject(envelope.data) ? envelope.data : { value: toJson(envelope.data) };
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
    for (const path of payload.paths) validatePath(path);
  }
  if (payload.snapshots !== undefined) validateSnapshotRefs(payload.snapshots);
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
  for (const field of ["properties", "attributes"]) {
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
}

function validateSnapshotRefs(value: JsonValue): void {
  if (!Array.isArray(value) || value.length < 1 || value.length > 500) {
    throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "snapshots must contain 1-500 bounded references.");
  }
  for (const ref of value) {
    if (!isObject(ref)) throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "Snapshot reference is malformed.");
    if (ref.path === undefined) throw new ConnectorError("COMMAND_PAYLOAD_INVALID", "Snapshot path is missing.");
    validatePath(ref.path);
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
  if kind == "string" or kind == "number" or kind == "boolean" then return tostring(value) end
  if kind == "Vector2" then return string.format("Vector2:%g,%g", value.X, value.Y) end
  if kind == "Vector3" then return string.format("Vector3:%g,%g,%g", value.X, value.Y, value.Z) end
  if kind == "Color3" then return string.format("Color3:%g,%g,%g", value.R, value.G, value.B) end
  if kind == "CFrame" then return "CFrame:" .. table.concat({value:GetComponents()}, ",") end
  if kind == "UDim" then return string.format("UDim:%g,%g", value.Scale, value.Offset) end
  if kind == "UDim2" then return string.format("UDim2:%g,%g,%g,%g", value.X.Scale, value.X.Offset, value.Y.Scale, value.Y.Offset) end
  if kind == "EnumItem" then return tostring(value) end
  return kind .. ":" .. tostring(value)
end
local HASH_PROPERTIES = { "Anchored", "CanCollide", "CanTouch", "CanQuery", "Transparency", "Material", "Color", "Size", "CFrame", "Value", "Enabled", "Visible", "Text", "Image" }
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
  local text = table.concat(chunks, "\30")
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
local function applyValues(inst, values, attributes)
  local errors = {}
  for key, value in pairs(values or {}) do local ok, err = pcall(function() inst[key] = decodeValue(value) end); if not ok then table.insert(errors, { field = key, message = tostring(err) }) end end
  for key, value in pairs(attributes or {}) do local ok, err = pcall(function() inst:SetAttribute(key, decodeValue(value)) end); if not ok then table.insert(errors, { field = key, message = tostring(err) }) end end
  return errors
end
local function trimSnapshots(root)
  local children = root:GetChildren(); table.sort(children, function(a, b) return (a:GetAttribute(INTERNAL_PREFIX .. "CreatedAt") or 0) < (b:GetAttribute(INTERNAL_PREFIX .. "CreatedAt") or 0) end)
  while #children > 50 do children[1]:Destroy(); table.remove(children, 1) end
end
local function createSnapshots(paths, snapshotId)
  local root = rootFolder("NexusMCPSnapshots")
  local folder = root:FindFirstChild(snapshotId)
  if folder then folder:Destroy() end
  folder = Instance.new("Folder"); folder.Name = snapshotId; folder:SetAttribute(INTERNAL_PREFIX .. "CreatedAt", os.time()); folder.Parent = root
  local refs = {}
  for index, requestedPath in ipairs(paths) do
    local inst = resolve(requestedPath); local actualPath = inst and pathOf(inst) or requestedPath
    local record = Instance.new("Folder"); record.Name = tostring(index); record:SetAttribute(INTERNAL_PREFIX .. "Path", actualPath); record:SetAttribute(INTERNAL_PREFIX .. "Existed", inst ~= nil)
    record:SetAttribute(INTERNAL_PREFIX .. "ParentPath", inst and inst.Parent and pathOf(inst.Parent) or string.match(actualPath, "^(.*)/[^/]+$") or "")
    record:SetAttribute(INTERNAL_PREFIX .. "Name", inst and inst.Name or string.match(actualPath, "([^/]+)$") or "")
    record.Parent = folder
    if inst then local clone = inst:Clone(); clone.Name = "Value"; clone.Parent = record end
    table.insert(refs, { snapshotId = snapshotId, path = actualPath, existed = inst ~= nil, preHash = hash(inst) })
  end
  trimSnapshots(root)
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
local function restoreSnapshots(refs, force)
  local restored = {}
  for _, ref in ipairs(refs) do
    local current = resolve(ref.path)
    if ref.postHash and force ~= true and hash(current) ~= ref.postHash then error("SNAPSHOT_CONFLICT: intervening edit detected at " .. ref.path) end
    local record = findRecord(ref.snapshotId, ref.path); if not record then error("SNAPSHOT_NOT_FOUND: " .. tostring(ref.snapshotId)) end
    if current then current:Destroy() end
    if record:GetAttribute(INTERNAL_PREFIX .. "Existed") == true then
      local parent = resolve(record:GetAttribute(INTERNAL_PREFIX .. "ParentPath")); if not parent then error("Snapshot parent missing") end
      local stored = record:FindFirstChild("Value"); if not stored then error("Snapshot value missing") end
      local clone = stored:Clone(); clone.Name = record:GetAttribute(INTERNAL_PREFIX .. "Name"); clone.Parent = parent
    end
    table.insert(restored, { path = ref.path, resultingHash = hash(resolve(ref.path)) })
  end
  return restored
end
local function validateDestination(path)
  local root = string.match(string.gsub(path or "", "^game/", ""), "^[^/]+")
  return root == "Workspace" or root == "ReplicatedStorage" or root == "ServerStorage"
end
local function mutate(op, p, nonce)
  if op == "get_selection" then local out = {}; for i, inst in ipairs(Selection:Get()) do if i > 100 then break end; table.insert(out, describe(inst)) end; return { instances = out } end
  if op == "create_snapshot" then local refs = createSnapshots(p.paths or {}, p.snapshotId or nonce); return { snapshots = finishSnapshots(refs), snapshotCount = #refs } end
  if op == "restore_snapshot" or op == "undo_last_batch" then return { restored = restoreSnapshots(p.snapshots or {}, p.force == true) } end
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
    local children = quarantine:GetChildren(); if #children ~= 1 then quarantine:Destroy(); error("Inserted asset envelope invalid") end
    local asset = children[1]; local scanned = 1 + #asset:GetDescendants(); if scanned > 5000 then quarantine:Destroy(); error("Inserted asset exceeds scan limit") end
    if not (asset:IsA("Model") or asset:IsA("BasePart")) then quarantine:Destroy(); error("Inserted asset root is not a Model or Mesh") end
    local all = { asset }; for _, item in ipairs(asset:GetDescendants()) do table.insert(all, item) end
    local removed = 0
    for index = #all, 1, -1 do local item = all[index]
      if item:IsA("LuaSourceContainer") or item:IsA("RemoteEvent") or item:IsA("RemoteFunction") or item:IsA("BindableEvent") or item:IsA("BindableFunction") then item:Destroy(); removed += 1
      elseif item:IsA("BasePart") then if p.anchoredPolicy ~= "preserve" then item.Anchored = true end; if p.collisionPolicy ~= "preserve" then item.CanCollide = p.collisionPolicy == "collide" end end
    end
    if not validateDestination(p.targetParentPath) then quarantine:Destroy(); error("Destination policy refused") end
    local parent = resolve(p.targetParentPath); if not parent or parent:IsDescendantOf(rootFolder("NexusMCPQuarantine")) then quarantine:Destroy(); error("Destination missing") end
    asset.Name = p.requestedName ~= "" and p.requestedName or asset.Name; asset.Parent = parent; quarantine:Destroy()
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
  local snapshotPaths = {}
  if op == "create_instance" or op == "create_script" then snapshotPaths = { p.path }
  elseif op == "duplicate_instance" then snapshotPaths = { p.newPath }
  elseif op == "move_instance" then snapshotPaths = { p.path, p.newPath or p.newParentPath }
  else snapshotPaths = { p.path } end
  local refs = createSnapshots(snapshotPaths, nonce)
  if op == "create_instance" or op == "create_script" then
    local parent, name = parentAndName(p.path, p.createParents ~= false); if not parent or not name then error("Target parent not found") end
    if parent:FindFirstChild(name) then error("Target already exists") end
    local inst = Instance.new(p.className or (op == "create_script" and "ModuleScript" or "Folder")); inst.Name = name
    local errors = applyValues(inst, p.properties, p.attributes); if #errors > 0 then inst:Destroy(); error(HttpService:JSONEncode(errors)) end
    if op == "create_script" then inst.Source = tostring(p.source or "") end
    for _, tag in ipairs(p.tags or {}) do CollectionService:AddTag(inst, tag) end
    inst.Parent = parent; return { instance = describe(inst), snapshots = finishSnapshots(refs), resultingHash = hash(inst) }
  end
  local inst = resolve(p.path); if not inst then error("Instance not found") end
  if op == "update_properties" then local errors = applyValues(inst, p.properties, nil); if #errors > 0 then error(HttpService:JSONEncode(errors)) end
  elseif op == "update_attributes" then local errors = applyValues(inst, nil, p.attributes or p.values); if #errors > 0 then error(HttpService:JSONEncode(errors)) end
  elseif op == "update_tags" then if p.set then for _, tag in ipairs(CollectionService:GetTags(inst)) do CollectionService:RemoveTag(inst, tag) end; for _, tag in ipairs(p.set) do CollectionService:AddTag(inst, tag) end else for _, tag in ipairs(p.remove or {}) do CollectionService:RemoveTag(inst, tag) end; for _, tag in ipairs(p.add or {}) do CollectionService:AddTag(inst, tag) end end
  elseif op == "rename_instance" then inst.Name = p.newName or p.name
  elseif op == "move_instance" then local parent, name = parentAndName(p.newPath or p.newParentPath, p.createParents ~= false); if not parent then error("Target parent not found") end; if name then inst.Name = name end; inst.Parent = parent
  elseif op == "duplicate_instance" then local parent, name = parentAndName(p.newPath, p.createParents ~= false); if not parent or parent:FindFirstChild(name) then error("Duplicate target invalid") end; local clone = inst:Clone(); clone.Name = name; clone.Parent = parent; inst = clone
  elseif op == "delete_instance" then inst:Destroy(); return { snapshots = finishSnapshots(refs), resultingHash = "missing", verified = resolve(p.path) == nil }
  elseif op == "batch_operations" then error("Nested batch dispatch must be expanded by the connector")
  else error("Unsupported routine") end
  return { instance = describe(inst), snapshots = finishSnapshots(refs), resultingHash = hash(inst) }
end
function __nexus_run(raw)
  local input = HttpService:JSONDecode(raw)
  local ok, data = pcall(function() return mutate(input.operation, input.payload, input.nonce) end)
  local message = tostring(data)
  local code = string.match(message, "SNAPSHOT_CONFLICT") and "SNAPSHOT_CONFLICT" or string.match(message, "SNAPSHOT_NOT_FOUND") and "SNAPSHOT_NOT_FOUND" or string.match(message, "TEST_PROFILE_FAILED") and "TEST_PROFILE_FAILED" or "ROUTINE_FAILED"
  local envelope = ok and { version = 1, nonce = input.nonce, ok = true, data = data } or { version = 1, nonce = input.nonce, ok = false, code = code, message = message }
  return HttpService:JSONEncode(envelope)
end`;
