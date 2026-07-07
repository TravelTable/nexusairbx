-- Cheap fingerprint of an instance's mutable state, used to tell whether a human
-- edited an instance after the agent wrote it. Scripts hash their source; other
-- instances hash curated properties + attributes + tags.
local function snapshotStateHash(inst)
	if not inst then
		return nil
	end
	if SCRIPT_CLASSES[inst.ClassName] then
		return scriptHash(inst)
	end
	local ok, hashValue = pcall(propertyHash, inst)
	return ok and hashValue or nil
end

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

	-- Pre-edit fingerprint: the state the instance had before the agent touched
	-- it. `postHash` (the state right after the agent's write) is stamped later
	-- by the command executor so restore can detect human edits made since.
	snap.preHash = snapshotStateHash(inst)

	if type(localSnapshots) == "table" then
		table.insert(localSnapshots, snap)
		if type(updateSnapshotLabel) == "function" then
			updateSnapshotLabel()
		end
	end
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
	local resolvedClass = tostring(className or "")
	if resolvedClass == "" then
		error("Missing className for " .. tostring(path))
	end
	if not CREATABLE_CLASSES[resolvedClass] then
		error("Unsupported className: " .. resolvedClass)
	end
	local parent, name = ensureParent(path, createParents ~= false)
	if not parent or not name then
		error("Could not resolve parent for " .. tostring(path))
	end
	local existing = parent:FindFirstChild(name)
	if existing then
		existing:Destroy()
	end
	local inst = Instance.new(resolvedClass)
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

local function restoreSnapshots(payload)
	local restored = 0
	local removed = 0
	-- `kept` counts instances left untouched because the user edited them after
	-- the agent's write. `force` bypasses that protection for a full revert.
	local kept = 0
	local force = payload.force == true
	local snapshots = payload.snapshots or localSnapshots
	for i = #snapshots, 1, -1 do
		local snap = snapshots[i]
		if snap.existed == false then
			local current = resolvePath(snap.path)
			if current then
				-- The agent created this. If the user changed it since the agent
				-- wrote it, keep their version instead of deleting it.
				if not force and snap.postHash then
					local currentHash = snapshotStateHash(current)
					if currentHash and currentHash ~= snap.postHash then
						kept = kept + 1
						continue
					end
				end
				current:Destroy()
				removed = removed + 1
			end
		elseif snap.path and snap.className and snap.className ~= "" then
			-- The agent overwrote/edited this. If the current state no longer
			-- matches what the agent produced (and isn't already the pre-edit
			-- state), a human edited it since -> keep their edits.
			if not force and snap.postHash then
				local current = resolvePath(snap.path)
				if current then
					local currentHash = snapshotStateHash(current)
					if currentHash and currentHash ~= snap.postHash and currentHash ~= snap.preHash then
						kept = kept + 1
						continue
					end
				end
			end
			local inst = createOrReplaceInstance(snap.path, snap.className, snap.properties or {}, true)
			if SCRIPT_CLASSES[inst.ClassName] and snap.source ~= nil then
				writeScriptSource(inst, snap.source)
			end
			for key, value in pairs(snap.attributes or {}) do
				pcall(function()
					inst:SetAttribute(key, value)
				end)
			end
			for _, tag in ipairs(snap.tags or {}) do
				pcall(function()
					CollectionService:AddTag(inst, tag)
				end)
			end
			restored = restored + 1
		end
	end
	return { restored = restored, removed = removed, kept = kept }
end
