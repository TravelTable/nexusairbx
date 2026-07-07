local function vectorTable(v)
	return { x = v.X, y = v.Y, z = v.Z }
end

local function isFiniteNumber(value)
	return type(value) == "number" and value == value and value ~= math.huge and value ~= -math.huge
end

local function isDescendantOrSelf(inst, root)
	return inst == root or inst:IsDescendantOf(root)
end

local function addValidationIssue(issues, severity, code, inst, message, recommendation)
	table.insert(issues, {
		severity = severity,
		code = code,
		targetPath = inst and fullPath(inst) or "",
		message = tostring(message or code),
		recommendation = recommendation or "",
	})
end

local function validationTarget(payload)
	local target = payload.target or {}
	if target.type == "entire_project" then
		return game, "entire_project", ""
	end
	local path = tostring(target.path or target.modelPath or payload.modelPath or "")
	if path == "" then
		return nil, tostring(target.type or "unknown"), "Validation target path is missing."
	end
	local root = resolvePath(path)
	if not root then
		return nil, tostring(target.type or "unknown"), "Validation target does not exist in Studio."
	end
	return root, tostring(target.type or "unknown"), ""
end

local function validationBounds(root)
	local center = { x = 0, y = 0, z = 0 }
	local size = { x = 0, y = 0, z = 0 }
	local ok, cf, boxSize = pcall(function()
		if root:IsA("Model") then
			return root:GetBoundingBox()
		elseif root:IsA("BasePart") then
			return root.CFrame, root.Size
		else
			local model = Instance.new("Model")
			for _, child in ipairs(root:GetChildren()) do
				if child:IsA("PVInstance") then
					child:Clone().Parent = model
				end
			end
			if #model:GetChildren() == 0 then
				model:Destroy()
				return CFrame.new(), Vector3.new()
			end
			local nextCf, nextSize = model:GetBoundingBox()
			model:Destroy()
			return nextCf, nextSize
		end
	end)
	if ok and cf and boxSize then
		center = vectorTable(cf.Position)
		size = vectorTable(boxSize)
	end
	return {
		center = center,
		size = size,
		lowestPoint = center.y - (size.y / 2),
		highestPoint = center.y + (size.y / 2),
		distanceFromOrigin = math.sqrt((center.x * center.x) + (center.y * center.y) + (center.z * center.z)),
	}
end

local function runProjectValidation(payload)
	payload = payload or {}
	local root, targetType, targetError = validationTarget(payload)
	local issues = {}
	if not root then
		addValidationIssue(issues, "error", "VALIDATION_TARGET_NOT_FOUND", nil, targetError)
		return {
			ok = false,
			checksRun = 1,
			passed = 0,
			issues = issues,
			diagnostics = issues,
			counts = {},
			bounds = nil,
			rulesVersion = tostring(payload.rulesVersion or "studio-validation-1"),
		}
	end

	local target = payload.target or {}
	local checks = payload.checks or {}
	local limits = payload.limits or {}
	local visualOnly = payload.visualOnly == true and targetType ~= "entire_project"
	local maxDescendants = math.clamp(tonumber(limits.maxDescendants) or 1000, 20, 10000)
	local maxTreeDepth = math.clamp(tonumber(limits.maxTreeDepth) or NATIVE_MODEL_LIMITS.maxTreeDepth, 1, 64)
	local diagnosticLimit = math.clamp(tonumber(payload.diagnosticLimit or limits.diagnosticLimit) or 500, 10, 1000)
	local descendants = root == game and game:GetDescendants() or root:GetDescendants()
	local counts = {
		descendants = #descendants,
		models = root:IsA("Model") and 1 or 0,
		folders = root:IsA("Folder") and 1 or 0,
		baseParts = root:IsA("BasePart") and 1 or 0,
		meshParts = root:IsA("MeshPart") and 1 or 0,
		constraints = 0,
		attachments = 0,
		lights = 0,
		particleEmitters = 0,
		decals = 0,
		textures = 0,
		sounds = 0,
		scripts = 0,
		remotes = 0,
		bindables = 0,
		humanoids = 0,
		seats = 0,
		unanchoredParts = 0,
		anchoredParts = 0,
		collisionEnabledParts = 0,
		touchEnabledParts = 0,
		queryEnabledParts = 0,
	}
	local managedIds = {}
	local maxDepthSeen = 0
	local materialSet = {}

	if counts.descendants > maxDescendants then
		addValidationIssue(issues, "error", "VALIDATION_TARGET_TOO_LARGE", root, "Validation target exceeds configured object-count limits.", "Split the target or validate the specific model instead of the entire project.")
	end

	local function depthOf(inst)
		local depth = 0
		local current = inst
		while current and current ~= root do
			depth = depth + 1
			current = current.Parent
		end
		return depth
	end

	local function visit(inst)
		local depth = depthOf(inst)
		if depth > maxDepthSeen then
			maxDepthSeen = depth
		end
		if depth > maxTreeDepth then
			addValidationIssue(issues, "warning", "TREE_DEPTH_EXCEEDED", inst, "Instance hierarchy is deeper than the configured validation limit.", "Review the model hierarchy for accidental nesting.")
		end
		if #inst.Name > 100 then
			addValidationIssue(issues, "warning", "NAME_TOO_LONG", inst, "Instance name is unusually long.", "Use shorter instance names for easier Studio maintenance.")
		end
		local attrs = attributesOf(inst)
		local attrCount = 0
		for key in pairs(attrs) do
			attrCount = attrCount + 1
			if #tostring(key) > 100 then
				addValidationIssue(issues, "warning", "ATTRIBUTE_NAME_TOO_LONG", inst, "An attribute name is unusually long.")
			end
		end
		if attrCount > 40 then
			addValidationIssue(issues, "warning", "ATTRIBUTE_COUNT_HIGH", inst, "Instance has many attributes.", "Remove metadata that is not needed at runtime.")
		end
		local tags = CollectionService:GetTags(inst)
		if #tags > 40 then
			addValidationIssue(issues, "warning", "TAG_COUNT_HIGH", inst, "Instance has many tags.", "Remove tags that are not needed for gameplay or tooling.")
		end
		local nexusId = inst:GetAttribute("NexusInstanceId")
		if nexusId then
			local key = tostring(nexusId)
			if managedIds[key] then
				addValidationIssue(issues, "error", "DUPLICATE_MANAGED_ID", inst, "Duplicate NexusInstanceId detected.", "Regenerate or repair the managed model metadata.")
			else
				managedIds[key] = true
			end
		end
		if inst:IsA("Model") then
			counts.models = counts.models + 1
		elseif inst:IsA("Folder") then
			counts.folders = counts.folders + 1
		end
		if inst:IsA("BasePart") then
			counts.baseParts = counts.baseParts + 1
			if inst:IsA("MeshPart") then
				counts.meshParts = counts.meshParts + 1
			end
			if inst:IsA("Seat") or inst:IsA("VehicleSeat") then
				counts.seats = counts.seats + 1
				if inst:IsA("VehicleSeat") then
					addValidationIssue(issues, "warning", "UNEXPECTED_VEHICLE_SEAT", inst, "VehicleSeat found in validation target.", "Confirm this model is intended to contain vehicle controls.")
				end
			end
			if inst.Anchored then
				counts.anchoredParts = counts.anchoredParts + 1
			else
				counts.unanchoredParts = counts.unanchoredParts + 1
			end
			if inst.CanCollide then
				counts.collisionEnabledParts = counts.collisionEnabledParts + 1
			end
			if inst.CanTouch then
				counts.touchEnabledParts = counts.touchEnabledParts + 1
			end
			if inst.CanQuery then
				counts.queryEnabledParts = counts.queryEnabledParts + 1
			end
			materialSet[tostring(inst.Material)] = true
			local pos = inst.Position
			local size = inst.Size
			if not (isFiniteNumber(pos.X) and isFiniteNumber(pos.Y) and isFiniteNumber(pos.Z) and isFiniteNumber(size.X) and isFiniteNumber(size.Y) and isFiniteNumber(size.Z)) then
				addValidationIssue(issues, "error", "INVALID_TRANSFORM", inst, "BasePart has a non-finite transform or size.", "Reset the part transform and size in Studio.")
			end
			if size.X <= 0 or size.Y <= 0 or size.Z <= 0 then
				addValidationIssue(issues, "error", "INVALID_PART_SIZE", inst, "BasePart has a non-positive dimension.", "Set all part dimensions to positive finite values.")
			end
			if math.abs(pos.X) > 50000 or math.abs(pos.Y) > 50000 or math.abs(pos.Z) > 50000 then
				addValidationIssue(issues, "warning", "PART_FAR_FROM_ORIGIN", inst, "Part is very far from the world origin.", "Move the model closer to the intended play area.")
			end
			if not inst.Anchored and visualOnly then
				addValidationIssue(issues, "warning", "UNANCHORED_DECORATIVE_PART", inst, "Visual-only target contains an unanchored part.", "Anchor decorative parts unless physics is intentional.")
			end
		end
		if SCRIPT_CLASSES[inst.ClassName] then
			counts.scripts = counts.scripts + 1
			if visualOnly then
				addValidationIssue(issues, "critical", "UNEXPECTED_EXECUTABLE_CONTENT", inst, "Visual-only validation target contains executable Luau.", "Remove the script or validate it as part of an explicit project-level review.")
			end
		end
		if NETWORKING_CLASSES[inst.ClassName] then
			if inst.ClassName == "RemoteEvent" or inst.ClassName == "RemoteFunction" or inst.ClassName == "UnreliableRemoteEvent" then
				counts.remotes = counts.remotes + 1
			else
				counts.bindables = counts.bindables + 1
			end
			if visualOnly then
				addValidationIssue(issues, "critical", "UNEXPECTED_NETWORKING_OBJECT", inst, "Visual-only validation target contains a networking or bindable object.", "Remove unexpected remotes or validate the containing project explicitly.")
			end
		end
		if inst:IsA("Constraint") then
			counts.constraints = counts.constraints + 1
			local ok0, a0 = pcall(function() return inst.Attachment0 end)
			local ok1, a1 = pcall(function() return inst.Attachment1 end)
			if (ok0 and a0 and not isDescendantOrSelf(a0, root)) or (ok1 and a1 and not isDescendantOrSelf(a1, root)) then
				addValidationIssue(issues, "error", "BROKEN_CONSTRAINT_REFERENCE", inst, "Constraint references an attachment outside the validation target.", "Repair the constraint attachments or include the referenced objects in the target.")
			end
		end
		if inst:IsA("WeldConstraint") then
			counts.constraints = counts.constraints + 1
			if (inst.Part0 and not isDescendantOrSelf(inst.Part0, root)) or (inst.Part1 and not isDescendantOrSelf(inst.Part1, root)) then
				addValidationIssue(issues, "error", "BROKEN_CONSTRAINT_REFERENCE", inst, "WeldConstraint references a part outside the validation target.", "Repair the weld parts or include the referenced objects in the target.")
			end
		end
		if inst:IsA("Attachment") then
			counts.attachments = counts.attachments + 1
		end
		if NATIVE_LIGHT_CLASSES[inst.ClassName] then
			counts.lights = counts.lights + 1
		end
		if inst:IsA("ParticleEmitter") then
			counts.particleEmitters = counts.particleEmitters + 1
		end
		if inst:IsA("Decal") then
			counts.decals = counts.decals + 1
			local texture = tostring(inst.Texture or "")
			if texture ~= "" and not string.match(texture, "^rbxassetid://%d+$") and not string.match(texture, "^%d+$") then
				addValidationIssue(issues, "warning", "UNEXPECTED_ASSET_REFERENCE", inst, "Decal texture is not a simple Roblox asset ID.", "Verify the texture reference is accessible in Studio.")
			end
		end
		if inst:IsA("Texture") then
			counts.textures = counts.textures + 1
			local texture = tostring(inst.Texture or "")
			if texture ~= "" and not string.match(texture, "^rbxassetid://%d+$") and not string.match(texture, "^%d+$") then
				addValidationIssue(issues, "warning", "UNEXPECTED_ASSET_REFERENCE", inst, "Texture reference is not a simple Roblox asset ID.", "Verify the texture reference is accessible in Studio.")
			end
		end
		if inst:IsA("Sound") then
			counts.sounds = counts.sounds + 1
			local soundId = tostring(inst.SoundId or "")
			if soundId ~= "" and not string.match(soundId, "^rbxassetid://%d+$") and not string.match(soundId, "^%d+$") then
				addValidationIssue(issues, "warning", "UNEXPECTED_ASSET_REFERENCE", inst, "SoundId is not a simple Roblox asset ID.", "Verify the sound reference is accessible in Studio.")
			end
		end
		if inst:IsA("ObjectValue") and inst.Value and visualOnly and not isDescendantOrSelf(inst.Value, root) then
			addValidationIssue(issues, "warning", "EXTERNAL_OBJECT_REFERENCE", inst, "ObjectValue points outside the validation target.", "Confirm this reference is intentional.")
		end
		if inst:IsA("Humanoid") then
			counts.humanoids = counts.humanoids + 1
		end
	end

	visit(root)
	for _, inst in ipairs(descendants) do
		if #issues >= diagnosticLimit then
			break
		end
		visit(inst)
	end

	local uniqueMaterials = 0
	for _ in pairs(materialSet) do
		uniqueMaterials = uniqueMaterials + 1
	end
	counts.uniqueMaterials = uniqueMaterials

	local bounds = validationBounds(root)
	if checks.managedIdentity ~= false and visualOnly then
		local managed = root:GetAttribute("NexusManaged") == true or root:GetAttribute("NexusGenerated") == true
		local expectedModelId = tostring(target.modelId or "")
		local actualModelId = tostring(root:GetAttribute("NexusModelId") or "")
		if not managed then
			addValidationIssue(issues, "warning", "MISSING_MANAGED_METADATA", root, "Expected NexusRBX managed metadata is missing.", "Reinsert or inspect the model through NexusRBX before relying on receipt-based validation.")
		end
		if expectedModelId ~= "" and actualModelId ~= "" and expectedModelId ~= actualModelId then
			addValidationIssue(issues, "error", "MANAGED_IDENTITY_MISMATCH", root, "Managed model ID does not match the validation receipt.", "Validate the model created by the matching NexusRBX receipt.")
		end
	end
	if counts.baseParts == 0 and visualOnly then
		addValidationIssue(issues, "error", "NO_USABLE_VISUAL_CONTENT", root, "Validation target contains no usable BaseParts.", "Reinsert or rebuild the model.")
	end
	if counts.anchoredParts == 0 and counts.baseParts > 0 and visualOnly then
		addValidationIssue(issues, "error", "NO_ANCHORED_STRUCTURE", root, "Static visual target has no anchored structural parts.", "Anchor the structural parts unless physics is intentional.")
	end
	if counts.meshParts > 0 and counts.meshParts == counts.collisionEnabledParts then
		addValidationIssue(issues, "warning", "DECORATIVE_COLLISION_ENABLED", root, "Every MeshPart has collision enabled.", "Disable collision on decorative MeshParts when players do not need to stand on them.")
	end
	if counts.touchEnabledParts > 100 then
		addValidationIssue(issues, "warning", "TOUCH_EVENTS_HIGH", root, "Many parts have CanTouch enabled.", "Disable touch on decorative parts that do not need touch events.")
	end
	if counts.descendants > 1000 then
		addValidationIssue(issues, "warning", "DESCENDANT_COUNT_HIGH", root, "Validation target has more than 1,000 descendants.", "Review whether the model can be simplified.")
	end
	if counts.baseParts > 500 then
		addValidationIssue(issues, "warning", "BASE_PART_COUNT_HIGH", root, "Validation target has more than 500 BaseParts.", "Consider simplifying geometry.")
	end
	if counts.constraints > 250 then
		addValidationIssue(issues, "warning", "CONSTRAINT_COUNT_HIGH", root, "Validation target has more than 250 constraints.", "Review whether all constraints are needed.")
	end
	if bounds.distanceFromOrigin > 50000 then
		addValidationIssue(issues, "warning", "MODEL_FAR_FROM_ORIGIN", root, "Target bounds are very far from the world origin.", "Move the model closer to the intended play area.")
	end
	if bounds.size.x > 4096 or bounds.size.y > 4096 or bounds.size.z > 4096 then
		addValidationIssue(issues, "warning", "EXTREME_BOUNDS", root, "Target bounding box is extremely large.", "Review accidental distant parts or oversized geometry.")
	end

	local errors = 0
	local critical = 0
	for _, issue in ipairs(issues) do
		if issue.severity == "error" then
			errors = errors + 1
		elseif issue.severity == "critical" then
			critical = critical + 1
		end
	end
	local ok = errors == 0 and critical == 0
	local checksRun = 0
	for _, enabled in pairs(checks) do
		if enabled == true then
			checksRun = checksRun + 1
		end
	end
	if checksRun == 0 then
		checksRun = 1
	end
	return {
		ok = ok,
		checksRun = checksRun,
		passed = ok and checksRun or math.max(0, checksRun - errors - critical),
		target = { type = targetType, path = root == game and "" or fullPath(root), name = root.Name },
		counts = counts,
		bounds = bounds,
		issues = issues,
		diagnostics = issues,
		rulesVersion = tostring(payload.rulesVersion or "studio-validation-1"),
		summary = {
			checksRun = checksRun,
			passed = ok and checksRun or math.max(0, checksRun - errors - critical),
			errors = errors,
			critical = critical,
		},
	}
end

local function collectDiagnostics(payload)
	return runProjectValidation(payload or {})
end

-- Output/log observer. LogService.MessageOut fires in the edit-context plugin for
-- messages printed during Play Solo, so we keep a capped ring buffer and merge it
-- with LogService:GetLogHistory() (which also includes pre-connection messages).
local outputLogBuffer, OUTPUT_LOG_LIMIT, LOG_MESSAGE_LEVEL = {}, 500, {
	[Enum.MessageType.MessageOutput] = "output",
	[Enum.MessageType.MessageInfo] = "info",
	[Enum.MessageType.MessageWarning] = "warning",
	[Enum.MessageType.MessageError] = "error",
}
do
	local ok, logService = pcall(function()
		return game:GetService("LogService")
	end)
	if ok and logService then
		logService.MessageOut:Connect(function(message, messageType)
			table.insert(outputLogBuffer, {
				message = tostring(message),
				level = LOG_MESSAGE_LEVEL[messageType] or "output",
				timestamp = os.time(),
			})
			if #outputLogBuffer > OUTPUT_LOG_LIMIT then
				table.remove(outputLogBuffer, 1)
			end
		end)
	end
end

local function collectOutput(payload)
	payload = payload or {}
	local maxMessages = math.clamp(tonumber(payload.maxMessages) or 200, 1, 500)
	local sinceTimestamp = tonumber(payload.sinceTimestamp) or 0
	local levelFilter = nil
	if type(payload.levels) == "table" and #payload.levels > 0 then
		levelFilter = {}
		for _, level in ipairs(payload.levels) do
			levelFilter[tostring(level):lower()] = true
		end
	end

	local combined, seen = {}, {}
	local function push(entry)
		local key = tostring(entry.timestamp) .. "|" .. tostring(entry.message)
		if seen[key] then
			return
		end
		seen[key] = true
		table.insert(combined, entry)
	end

	local okHistory, history = pcall(function()
		return game:GetService("LogService"):GetLogHistory()
	end)
	if okHistory and type(history) == "table" then
		for _, item in ipairs(history) do
			push({
				message = tostring(item.message),
				level = LOG_MESSAGE_LEVEL[item.messageType] or "output",
				timestamp = math.floor(tonumber(item.timestamp) or os.time()),
			})
		end
	end
	for _, entry in ipairs(outputLogBuffer) do
		push(entry)
	end

	local filtered = {}
	for _, entry in ipairs(combined) do
		if (not levelFilter or levelFilter[entry.level]) and entry.timestamp >= sinceTimestamp then
			table.insert(filtered, entry)
		end
	end
	if #filtered > maxMessages then
		local trimmed = {}
		for i = #filtered - maxMessages + 1, #filtered do
			table.insert(trimmed, filtered[i])
		end
		filtered = trimmed
	end

	local errorCount, warningCount = 0, 0
	for _, entry in ipairs(filtered) do
		if entry.level == "error" then
			errorCount += 1
		elseif entry.level == "warning" then
			warningCount += 1
		end
	end

	return {
		ok = true,
		output = filtered,
		messages = filtered,
		summary = {
			total = #filtered,
			errors = errorCount,
			warnings = warningCount,
		},
	}
end

local function getServiceRoot(serviceName)
	if serviceName == "ServerScriptService" then
		return ServerScriptService
	elseif serviceName == "StarterPlayerScripts" then
		return getStarterPlayerScripts()
	elseif serviceName == "StarterGui" then
		return StarterGui
	else
		return ReplicatedStorage
	end
end

