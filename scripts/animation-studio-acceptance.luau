-- Executed against real Studio instances by verify-animation-studio.mjs.
-- The harness supplies folder and animationIds from the actual compiler/deploy receipts.
local Controller = require(folder.AnimationSetController)
local config = require(folder.AnimationSetConfig)
local fixture = workspace.NexusAnimationProof
local rig = fixture.Hero
local animator = rig.Humanoid.Animator
local root = rig.HumanoidRootPart
local sound = root:FindFirstChild("ContactSound") or Instance.new("Sound")
sound.Name = "ContactSound"; sound.SoundId = "rbxasset://sounds/action_jump_land.mp3"; sound.Parent = root
local vfx = root:FindFirstChild("ContactVFX") or Instance.new("ParticleEmitter")
vfx.Name = "ContactVFX"; vfx.Enabled = false; vfx.Rate = 20; vfx.Parent = root
local results = {states={}, markers={}, windows={}, events={}, soundPlayed=0, gameplayContacts=0, gameplayImpacts=0, isServer=game:GetService("RunService"):IsServer()}
local soundConnection = sound.Played:Connect(function() results.soundPlayed += 1 end)
local active, npc
local function stateOf(runtime, id)
    for _, layer in ipairs(runtime:GetSnapshot().layers) do if layer.id == id then return layer.stateId end end
end
local function step(seconds, runtime, targetAnimator)
    runtime = runtime or active; targetAnimator = targetAnimator or animator
    local remaining = seconds
    while remaining > 0.00001 do
        local dt = math.min(0.05, remaining)
        targetAnimator:StepAnimations(dt)
        task.wait()
        runtime:Update(dt)
        remaining -= dt
    end
end
local function request(name)
    local ok, reason = active:Request(name)
    assert(ok, name .. " rejected: " .. tostring(reason))
end
local success, failure = xpcall(function()
    active = Controller.Attach(rig, {animationIds=animationIds, autoUpdate=false, locomotion=false,
        gameplay={interaction_contact=function() results.gameplayContacts += 1 end, attack_impact=function() results.gameplayImpacts += 1 end},
        onState=function(event) if #results.states<64 then table.insert(results.states, event) end end,
        onMarker=function(event) if #results.markers<64 then table.insert(results.markers, event) end end,
        onWindow=function(event) if #results.windows<64 then table.insert(results.windows, event) end end,
        onEvent=function(event) if #results.events<64 then table.insert(results.events, event) end end,
    })
    step(0.3)
    assert(stateOf(active, "locomotion") == "idle", "Initial idle missing")
    request("walk"); step(0.05)
    results.walkBlend = active:GetSnapshot()
    assert(results.walkBlend.activeTrackCount == 2, "Expected simultaneous outgoing and incoming locomotion tracks")
    request("run"); step(0.25)
    assert(stateOf(active, "locomotion") == "run", "Run transition failed")
    local movingJoints = 0
    for _, joint in ipairs(rig:GetDescendants()) do
        if joint:IsA("Motor6D") or joint:IsA("Bone") or joint.ClassName == "AnimationConstraint" then
            local ok, transform = pcall(function() return joint.Transform end)
            if ok and transform ~= CFrame.identity then movingJoints += 1 end
        end
    end
    results.animatedJoints = movingJoints
    assert(movingJoints > 0, "Tracks did not move actual rig joints")
    request("jump"); step(0.85)
    assert(stateOf(active, "locomotion") == "fall", "Jump completion did not enter fall")
    request("land"); step(0.8)
    assert(stateOf(active, "locomotion") == "idle", "Land completion did not return to idle")
    results.locomotion = true

    request("equip"); step(0.9)
    assert(stateOf(active, "action") == "ready", "Equip did not recover")
    request("attack"); step(0.45)
    assert(vfx.Enabled, "Impact did not enable actual ParticleEmitter")
    results.attackAtImpact = active:GetSnapshot()
    step(0.03); request("attack"); step(0.15)
    assert(stateOf(active, "action") == "combo", "Buffered combo did not consume ComboOpen marker")
    step(1.3)
    assert(stateOf(active, "action") == "ready", "Combo did not recover")
    assert(not vfx.Enabled, "Action completion leaked enabled VFX")
    request("hit_reaction"); step(0.8)
    request("dodge"); step(0.12)
    results.dodge = active:GetSnapshot()
    active:ForceCancel("action", "acceptance_interrupt")
    assert(stateOf(active, "action") == nil, "Interrupted dodge remained active")
    assert(active:Transition("ready"))
    step(0.2)
    results.combat = true

    local soundsBefore = results.soundPlayed
    request("interaction"); step(0.8)
    assert(vfx.Enabled, "Contact marker did not enable actual VFX")
    assert(results.soundPlayed > soundsBefore, "Contact marker did not play actual Sound")
    assert(results.gameplayContacts == 1, "Contact marker did not call server interaction callback")
    results.interactionAtContact = active:GetSnapshot()
    step(0.9)
    assert(not vfx.Enabled, "Interaction completion leaked VFX")
    results.interaction = true

    request("attack"); step(0.05)
    assert(active:SetSpeed("action", 2))
    step(0.25)
    results.speed = active:GetSnapshot()
    local sped = false
    for _, track in ipairs(results.speed.tracks) do if track.resourceId == "attack" and track.isPlaying then sped = track.speed == 2 end end
    assert(sped, "AdjustSpeed did not affect the real track")
    active:ForceCancel("action", "replacement_setup"); step(0.2)
    assert(active:Transition("ready"))
    local attack
    for _, resource in ipairs(config.resources) do if resource.id == "attack" then attack = table.clone(resource) end end
    assert(active:ReplaceResource("attack", attack, animationIds.attack))
    request("attack"); step(1.5)
    results.beforeRepeated = active:GetSnapshot()
    for index = 1, 25 do request("attack"); step(1.5) end
    results.afterRepeated = active:GetSnapshot()
    assert(results.afterRepeated.cachedTrackCount == results.beforeRepeated.cachedTrackCount, "Repeated actions grew track cache")
    assert(results.afterRepeated.connectionCount == results.beforeRepeated.connectionCount, "Repeated actions grew connections")
    assert(results.afterRepeated.loadedTotal == results.beforeRepeated.loadedTotal, "Repeated actions loaded new tracks")
    assert(results.afterRepeated.activeTrackCount <= 2, "Completed attacks remained active")
    results.repeatedActions = 25

    local npcAnimator = fixture.NPC.AnimationController.Animator
    npc = Controller.Attach(fixture.NPC, {animationIds=animationIds, autoUpdate=false, locomotion=false})
    step(0.3, npc, npcAnimator)
    assert(npc:Request("walk")); step(0.3, npc, npcAnimator)
    assert(npc:Request("attack")); step(0.4, npc, npcAnimator)
    results.npc = npc:GetSnapshot()
    assert(stateOf(npc, "locomotion") == "walk" and stateOf(npc, "action") == "attack", "AnimationController rig did not play layered states")
    assert(results.npc.markerCount > 0, "NPC marker signals were not observed")
    npc:Destroy(); for _ = 1, 8 do npcAnimator:StepAnimations(0.05); task.wait() end
    results.npcDestroyed = npc:GetSnapshot()
    active:Destroy(); for _ = 1, 8 do animator:StepAnimations(0.05); task.wait() end
    results.destroyed = active:GetSnapshot()
    assert(results.destroyed.connectionCount == 0 and results.destroyed.cachedTrackCount == 0, "Destroy retained owned resources")
    assert(results.destroyed.animatorTrackCount == 0, "Animator retains playing tracks after destroy and fade drain")
end, debug.traceback)
if active and not active.destroyed then results.failureSnapshot = active:GetSnapshot(); active:Destroy(); animator:StepAnimations(0.3) end
if npc and not npc.destroyed then npc:Destroy(); fixture.NPC.AnimationController.Animator:StepAnimations(0.3) end
soundConnection:Disconnect()
results.pass = success; results.error = not success and tostring(failure) or nil
return results
