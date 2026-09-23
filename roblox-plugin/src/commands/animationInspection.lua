-- Inspection is source-free and bounded. Studio access to a clip is not proof
-- that the published target universe can play it.
local AnimationInspection = { sequenceHash = animationSequenceHash }
function AnimationInspection.clipSummary(clip, limit)
	local markers, joints, seen = {}, {}, {}
	local duration, keyframeCount, truncated = 0, 0, false
	local descendants = clip:GetDescendants()
	for index, item in ipairs(descendants) do
		if index > 12000 then truncated = true; break end
		if item:IsA("Keyframe") then
			keyframeCount += 1
			duration = math.max(duration, item.Time)
			for _, marker in ipairs(item:GetMarkers()) do
				if #markers >= limit then truncated = true; break end
				table.insert(markers, { name = marker.Name, value = marker.Value, timeMs = math.round(item.Time * 1000) })
			end
		elseif item:IsA("Pose") and item.Weight > 0 and not seen[item.Name] then
			seen[item.Name] = true
			table.insert(joints, item.Name)
		end
	end
	table.sort(markers, function(a, b)
		if a.timeMs ~= b.timeMs then return a.timeMs < b.timeMs end
		if a.name ~= b.name then return a.name < b.name end
		return a.value < b.value
	end)
	table.sort(joints)
	local sequence = clip:IsA("KeyframeSequence")
	return {
		name = clip.Name, clipFormat = clip.ClassName, loop = clip.Loop,
		priority = clip.Priority.Name, durationMs = sequence and math.round(duration * 1000) or nil,
		keyframeCount = sequence and keyframeCount or nil,
		markers = markers, requiredJoints = joints, truncated = truncated,
		markerStatus = sequence and not truncated and "observed" or "unknown",
		sequenceHash = sequence and animationSequenceHash(clip) or nil,
	}
end

function AnimationInspection.inspectAsset(payload)
	local clip, temporary = nil, false
	if payload.sequencePath and payload.sequencePath ~= "" then
		clip = resolvePath(payload.sequencePath)
		if not clip or not clip:IsA("AnimationClip") then
			return { ok = false, code = "animation_clip_not_found", error = "The requested animation clip does not exist" }
		end
	else
		local ok, result = pcall(function()
			return game:GetService("AnimationClipProvider"):GetAnimationClipAsync("rbxassetid://" .. tostring(payload.assetId))
		end)
		if not ok then return { ok = false, code = "animation_clip_unreadable", error = tostring(result), markerStatus = "unknown", accessStatus = "unknown" } end
		clip, temporary = result, true
	end
	local ok, result = pcall(AnimationInspection.clipSummary, clip, 128)
	if temporary then clip:Destroy() end
	if not ok then return { ok = false, code = "animation_inspection_failed", error = tostring(result), markerStatus = "unknown" } end
	result.ok = true
	result.sequencePath = payload.sequencePath
	result.assetId = payload.assetId
	result.accessStatus = "unknown"
	result.evidenceSource = "studio_clip_inspection"
	return result
end

function AnimationInspection.inspectRig(payload)
	local rig = payload.rigPath and payload.rigPath ~= "" and resolvePath(payload.rigPath) or Selection:Get()[1]
	while rig and rig ~= game and not rig:IsA("Model") do rig = rig.Parent end
	if not rig or rig == game then return { ok = false, code = "animation_rig_required", error = "Select a rig Model or provide its path" } end
	local humanoid = rig:FindFirstChildOfClass("Humanoid")
	local controller = humanoid or rig:FindFirstChildOfClass("AnimationController")
	local animator = controller and controller:FindFirstChildOfClass("Animator")
	local joints, sequences, tracks, mappings = {}, {}, {}, {}
	local truncated = false
	for index, item in ipairs(rig:GetDescendants()) do
		if index > 6000 then truncated = true; break end
		if item:IsA("Motor6D") or item:IsA("Bone") or item.ClassName == "AnimationConstraint" then
			if #joints >= 256 then truncated = true; continue end
			local entry = { name = item.Name, path = fullPath(item), className = item.ClassName }
			if item:IsA("Bone") then entry.parent = item.Parent and fullPath(item.Parent) else
				pcall(function() entry.part0 = item.Part0 and fullPath(item.Part0); entry.part1 = item.Part1 and fullPath(item.Part1) end)
			end
			table.insert(joints, entry)
		elseif item:IsA("AnimationClip") then
			if #sequences >= 64 then truncated = true; continue end
			local summary = AnimationInspection.clipSummary(item, 128)
			summary.path = fullPath(item)
			table.insert(sequences, summary)
		elseif item.ClassName == "HumanoidRigDescription" or item.ClassName == "DigitsRigDescription" then
			table.insert(mappings, { className = item.ClassName, path = fullPath(item) })
		end
	end
	if animator then
		for index, track in ipairs(animator:GetPlayingAnimationTracks()) do
			if index > 64 then truncated = true; break end
			table.insert(tracks, { name = track.Name, animationId = track.Animation and track.Animation.AnimationId,
				lengthMs = math.round(track.Length * 1000), timeMs = math.round(track.TimePosition * 1000),
				speed = track.Speed, looped = track.Looped, priority = track.Priority.Name,
				weightCurrent = track.WeightCurrent, weightTarget = track.WeightTarget, playing = track.IsPlaying })
		end
	end
	local authorityMode = "unknown"
	pcall(function() authorityMode = tostring(game:GetService("Workspace").AuthorityMode) end)
	return { ok = true, rigPath = fullPath(rig), rigType = humanoid and humanoid.RigType.Name or "custom",
		controllerClass = controller and controller.ClassName, animatorPath = animator and fullPath(animator),
		joints = joints, sequences = sequences, tracks = tracks, adaptiveMappings = mappings, truncated = truncated,
		placeId = tostring(game.PlaceId), universeId = tostring(game.GameId),
		authorityMode = authorityMode, evidenceSource = "studio_rig_inspection" }
end

-- This fixed probe is deliberately separate from Edit clip inspection. Only
-- playback in a published universe's running server can provide access evidence.
function AnimationInspection.probeAsset(payload)
	local runService = game:GetService("RunService")
	local receipt = {assetId = payload.assetId, rigPath = payload.rigPath,
		universeId = tostring(game.GameId), placeId = tostring(game.PlaceId),
		running = runService:IsRunning(), isServer = runService:IsServer(),
		context = "server_play", evidenceSource = "studio_server_playback", played = false, cleanedUp = true}
	if not receipt.running or not receipt.isServer or game.GameId <= 0 or game.PlaceId <= 0 then
		receipt.ok, receipt.code, receipt.error = false, "animation_probe_context_required", "Playback probe requires a running server in a published universe"
		return receipt
	end
	if type(payload.assetId) ~= "string" or #payload.assetId > 20 or not string.match(payload.assetId, "^[1-9]%d*$")
		or type(payload.rigPath) ~= "string" or not string.match(payload.rigPath, "^Workspace/") then
		receipt.ok, receipt.code, receipt.error = false, "animation_probe_payload_invalid", "Provide a Workspace rig and numeric published asset ID"
		return receipt
	end
	local animation, track, animator
	local deadline = os.clock() + 5
	local ok, issue = pcall(function()
		local rig = resolvePath(payload.rigPath)
		assert(rig and rig:IsA("Model") and rig:IsDescendantOf(workspace), "Probe rig is missing")
		local host = rig:FindFirstChildOfClass("Humanoid") or rig:FindFirstChildOfClass("AnimationController")
		animator = host and host:FindFirstChildOfClass("Animator")
		assert(animator, "Probe requires an existing server Animator")
		animation = Instance.new("Animation")
		animation.Name = "NexusAssetPlaybackProbe"
		animation.AnimationId = "rbxassetid://" .. payload.assetId
		track = animator:LoadAnimation(animation)
		receipt.cleanedUp = false
		while track.Length <= 0 and os.clock() < deadline - 0.5 do task.wait(0.05) end
		assert(track.Length > 0, "Animation did not load before the bounded probe timeout")
		receipt.lengthMs = math.round(track.Length * 1000)
		-- Minimal weight verifies actual engine playback without taking over pose.
		track:Play(0.05, 0.001, 1)
		while track.TimePosition <= 0 and os.clock() < deadline do task.wait(0.05) end
		receipt.played = track.TimePosition > 0
		receipt.timePositionMs = math.round(track.TimePosition * 1000)
		assert(receipt.played, "Loaded track did not advance in the running server")
	end)
	local cleanupOk = true
	if track then
		cleanupOk = pcall(function() track:Stop(0.05); task.wait(0.1); track:Destroy() end)
	end
	if animation then cleanupOk = pcall(function() animation:Destroy() end) and cleanupOk end
	if track and animator then
		local inspected, absent = pcall(function()
			for _, candidate in ipairs(animator:GetPlayingAnimationTracks()) do if candidate == track then return false end end
			return true
		end)
		cleanupOk = cleanupOk and inspected and absent
	end
	receipt.cleanedUp = cleanupOk
	receipt.ok = ok and cleanupOk
	if not receipt.ok then receipt.code = cleanupOk and "animation_probe_failed" or "animation_probe_cleanup_failed"; receipt.error = tostring(issue or "Probe track cleanup failed") end
	return receipt
end

function AnimationInspection.preview(payload)
	if payload.action == "register" then
		local clip = resolvePath(payload.sequencePath)
		if not clip or not clip:IsA("AnimationClip") then return { ok = false, code = "animation_clip_not_found", error = "The preview clip does not exist" } end
		local ok, result = pcall(function() return game:GetService("AnimationClipProvider"):RegisterAnimationClip(clip) end)
		if not ok then return { ok = false, code = "animation_preview_registration_failed", error = tostring(result) } end
		return { ok = true, action = "register", animationId = result, sequencePath = fullPath(clip), previewOnly = true,
			published = false, sequenceHash = clip:IsA("KeyframeSequence") and animationSequenceHash(clip) or nil }
	end
	if payload.action ~= "attach_set" and payload.action ~= "control" and payload.action ~= "stop" and payload.action ~= "inspect" then
		return { ok = false, code = "animation_preview_action_unsupported", error = "Unsupported preview action" }
	end
	if type(payload.basePath) ~= "string" or #payload.basePath > 180 or not string.match(payload.basePath, "^ReplicatedStorage/NexusAnimations/[%w_]+$")
		or type(payload.rigPath) ~= "string" or not string.match(payload.rigPath, "^Workspace/") then
		return { ok = false, code = "animation_preview_path_invalid", error = "Preview requires a compiled NexusAnimations folder and Workspace rig" }
	end
	local ok, result = pcall(function()
		local folder, rig = resolvePath(payload.basePath), resolvePath(payload.rigPath)
		assert(folder and folder:IsA("Folder"), "Compiled preview folder does not exist")
		assert(rig and rig:IsA("Model") and rig:IsDescendantOf(workspace), "Preview rig does not exist")
		local module = folder:FindFirstChild("AnimationSetPreviewRegistry")
		assert(module and module:IsA("ModuleScript"), "Compiled preview registry is missing; redeploy this set")
		local registry = require(module)
		assert(type(registry) == "table" and type(registry.Attach) == "function" and type(registry.Control) == "function"
			and type(registry.Stop) == "function" and type(registry.Inspect) == "function", "Invalid preview registry")
		local receipt = {ok = true, action = payload.action, basePath = payload.basePath,
			rigPath = fullPath(rig), previewOnly = true, published = false}
		if payload.action == "attach_set" then
			assert(game:GetService("RunService"):IsStudio() and not game:GetService("RunService"):IsRunning(), "Preview requires Studio Edit mode")
			assert(type(payload.resources) == "table" and #payload.resources >= 1 and #payload.resources <= 64, "Preview requires 1–64 resources")
			local config = require(folder:FindFirstChild("AnimationSetConfig"))
			local known, ids, registered = {}, {}, {}
			for _, resource in ipairs(config.resources) do known[resource.id] = resource end
			for _, resource in ipairs(payload.resources) do
				local definition = known[resource.resourceId]
				assert(definition and not ids[resource.resourceId], "Unknown or duplicate preview resource")
				if resource.sequencePath then
					local clip = resolvePath(resource.sequencePath)
					assert(clip and clip:IsA("KeyframeSequence"), "Preview sequence does not exist")
					local observed = AnimationInspection.clipSummary(clip, 128)
					assert(not observed.truncated, "Preview sequence exceeds inspection limits")
					for _, expected in ipairs(definition.markers or {}) do
						local found = false
						for _, marker in ipairs(observed.markers) do
							if marker.name == expected.name and marker.timeMs == expected.timeMs and marker.value == (expected.value or "") then found = true; break end
						end
						assert(found, "Preview sequence marker differs from compiled configuration: " .. expected.name)
					end
					ids[resource.resourceId] = game:GetService("AnimationClipProvider"):RegisterAnimationClip(clip)
					table.insert(registered, {resourceId = resource.resourceId, animationId = ids[resource.resourceId], sequencePath = fullPath(clip), sequenceHash = observed.sequenceHash})
				else
					assert(type(resource.assetId) == "string" and string.match(resource.assetId, "^[1-9]%d*$") and #resource.assetId <= 20, "Invalid published preview asset ID")
					assert(tostring(definition.robloxAssetId) == resource.assetId, "Published preview ID differs from compiled resource")
					ids[resource.resourceId] = "rbxassetid://" .. resource.assetId
				end
			end
			for resourceId in pairs(known) do assert(ids[resourceId], "Preview resource is unresolved: " .. resourceId) end
			receipt.snapshot = registry.Attach(rig, {animationIds = ids, lifetimeSeconds = payload.lifetimeSeconds})
			receipt.registrations = registered
		elseif payload.action == "control" then
			receipt.accepted, receipt.reason, receipt.snapshot = registry.Control(rig, payload)
		elseif payload.action == "stop" then receipt.snapshot = registry.Stop(rig, "requested")
		else receipt.snapshot = registry.Inspect(rig) end
		return receipt
	end)
	if not ok then return {ok = false, code = "animation_preview_failed", error = tostring(result)} end
	return result
end
