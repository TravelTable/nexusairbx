-- Run in Studio's actual Play Server after compiling/deploying the set in Edit.
assert(game:GetService("RunService"):IsRunning() and game:GetService("RunService"):IsServer(), "Expected live Play Server")
local Controller = require(folder.AnimationSetController)
local config = require(folder.AnimationSetConfig)
local fixture = workspace.NexusAnimationProof
local hero, npc = fixture.Hero, fixture.NPC
local animationIds = {}
for resourceId, name in pairs(sequenceNames) do
    local sequence = hero.AnimSaves:FindFirstChild(name)
    assert(sequence, "Missing actual deployed sequence " .. name)
    animationIds[resourceId] = game:GetService("AnimationClipProvider"):RegisterAnimationClip(sequence)
end
local report = {context="play_server", placeId=tostring(game.PlaceId), universeId=tostring(game.GameId), states={}, markers={}, windows={}, contacts=0, impacts=0, sounds=0}
local root = hero.HumanoidRootPart
local sound = root:FindFirstChild("ContactSound") or Instance.new("Sound")
sound.Name="ContactSound"; sound.SoundId="rbxasset://sounds/action_jump_land.mp3"; sound.Parent=root
local vfx = root:FindFirstChild("ContactVFX") or Instance.new("ParticleEmitter")
vfx.Name="ContactVFX"; vfx.Enabled=false; vfx.Parent=root
local sc = sound.Played:Connect(function() report.sounds += 1 end)
local active, npcRuntime
local function state(runtime, layer)
    for _, item in ipairs(runtime:GetSnapshot().layers) do if item.id==layer then return item.stateId end end
end
local function request(name)
    local ok, reason = active:Request(name); assert(ok, name .. ": " .. tostring(reason))
end
local ok, problem = xpcall(function()
    active = Controller.Attach(hero, {animationIds=animationIds, locomotion=false,
        gameplay={interaction_contact=function() report.contacts+=1 end, attack_impact=function() report.impacts+=1 end},
        onState=function(value) table.insert(report.states,value) end,
        onMarker=function(value) table.insert(report.markers,value) end,
        onWindow=function(value) table.insert(report.windows,value) end})
    task.wait(0.3)
    request("walk"); task.wait(0.35)
    request("run"); task.wait(0.35)
    request("jump"); task.wait(0.95)
    assert(state(active,"locomotion")=="fall", "Live jump did not enter fall")
    request("land"); task.wait(0.85)
    assert(state(active,"locomotion")=="idle", "Live land did not recover")
    request("equip"); task.wait(0.95)
    request("attack"); task.wait(0.45)
    request("attack"); task.wait(0.25)
    assert(state(active,"action")=="combo", "Live buffered combo failed")
    task.wait(1.15)
    request("hit_reaction"); task.wait(0.85)
    request("dodge"); task.wait(0.2)
    active:ForceCancel("action", "live_interrupt"); assert(active:Transition("ready"))
    local beforeSound = report.sounds
    request("interaction"); task.wait(0.85)
    assert(report.contacts==1 and vfx.Enabled and report.sounds>beforeSound, "Live Contact did not synchronize gameplay/sound/VFX")
    task.wait(0.8)
    assert(not vfx.Enabled, "Live effect did not clean up")
    npcRuntime = Controller.Attach(npc, {animationIds=animationIds, locomotion=false})
    assert(npcRuntime:Request("walk")); task.wait(0.4)
    assert(npcRuntime:Request("attack")); task.wait(0.45)
    report.npc = npcRuntime:GetSnapshot()
    assert(report.npc.markerCount>0 and report.npc.animatorTrackCount>=2, "Live NPC did not play layered tracks with markers")
    report.hero = active:GetSnapshot()
    assert(report.impacts==2, "Both live attacks did not produce impact callbacks")
end, debug.traceback)
if active then active:Destroy() end
if npcRuntime then npcRuntime:Destroy() end
task.wait(0.3)
if active then report.destroyed=active:GetSnapshot() end
if npcRuntime then report.npcDestroyed=npcRuntime:GetSnapshot() end
sc:Disconnect()
report.pass=ok; report.error=not ok and tostring(problem) or nil
return report
