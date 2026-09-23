const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = require("../../backend/node_modules/fengari");
const read = (name) => fs.readFileSync(path.join(__dirname, "../src/studio", name), "utf8");
const paths = read("path.lua");
const setter = paths.slice(paths.indexOf("local function safeSetProperty("), paths.indexOf("-- Asset-bearing properties"));
const snapshot = read("snapshot.lua").replace(/\b(\w+)\s*\+=\s*([^\r\n]+)/g, "$1 = $1 + $2");

test("actual sequence fingerprint detects marker-only legacy keyframe renames", () => {
  const animation = fs.readFileSync(path.join(__dirname, "../src/commands/animation.lua"), "utf8");
  const hash = animation.slice(animation.indexOf("local function animationSequenceHash("), animation.indexOf("\naddPose = function"));
  const state = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(state);
  const source = `
HttpService = {JSONEncode = function(_, values)
    local pieces = {}; for _, value in ipairs(values) do table.insert(pieces, string.format("%q", tostring(value))) end
    return "[" .. table.concat(pieces, ",") .. "]"
end}
function stableHash(value) return value end
${hash}
local marker = {Name = "Impact", Value = "blade"}
local frame = {Time = 0.25, Name = "OldLegacyEvent", IsA = function(_, name) return name == "Keyframe" end,
    GetDescendants = function() return {} end, GetMarkers = function() return {marker} end}
local clip = {Name = "Attack", Loop = false, Priority = "Action", IsA = function(_, name) return name == "KeyframeSequence" end,
    GetChildren = function() return {frame} end}
local original = animationSequenceHash(clip)
assert(animationSequenceHash(clip) == original)
frame.Name = "NewLegacyEvent"
assert(animationSequenceHash(clip) ~= original, "marker-only frame rename did not invalidate the replacement hash")
frame.Name = "OldLegacyEvent"
assert(animationSequenceHash(clip) == original, "restoring the exact name did not restore its fingerprint")
`;
  const status = lauxlib.luaL_dostring(state, to_luastring(source));
  assert.equal(status, lua.LUA_OK, status === lua.LUA_OK ? "" : to_jsstring(lua.lua_tostring(state, -1)));
  lua.lua_close(state);
});

test("real snapshot helpers preserve enum-looking marker text and restore AnimSaves after its children", () => {
  const state = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(state);
  const source = `
typeof = type
Enum = {Material = {Plastic = {enum = true}}}
NATIVE_PROPERTY_ALLOWLIST = {}
SAFE_UI_RESTORE_PROPERTIES = {}
SCRIPT_CLASSES = {}
CREATABLE_CLASSES = {Folder = true, KeyframeSequence = true, Keyframe = true, KeyframeMarker = true, Pose = true}
localSnapshots = {}
HttpService = {GenerateGUID = function() return "snapshot" end}
CollectionService = {GetTags = function() return {} end, AddTag = function() end, HasTag = function() return false end}
local objects = {}
Instance = {new = function(class)
    local item = {ClassName = class, Name = class, attributes = {}}
    function item:IsA(name) return name == self.ClassName end
    function item:GetChildren()
        local children = {}; for _, other in ipairs(objects) do if other.Parent == self then table.insert(children, other) end end; return children
    end
    function item:FindFirstChild(name) for _, child in ipairs(self:GetChildren()) do if child.Name == name then return child end end end
    function item:GetAttributes() return self.attributes end
    function item:SetAttribute(key, value) self.attributes[key] = value end
    function item:Destroy() for _, child in ipairs(self:GetChildren()) do child:Destroy() end; self.Parent = nil end
    table.insert(objects, item); return item
end}
local root = Instance.new("Workspace")
function fullPath(item) return item.Parent and fullPath(item.Parent) .. "/" .. item.Name or item.Name end
function resolvePath(path)
    local current = root
    for name in string.gmatch(path, "[^/]+") do if name ~= "Workspace" then current = current and current:FindFirstChild(name) end end
    return current
end
function ensureParent(path) local parent, name = string.match(path, "^(.*)/([^/]+)$"); return resolvePath(parent), name end
function attributesOf(item) return item:GetAttributes() end
function propertiesOf(item)
    local props = {Name = item.Name, ClassName = item.ClassName}; if item.Value ~= nil then props.Value = item.Value end; return props
end
function propertyHash(item) return item.ClassName .. "|" .. item.Name .. "|" .. tostring(item.Value or "") end
function stableHash(value) return value end
function safeRestoreAssetReference() return false end
${setter}
${snapshot}
local marker = Instance.new("KeyframeMarker")
assert(safeSetProperty(marker, "Value", "Enum.Material.Plastic"))
assert(type(marker.Value) == "string" and marker.Value == "Enum.Material.Plastic", "literal marker value was decoded as enum")
assert(not safeSetProperty(marker, "Value", {type = "EnumItem", enumName = "Material", name = "Plastic"}))
local folder = Instance.new("Folder"); folder.Name = "AnimSaves"; folder.Parent = root
local sequence = Instance.new("KeyframeSequence"); sequence.Name = "Attack"; sequence.Parent = folder
local frame = Instance.new("Keyframe"); frame.Name = "Frame"; frame.Parent = sequence
marker.Parent = frame
local snapshots = {}
appendSnapshotTree(folder, snapshots)
folder:Destroy()
local result = restoreSnapshots({snapshots = snapshots, force = true})
assert(result.ok, result.errors[1] and result.errors[1].message or "restore failed")
assert(result.restored == 2)
assert(resolvePath("Workspace/AnimSaves/Attack/Frame/KeyframeMarker").Value == "Enum.Material.Plastic")
`;
  const status = lauxlib.luaL_dostring(state, to_luastring(source));
  assert.equal(status, lua.LUA_OK, status === lua.LUA_OK ? "" : to_jsstring(lua.lua_tostring(state, -1)));
  lua.lua_close(state);
});
