local function snapshotInstance(path)
	local inst = resolvePath(path)
	if not inst then
		local parts = splitPath(path)
		local parentPath = ""
		if #parts > 1 then
			parentPath = table.concat(parts, "/", 1, #parts - 1)
		end
		return {
			id = HttpService:GenerateGUID(false),
			path = path,
			parentPath = parentPath,
			name = parts[#parts] or "",
			className = "",
			existed = false,
			properties = {},
		}
	end

	local snap = {
		id = HttpService:GenerateGUID(false),
		path = fullPath(inst),
		parentPath = inst.Parent and fullPath(inst.Parent) or "",
		name = inst.Name,
		className = inst.ClassName,
		existed = true,
		properties = propertiesOf(inst),
		attributes = attributesOf(inst),
		tags = CollectionService:GetTags(inst),
	}
	snap.properties.ClassName = nil

	if SCRIPT_CLASSES[inst.ClassName] then
		local ok, source = readScriptSource(inst)
		snap.source = ok and source or ""
	end

	table.insert(localSnapshots, snap)
	updateSnapshotLabel()
	return snap
end

local function appendSnapshotTree(inst, snapshots)
	if not inst then
		return
	end
	for _, child in ipairs(inst:GetChildren()) do
		appendSnapshotTree(child, snapshots)
	end
	table.insert(snapshots, snapshotInstance(fullPath(inst)))
end

local function beginRecording(label)
	local ok, recording = pcall(function()
		return ChangeHistoryService:TryBeginRecording(label)
	end)
	if ok then
		return recording
	end
	return nil
end

local function finishRecording(recording, commit)
	if not recording then
		return
	end
	pcall(function()
		ChangeHistoryService:FinishRecording(
			recording,
			commit and Enum.FinishRecordingOperation.Commit or Enum.FinishRecordingOperation.Cancel
		)
	end)
end

local function createOrReplaceInstance(path, className, properties, createParents)
	if not CREATABLE_CLASSES[className] then
		error("Unsupported className: " .. tostring(className))
	end
	local parent, name = ensureParent(path, createParents ~= false)
	if not parent or not name then
		error("Could not resolve parent for " .. tostring(path))
	end
	local existing = parent:FindFirstChild(name)
	if existing then
		existing:Destroy()
	end
	local inst = Instance.new(className)
	inst.Name = name
	for key, value in pairs(properties or {}) do
		local ok, err = safeSetProperty(inst, key, value)
		if not ok then
			error(err)
		end
	end
	inst.Parent = parent
	return inst
end
