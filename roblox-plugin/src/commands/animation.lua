local R15_ANIMATION_PARTS = {
	"Head",
	"UpperTorso",
	"LowerTorso",
	"LeftUpperArm",
	"LeftLowerArm",
	"LeftHand",
	"RightUpperArm",
	"RightLowerArm",
	"RightHand",
	"LeftUpperLeg",
	"LeftLowerLeg",
	"LeftFoot",
	"RightUpperLeg",
	"RightLowerLeg",
	"RightFoot",
}

local R15_POSE_PARENT = {
	LowerTorso = "HumanoidRootPart",
	UpperTorso = "LowerTorso",
	Head = "UpperTorso",
	LeftUpperArm = "UpperTorso",
	LeftLowerArm = "LeftUpperArm",
	LeftHand = "LeftLowerArm",
	RightUpperArm = "UpperTorso",
	RightLowerArm = "RightUpperArm",
	RightHand = "RightLowerArm",
	LeftUpperLeg = "LowerTorso",
	LeftLowerLeg = "LeftUpperLeg",
	LeftFoot = "LeftLowerLeg",
	RightUpperLeg = "LowerTorso",
	RightLowerLeg = "RightUpperLeg",
	RightFoot = "RightLowerLeg",
}

local animationFailure, findR15Rig, resolveAnimationRig, quaternionCFrame, poseSignature, addPose, buildKeyframe

animationFailure = function(code, message, details)
	local result = details or {}
	result.ok = false
	result.success = false
	result.code = code
	result.error = tostring(message or "Animation command failed")
	result.retryable = false
	return result
end

findR15Rig = function(candidate)
	local current = candidate
	while current and current ~= game do
		if current:IsA("Model") then
			local humanoid = current:FindFirstChildOfClass("Humanoid")
			local valid = humanoid == nil or humanoid.RigType == Enum.HumanoidRigType.R15
			if valid and current:FindFirstChild("HumanoidRootPart", true) then
				for _, partName in ipairs(R15_ANIMATION_PARTS) do
					local part = current:FindFirstChild(partName, true)
					if not part or not part:IsA("BasePart") then
						valid = false
						break
					end
				end
				if valid then return current end
			end
		end
		current = current.Parent
	end
	return nil
end

resolveAnimationRig = function(payload)
	local requestedPath = tostring(payload.rigPath or "")
	if requestedPath ~= "" then
		return findR15Rig(resolvePath(requestedPath)), requestedPath
	end
	local selected = Selection:Get()
	local candidate = selected[1]
	return findR15Rig(candidate), candidate and fullPath(candidate) or ""
end

quaternionCFrame = function(value)
	if type(value) ~= "table" or #value ~= 4 then return CFrame.new() end
	local x = tonumber(value[1]) or 0
	local y = tonumber(value[2]) or 0
	local z = tonumber(value[3]) or 0
	local w = tonumber(value[4]) or 1
	local length = math.sqrt(x * x + y * y + z * z + w * w)
	if length <= 0.000001 then return CFrame.new() end
	x, y, z, w = x / length, y / length, z / length, w / length
	local xx, yy, zz = x * x, y * y, z * z
	local xy, xz, yz = x * y, x * z, y * z
	local xw, yw, zw = x * w, y * w, z * w
	return CFrame.new(
		0, 0, 0,
		1 - 2 * (yy + zz), 2 * (xy - zw), 2 * (xz + yw),
		2 * (xy + zw), 1 - 2 * (xx + zz), 2 * (yz - xw),
		2 * (xz - yw), 2 * (yz + xw), 1 - 2 * (xx + yy)
	)
end

poseSignature = function(pose, pieces)
	local components = { pose.CFrame:GetComponents() }
	local formatted = {}
	for index, component in ipairs(components) do
		formatted[index] = string.format("%.6f", component)
	end
	table.insert(pieces, table.concat({
		fullPath(pose),
		table.concat(formatted, ","),
		tostring(pose.Weight),
		tostring(pose.EasingStyle),
		tostring(pose.EasingDirection),
	}, "|"))
end

local function animationSequenceHash(sequence)
	if not sequence or not sequence:IsA("KeyframeSequence") then return nil end
	local pieces = { sequence.Name, tostring(sequence.Loop), tostring(sequence.Priority) }
	local keyframes = {}
	for _, child in ipairs(sequence:GetChildren()) do
		if child:IsA("Keyframe") then table.insert(keyframes, child) end
	end
	table.sort(keyframes, function(a, b)
		if a.Time == b.Time then return a.Name < b.Name end
		return a.Time < b.Time
	end)
	for _, keyframe in ipairs(keyframes) do
		table.insert(pieces, string.format("time:%.6f", keyframe.Time))
		local poses = {}
		for _, descendant in ipairs(keyframe:GetDescendants()) do
			if descendant:IsA("Pose") then table.insert(poses, descendant) end
		end
		table.sort(poses, function(a, b) return fullPath(a) < fullPath(b) end)
		for _, pose in ipairs(poses) do poseSignature(pose, pieces) end
	end
	return stableHash(table.concat(pieces, "\n"))
end

addPose = function(parent, name, transform, easingStyle, easingDirection)
	local pose = Instance.new("Pose")
	pose.Name = name
	pose.Weight = 1
	pose.CFrame = quaternionCFrame(transform and transform.rotation)
	pose.EasingStyle = Enum.PoseEasingStyle[easingStyle] or Enum.PoseEasingStyle.Cubic
	pose.EasingDirection = Enum.PoseEasingDirection[easingDirection] or Enum.PoseEasingDirection.InOut
	parent:AddSubPose(pose)
	return pose
end

buildKeyframe = function(frame)
	local keyframe = Instance.new("Keyframe")
	keyframe.Time = (tonumber(frame.timeMs) or 0) / 1000
	local rootPose = Instance.new("Pose")
	rootPose.Name = "HumanoidRootPart"
	rootPose.Weight = 0
	keyframe:AddPose(rootPose)
	local poses = { HumanoidRootPart = rootPose }
	for _, jointName in ipairs(R15_ANIMATION_PARTS) do
		local parentName = R15_POSE_PARENT[jointName]
		local parent = poses[parentName]
		if not parent then error("Missing R15 pose parent for " .. tostring(jointName)) end
		poses[jointName] = addPose(
			parent,
			jointName,
			(frame.joints or {})[jointName],
			tostring(frame.easingStyle or "Cubic"),
			tostring(frame.easingDirection or "InOut")
		)
	end
	return keyframe
end

local function createAnimationSequence(payload)
	local rig, requestedPath = resolveAnimationRig(payload)
	if not rig then
		return animationFailure(
			"r15_rig_required",
			"Select a complete R15 rig in Studio before applying this animation",
			{ requestedRigPath = requestedPath }
		)
	end
	local name = tostring(payload.name or "Nexus Animation")
	local animSaves = rig:FindFirstChild("AnimSaves")
	if animSaves and not animSaves:IsA("Folder") then
		return animationFailure("animation_folder_conflict", "The rig already has a non-Folder child named AnimSaves", {
			rigPath = fullPath(rig),
		})
	end
	local existing = animSaves and animSaves:FindFirstChild(name) or nil
	if existing and not existing:IsA("KeyframeSequence") then
		return animationFailure("animation_name_conflict", "An incompatible instance already uses this animation name", {
			path = fullPath(existing),
		})
	end
	if existing then
		local currentHash = animationSequenceHash(existing)
		local expectedHash = tostring(payload.expectedSequenceHash or "")
		if expectedHash == "" then
			return animationFailure("animation_sequence_hash_required", "Inspect the existing animation before replacing it", {
				path = fullPath(existing),
				currentSequenceHash = currentHash,
			})
		end
		if expectedHash ~= currentHash then
			return animationFailure("animation_sequence_conflict", "The existing animation changed after it was inspected", {
				path = fullPath(existing),
				expectedSequenceHash = expectedHash,
				currentSequenceHash = currentHash,
			})
		end
	end

	local rigPath = fullPath(rig)
	local animSavesPath = rigPath .. "/AnimSaves"
	local sequencePath = animSavesPath .. "/" .. name
	local snapshots = {}
	if not animSaves then table.insert(snapshots, snapshotInstance(animSavesPath)) end
	if existing then appendSnapshotTree(existing, snapshots) else table.insert(snapshots, snapshotInstance(sequencePath)) end

	local ok, sequenceOrError = pcall(function()
		if not animSaves then
			animSaves = Instance.new("Folder")
			animSaves.Name = "AnimSaves"
			animSaves.Parent = rig
		end
		if existing then existing:Destroy() end
		local sequence = Instance.new("KeyframeSequence")
		sequence.Name = name
		sequence.Loop = payload.loop == true
		sequence.Priority = Enum.AnimationPriority[tostring(payload.priority or "Action")] or Enum.AnimationPriority.Action
		sequence:SetAttribute("NexusGenerated", true)
		sequence:SetAttribute("NexusAnimationSchemaVersion", tonumber(payload.animationSchemaVersion) or 1)
		sequence:SetAttribute("NexusAnimationContentHash", tostring(payload.contentHash or ""))
		sequence:SetAttribute("NexusSourceAnimationHash", tostring(payload.sourceContentHash or ""))
		for _, frame in ipairs(payload.keyframes or {}) do sequence:AddKeyframe(buildKeyframe(frame)) end
		sequence.Parent = animSaves
		return sequence
	end)
	if not ok then
		return rollbackMutation(snapshots, "create_animation_sequence_failed", tostring(sequenceOrError), {
			path = sequencePath,
			rigPath = rigPath,
		})
	end
	local sequence = sequenceOrError
	return {
		ok = true,
		path = fullPath(sequence),
		rigPath = rigPath,
		className = sequence.ClassName,
		keyframeCount = #(payload.keyframes or {}),
		durationMs = tonumber(payload.durationMs) or 0,
		sequenceHash = animationSequenceHash(sequence),
		contentHash = tostring(payload.contentHash or ""),
		snapshots = snapshots,
	}
end
