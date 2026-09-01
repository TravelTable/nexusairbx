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
	-- Managed UI roots need a whole-tree fingerprint so undo/restore keeps a
	-- creator's node additions, removals, property edits, and source edits made
	-- after Nexus applied the artifact. UiArtifact is initialized before any
	-- command can execute, even though snapshot helpers are bundled earlier.
	if inst:IsA("ScreenGui") and type(UiArtifact) == "table" and type(UiArtifact.treeHash) == "function" then
		local treeOk, treeHash = pcall(UiArtifact.treeHash, inst)
		if treeOk then
			return treeHash
		end
	end
	local ok, hashValue = pcall(propertyHash, inst)
	return ok and hashValue or nil
end

local function recordStudioSnapshotLocally(snap)
	if type(localSnapshots) == "table" then
		table.insert(localSnapshots, snap)
		if type(updateSnapshotLabel) == "function" then
			updateSnapshotLabel()
		end
	end
end

local function snapshotInstance(path, deferLocalRecord)
	local inst = resolvePath(path)
	if not inst then
		local parts = splitPath(path)
		local parentPath = ""
		if #parts > 1 then
			parentPath = table.concat(parts, "/", 1, #parts - 1)
		end
		local missingSnap = {
			id = HttpService:GenerateGUID(false),
			path = path,
			parentPath = parentPath,
			name = parts[#parts] or "",
			className = "",
			existed = false,
			properties = {},
		}
		if not deferLocalRecord then
			recordStudioSnapshotLocally(missingSnap)
		end
		return missingSnap
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
		if not ok then
			error("Could not snapshot script source at " .. tostring(snap.path) .. "; mutation was not attempted")
		end
		snap.source = source
		-- Hash exactly the bytes captured in the snapshot. A second source read
		-- could race an editor update and make the snapshot unverifiable.
		snap.preHash = stableHash(source)
	else
		snap.preHash = snapshotStateHash(inst)
	end

	-- Pre-edit fingerprint: the state the instance had before the agent touched
	-- it. `postHash` (the state right after the agent's write) is stamped later
	-- by the command executor so restore can detect human edits made since.
	if not deferLocalRecord then
		recordStudioSnapshotLocally(snap)
	end
	return snap
end

local function appendSnapshotTree(inst, snapshots)
	if not inst then
		return
	end

	-- Capture the complete tree before publishing any of its snapshots. If one
	-- descendant script cannot be read, callers fail before mutation and the
	-- manual recovery list is not polluted with a partial tree.
	local pending = {}
	local function captureTree(current)
		for _, child in ipairs(current:GetChildren()) do
			captureTree(child)
		end
		table.insert(pending, snapshotInstance(fullPath(current), true))
	end
	captureTree(inst)
	for _, snap in ipairs(pending) do
		table.insert(snapshots, snap)
		recordStudioSnapshotLocally(snap)
	end
end

-- Snapshot every currently-missing segment before ensureParent can create it.
-- Restores run in reverse order, so a failed mutation removes the leaf first
-- and then any empty parent folders that were created for the command.
local function appendMissingPathSnapshots(path, snapshots, seenPaths)
	snapshots = snapshots or {}
	seenPaths = seenPaths or {}
	local parts = splitPath(path)
	local rootInst, startIndex = rootFromParts(parts)
	if not rootInst or #parts < startIndex then
		return snapshots
	end
	for index = startIndex, #parts do
		local segmentPath = table.concat(parts, "/", 1, index)
		if not seenPaths[segmentPath] and not resolvePath(segmentPath) then
			seenPaths[segmentPath] = true
			table.insert(snapshots, snapshotInstance(segmentPath))
		end
	end
	return snapshots
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
		local handled, ok, err = safeRestoreAssetReference(inst, key, value)
		if not handled then
			ok, err = safeSetProperty(inst, key, value)
		end
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
	local errors = {}
	local deferredHashChecks = {}
	local force = type(payload) == "table" and payload.force == true
	local snapshots = (type(payload) == "table" and payload.snapshots) or localSnapshots
	if type(snapshots) ~= "table" then
		snapshots = {}
	end
	for i = #snapshots, 1, -1 do
		local snap = snapshots[i]
		local ok, restoreErr = pcall(function()
			if snap.existed == false then
				local current = resolvePath(snap.path)
				if current then
					-- The agent created this. If the user changed it since the agent
					-- wrote it, keep their version instead of deleting it.
					if not force and snap.postHash then
						local currentHash = snapshotStateHash(current)
						if currentHash and currentHash ~= snap.postHash then
							kept = kept + 1
							return
						end
					end
					current:Destroy()
					if resolvePath(snap.path) then
						error("Created instance still exists after rollback")
					end
					removed = removed + 1
				end
			elseif snap.path and snap.className and snap.className ~= "" then
				-- The agent overwrote/edited this. If the current state no longer
				-- matches what the agent produced (and isn't already the pre-edit
				-- state), a human edited it since -> keep their edits.
				if not force and snap.postHash then
					local current = resolvePath(snap.path)
					if not current then
						-- The instance existed immediately after Nexus wrote it but is now
						-- missing, so a creator removed or renamed it. Keep that edit.
						kept = kept + 1
						return
					end
					local currentHash = snapshotStateHash(current)
					if currentHash and currentHash ~= snap.postHash and currentHash ~= snap.preHash then
						kept = kept + 1
						return
					end
				end
				local inst = createOrReplaceInstance(snap.path, snap.className, snap.properties or {}, true)
				if SCRIPT_CLASSES[inst.ClassName] and snap.source ~= nil then
					local wrote, writeErr = writeScriptSource(inst, snap.source)
					if not wrote then
						error(writeErr or "Could not restore script source")
					end
				end
				for key, value in pairs(snap.attributes or {}) do
					local setOk, setErr = pcall(function()
						inst:SetAttribute(key, value)
					end)
					if not setOk then
						error(setErr or ("Could not restore attribute " .. tostring(key)))
					end
				end
				for _, tag in ipairs(snap.tags or {}) do
					local tagOk, tagErr = pcall(function()
						CollectionService:AddTag(inst, tag)
					end)
					if not tagOk then
						error(tagErr or ("Could not restore tag " .. tostring(tag)))
					end
				end
				local restoredHash = snapshotStateHash(inst)
				if snap.preHash and restoredHash ~= snap.preHash then
					if inst:IsA("ScreenGui") and type(UiArtifact) == "table" and type(UiArtifact.treeHash) == "function" then
						-- The root is restored before its descendant snapshots. Verify its
						-- complete tree after the reverse-order restore has finished.
						table.insert(deferredHashChecks, snap)
					else
						error(
							"Restored state hash does not match the pre-mutation snapshot (expected "
								.. tostring(snap.preHash)
								.. ", got "
								.. tostring(restoredHash)
								.. ")"
						)
					end
				end
				restored = restored + 1
			end
		end)
		if not ok then
			table.insert(errors, {
				snapshotId = snap and snap.id or nil,
				path = snap and snap.path or "",
				message = tostring(restoreErr),
			})
		end
	end
	for _, snap in ipairs(deferredHashChecks) do
		local current = resolvePath(snap.path)
		local restoredHash = snapshotStateHash(current)
		if not current or restoredHash ~= snap.preHash then
			table.insert(errors, {
				snapshotId = snap.id,
				path = snap.path or "",
				message = "Restored UI tree hash does not match the pre-mutation snapshot (expected "
					.. tostring(snap.preHash)
					.. ", got "
					.. tostring(restoredHash)
					.. ")",
			})
		end
	end
	local complete = #errors == 0 and kept == 0
	local verificationChecks = {}
	local snapshotIds = {}
	for _, snap in ipairs(snapshots) do
		local current = snap.path and resolvePath(snap.path) or nil
		local actualHash = current and snapshotStateHash(current) or nil
		local expectedHash = snap.existed == false and nil or snap.preHash
		local restoredToBaseline = snap.existed == false
			and current == nil
			or current ~= nil and (not expectedHash or actualHash == expectedHash)
		table.insert(verificationChecks, {
			kind = "snapshot_restore",
			path = snap.path or "",
			snapshotId = snap.id,
			existed = snap.existed ~= false,
			expectedHash = expectedHash,
			actualHash = actualHash,
			ok = restoredToBaseline,
		})
		if snap.id then
			table.insert(snapshotIds, snap.id)
		end
	end
	for _, check in ipairs(verificationChecks) do
		if not check.ok then
			complete = false
			break
		end
	end
	return {
		ok = complete,
		success = complete,
		succeeded = complete,
		complete = complete,
		code = complete and nil or "snapshot_restore_incomplete",
		error = complete and nil or "One or more Studio snapshots could not be fully restored",
		restored = restored,
		removed = removed,
		kept = kept,
		requested = #snapshots,
		errors = errors,
		verification = {
			verified = complete,
			source = "studio_readback",
			evidence = {
				checks = verificationChecks,
				snapshotIds = snapshotIds,
			},
		},
	}
end

local function rollbackMutation(snapshots, code, message, details)
	local rollback = restoreSnapshots({ snapshots = snapshots, force = true })
	local response = type(details) == "table" and details or {}
	response.ok = false
	response.success = false
	response.error = tostring(message or "Studio mutation failed")
	response.mutationCode = tostring(code or "mutation_failed")
	response.code = rollback.ok and response.mutationCode or "rollback_failed"
	response.snapshots = snapshots or {}
	response.rolledBack = rollback.ok == true
	response.rollback = rollback
	for _, snap in ipairs(snapshots or {}) do
		if snap.source ~= nil then
			response.previousSourceHash = snap.preHash or scriptHash(resolvePath(snap.path))
			response.rollback.restoredSourceHash = scriptHash(resolvePath(snap.path))
			break
		end
	end
	return response
end
