function ImportedAsset.importChatModelFile(payload)
	if game:GetService("RunService"):IsRunning() then
		return { ok = false, code = "studio_edit_mode_required", error = "Stop the playtest before inserting this model." }
	end
	local parent = resolvePath(payload.targetParentPath)
	if not parent then return { ok = false, code = "model_parent_missing", error = "The target parent no longer exists." } end
	local importKey = tostring(payload.importId) .. ":" .. tostring(payload.targetParentPath)
	local existing = {}
	for _, child in ipairs(parent:GetChildren()) do
		if child:GetAttribute("NexusChatImportId") == importKey then table.insert(existing, { path = fullPath(child), managedId = ensureManagedId(child) }) end
	end
	if #existing == payload.rootCount then return { ok = true, duplicate = true, inserted = existing, contentHash = payload.contentHash } end
	if #existing > 0 then return { ok = false, code = "model_import_incomplete", error = "Part of this import already exists. Undo the earlier import before retrying." } end
	if not string.match(tostring(payload.downloadUrl), "^https://storage%.googleapis%.com/") then
		return { ok = false, code = "model_download_invalid", error = "The model download is not a trusted storage URL." }
	end
	local ok, raw = pcall(function() return HttpService:GetAsync(payload.downloadUrl, true) end)
	if not ok then return { ok = false, code = "model_download_failed", error = "Model download failed. Retry the insertion.", retryable = true } end
	local check = 2166136261
	for index = 1, #raw do
		check = bit32.bxor(check, string.byte(raw, index))
		-- Split multiplication to retain all uint32 bits in Luau doubles.
		check = (bit32.band(check, 65535) * 16777619 + bit32.band(bit32.rshift(check, 16) * 403, 65535) * 65536) % 4294967296
	end
	if #raw ~= payload.byteLength or string.format("%08x", check) ~= payload.contentCheck then
		return { ok = false, code = "model_content_mismatch", error = "The downloaded file did not match the requested model." }
	end
	local parsed, roots = pcall(function() return game:GetService("SerializationService"):DeserializeInstancesAsync(buffer.fromstring(raw)) end)
	if not parsed then return { ok = false, code = "model_deserialize_failed", error = "Studio could not read this model. The place was not changed." } end
	if #roots ~= payload.rootCount then
		for _, root in ipairs(roots) do root:Destroy() end
		return { ok = false, code = "model_structure_mismatch", error = "Studio read a different number of model roots. The place was not changed." }
	end
	local snapshots, inserted = {}, {}
	local applied, err = pcall(function()
		if game:GetService("RunService"):IsRunning() then error("Studio must remain in edit mode") end
		local reservedNames = {}
		for _, root in ipairs(roots) do
			local name = root.Name
			if parent:FindFirstChild(name) or reservedNames[name] then name = name .. " (" .. HttpService:GenerateGUID(false) .. ")" end
			reservedNames[name] = true
			root.Name = name
			local path = fullPath(parent) .. "/" .. name
			local snapshot = snapshotInstance(path)
			if not snapshot or snapshot.ok == false then error("Could not create an undo snapshot") end
			table.insert(snapshots, snapshot)
			root:SetAttribute("NexusChatImportId", importKey)
			ensureManagedId(root)
		end
		for _, root in ipairs(roots) do
			root.Parent = parent
			table.insert(inserted, { path = fullPath(root), managedId = ensureManagedId(root), className = root.ClassName })
		end
	end)
	if not applied then
		for _, root in ipairs(roots) do root:Destroy() end
		return { ok = false, code = "model_import_failed", error = tostring(err), snapshots = snapshots }
	end
	return { ok = true, inserted = inserted, contentHash = payload.contentHash, snapshots = snapshots }
end

function ImportedAsset.applyUiModel(payload)
	local function uiSourceHash(source)
		local value = 2166136261
		for index = 1, #source do
			value = bit32.bxor(value, string.byte(source, index))
			value = (bit32.band(value, 65535) * 16777619 + bit32.band(bit32.rshift(value, 16) * 403, 65535) * 65536) % 4294967296
		end
		return string.format("%08x", value)
	end
	local function uiSourceInstance(root, relativePath)
		local path = tostring(relativePath or "")
		if path == "View.luau" then return root:FindFirstChild("View") end
		if path == "Controller.client.luau" then return root:FindFirstChild("Controller") end
		local parts = {}
		for part in string.gmatch(path, "[^/]+") do table.insert(parts, part) end
		local current = root:FindFirstChild("_NexusSource")
		for index = 1, #parts - 1 do
			current = current and current:FindFirstChild(parts[index]) or nil
		end
		local name = parts[#parts] or ""
		name = string.gsub(name, "%.client%.luau$", "")
		name = string.gsub(name, "%.luau$", "")
		return current and current:FindFirstChild(name) or nil
	end
	local function verifyUiSources(root, expectedHashes)
		local hashes = {}
		local expectedCount = 0
		for relativePath, expectedHash in pairs(expectedHashes or {}) do
			expectedCount += 1
			local source = uiSourceInstance(root, relativePath)
			if not source or not source:IsA("LuaSourceContainer") then
				return false, hashes, relativePath, "missing"
			end
			local currentHash = uiSourceHash(source.Source)
			hashes[relativePath] = currentHash
			if currentHash ~= expectedHash then return false, hashes, relativePath, "changed" end
		end
		local actualCount = root:IsA("LuaSourceContainer") and 1 or 0
		for _, descendant in ipairs(root:GetDescendants()) do
			if descendant:IsA("LuaSourceContainer") then actualCount += 1 end
		end
		if actualCount ~= expectedCount then return false, hashes, "", "count" end
		return true, hashes
	end
	local function currentTreeHash(root)
		if type(UiArtifact) ~= "table" or type(UiArtifact.treeHash) ~= "function" then return nil end
		local ok, value = pcall(UiArtifact.treeHash, root)
		return ok and value or nil
	end
	if game:GetService("RunService"):IsRunning() then return { ok = false, code = "studio_edit_mode_required", error = "Stop the playtest before applying this UI." } end
	local parent = game:GetService("StarterGui")
	local previous = parent:FindFirstChild(payload.rootName)
	local snapshots = {}
	if previous then
		local duplicate = previous:GetAttribute("NexusUiModelHash") == payload.contentHash
		if not duplicate and (previous:GetAttribute("NexusUiDesignId") ~= payload.designId or previous:GetAttribute("NexusUiModelHash") ~= payload.expectedContentHash) then
			return { ok = false, code = "ui_model_conflict", error = "The existing UI does not match the last applied revision." }
		end
		local expectedTreeHash = tostring(payload.expectedTreeHash or "")
		if expectedTreeHash == "" then
			return { ok = false, code = "ui_tree_precondition_required", error = "The existing UI predates full conflict protection. Your Studio copy was preserved." }
		end
		local actualTreeHash = currentTreeHash(previous)
		if not actualTreeHash or actualTreeHash ~= expectedTreeHash then
			return { ok = false, code = "ui_tree_conflict", error = "The UI tree changed in Studio. Your edits were preserved.", expectedTreeHash = expectedTreeHash, currentTreeHash = actualTreeHash }
		end
		local expectedSources = duplicate and payload.newSourceHashes or payload.expectedSourceHashes
		if type(expectedSources) ~= "table" or next(expectedSources) == nil then
			return { ok = false, code = "ui_source_precondition_required", error = "The existing UI source identity is unavailable. Your Studio copy was preserved." }
		end
		local sourcesOk, hashes, changedPath = verifyUiSources(previous, expectedSources)
		if not sourcesOk then
			return { ok = false, code = "source_hash_mismatch", error = "A UI source file changed in Studio. Your edits were preserved.", sourcePath = changedPath }
		end
		if duplicate then
			return { ok = true, duplicate = true, contentHash = payload.contentHash, treeHash = actualTreeHash, sourceHashes = hashes, inserted = {{ path = fullPath(previous), managedId = ensureManagedId(previous) }} }
		end
		local snapshotOk = pcall(function() appendSnapshotTree(previous, snapshots) end)
		if not snapshotOk or #snapshots == 0 then return { ok = false, code = "snapshot_failed", error = "Could not snapshot the complete existing UI." } end
		-- The root is restored by replacing the whole applied subtree. This removes
		-- descendants introduced by the new revision before recreating the old tree.
		snapshots[#snapshots].replaceSubtree = true
		previous.Parent = nil
	end
	local ok, result = pcall(ImportedAsset.importChatModelFile, payload)
	if not ok or not result.ok then
		if previous then previous.Parent = parent end
		return { ok = false, code = "ui_model_apply_failed", error = ok and result.error or tostring(result), snapshots = snapshots }
	end
	local root = parent:FindFirstChild(payload.rootName)
	if not root or not root:IsA("ScreenGui") then
		if previous then previous.Parent = parent end
		return { ok = false, code = "ui_model_root_missing", error = "The imported ScreenGui was not found.", snapshots = snapshots }
	end
	root:SetAttribute("NexusUiDesignId", payload.designId)
	root:SetAttribute("NexusUiModelHash", payload.contentHash)
	root:SetAttribute("NexusRevision", payload.sourceRevision)
	local sourcesOk, hashes, changedPath = verifyUiSources(root, payload.newSourceHashes)
	local treeHash = currentTreeHash(root)
	if not sourcesOk or not treeHash then
		root:Destroy()
		if previous then previous.Parent = parent end
		return { ok = false, code = sourcesOk and "ui_tree_hash_failed" or "source_hash_mismatch", error = sourcesOk and "Studio could not fingerprint the imported UI tree." or "The imported model did not contain every saved UI source file.", sourcePath = changedPath, snapshots = snapshots }
	end
	if previous then previous:Destroy() end
	if not previous then for _, snapshot in ipairs(result.snapshots or {}) do table.insert(snapshots, snapshot) end end
	result.snapshots = snapshots
	result.sourceHashes = hashes
	result.treeHash = treeHash
	return result
end
