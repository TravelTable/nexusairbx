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
