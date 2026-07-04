local function nativeBuildError(code, message)
	return {
		ok = false,
		success = false,
		code = code or "BUILD_FAILED",
		error = tostring(message or "Native model build failed"),
	}
end

local function nativePanic(code, message)
	error(jsonEncode(nativeBuildError(code, message)))
end

local function isSafeNativeId(value)
	return type(value) == "string" and string.match(value, "^[A-Za-z][A-Za-z0-9_-]*$") ~= nil and #value <= 80
end

local function isSafeNativeName(value)
	return type(value) == "string" and value ~= "" and #value <= 120 and string.match(value, "^[%w][%w%s_%.%-]*$") ~= nil
end

local function finiteNumber(value, minValue, maxValue)
	local n = tonumber(value)
	if n == nil or n ~= n or n == math.huge or n == -math.huge then
		return nil
	end
	if minValue ~= nil and n < minValue then
		return nil
	end
	if maxValue ~= nil and n > maxValue then
		return nil
	end
	return n
end

local function nativeVector3(value, minValue, maxValue)
	if type(value) ~= "table" or value["$type"] ~= "Vector3" then
		return nil
	end
	local x = finiteNumber(value.x, minValue, maxValue)
	local y = finiteNumber(value.y, minValue, maxValue)
	local z = finiteNumber(value.z, minValue, maxValue)
	if not x or not y or not z then
		return nil
	end
	return Vector3.new(x, y, z)
end

local function nativeColor3(value)
	if type(value) ~= "table" or value["$type"] ~= "Color3" then
		return nil
	end
	local r = finiteNumber(value.r, 0, 1)
	local g = finiteNumber(value.g, 0, 1)
	local b = finiteNumber(value.b, 0, 1)
	if not r or not g or not b then
		return nil
	end
	return Color3.new(r, g, b)
end

local function nativeCFrame(value)
	if type(value) ~= "table" or value["$type"] ~= "CFrame" or type(value.position) ~= "table" then
		return nil
	end
	local x = finiteNumber(value.position.x, -100000, 100000)
	local y = finiteNumber(value.position.y, -100000, 100000)
	local z = finiteNumber(value.position.z, -100000, 100000)
	if not x or not y or not z then
		return nil
	end
	local rotation = value.rotationDegrees or {}
	return CFrame.new(x, y, z) * CFrame.Angles(
		math.rad(finiteNumber(rotation.x or 0, -3600, 3600) or 0),
		math.rad(finiteNumber(rotation.y or 0, -3600, 3600) or 0),
		math.rad(finiteNumber(rotation.z or 0, -3600, 3600) or 0)
	)
end

local function nativeEnum(value)
	if type(value) ~= "table" or value["$type"] ~= "Enum" then
		return nil
	end
	local enumType = tostring(value.enumType or "")
	local name = tostring(value.name or "")
	if enumType == "Material" and Enum.Material[name] then
		return Enum.Material[name]
	elseif enumType == "PartType" and Enum.PartType[name] then
		return Enum.PartType[name]
	elseif enumType == "NormalId" and Enum.NormalId[name] then
		return Enum.NormalId[name]
	elseif enumType == "ActuatorType" and Enum.ActuatorType[name] then
		return Enum.ActuatorType[name]
	elseif enumType == "HighlightDepthMode" and Enum.HighlightDepthMode[name] then
		return Enum.HighlightDepthMode[name]
	end
	return nil
end

local function nativeNumberRange(value)
	if type(value) ~= "table" or value["$type"] ~= "NumberRange" then
		return nil
	end
	local minValue = finiteNumber(value.min, 0, 10000)
	local maxValue = finiteNumber(value.max, 0, 10000)
	if not minValue or not maxValue or maxValue < minValue then
		return nil
	end
	return NumberRange.new(minValue, maxValue)
end

local function nativeNumberSequence(value)
	if type(value) == "number" then
		local n = finiteNumber(value, 0, 10000)
		return n and NumberSequence.new(n) or nil
	end
	if type(value) ~= "table" or value["$type"] ~= "NumberSequence" or type(value.keypoints) ~= "table" then
		return nil
	end
	local keypoints = {}
	for _, kp in ipairs(value.keypoints) do
		local time = finiteNumber(kp.time, 0, 1)
		local amount = finiteNumber(kp.value, 0, 10000)
		local envelope = finiteNumber(kp.envelope or 0, 0, 10000)
		if not time or not amount or not envelope then
			return nil
		end
		table.insert(keypoints, NumberSequenceKeypoint.new(time, amount, envelope))
	end
	if #keypoints == 0 then
		return nil
	end
	return NumberSequence.new(keypoints)
end

local function nativePropertyValue(key, value)
	if type(value) == "table" then
		local typed = value["$type"]
		if typed == "Vector3" then
			return nativeVector3(value, key == "Size" and 0.05 or -100000, key == "Size" and 2048 or 100000)
		elseif typed == "Color3" then
			return nativeColor3(value)
		elseif typed == "CFrame" then
			return nativeCFrame(value)
		elseif typed == "Enum" then
			return nativeEnum(value)
		elseif typed == "NumberRange" then
			return nativeNumberRange(value)
		elseif typed == "NumberSequence" then
			return nativeNumberSequence(value)
		end
	end
	return value
end

local function applyNativeProperty(inst, key, value, idMap)
	local allow = NATIVE_PROPERTY_ALLOWLIST[inst.ClassName]
	if not allow or not allow[key] then
		nativePanic("UNSUPPORTED_PROPERTY", inst.ClassName .. "." .. tostring(key) .. " is not supported")
	end
	if key == "Value" and inst:IsA("ObjectValue") then
		if value == nil then
			inst.Value = nil
			return
		end
		local target = idMap[tostring(value)]
		if not target then
			nativePanic("INVALID_REFERENCE", "ObjectValue references an unknown generated ID")
		end
		inst.Value = target
		return
	end
	local converted = nativePropertyValue(key, value)
	if converted == nil and value ~= nil then
		nativePanic("INVALID_PROPERTY_VALUE", "Invalid property value for " .. tostring(key))
	end
	local ok, err = pcall(function()
		inst[key] = converted
	end)
	if not ok then
		nativePanic("INVALID_PROPERTY_VALUE", tostring(err))
	end
end

local function validateNativeNode(node, state, depth)
	if type(node) ~= "table" then
		nativePanic("INVALID_SPEC", "Native model node must be an object")
	end
	if depth > NATIVE_MODEL_LIMITS.maxTreeDepth then
		nativePanic("TREE_DEPTH_EXCEEDED", "Native model tree is too deep")
	end
	local id = tostring(node.id or "")
	local className = tostring(node.className or "")
	if not isSafeNativeId(id) then
		nativePanic("INVALID_SPEC", "Invalid native model ID")
	end
	if state.ids[id] then
		nativePanic("DUPLICATE_INSTANCE_ID", "Duplicate native model ID: " .. id)
	end
	if not NATIVE_CLASSES[className] then
		nativePanic("UNSUPPORTED_CLASS", "Unsupported native model class: " .. className)
	end
	if not isSafeNativeName(tostring(node.name or id)) then
		nativePanic("INVALID_SPEC", "Invalid native model name")
	end
	state.ids[id] = node
	state.counts.instances = state.counts.instances + 1
	if state.counts.instances > NATIVE_MODEL_LIMITS.maxInstances then
		nativePanic("INSTANCE_LIMIT_EXCEEDED", "Native model instance limit exceeded")
	end
	if className == "Model" then
		state.counts.models = state.counts.models + 1
	elseif className == "Folder" then
		state.counts.folders = state.counts.folders + 1
	end
	if NATIVE_BASE_PART_CLASSES[className] then
		state.counts.parts = state.counts.parts + 1
		if className == "WedgePart" or className == "CornerWedgePart" then
			state.counts.wedgeParts = state.counts.wedgeParts + 1
		end
		if state.counts.parts > NATIVE_MODEL_LIMITS.maxBaseParts then
			nativePanic("PART_LIMIT_EXCEEDED", "Native model part limit exceeded")
		end
		local size = nativeVector3((node.properties or {}).Size or { ["$type"] = "Vector3", x = 4, y = 1, z = 2 }, 0.05, 2048)
		local cf = nativeCFrame((node.properties or {}).CFrame or { ["$type"] = "CFrame", position = { x = 0, y = 0, z = 0 }, rotationDegrees = { x = 0, y = 0, z = 0 } })
		if not size or not cf then
			nativePanic("INVALID_PROPERTY_VALUE", "Invalid BasePart Size or CFrame")
		end
		local p = cf.Position
		state.bounds.minX = math.min(state.bounds.minX, p.X - size.X / 2)
		state.bounds.maxX = math.max(state.bounds.maxX, p.X + size.X / 2)
		state.bounds.minY = math.min(state.bounds.minY, p.Y - size.Y / 2)
		state.bounds.maxY = math.max(state.bounds.maxY, p.Y + size.Y / 2)
		state.bounds.minZ = math.min(state.bounds.minZ, p.Z - size.Z / 2)
		state.bounds.maxZ = math.max(state.bounds.maxZ, p.Z + size.Z / 2)
	end
	if className == "Attachment" then
		state.counts.attachments = state.counts.attachments + 1
		if state.counts.attachments > NATIVE_MODEL_LIMITS.maxAttachments then
			nativePanic("INSTANCE_LIMIT_EXCEEDED", "Native model attachment limit exceeded")
		end
	end
	if NATIVE_CONSTRAINT_CLASSES[className] then
		state.counts.constraints = state.counts.constraints + 1
		if state.counts.constraints > NATIVE_MODEL_LIMITS.maxConstraints then
			nativePanic("CONSTRAINT_LIMIT_EXCEEDED", "Native model constraint limit exceeded")
		end
	end
	if NATIVE_LIGHT_CLASSES[className] then
		state.counts.lights = state.counts.lights + 1
		if state.counts.lights > NATIVE_MODEL_LIMITS.maxLights then
			nativePanic("INSTANCE_LIMIT_EXCEEDED", "Native model light limit exceeded")
		end
	end
	if className == "Decal" or className == "Texture" then
		state.counts.decals = state.counts.decals + 1
	end
	if className == "ParticleEmitter" then
		state.counts.particleEmitters = state.counts.particleEmitters + 1
		if state.counts.particleEmitters > NATIVE_MODEL_LIMITS.maxParticleEmitters then
			nativePanic("INSTANCE_LIMIT_EXCEEDED", "Native model particle emitter limit exceeded")
		end
	end
	if type(node.tags or {}) ~= "table" or #(node.tags or {}) > NATIVE_MODEL_LIMITS.maxTagsPerInstance then
		nativePanic("INVALID_SPEC", "Invalid native model tags")
	end
	local attrCount = 0
	for key, value in pairs(node.attributes or {}) do
		attrCount = attrCount + 1
		if attrCount > NATIVE_MODEL_LIMITS.maxAttributesPerInstance then
			nativePanic("INVALID_SPEC", "Too many native model attributes")
		end
		local valueType = type(value)
		if valueType ~= "string" and valueType ~= "number" and valueType ~= "boolean" then
			nativePanic("INVALID_PROPERTY_VALUE", "Unsupported attribute value")
		end
		if not isSafeNativeId(tostring(key)) then
			nativePanic("INVALID_SPEC", "Invalid native model attribute name")
		end
	end
	for key, value in pairs(node.properties or {}) do
		local allow = NATIVE_PROPERTY_ALLOWLIST[className]
		if not allow or not allow[key] then
			nativePanic("UNSUPPORTED_PROPERTY", className .. "." .. tostring(key) .. " is not supported")
		end
		if type(value) == "table" and value["$type"] ~= nil and nativePropertyValue(key, value) == nil then
			nativePanic("INVALID_PROPERTY_VALUE", "Invalid typed value for " .. tostring(key))
		end
	end
	for _, child in ipairs(node.children or {}) do
		validateNativeNode(child, state, depth + 1)
	end
end

local function validateNativeReferences(node, idMap)
	if NATIVE_CONSTRAINT_CLASSES[node.className] then
		for specKey, propName in pairs(NATIVE_REFERENCE_FIELDS[node.className] or {}) do
			local refId = tostring((node.references or {})[specKey] or node[specKey] or "")
			local target = idMap[refId]
			if not target then
				nativePanic("INVALID_REFERENCE", node.className .. " missing generated reference " .. specKey)
			end
			if propName == "Part0" or propName == "Part1" then
				if not target:IsA("BasePart") then
					nativePanic("INVALID_REFERENCE", specKey .. " must reference a BasePart")
				end
			elseif not target:IsA("Attachment") then
				nativePanic("INVALID_REFERENCE", specKey .. " must reference an Attachment")
			end
		end
	end
	for _, child in ipairs(node.children or {}) do
		validateNativeReferences(child, idMap)
	end
end

local function createNativeInstances(node, parent, idMap)
	local inst = Instance.new(node.className)
	inst.Name = tostring(node.name or node.id)
	idMap[tostring(node.id)] = inst
	inst:SetAttribute("NexusInstanceId", tostring(node.id))
	for key, value in pairs(node.properties or {}) do
		if key ~= "Value" then
			applyNativeProperty(inst, key, value, idMap)
		end
	end
	for key, value in pairs(node.attributes or {}) do
		inst:SetAttribute(tostring(key), value)
	end
	for _, tag in ipairs(node.tags or {}) do
		CollectionService:AddTag(inst, tostring(tag))
	end
	for _, child in ipairs(node.children or {}) do
		createNativeInstances(child, inst, idMap)
	end
	inst.Parent = parent
	return inst
end

local function resolveNativeReferences(node, idMap)
	local inst = idMap[tostring(node.id)]
	if inst:IsA("ObjectValue") and (node.properties or {}).Value ~= nil then
		applyNativeProperty(inst, "Value", node.properties.Value, idMap)
	end
	if NATIVE_CONSTRAINT_CLASSES[node.className] then
		for specKey, propName in pairs(NATIVE_REFERENCE_FIELDS[node.className] or {}) do
			local refId = tostring((node.references or {})[specKey] or node[specKey] or "")
			inst[propName] = idMap[refId]
		end
	end
	for _, child in ipairs(node.children or {}) do
		resolveNativeReferences(child, idMap)
	end
end

local function findNativeIdempotentModel(idempotencyKey)
	if tostring(idempotencyKey or "") == "" then
		return nil
	end
	for _, rootInst in pairs(NATIVE_ALLOWED_ROOTS) do
		for _, inst in ipairs(rootInst:GetDescendants()) do
			if inst:IsA("Model") and inst:GetAttribute("NexusIdempotencyKey") == idempotencyKey then
				return inst
			end
		end
	end
	return nil
end

local function ensureNativeTargetParent(path)
	local parts = splitPath(path)
	local rootInst = NATIVE_ALLOWED_ROOTS[parts[1]]
	if not rootInst then
		nativePanic("INVALID_TARGET_PATH", "Native model target path must start with Workspace, ReplicatedStorage, or ServerStorage")
	end
	local current = rootInst
	local created = {}
	for i = 2, #parts do
		local name = parts[i]
		if not isSafeNativeName(name) then
			nativePanic("INVALID_TARGET_PATH", "Unsafe native model target path segment")
		end
		local child = current:FindFirstChild(name)
		if not child then
			child = Instance.new("Folder")
			child.Name = name
			child.Parent = current
			table.insert(created, child)
		elseif not child:IsA("Folder") and not child:IsA("Model") then
			nativePanic("INVALID_TARGET_PATH", "Native model target path segment is not a container")
		end
		current = child
	end
	return current, created
end

local function cleanupCreatedTargets(created)
	for i = #created, 1, -1 do
		local inst = created[i]
		if inst and inst.Parent and #inst:GetChildren() == 0 then
			inst:Destroy()
		end
	end
end

local function uniqueNativeName(parent, baseName)
	local name = baseName
	local index = 2
	while parent:FindFirstChild(name) do
		name = ("%s %d"):format(baseName, index)
		index = index + 1
	end
	return name
end

local function placementCFrame(spec)
	local placement = spec.placement or {}
	local mode = tostring(placement.mode or "camera_focus")
	local rotation = placement.rotation or {}
	local cf = CFrame.Angles(
		math.rad(finiteNumber(rotation.x or 0, -3600, 3600) or 0),
		math.rad(finiteNumber(rotation.y or 0, -3600, 3600) or 0),
		math.rad(finiteNumber(rotation.z or 0, -3600, 3600) or 0)
	)
	if mode == "origin" then
		return CFrame.new(0, 0, 0) * cf
	elseif mode == "explicit_position" and type(placement.position) == "table" then
		local p = placement.position
		return CFrame.new(finiteNumber(p.x, -100000, 100000) or 0, finiteNumber(p.y, -100000, 100000) or 0, finiteNumber(p.z, -100000, 100000) or 0) * cf
	elseif mode == "selection_relative" then
		local selected = Selection:Get()
		if #selected > 0 and selected[1] and selected[1]:IsA("PVInstance") then
			return selected[1]:GetPivot() * CFrame.new(0, 0, -8) * cf
		end
	end
	local camera = Workspace.CurrentCamera
	if camera then
		return camera.CFrame * CFrame.new(0, 0, -18) * cf
	end
	return CFrame.new(0, 6, 0) * cf
end

local function buildNativeReceipt(commandId, spec, rootModel, state, warnings, alreadyApplied)
	local bounds
	if state.bounds.minX == math.huge then
		bounds = { x = 0, y = 0, z = 0 }
	else
		bounds = {
			x = state.bounds.maxX - state.bounds.minX,
			y = state.bounds.maxY - state.bounds.minY,
			z = state.bounds.maxZ - state.bounds.minZ,
		}
	end
	return {
		ok = true,
		success = true,
		type = "build_native_model",
		commandId = commandId,
		modelId = tostring(spec.modelId or ""),
		insertedName = rootModel and rootModel.Name or tostring(spec.name or ""),
		insertedRootPath = rootModel and fullPath(rootModel) or "",
		counts = state.counts,
		bounds = bounds,
		placement = spec.placement or { mode = "camera_focus" },
		warnings = warnings or {},
		history = { recorded = true },
		commandAlreadyApplied = alreadyApplied == true,
	}
end

local function buildNativeModel(payload, command)
	local spec = payload.spec
	if type(spec) ~= "table" or tonumber(spec.schemaVersion or 0) ~= 1 then
		return nativeBuildError("INVALID_SPEC", "Invalid NativeModelSpec schema")
	end
	if type(spec.root) ~= "table" or spec.root.className ~= "Model" then
		return nativeBuildError("INVALID_SPEC", "NativeModelSpec root must be a Model")
	end
	local idempotencyKey = tostring(payload.idempotencyKey or "")
	local existing = findNativeIdempotentModel(idempotencyKey)
	if existing then
		local emptyState = {
			counts = { instances = 0, models = 1, folders = 0, parts = 0, wedgeParts = 0, attachments = 0, constraints = 0, lights = 0, decals = 0, particleEmitters = 0 },
			bounds = { minX = math.huge, minY = math.huge, minZ = math.huge, maxX = -math.huge, maxY = -math.huge, maxZ = -math.huge },
		}
		local receipt = buildNativeReceipt(command and command.id or "", spec, existing, emptyState, { "Command already applied; existing model returned." }, true)
		receipt.code = "COMMAND_ALREADY_APPLIED"
		return receipt
	end
	local state = {
		ids = {},
		counts = { instances = 0, models = 0, folders = 0, parts = 0, wedgeParts = 0, attachments = 0, constraints = 0, lights = 0, decals = 0, particleEmitters = 0 },
		bounds = { minX = math.huge, minY = math.huge, minZ = math.huge, maxX = -math.huge, maxY = -math.huge, maxZ = -math.huge },
	}
	local validateOk, validateErr = pcall(function()
		validateNativeNode(spec.root, state, 1)
		if state.bounds.minX ~= math.huge then
			local extentX = state.bounds.maxX - state.bounds.minX
			local extentY = state.bounds.maxY - state.bounds.minY
			local extentZ = state.bounds.maxZ - state.bounds.minZ
			if extentX > NATIVE_MODEL_LIMITS.maxModelExtent or extentY > NATIVE_MODEL_LIMITS.maxModelExtent or extentZ > NATIVE_MODEL_LIMITS.maxModelExtent then
				nativePanic("BOUNDS_LIMIT_EXCEEDED", "Native model bounds exceed safety limit")
			end
		end
	end)
	if not validateOk then
		return nativeBuildError("INVALID_SPEC", tostring(validateErr))
	end
	local idMap = {}
	local rootModel = nil
	local createdTargets = {}
	local buildOk, buildErr = pcall(function()
		rootModel = createNativeInstances(spec.root, nil, idMap)
		validateNativeReferences(spec.root, idMap)
		resolveNativeReferences(spec.root, idMap)
		rootModel:SetAttribute("NexusGenerated", true)
		rootModel:SetAttribute("NexusManaged", true)
		rootModel:SetAttribute("NexusBuildType", "native_model")
		rootModel:SetAttribute("NexusModelId", tostring(spec.modelId or ""))
		rootModel:SetAttribute("NexusCommandId", command and tostring(command.id or "") or "")
		rootModel:SetAttribute("NexusLastCommandId", command and tostring(command.id or "") or "")
		rootModel:SetAttribute("NexusSchemaVersion", 1)
		rootModel:SetAttribute("NexusRevision", "rev_" .. stableHash(tostring(spec.modelId or "") .. ":" .. tostring(command and command.id or "") .. ":" .. tostring(os.clock())))
		rootModel:SetAttribute("NexusIdempotencyKey", idempotencyKey)
		local targetParent
		targetParent, createdTargets = ensureNativeTargetParent(spec.targetParentPath or "Workspace/NexusBuilds")
		rootModel.Name = uniqueNativeName(targetParent, tostring(spec.name or rootModel.Name))
		rootModel.Parent = targetParent
		rootModel:PivotTo(placementCFrame(spec))
	end)
	if not buildOk then
		if rootModel then
			rootModel:Destroy()
		end
		cleanupCreatedTargets(createdTargets)
		return nativeBuildError("BUILD_FAILED", tostring(buildErr))
	end
	return buildNativeReceipt(command and command.id or "", spec, rootModel, state, spec.warnings or {}, false)
end

local function nativeTypedValue(value)
	local valueType = typeof(value)
	if valueType == "Vector3" then
		return { ["$type"] = "Vector3", x = value.X, y = value.Y, z = value.Z }
	elseif valueType == "Color3" then
		return { ["$type"] = "Color3", r = value.R, g = value.G, b = value.B }
	elseif valueType == "CFrame" then
		local rx, ry, rz = value:ToOrientation()
		return {
			["$type"] = "CFrame",
			position = { x = value.Position.X, y = value.Position.Y, z = value.Position.Z },
			rotationDegrees = { x = math.deg(rx), y = math.deg(ry), z = math.deg(rz) },
		}
	elseif valueType == "EnumItem" then
		local text = tostring(value)
		local enumType, name = string.match(text, "^Enum%.([^%.]+)%.(.+)$")
		return { ["$type"] = "Enum", enumType = enumType or "", name = name or text }
	elseif valueType == "NumberRange" then
		return { ["$type"] = "NumberRange", min = value.Min, max = value.Max }
	elseif valueType == "NumberSequence" then
		local keypoints = {}
		for _, kp in ipairs(value.Keypoints) do
			table.insert(keypoints, { time = kp.Time, value = kp.Value, envelope = kp.Envelope })
		end
		return { ["$type"] = "NumberSequence", keypoints = keypoints }
	elseif valueType == "string" or valueType == "number" or valueType == "boolean" then
		return value
	end
	return nil
end

local function nativeAllowedProperties(inst)
	local out = {}
	local allow = NATIVE_PROPERTY_ALLOWLIST[inst.ClassName] or {}
	for key in pairs(allow) do
		local ok, value = pcall(function()
			return inst[key]
		end)
		if ok then
			local typed = nativeTypedValue(value)
			if typed ~= nil then
				out[key] = typed
			end
		end
	end
	return out
end

local function nativeSnapshotSignature(root)
	local rows = {}
	for _, inst in ipairs(root:GetDescendants()) do
		local id = inst:GetAttribute("NexusInstanceId")
		if id then
			table.insert(rows, tostring(id) .. ":" .. inst.ClassName .. ":" .. inst.Name .. ":" .. propertyHash(inst))
		end
	end
	table.sort(rows)
	return table.concat(rows, "|")
end

local function nativeRevision(root)
	local stored = tostring(root:GetAttribute("NexusRevision") or "")
	return "rev_" .. stableHash(stored .. ":" .. nativeSnapshotSignature(root))
end

local function nativeModelSummary(root)
	local counts = { instances = 1, parts = 0, constraints = 0 }
	for _, inst in ipairs(root:GetDescendants()) do
		counts.instances = counts.instances + 1
		if inst:IsA("BasePart") then
			counts.parts = counts.parts + 1
		end
		if NATIVE_CONSTRAINT_CLASSES[inst.ClassName] then
			counts.constraints = counts.constraints + 1
		end
	end
	local bounds = { x = 0, y = 0, z = 0 }
	local ok, _, size = pcall(function()
		return root:GetBoundingBox()
	end)
	if ok and size then
		bounds = { x = size.X, y = size.Y, z = size.Z }
	end
	return counts, bounds
end

local function inspectNativeModel(payload)
	local root = resolvePath(payload.modelPath)
	if not root or not root:IsA("Model") then
		return nativeBuildError("MANAGED_MODEL_NOT_FOUND", "Managed native model was not found")
	end
	if root:GetAttribute("NexusManaged") ~= true and root:GetAttribute("NexusGenerated") ~= true then
		return nativeBuildError("MODEL_NOT_MANAGED", "Model is not managed by NexusRBX")
	end
	local expectedModelId = tostring(payload.expectedModelId or payload.modelId or "")
	local modelId = tostring(root:GetAttribute("NexusModelId") or "")
	if expectedModelId ~= "" and modelId ~= expectedModelId then
		return nativeBuildError("MODEL_ID_MISMATCH", "Managed model ID does not match")
	end

	local warnings = {}
	local seen = {}
	local instances = {}
	local maxInstances = finiteNumber(payload.maxInstances or NATIVE_MODEL_LIMITS.maxInstances, 20, NATIVE_MODEL_LIMITS.maxInstances) or NATIVE_MODEL_LIMITS.maxInstances
	local function addInstance(inst, parentId)
		if #instances >= maxInstances then
			table.insert(warnings, { code = "INSPECTION_TRUNCATED", message = "Native model inspection reached the instance limit" })
			return
		end
		local id = inst == root and "root" or tostring(inst:GetAttribute("NexusInstanceId") or "")
		if id == "" then
			table.insert(warnings, { code = "MISSING_INSTANCE_ID", message = fullPath(inst) .. " is missing NexusInstanceId" })
			return
		end
		if seen[id] then
			table.insert(warnings, { code = "DUPLICATE_INSTANCE_ID", message = "Duplicate NexusInstanceId: " .. id })
			return
		end
		if not NATIVE_CLASSES[inst.ClassName] then
			table.insert(warnings, { code = "UNSUPPORTED_CLASS", message = fullPath(inst) .. " has unsupported class " .. inst.ClassName })
			return
		end
		seen[id] = true
		table.insert(instances, {
			id = id,
			parentId = parentId,
			className = inst.ClassName,
			name = inst.Name,
			properties = nativeAllowedProperties(inst),
			attributes = attributesOf(inst),
			tags = CollectionService:GetTags(inst),
		})
		for _, child in ipairs(inst:GetChildren()) do
			addInstance(child, id)
		end
	end
	addInstance(root, nil)
	local counts, bounds = nativeModelSummary(root)
	return {
		ok = true,
		success = true,
		type = "inspect_native_model",
		modelId = modelId,
		revision = nativeRevision(root),
		rootPath = fullPath(root),
		rootName = root.Name,
		summary = {
			instances = counts.instances,
			parts = counts.parts,
			constraints = counts.constraints,
			bounds = bounds,
		},
		instances = instances,
		warnings = warnings,
	}
end

local function nativeTargetMap(root)
	local map = { root = root }
	for _, inst in ipairs(root:GetDescendants()) do
		local id = inst:GetAttribute("NexusInstanceId")
		if id then
			if map[tostring(id)] then
				nativePanic("DUPLICATE_INSTANCE_ID", "Duplicate NexusInstanceId: " .. tostring(id))
			end
			map[tostring(id)] = inst
		end
	end
	return map
end

local function nativeTarget(idMap, targetId)
	local inst = idMap[tostring(targetId or "")]
	if not inst then
		nativePanic("TARGET_NOT_FOUND", "Unknown managed instance ID: " .. tostring(targetId or ""))
	end
	return inst
end

local function isProtectedNexusMetadata(key)
	return string.match(tostring(key or ""), "^Nexus") ~= nil
end

local function validateNoProtectedNexusAttributes(node)
	for key in pairs(node.attributes or {}) do
		if isProtectedNexusMetadata(key) then
			nativePanic("UNSUPPORTED_PROPERTY", tostring(key) .. " is protected Nexus metadata")
		end
	end
	for _, child in ipairs(node.children or {}) do
		validateNoProtectedNexusAttributes(child)
	end
end

local function applyNativeTransform(inst, op)
	local t = op.translation or {}
	local r = op.rotationDegrees or {}
	local cf = CFrame.new(finiteNumber(t.x or 0, -100000, 100000) or 0, finiteNumber(t.y or 0, -100000, 100000) or 0, finiteNumber(t.z or 0, -100000, 100000) or 0)
		* CFrame.Angles(math.rad(finiteNumber(r.x or 0, -3600, 3600) or 0), math.rad(finiteNumber(r.y or 0, -3600, 3600) or 0), math.rad(finiteNumber(r.z or 0, -3600, 3600) or 0))
	if inst:IsA("PVInstance") then
		inst:PivotTo(inst:GetPivot() * cf)
	elseif inst:IsA("BasePart") then
		inst.CFrame = inst.CFrame * cf
	else
		nativePanic("INVALID_OPERATION", inst.ClassName .. " cannot be transformed")
	end
end

local function rewriteDuplicateIds(rootClone, sourceId, newPrefix)
	local count = 0
	rootClone:SetAttribute("NexusCommandId", nil)
	rootClone:SetAttribute("NexusLastCommandId", nil)
	local function visit(inst)
		count = count + 1
		local oldId = tostring(inst:GetAttribute("NexusInstanceId") or sourceId)
		local newId = newPrefix
		if oldId ~= sourceId then
			newId = newPrefix .. "-" .. oldId
		end
		inst:SetAttribute("NexusInstanceId", newId)
		for _, child in ipairs(inst:GetChildren()) do
			visit(child)
		end
	end
	visit(rootClone)
	return count
end

local function applyNativeModelPatch(payload, command)
	local root = resolvePath(payload.modelPath)
	if not root or not root:IsA("Model") then
		return nativeBuildError("MANAGED_MODEL_NOT_FOUND", "Managed native model was not found")
	end
	if root:GetAttribute("NexusManaged") ~= true and root:GetAttribute("NexusGenerated") ~= true then
		return nativeBuildError("MODEL_NOT_MANAGED", "Model is not managed by NexusRBX")
	end
	local modelId = tostring(root:GetAttribute("NexusModelId") or "")
	if modelId ~= tostring(payload.modelId or "") then
		return nativeBuildError("MODEL_ID_MISMATCH", "Managed model ID does not match")
	end
	local expectedRevision = tostring(payload.expectedRevision or "")
	local currentRevision = nativeRevision(root)
	if expectedRevision ~= "" and expectedRevision ~= currentRevision then
		return {
			ok = false,
			success = false,
			code = "MODEL_REVISION_CONFLICT",
			expectedRevision = expectedRevision,
			currentRevision = currentRevision,
			message = "The model changed in Studio after this edit was prepared.",
		}
	end
	local idempotencyKey = tostring(payload.idempotencyKey or "")
	if idempotencyKey ~= "" and root:GetAttribute("NexusLastPatchIdempotencyKey") == idempotencyKey then
		return {
			ok = true,
			success = true,
			type = "apply_native_model_patch",
			code = "COMMAND_ALREADY_APPLIED",
			commandId = command and tostring(command.id or "") or "",
			modelId = modelId,
			rootPath = fullPath(root),
			previousRevision = expectedRevision,
			newRevision = currentRevision,
			operations = { requested = #(payload.patch and payload.patch.operations or {}), applied = 0, added = 0, removed = 0, modified = 0, duplicated = 0 },
			affectedInstanceIds = {},
			warnings = { "Command already applied; existing model returned." },
			history = { recorded = true },
		}
	end

	local patch = payload.patch or {}
	if tonumber(patch.schemaVersion or 0) ~= 1 or tostring(patch.modelId or "") ~= modelId then
		return nativeBuildError("INVALID_PATCH", "Invalid NativeModelPatch")
	end
	local hasRemoval = false
	for _, op in ipairs(patch.operations or {}) do
		if op.op == "remove_instance" then
			hasRemoval = true
		end
	end
	if hasRemoval and payload.destructiveConfirmed ~= true then
		return nativeBuildError("INVALID_PATCH", "remove_instance requires destructive confirmation")
	end

	local parent = root.Parent
	local originalName = root.Name
	local rollback = root:Clone()
	local snapshots = {}
	appendSnapshotTree(root, snapshots)
	local previousRevision = currentRevision
	local affected = {}
	local opCounts = { requested = #(patch.operations or {}), applied = 0, added = 0, removed = 0, modified = 0, duplicated = 0 }
	local applyOk, applyErr = pcall(function()
		local idMap = nativeTargetMap(root)
		for _, op in ipairs(patch.operations or {}) do
			local kind = tostring(op.op or "")
			if kind == "set_properties" then
				local inst = nativeTarget(idMap, op.targetId)
				for key, value in pairs(op.properties or {}) do
					applyNativeProperty(inst, key, value, idMap)
				end
				table.insert(affected, tostring(op.targetId))
				opCounts.modified = opCounts.modified + 1
			elseif kind == "set_attributes" then
				local inst = nativeTarget(idMap, op.targetId)
				for key, value in pairs(op.attributes or {}) do
					if isProtectedNexusMetadata(key) then
						nativePanic("UNSUPPORTED_PROPERTY", tostring(key) .. " is protected Nexus metadata")
					end
					inst:SetAttribute(tostring(key), value)
				end
				table.insert(affected, tostring(op.targetId))
				opCounts.modified = opCounts.modified + 1
			elseif kind == "rename" then
				local inst = nativeTarget(idMap, op.targetId)
				if not isSafeNativeName(tostring(op.name or "")) then
					nativePanic("INVALID_OPERATION", "Invalid rename target")
				end
				inst.Name = tostring(op.name)
				table.insert(affected, tostring(op.targetId))
				opCounts.modified = opCounts.modified + 1
			elseif kind == "transform" then
				local inst = nativeTarget(idMap, op.targetId)
				applyNativeTransform(inst, op)
				table.insert(affected, tostring(op.targetId))
				opCounts.modified = opCounts.modified + 1
			elseif kind == "resize" then
				local inst = nativeTarget(idMap, op.targetId)
				if not inst:IsA("BasePart") then
					nativePanic("INVALID_OPERATION", "Only BaseParts can be resized")
				end
				local size = nativeVector3(op.size, 0.05, 2048)
				if not size then
					nativePanic("INVALID_PROPERTY_VALUE", "Invalid resize size")
				end
				inst.Size = size
				table.insert(affected, tostring(op.targetId))
				opCounts.modified = opCounts.modified + 1
			elseif kind == "add_instance" then
				local parentInst = nativeTarget(idMap, op.parentId)
				validateNoProtectedNexusAttributes(op.instance or {})
				local newInst = createNativeInstances(op.instance, nil, idMap)
				newInst.Parent = parentInst
				table.insert(affected, tostring(op.instance and op.instance.id or ""))
				opCounts.added = opCounts.added + 1
			elseif kind == "move_instance" then
				local inst = nativeTarget(idMap, op.targetId)
				local newParent = nativeTarget(idMap, op.newParentId)
				if inst == root then
					nativePanic("INVALID_OPERATION", "Managed root cannot be moved")
				end
				inst.Parent = newParent
				table.insert(affected, tostring(op.targetId))
				opCounts.modified = opCounts.modified + 1
			elseif kind == "duplicate_instance" then
				local inst = nativeTarget(idMap, op.targetId)
				local clone = inst:Clone()
				rewriteDuplicateIds(clone, tostring(op.targetId), tostring(op.newIdPrefix or "copy"))
				clone.Parent = inst.Parent
				applyNativeTransform(clone, { translation = op.translation or { x = 0, y = 0, z = 0 } })
				for _, desc in ipairs(clone:GetDescendants()) do
					local id = desc:GetAttribute("NexusInstanceId")
					if id then
						idMap[tostring(id)] = desc
					end
				end
				idMap[tostring(clone:GetAttribute("NexusInstanceId") or op.newIdPrefix)] = clone
				table.insert(affected, tostring(op.newIdPrefix))
				opCounts.duplicated = opCounts.duplicated + 1
				opCounts.added = opCounts.added + 1
			elseif kind == "remove_instance" then
				local inst = nativeTarget(idMap, op.targetId)
				if inst == root then
					nativePanic("INVALID_OPERATION", "Managed root cannot be removed")
				end
				inst:Destroy()
				table.insert(affected, tostring(op.targetId))
				opCounts.removed = opCounts.removed + 1
			elseif kind == "set_tags" then
				local inst = nativeTarget(idMap, op.targetId)
				for _, tag in ipairs(op.remove or {}) do
					if CollectionService:HasTag(inst, tostring(tag)) then
						CollectionService:RemoveTag(inst, tostring(tag))
					end
				end
				for _, tag in ipairs(op.add or {}) do
					CollectionService:AddTag(inst, tostring(tag))
				end
				table.insert(affected, tostring(op.targetId))
				opCounts.modified = opCounts.modified + 1
			elseif kind == "transform_model" then
				applyNativeTransform(root, op)
				table.insert(affected, "root")
				opCounts.modified = opCounts.modified + 1
			else
				nativePanic("INVALID_OPERATION", "Unsupported NativeModelPatch operation: " .. kind)
			end
			opCounts.applied = opCounts.applied + 1
		end
		local counts = nativeModelSummary(root)
		if counts.instances > NATIVE_MODEL_LIMITS.maxInstances or counts.parts > NATIVE_MODEL_LIMITS.maxBaseParts then
			nativePanic("INSTANCE_LIMIT_EXCEEDED", "Native model limits exceeded")
		end
		root:SetAttribute("NexusRevision", "rev_" .. stableHash(modelId .. ":" .. tostring(command and command.id or "") .. ":" .. tostring(os.clock())))
		root:SetAttribute("NexusLastCommandId", command and tostring(command.id or "") or "")
		root:SetAttribute("NexusLastPatchIdempotencyKey", idempotencyKey)
	end)

	if not applyOk then
		root:Destroy()
		rollback.Name = originalName
		rollback.Parent = parent
		return {
			ok = false,
			success = false,
			code = "PATCH_APPLICATION_FAILED",
			error = tostring(applyErr),
			snapshots = snapshots,
		}
	end
	rollback:Destroy()
	local countsAfter, boundsAfter = nativeModelSummary(root)
	return {
		ok = true,
		success = true,
		type = "apply_native_model_patch",
		commandId = command and tostring(command.id or "") or "",
		modelId = modelId,
		rootPath = fullPath(root),
		previousRevision = previousRevision,
		newRevision = nativeRevision(root),
		operations = opCounts,
		affectedInstanceIds = affected,
		countsAfter = {
			instances = countsAfter.instances,
			parts = countsAfter.parts,
			constraints = countsAfter.constraints,
		},
		boundsAfter = boundsAfter,
		warnings = {},
		history = { recorded = true },
		snapshots = snapshots,
