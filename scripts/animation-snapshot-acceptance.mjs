import fs from "node:fs/promises";

// Assemble the same helpers as the plugin bundler, retaining lexical bindings.
// Actual Instance/property behavior is supplied by Studio, not a mock VM.
export async function snapshotAcceptanceSource() {
  const files = ["serialization", "path", "snapshot"];
  const sources = await Promise.all(files.map(name => fs.readFile(new URL(`../roblox-plugin/src/studio/${name}.lua`, import.meta.url), "utf8")));
  const names = [...new Set(sources.flatMap(source => [...source.matchAll(/^local (?:function )?(\w+)(?:\s*=|\()/gm)].map(match => match[1])))];
  const body = sources.map(source => source.replace(/^local function (\w+)\(/gm, "$1 = function(").replace(/^local (\w+) =/gm, "$1 =")).join("\n");
  return `
local HttpService = game:GetService("HttpService")
local CollectionService = game:GetService("CollectionService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local StarterPlayer = game:GetService("StarterPlayer")
local SERVICE_ROOTS = { Workspace = workspace }
local SCRIPT_CLASSES = { Script=true, LocalScript=true, ModuleScript=true }
local localSnapshots = {}
local function jsonEncode(value) return HttpService:JSONEncode(value) end
local ${names.join(", ")}
${body}
local fixture = workspace.NexusAnimationProof
local sequence = Instance.new("KeyframeSequence")
sequence.Name = "SnapshotAcceptance"; sequence.Loop = true; sequence.Priority = Enum.AnimationPriority.Action2; sequence.Parent = fixture
for _, time in ipairs({0.2, 0.7}) do
    local frame = Instance.new("Keyframe"); frame.Time = time; frame.Name = "Keyframe"; frame.Parent = sequence
    local pose = Instance.new("Pose"); pose.Name = "HumanoidRootPart"; pose.CFrame = CFrame.Angles(time,0,0); pose.Parent = frame
    local marker = Instance.new("KeyframeMarker"); marker.Name = "Footstep"; marker.Value = tostring(time); marker.Parent = frame
end
local original = snapshotStateHash(sequence)
local snap = snapshotInstance(fullPath(sequence))
sequence:GetChildren()[1]:Destroy()
sequence:SetAttribute("Changed", true)
snap.postHash = snapshotStateHash(sequence)
local restored = restoreSnapshots({snapshots={snap}})
assert(restored.ok, HttpService:JSONEncode(restored))
sequence = resolvePath(snap.path)
assert(snapshotStateHash(sequence) == original, "Indexed animation tree did not restore exactly")
assert(#sequence:GetKeyframes() == 2, "Duplicate-name keyframe was lost")
assert(#sequence:GetKeyframes()[1]:GetMarkers() == 1 and #sequence:GetKeyframes()[2]:GetMarkers() == 1, "Duplicate-name markers were lost")
local protected = snapshotInstance(fullPath(sequence))
sequence.Priority = Enum.AnimationPriority.Action
protected.postHash = snapshotStateHash(sequence)
sequence:GetKeyframes()[1]:GetMarkers()[1].Value = "creator edit"
local conflict = restoreSnapshots({snapshots={protected}})
assert(conflict.kept == 1 and not conflict.ok, "Creator marker edit was not protected")
sequence:Destroy()
local folder = Instance.new("Folder"); folder.Name = "AnimSaves"; folder.Parent = fixture
local absent = {id="snapshot-test", path=fullPath(folder), existed=false}
absent.postHash = snapshotStateHash(folder)
Instance.new("KeyframeSequence", folder)
local folderConflict = restoreSnapshots({snapshots={absent}})
assert(folderConflict.kept == 1 and folder.Parent == fixture, "New creator child was removed with created animation folder")
folder:Destroy()
return {pass=true, restored=restored.restored, duplicateKeyframes=2, protectedMarkerEdits=conflict.kept, protectedFolderEdits=folderConflict.kept}
`;
}
