local function getStudioContext()
	local roots = {}
	for _, inst in ipairs(getInspectionRoots()) do
		table.insert(roots, {
			name = inst.Name,
			className = inst.ClassName,
			path = fullPath(inst),
			childCount = #inst:GetChildren(),
		})
	end
	return {
		placeName = game.Name,
		placeId = tostring(game.PlaceId),
		jobId = tostring(game.JobId),
		pluginVersion = PLUGIN_VERSION,
		roots = roots,
	}
end

local function patchScript(payload)
	local path = payload.path
	local inst = resolvePath(path)
	if not inst or not SCRIPT_CLASSES[inst.ClassName] then
		return { ok = false, error = "Script not found", path = path }
	end
	local hashOk, hashResult = verifyExpectedScriptHash(inst, payload.expectedSourceHash, fullPath(inst))
	if not hashOk then
		return hashResult
	end
	local ok, source = readScriptSource(inst)
	if not ok then
		return { ok = false, error = "Could not read script source", path = path }
	end
	local currentHash = stableHash(source)
	local nextSource = payload.source and payload.source ~= "" and tostring(payload.source) or source
	local replacements = 0
	for _, patch in ipairs(payload.patches or {}) do
		local find = tostring(patch.find or "")
		local replace = tostring(patch.replace or "")
		if find ~= "" then
			if patch.all == true then
				local count
				nextSource, count = string.gsub(nextSource, escapePattern(find), escapeReplacement(replace))
				replacements = replacements + count
			else
				local startIndex, endIndex = string.find(nextSource, find, 1, true)
				if startIndex then
					nextSource = string.sub(nextSource, 1, startIndex - 1) .. replace .. string.sub(nextSource, endIndex + 1)
					replacements = replacements + 1
				else
					return { ok = false, error = "Patch find text not found", path = fullPath(inst), find = find }
				end
			end
		end
	end
	local contextValidation = ScriptContextGuard.validate({
		className = inst.ClassName,
		path = fullPath(inst),
		source = nextSource,
	})
	if not contextValidation.ok then
		return ScriptContextGuard.failure(contextValidation)
	end
	local snapshots = {}
	table.insert(snapshots, snapshotInstance(fullPath(inst)))
	local wrote, writeErr = writeScriptSource(inst, nextSource)
	if not wrote then
		return rollbackMutation(snapshots, "patch_script_failed", writeErr or "Could not write patched source", {
			path = fullPath(inst),
		})
	end
	return {
		ok = true,
		path = fullPath(inst),
		replacements = replacements,
		previousHash = currentHash,
		sourceHash = stableHash(nextSource),
		sourceLength = #nextSource,
		snapshots = snapshots,
	}
end

local function renameInstanceTool(payload)
	local inst = resolvePath(payload.path)
	if not inst then
		return { ok = false, error = "Instance not found", path = payload.path }
	end
	local hashOk, hashResult = verifyExpectedScriptHash(inst, payload.expectedSourceHash, fullPath(inst))
	if not hashOk then
		return hashResult
	end
	local newName = tostring(payload.newName or payload.name or inst.Name)
	local existingTarget = inst.Parent and inst.Parent:FindFirstChild(newName) or nil
	if existingTarget and existingTarget ~= inst then
		return {
			ok = false,
			code = "target_exists",
			error = "Rename target already exists",
			path = fullPath(existingTarget),
			retryable = false,
		}
	end
	local snapshots = {}
	local oldPath = fullPath(inst)
	appendSnapshotTree(inst, snapshots)
	local destinationPath = inst.Parent and (fullPath(inst.Parent) .. "/" .. newName) or newName
	if destinationPath ~= oldPath then
		table.insert(snapshots, snapshotInstance(destinationPath))
	end
	local mutationOk, mutationErr = pcall(function()
		inst.Name = newName
	end)
	if not mutationOk then
		return rollbackMutation(snapshots, "rename_instance_failed", mutationErr, { path = oldPath })
	end
	return { ok = true, previousPath = oldPath, path = fullPath(inst), snapshots = snapshots }
end

local function moveInstanceTool(payload)
	local inst = resolvePath(payload.path)
	if not inst then
		return { ok = false, error = "Instance not found", path = payload.path }
	end
	local hashOk, hashResult = verifyExpectedScriptHash(inst, payload.expectedSourceHash, fullPath(inst))
	if not hashOk then
		return hashResult
	end
	local targetPath = payload.newPath and canonicalizePath(payload.newPath) or ""
	local parent = nil
	local leaf = nil
	local parentPath = ""
	if targetPath ~= "" then
		local parts = splitPath(targetPath)
		leaf = parts[#parts]
		if #parts > 1 then
			parentPath = table.concat(parts, "/", 1, #parts - 1)
			parent = resolvePath(parentPath)
		end
		if not leaf or leaf == "" or (not parent and payload.createParents == false) then
			return { ok = false, error = "Target parent not found", path = payload.path }
		end
	else
		parentPath = canonicalizePath(payload.newParentPath)
		parent = resolvePath(parentPath)
	end
	if targetPath == "" and not parent then
		return { ok = false, error = "Target parent not found", path = payload.path }
	end
	local destinationName = leaf and leaf ~= "" and leaf or inst.Name
	local sourcePath = fullPath(inst)
	local destinationPath = targetPath ~= "" and targetPath or (fullPath(parent) .. "/" .. destinationName)
	if (parent and (parent == inst or parent:IsDescendantOf(inst)))
		or string.sub(destinationPath, 1, #sourcePath + 1) == sourcePath .. "/" then
		return {
			ok = false,
			code = "destination_invalid",
			error = "An instance cannot be moved into its own descendant tree",
			path = sourcePath,
			retryable = false,
		}
	end
	local existingTarget = parent and parent:FindFirstChild(destinationName) or nil
	if existingTarget and existingTarget ~= inst then
		return {
			ok = false,
			code = "target_exists",
			error = "Move target already exists",
			path = fullPath(existingTarget),
			retryable = false,
		}
	end
	local snapshots = {}
	local oldPath = sourcePath
	appendSnapshotTree(inst, snapshots)
	if destinationPath ~= oldPath then
		appendMissingPathSnapshots(destinationPath, snapshots, {})
	end
	local mutationOk, mutationResult = pcall(function()
		local targetParent = parent
		local targetLeaf = leaf
		if targetPath ~= "" and not targetParent then
			targetParent, targetLeaf = ensureParent(targetPath, payload.createParents ~= false)
		end
		if not targetParent then
			error("Target parent not found")
		end
		local currentTarget = targetParent:FindFirstChild(destinationName)
		if currentTarget and currentTarget ~= inst then
			error("Move target already exists")
		end
		if targetLeaf and targetLeaf ~= "" then
			inst.Name = targetLeaf
		end
		inst.Parent = targetParent
		return inst
	end)
	if not mutationOk then
		return rollbackMutation(snapshots, "move_instance_failed", mutationResult, { path = oldPath })
	end
	return { ok = true, previousPath = oldPath, path = fullPath(mutationResult), snapshots = snapshots }
end

local function duplicateInstanceTool(payload)
	local inst = resolvePath(payload.path)
	if not inst then
		return { ok = false, error = "Instance not found", path = payload.path }
	end
	local sourceHashOk, sourceHashResult = verifyExpectedScriptHash(inst, payload.expectedSourceHash, fullPath(inst))
	if not sourceHashOk then
		return sourceHashResult
	end
	local targetPath = canonicalizePath(payload.newPath)
	local parts = splitPath(targetPath)
	local leaf = parts[#parts]
	local parentPath = #parts > 1 and table.concat(parts, "/", 1, #parts - 1) or ""
	local parent = parentPath ~= "" and resolvePath(parentPath) or nil
	if not leaf or leaf == "" or (not parent and payload.createParents == false) then
		return { ok = false, error = "Could not resolve duplicate target", path = payload.newPath }
	end
	local sourcePath = fullPath(inst)
	if (parent and (parent == inst or parent:IsDescendantOf(inst)))
		or string.sub(targetPath, 1, #sourcePath + 1) == sourcePath .. "/" then
		return {
			ok = false,
			code = "destination_invalid",
			error = "An instance cannot be duplicated into its own descendant tree",
			path = sourcePath,
			retryable = false,
		}
	end
	local existing = parent and parent:FindFirstChild(leaf) or nil
	if existing == inst then
		return {
			ok = false,
			code = "source_target_conflict",
			error = "Duplicate target must differ from the source",
			path = fullPath(inst),
			retryable = false,
		}
	end
	if existing and SCRIPT_CLASSES[existing.ClassName] then
		local targetHashOk, targetHashResult =
			verifyExpectedScriptHash(existing, payload.expectedTargetSourceHash, fullPath(existing))
		if not targetHashOk then
			return targetHashResult
		end
	end
	local snapshots = {}
	if existing then
		appendSnapshotTree(existing, snapshots)
	else
		appendMissingPathSnapshots(targetPath, snapshots, {})
	end
	local mutationOk, mutationResult = pcall(function()
		local targetParent = parent
		local targetLeaf = leaf
		if not targetParent then
			targetParent, targetLeaf = ensureParent(targetPath, payload.createParents ~= false)
		end
		if not targetParent or not targetLeaf then
			error("Could not resolve duplicate target")
		end
		local currentTarget = targetParent:FindFirstChild(targetLeaf)
		if currentTarget == inst then
			error("Duplicate target must differ from the source")
		end
		if currentTarget ~= existing then
			error("Duplicate target changed before mutation")
		end
		local clone = inst:Clone()
		if currentTarget then
			currentTarget:Destroy()
		end
		clone.Name = targetLeaf
		clone.Parent = targetParent
		ensureManagedId(clone)
		return clone
	end)
	if not mutationOk then
		return rollbackMutation(snapshots, "duplicate_instance_failed", mutationResult, {
			path = tostring(payload.newPath or ""),
			sourcePath = sourcePath,
		})
	end
	local clone = mutationResult
	return { ok = true, path = fullPath(clone), sourcePath = sourcePath, snapshots = snapshots }
end

local function createScript(payload)
	payload.createOnly = true
	return writeScript(payload)
end

local function deleteScript(payload)
	local inst = resolvePath(payload.path)
	if inst and not SCRIPT_CLASSES[inst.ClassName] then
		return { ok = false, error = "Target is not a script", path = payload.path }
	end
	return deleteInstanceTool(payload)
end

local function updateProperties(payload)
	local inst = resolvePath(payload.path)
	if not inst then
		return { ok = false, error = "Instance not found", path = payload.path }
	end
	local hashOk, hashResult = verifyExpectedScriptHash(inst, payload.expectedSourceHash, fullPath(inst))
	if not hashOk then
		return hashResult
	end
	local snapshots = {}
	table.insert(snapshots, snapshotInstance(fullPath(inst)))
	local errors = {}
	for key, value in pairs(payload.properties or {}) do
		local ok, err = safeSetProperty(inst, key, value)
		if not ok then
			table.insert(errors, { property = key, message = err })
		end
	end
	if #errors > 0 then
		return rollbackMutation(snapshots, "update_properties_failed", "One or more Studio properties could not be updated", {
			path = fullPath(inst),
			errors = errors,
		})
	end
	return { path = fullPath(inst), properties = propertiesOf(inst), errors = {}, snapshots = snapshots, ok = true }
end

local function applyAssetReference(payload)
	local requestedPath = tostring(payload.path or "")
	local inst = resolvePath(requestedPath)
	if not inst then
		return {
			ok = false,
			code = "STUDIO_ASSET_IMPLEMENTATION_FAILED",
			error = "Target instance not found",
			path = requestedPath,
		}
	end

	-- Inspect the exact target and current value before taking a snapshot or
	-- mutating anything. The server has already validated this tuple, but the
	-- live Studio class must still agree.
	local targetPath = fullPath(inst)
	local expectedClassName = tostring(payload.className or "")
	local property = tostring(payload.property or "")
	local previousValue = safePropertyValue(inst, property)
	if inst.ClassName ~= expectedClassName then
		return {
			ok = false,
			code = "STUDIO_ASSET_IMPLEMENTATION_FAILED",
			error = "Target class changed before the asset could be applied",
			path = targetPath,
			className = inst.ClassName,
			expectedClassName = expectedClassName,
			property = property,
		}
	end

	local robloxAssetId = tostring(payload.robloxAssetId or "")
	local assetReference = "rbxassetid://" .. robloxAssetId
	local snapshot = snapshotInstance(targetPath)
	local ok, err = safeSetAssetReference(inst, property, assetReference, expectedClassName)
	local currentValue = safePropertyValue(inst, property)
	local exact = ok and currentValue == assetReference
	local changed = {
		path = targetPath,
		className = inst.ClassName,
		property = property,
		previousValue = previousValue,
		currentValue = currentValue,
	}
	local details = {
		path = targetPath,
		className = inst.ClassName,
		property = property,
		robloxAssetId = robloxAssetId,
		assetRecordId = tostring(payload.assetRecordId or ""),
		assetReference = assetReference,
		previousValue = previousValue,
		currentValue = currentValue,
		changedInstances = { changed },
		snapshotIds = { snapshot.id },
		affectedPaths = { targetPath },
	}

	if not exact then
		return rollbackMutation(
			{ snapshot },
			"STUDIO_ASSET_IMPLEMENTATION_FAILED",
			err or "Studio did not retain the exact Roblox asset reference",
			details
		)
	end

	details.ok = true
	details.snapshots = { snapshot }
	return details
end

local function updateAttributes(payload)
	local inst = resolvePath(payload.path)
	if not inst then
		return { ok = false, error = "Instance not found", path = payload.path }
	end
	local hashOk, hashResult = verifyExpectedScriptHash(inst, payload.expectedSourceHash, fullPath(inst))
	if not hashOk then
		return hashResult
	end
	local snapshots = { snapshotInstance(fullPath(inst)) }
	local mutationOk, mutationErr = pcall(function()
		for key, value in pairs(payload.attributes or payload.values or {}) do
			inst:SetAttribute(tostring(key), value)
		end
	end)
	if not mutationOk then
		return rollbackMutation(snapshots, "update_attributes_failed", mutationErr, {
			path = fullPath(inst),
		})
	end
	return { ok = true, path = fullPath(inst), attributes = attributesOf(inst), snapshots = snapshots }
end

local function updateTags(payload)
	local inst = resolvePath(payload.path)
	if not inst then
		return { ok = false, error = "Instance not found", path = payload.path }
	end
	local hashOk, hashResult = verifyExpectedScriptHash(inst, payload.expectedSourceHash, fullPath(inst))
	if not hashOk then
		return hashResult
	end
	local snapshots = { snapshotInstance(fullPath(inst)) }
	local mutationOk, mutationErr = pcall(function()
		if payload.set ~= nil then
			for _, tag in ipairs(CollectionService:GetTags(inst)) do
				CollectionService:RemoveTag(inst, tag)
			end
			for _, tag in ipairs(payload.set or {}) do
				CollectionService:AddTag(inst, tostring(tag))
			end
		else
			for _, tag in ipairs(payload.remove or {}) do
				CollectionService:RemoveTag(inst, tostring(tag))
			end
			for _, tag in ipairs(payload.add or {}) do
				CollectionService:AddTag(inst, tostring(tag))
			end
		end
	end)
	if not mutationOk then
		return rollbackMutation(snapshots, "update_tags_failed", mutationErr, {
			path = fullPath(inst),
		})
	end
	return { ok = true, path = fullPath(inst), tags = CollectionService:GetTags(inst), snapshots = snapshots }
end

local function replaceInFiles(payload)
	local paths = payload.paths or {}
	if #paths == 0 then
		for _, inst in ipairs(game:GetDescendants()) do
			if SCRIPT_CLASSES[inst.ClassName] then
				table.insert(paths, fullPath(inst))
			end
		end
	end
	local maxFiles = math.clamp(tonumber(payload.maxFiles) or 120, 1, 500)
	local candidates = {}
	local snapshots = {}
	local find = tostring(payload.find or "")
	local replace = tostring(payload.replace or "")
	local expectedSourceHashes = type(payload.expectedSourceHashes) == "table" and payload.expectedSourceHashes or {}
	if find == "" then
		return { ok = false, error = "find is required" }
	end
	for _, path in ipairs(paths) do
		if #candidates >= maxFiles then
			break
		end
		local inst = resolvePath(path)
		if inst and SCRIPT_CLASSES[inst.ClassName] then
			local readOk, source = readScriptSource(inst)
			if not readOk then
				return {
					ok = false,
					code = "source_read_failed",
					error = "Could not read script source",
					path = fullPath(inst),
					retryable = false,
				}
			end
			local hay = source
			local needle = find
			if payload.caseSensitive == false then
				hay = string.lower(source)
				needle = string.lower(find)
			end
			if string.find(hay, needle, 1, true) then
				local canonicalPath = fullPath(inst)
				local expectedHash = expectedSourceHashes[canonicalPath] or expectedSourceHashes[tostring(path)]
				local hashOk, hashResult = verifyExpectedScriptHash(inst, expectedHash, canonicalPath)
				if not hashOk then
					return hashResult
				end
				local nextSource
				if payload.caseSensitive == false then
					nextSource = source
					local startIndex, endIndex = string.find(string.lower(nextSource), needle, 1, true)
					while startIndex do
						nextSource = string.sub(nextSource, 1, startIndex - 1) .. replace .. string.sub(nextSource, endIndex + 1)
						startIndex, endIndex = string.find(string.lower(nextSource), needle, startIndex + #replace, true)
					end
				else
					nextSource = string.gsub(source, escapePattern(find), escapeReplacement(replace))
				end
				table.insert(candidates, {
					instance = inst,
					path = canonicalPath,
					source = source,
					nextSource = nextSource,
				})
			end
		end
	end
	for _, candidate in ipairs(candidates) do
		local contextValidation = ScriptContextGuard.validate({
			className = candidate.instance.ClassName,
			path = candidate.path,
			source = candidate.nextSource,
		})
		if not contextValidation.ok then
			return ScriptContextGuard.failure(contextValidation)
		end
	end
	for _, candidate in ipairs(candidates) do
		table.insert(snapshots, snapshotInstance(candidate.path))
	end

	local results = {}
	for _, candidate in ipairs(candidates) do
		local wrote, writeErr = writeScriptSource(candidate.instance, candidate.nextSource)
		if not wrote then
			return rollbackMutation(snapshots, "replace_in_files_failed", writeErr or "Could not replace script source", {
				path = candidate.path,
				files = results,
				filesChanged = #results,
			})
		end
		table.insert(results, {
			path = candidate.path,
			previousHash = stableHash(candidate.source),
			sourceHash = stableHash(candidate.nextSource),
		})
	end
	return { ok = true, filesChanged = #results, files = results, snapshots = snapshots }
end

local function createSnapshotTool(payload)
	local snapshots = {}
	for _, path in ipairs(payload.paths or {}) do
		local inst = resolvePath(path)
		if inst and payload.recursive ~= false then
			appendSnapshotTree(inst, snapshots)
		else
			table.insert(snapshots, snapshotInstance(path))
		end
	end
	return { snapshots = snapshots, snapshotCount = #snapshots }
end

local function runSmokeCheck(payload)
	local maxScripts = math.clamp(tonumber(payload.maxScripts) or 200, 10, 500)
	local checked = 0
	local issues = {}
	local function scan(inst)
		if checked >= maxScripts then
			return
		end
		if SCRIPT_CLASSES[inst.ClassName] then
			checked = checked + 1
			local ok, source = readScriptSource(inst)
			if not ok then
				table.insert(issues, { path = fullPath(inst), message = "Could not read source" })
			elseif payload.includeSourceScan ~= false then
				local contextValidation = ScriptContextGuard.validate({
					className = inst.ClassName,
					path = fullPath(inst),
					source = source,
				})
				for _, finding in ipairs(contextValidation.findings or {}) do
					table.insert(issues, {
						path = fullPath(inst),
						code = finding.ruleCode,
						ruleCode = finding.ruleCode,
						severity = finding.severity,
						message = finding.message,
						explanation = finding.explanation,
						line = finding.line,
					})
				end
				if source:find("TODO", 1, true) then
					table.insert(issues, { path = fullPath(inst), message = "Contains TODO marker" })
				end
				if source:find("while true do", 1, true) and not source:find("task.wait", 1, true) then
					table.insert(issues, { path = fullPath(inst), message = "Possible unthrottled while true loop" })
				end
			end
		end
		for _, child in ipairs(inst:GetChildren()) do
			scan(child)
		end
	end
	scan(game)
	return { checkedScripts = checked, issues = issues, ok = #issues == 0 }
end

local function parseLuau(payload)
	local source = tostring(payload.source or "")
	local path = tostring(payload.path or "")
	if source == "" and path ~= "" then
		local inst = resolvePath(path)
		if inst and SCRIPT_CLASSES[inst.ClassName] then
			local ok, existing = readScriptSource(inst)
			if ok then
				source = existing
			end
		end
	end
	local diagnostics = {}
	if source:gsub("%s+", "") == "" then
		table.insert(diagnostics, { severity = "error", message = "Source is empty" })
	end
	if source:find("```", 1, true) then
		table.insert(diagnostics, { severity = "error", message = "Source contains markdown fence" })
	end
	if source:find("<file", 1, true) or source:find("</file>", 1, true) then
		table.insert(diagnostics, { severity = "error", message = "Source contains leaked file markup" })
	end
	local balance = 0
	for token in source:gmatch("[%(%)]") do
		if token == "(" then
			balance = balance + 1
		else
			balance = balance - 1
		end
		if balance < 0 then
			table.insert(diagnostics, { severity = "warning", message = "Possible unmatched closing parenthesis" })
			break
		end
	end
	if balance > 0 then
		table.insert(diagnostics, { severity = "warning", message = "Possible unmatched opening parenthesis" })
	end
	return {
		path = path ~= "" and path or nil,
		ok = #diagnostics == 0,
		diagnostics = diagnostics,
		sourceHash = stableHash(source),
		sourceLength = #source,
	}
end

local function ensureCleanFolder(parent, folderName, snapshots)
	local existing = parent:FindFirstChild(folderName)
	if existing then
		if snapshots then
			appendSnapshotTree(existing, snapshots)
		end
		existing:Destroy()
	elseif snapshots then
		table.insert(snapshots, snapshotInstance(fullPath(parent) .. "/" .. folderName))
	end
	local folder = Instance.new("Folder")
	folder.Name = folderName
	folder.Parent = parent
	return folder
end

-- Lightweight pre-apply Luau sanity check. Studio plugins can't compile Luau
-- from a string, so this is a conservative static check (only high-confidence
-- problems) whose diagnostics are reported back to the backend.
local function validateLuauSource(source)
	local issues = {}
	local src = tostring(source or "")
	if src:gsub("%s+", "") == "" then
		table.insert(issues, "empty source")
		return false, issues
	end
	if src:find("```", 1, true) then
		table.insert(issues, "contains markdown code fence (```)")
	end
	if src:find("<file", 1, true) or src:find("</file>", 1, true) then
		table.insert(issues, "contains leaked <file> tag")
	end
	if src:find("TODO", 1, true) or src:find("your code here", 1, true) then
		table.insert(issues, "contains placeholder / TODO text")
	end
	return #issues == 0, issues
end

function ScriptContextGuard.resolveScriptClassName(className)
	return tostring(className or "")
end

function ScriptContextGuard.validateScriptDescriptors(descriptors)
	local findings = {}
	local contexts = {}
	for _, descriptor in ipairs(descriptors or {}) do
		local validation = ScriptContextGuard.validate(descriptor)
		contexts[validation.requiredContext or "unknown"] = true
		for _, finding in ipairs(validation.findings or {}) do
			table.insert(findings, finding)
		end
	end
	local requiredContext = "unknown"
	if contexts.mixed then
		requiredContext = "mixed"
	elseif contexts.client and contexts.server then
		requiredContext = "unknown"
	elseif contexts.client then
		requiredContext = "client"
	elseif contexts.server then
		requiredContext = "server"
	elseif contexts.module then
		requiredContext = "module"
	end
	return {
		ok = #findings == 0,
		status = #findings == 0 and "valid" or "blocked",
		requiredContext = requiredContext,
		findings = findings,
		adjustments = {},
	}
end

local function applyArtifactLegacy(payload)
	local projectName = payload.projectName or "NexusRBX_Project"
	local serviceFolders = {}
	local fileResults = {}
	local validationFailures = 0
	local snapshots = {}
	local contextDescriptors = {}
	for _, scriptSpec in ipairs(payload.scripts or {}) do
		local serviceName = tostring(scriptSpec.service or "")
		local className = ScriptContextGuard.resolveScriptClassName(scriptSpec.className)
		local name = tostring(scriptSpec.name or className)
		table.insert(contextDescriptors, {
			className = className,
			path = serviceName ~= "" and (serviceName .. "/" .. projectName .. "/" .. name) or "",
			source = scriptSpec.source,
		})
	end
	local contextValidation = ScriptContextGuard.validateScriptDescriptors(contextDescriptors)
	if not contextValidation.ok then
		return ScriptContextGuard.failure(contextValidation)
	end

	local executionOk, executionErr = pcall(function()
		for _, scriptSpec in ipairs(payload.scripts or {}) do
			local serviceName = tostring(scriptSpec.service)
			local serviceRoot = getServiceRoot(serviceName)
			if not serviceFolders[serviceName] then
				serviceFolders[serviceName] = ensureCleanFolder(serviceRoot, projectName, snapshots)
			end
			local name = scriptSpec.name or scriptSpec.className
			local valid, issues = validateLuauSource(scriptSpec.source)
			if not valid then
				validationFailures = validationFailures + 1
			end
			local applyOk, applyErr = pcall(function()
				local inst = Instance.new(ScriptContextGuard.resolveScriptClassName(scriptSpec.className))
				inst.Name = name
				inst.Parent = serviceFolders[serviceName]
				local ok, err = writeScriptSource(inst, scriptSpec.source or "")
				if not ok then
					error(err or "Could not write script source")
				end
			end)
			table.insert(fileResults, {
				name = name,
				service = serviceName,
				ok = applyOk,
				valid = valid,
				issues = issues,
				error = (not applyOk) and tostring(applyErr) or nil,
			})
			if not applyOk then
				error(applyErr or ("Could not apply " .. tostring(name)))
			end
		end

		if #(payload.remotes or {}) > 0 then
			local remoteFolder =
				serviceFolders["ReplicatedStorage"] or ensureCleanFolder(ReplicatedStorage, projectName, snapshots)
			for _, remoteSpec in ipairs(payload.remotes or {}) do
				local remote = Instance.new(remoteSpec.className == "RemoteFunction" and "RemoteFunction" or "RemoteEvent")
				remote.Name = remoteSpec.name or remote.ClassName
				remote.Parent = remoteFolder
			end
		end
		for _, screenSpec in ipairs(payload.screenGuis or {}) do
			local screenPath = "StarterGui/" .. (screenSpec.name or "NexusRBXScreen")
			local existing = resolvePath(screenPath)
			if existing then
				appendSnapshotTree(existing, snapshots)
			else
				appendMissingPathSnapshots(screenPath, snapshots, {})
			end
			createOrReplaceInstance(screenPath, "ScreenGui", {
				ResetOnSpawn = screenSpec.resetOnSpawn ~= false,
				IgnoreGuiInset = screenSpec.ignoreGuiInset ~= false,
			}, true)
		end
	end)

	if not executionOk then
		return rollbackMutation(snapshots, "apply_artifact_failed", executionErr, {
			files = fileResults,
			validation = { failures = math.max(1, validationFailures), total = #(payload.scripts or {}) },
		})
	end
	return {
		ok = true,
		scripts = #(payload.scripts or {}),
		remotes = #(payload.remotes or {}),
		screenGuis = #(payload.screenGuis or {}),
		warnings = payload.warnings or {},
		files = fileResults,
		validation = { failures = validationFailures, total = #(payload.scripts or {}) },
		snapshots = snapshots,
	}
end

local function leafNameFromPath(path)
	local parts = splitPath(path)
	return parts[#parts] or ""
end

local function buildManagedIndexes(payload)
	local fileById = {}
	local fileByPath = {}
	local manifestById = {}
	local manifestByPath = {}
	local preconditionsByFileId = {}
	local preconditionsByPath = {}

	for _, file in ipairs(payload.files or {}) do
		local fileId = tostring(file.fileId or file.id or "")
		local path = tostring(file.path or "")
		local entry = {
			fileId = fileId,
			path = path,
			placement = file.placement,
			kind = file.kind,
			content = file.content or "",
			className = ScriptContextGuard.resolveScriptClassName(file.className),
			name = file.name or leafNameFromPath(path),
			allowClassChange = file.allowClassChange == true,
			inspectedClassName = ScriptContextGuard.resolveScriptClassName(file.inspectedClassName),
			expectedSourceHash = tostring(file.expectedSourceHash or ""),
		}
		if fileId ~= "" then
			fileById[fileId] = entry
		end
		if path ~= "" then
			fileByPath[path] = entry
		end
	end

	for _, file in ipairs(payload.managedManifest or {}) do
		local fileId = tostring(file.fileId or "")
		local path = tostring(file.canonicalPath or "")
		if fileId ~= "" then
			manifestById[fileId] = file
		end
		if path ~= "" then
			manifestByPath[path] = file
		end
	end

	for _, item in ipairs(payload.studioPreconditions or {}) do
		local fileId = tostring(item.fileId or "")
		local path = tostring(item.path or "")
		if fileId ~= "" then
			preconditionsByFileId[fileId] = item
		end
		if path ~= "" then
			preconditionsByPath[path] = item
		end
	end

	return {
		fileById = fileById,
		fileByPath = fileByPath,
		manifestById = manifestById,
		manifestByPath = manifestByPath,
		preconditionsByFileId = preconditionsByFileId,
		preconditionsByPath = preconditionsByPath,
	}
end

function ScriptContextGuard.validateManagedScriptContexts(payload, indexes)
	local descriptors = {}
	for _, file in ipairs(payload.files or {}) do
		table.insert(descriptors, {
			className = ScriptContextGuard.resolveScriptClassName(file.className),
			path = tostring(file.path or file.placement or ""),
			source = file.content,
		})
	end
	for _, op in ipairs(payload.operations or {}) do
		local opType = tostring(op.type or "")
		if opType == "upsert" then
			local spec = indexes.fileById[tostring(op.id or "")] or indexes.fileByPath[tostring(op.path or "")]
			table.insert(descriptors, {
				className = spec and spec.className or "",
				path = tostring(op.path or (spec and spec.path) or ""),
				source = spec and spec.content or "",
			})
		elseif opType == "rename" then
			local spec = indexes.fileById[tostring(op.id or "")] or indexes.fileByPath[tostring(op.toPath or "")]
			local manifestEntry = indexes.manifestById[tostring(op.id or "")]
				or indexes.manifestByPath[tostring(op.fromPath or "")]
			table.insert(descriptors, {
				className = ScriptContextGuard.resolveScriptClassName(
					(spec and spec.className) or (manifestEntry and manifestEntry.className)
				),
				path = tostring(op.toPath or ""),
				source = spec and spec.content or "",
			})
		end
	end
	return ScriptContextGuard.validateScriptDescriptors(descriptors)
end

local function validateManagedOperations(operations)
	local errors = {}
	local targetPaths = {}
	local renameSources = {}
	local deleteTargets = {}
	for index, op in ipairs(operations or {}) do
		local opType = tostring(op.type or "")
		if opType == "upsert" then
			local targetPath = tostring(op.path or "")
			if targetPath == "" then
				table.insert(errors, ("Upsert %d is missing path"):format(index))
			elseif targetPaths[targetPath] then
				table.insert(errors, "Duplicate target path: " .. targetPath)
			else
				targetPaths[targetPath] = true
			end
		elseif opType == "delete" then
			local targetPath = tostring(op.path or "")
			if targetPath == "" then
				table.insert(errors, ("Delete %d is missing path"):format(index))
			elseif deleteTargets[targetPath] then
				table.insert(errors, "Duplicate delete path: " .. targetPath)
			else
				deleteTargets[targetPath] = true
			end
		elseif opType == "rename" then
			local fromPath = tostring(op.fromPath or "")
			local toPath = tostring(op.toPath or "")
			if fromPath == "" or toPath == "" then
				table.insert(errors, ("Rename %d is missing paths"):format(index))
			elseif fromPath == toPath then
				table.insert(errors, ("Rename %d does not change path"):format(index))
			else
				if renameSources[fromPath] then
					table.insert(errors, "Duplicate rename source: " .. fromPath)
				end
				if deleteTargets[fromPath] then
					table.insert(errors, "Conflicting rename/delete for " .. fromPath)
				end
				if targetPaths[toPath] then
					table.insert(errors, "Duplicate target path: " .. toPath)
				end
				renameSources[fromPath] = true
				targetPaths[toPath] = true
			end
		else
			table.insert(errors, ("Unsupported operation type: %s"):format(opType))
		end
	end
	return errors
end

local function snapshotOnce(target, snapshots, seenPaths)
	local path = typeof(target) == "Instance" and fullPath(target) or tostring(target or "")
	if path == "" or seenPaths[path] then
		return
	end
	if typeof(target) == "Instance" then
		seenPaths[path] = true
		appendSnapshotTree(target, snapshots)
	else
		local existing = resolvePath(path)
		if existing then
			seenPaths[path] = true
			appendSnapshotTree(existing, snapshots)
		else
			appendMissingPathSnapshots(path, snapshots, seenPaths)
		end
	end
end

local function findManagedInstanceByFileId(fileId, expectedClass)
	if not fileId or fileId == "" then
		return nil, nil
	end
	local matches = {}
	for _, inst in ipairs(game:GetDescendants()) do
		if inst:GetAttribute(AGENT_FILE_ID_ATTRIBUTE) == fileId
			and (not expectedClass or inst.ClassName == expectedClass) then
			table.insert(matches, inst)
		end
	end
	if #matches == 1 then
		return matches[1], nil
	end
	if #matches > 1 then
		return nil, "ambiguous"
	end
	return nil, nil
end

function ScriptContextGuard.managedClassChangeCredentials(spec, indexes)
	local fileId = tostring(spec.fileId or spec.id or "")
	local precondition = indexes.preconditionsByFileId[fileId]
		or indexes.preconditionsByPath[tostring(spec.path or "")]
	local inspectedClassName = tostring(spec.inspectedClassName or "")
	if inspectedClassName == "" and precondition then
		inspectedClassName = tostring(precondition.className or "")
	end
	local expectedSourceHash = tostring(spec.expectedSourceHash or "")
	if expectedSourceHash == "" and precondition then
		expectedSourceHash = tostring(precondition.sourceHash or "")
	end
	return {
		allowed = spec.allowClassChange == true,
		inspectedClassName = ScriptContextGuard.resolveScriptClassName(inspectedClassName),
		expectedSourceHash = expectedSourceHash,
	}
end

function ScriptContextGuard.canChangeManagedClass(spec, indexes, inst, expectedClass)
	if not inst or inst.ClassName == expectedClass then
		return true
	end
	local credentials = ScriptContextGuard.managedClassChangeCredentials(spec, indexes)
	return credentials.allowed
		and credentials.inspectedClassName == inst.ClassName
		and credentials.expectedSourceHash ~= ""
end

local function findUniqueLeafMatch(path, expectedClass)
	local parent, leaf = ensureParent(path, false)
	if not parent or not leaf then
		return nil, nil
	end
	local matches = {}
	for _, child in ipairs(parent:GetChildren()) do
		if child.Name == leaf and child.ClassName == expectedClass then
			table.insert(matches, child)
		end
	end
	if #matches == 1 then
		return matches[1], nil
	end
	if #matches > 1 then
		return nil, "ambiguous"
	end
	return nil, nil
end

local function resolveManagedTarget(spec, indexes, currentPathOverride)
	local fileId = tostring(spec.fileId or spec.id or "")
	local expectedClass = ScriptContextGuard.resolveScriptClassName(spec.className)
	local canonicalPath = tostring(currentPathOverride or spec.path or "")
	if not SCRIPT_CLASSES[expectedClass] then
		return {
			ok = false,
			code = "SCRIPT_CONTEXT_MISMATCH",
			message = "Managed script is missing an explicit className",
		}
	end
	local attrMatch, attrError = findManagedInstanceByFileId(fileId, nil)
	if attrError == "ambiguous" then
		return { ok = false, code = "ambiguous", message = "Multiple Studio instances share the same AgentFileId" }
	end
	if attrMatch then
		if not ScriptContextGuard.canChangeManagedClass(spec, indexes, attrMatch, expectedClass) then
			return {
				ok = false,
				code = "SCRIPT_CONTEXT_MISMATCH",
				message = "Changing an existing managed script class requires allowClassChange, the inspected class, and the inspected source hash.",
			}
		end
		return { ok = true, instance = attrMatch, expectedClass = expectedClass, matchType = "file_id" }
	end

	local exact = canonicalPath ~= "" and resolvePath(canonicalPath) or nil
	if exact then
		if not SCRIPT_CLASSES[exact.ClassName] then
			return {
				ok = false,
				code = "class_mismatch",
				message = ("Expected %s at %s but found %s"):format(expectedClass, canonicalPath, exact.ClassName),
			}
		end
		if not ScriptContextGuard.canChangeManagedClass(spec, indexes, exact, expectedClass) then
			return {
				ok = false,
				code = "SCRIPT_CONTEXT_MISMATCH",
				message = "Changing an existing managed script class requires allowClassChange, the inspected class, and the inspected source hash.",
			}
		end
		return { ok = true, instance = exact, expectedClass = expectedClass, matchType = "canonical_path" }
	end

	local leafMatch, leafError = findUniqueLeafMatch(canonicalPath, expectedClass)
	if leafError == "ambiguous" then
		return {
			ok = false,
			code = "ambiguous",
			message = ("Ambiguous Studio leaf-name match for %s"):format(canonicalPath),
		}
	end
	if leafMatch then
		return { ok = true, instance = leafMatch, expectedClass = expectedClass, matchType = "leaf_name" }
	end

	return { ok = true, instance = nil, expectedClass = expectedClass, matchType = "create" }
end

local function checkStudioPreconditions(inst, spec, manifestEntry, indexes)
	if not inst or not SCRIPT_CLASSES[inst.ClassName] then
		return true, nil, nil
	end
	local ok, source = readScriptSource(inst)
	if not ok then
		return false, "Could not read Studio script source", nil
	end
	local currentHash = stableHash(source)
	local fileId = tostring(spec.fileId or spec.id or "")
	local precondition = indexes.preconditionsByFileId[fileId] or indexes.preconditionsByPath[tostring(spec.path or "")]
	local credentials = ScriptContextGuard.managedClassChangeCredentials(spec, indexes)
	if credentials.expectedSourceHash ~= "" and credentials.expectedSourceHash ~= currentHash then
		return false, "Studio source hash no longer matches the inspected target", currentHash
	end
	if precondition and tostring(precondition.sourceHash or "") ~= "" and tostring(precondition.sourceHash) ~= currentHash then
		return false, "Studio source precondition hash mismatch", currentHash
	end
	if manifestEntry and tostring(manifestEntry.lastAppliedSourceHash or "") ~= "" and tostring(manifestEntry.lastAppliedSourceHash) ~= currentHash then
		return false, "Studio source changed independently since the last managed apply", currentHash
	end
	return true, nil, currentHash
end

local function waitForExpectedScriptSource(inst, expectedSource)
	local expectedHash = stableHash(expectedSource)
	local lastHash = nil
	for attempt = 1, 6 do
		local ok, source = readScriptSource(inst)
		if ok then
			lastHash = stableHash(source)
			if lastHash == expectedHash then
				return true, expectedHash
			end
		end
		if attempt < 6 then
			task.wait(0.05)
		end
	end
	return false, lastHash, expectedHash
end

local function applyManagedUpsert(spec, resolved, indexes, snapshots, seenPaths)
	local targetPath = tostring(spec.path or "")
	local expectedClass = ScriptContextGuard.resolveScriptClassName(spec.className)
	if not SCRIPT_CLASSES[expectedClass] then
		return nil, "Managed upsert is missing an explicit className"
	end
	local inst = resolved.instance
	local manifestEntry = indexes.manifestById[tostring(spec.fileId or spec.id or "")] or indexes.manifestByPath[targetPath]
	if inst then
		local ok, preconditionError = checkStudioPreconditions(inst, spec, manifestEntry, indexes)
		if not ok then
			return nil, preconditionError
		end
		snapshotOnce(inst, snapshots, seenPaths)
		if inst.ClassName ~= expectedClass then
			if not ScriptContextGuard.canChangeManagedClass(spec, indexes, inst, expectedClass) then
				return nil, "Managed script class conversion is not authorized"
			end
			local previous = inst
			local previousParent = previous.Parent
			local previousName = previous.Name
			local previousAttributes = previous:GetAttributes()
			previous:Destroy()
			inst = Instance.new(expectedClass)
			inst.Name = previousName
			for attributeName, attributeValue in pairs(previousAttributes) do
				inst:SetAttribute(attributeName, attributeValue)
			end
			inst.Parent = previousParent
		end
	else
		snapshotOnce(targetPath, snapshots, seenPaths)
		local parent, leaf = ensureParent(targetPath, true)
		if not parent or not leaf then
			return nil, "Could not resolve parent for " .. targetPath
		end
		inst = Instance.new(expectedClass)
		inst.Name = leaf
		inst.Parent = parent
	end

	if inst.ClassName ~= expectedClass then
		return nil, ("Expected %s but found %s"):format(expectedClass, inst.ClassName)
	end

	inst:SetAttribute(AGENT_ARTIFACT_ID_ATTRIBUTE, tostring(spec.artifactId or ""))
	inst:SetAttribute(AGENT_FILE_ID_ATTRIBUTE, tostring(spec.fileId or spec.id or ""))
	local parent, leaf = ensureParent(targetPath, true)
	if not parent or not leaf then
		return nil, "Could not resolve parent for " .. targetPath
	end
	inst.Name = leaf
	inst.Parent = parent
	local wrote, writeErr = writeScriptSource(inst, spec.content or "")
	if not wrote then
		return nil, writeErr or "Could not update Studio script source"
	end
	local readbackOk, appliedHash, expectedHash = waitForExpectedScriptSource(inst, tostring(spec.content or ""))
	if not readbackOk then
		return nil, ("Studio source did not settle to the applied content (expected %s, read %s)"):format(
			tostring(expectedHash or ""),
			tostring(appliedHash or "unavailable")
		)
	end
	return inst, nil, appliedHash
end

local function buildManagedFileRecord(inst, spec, knownSourceHash)
	local ok, source = readScriptSource(inst)
	local sourceText = ok and source or (spec.content or "")
	return {
		fileId = tostring(spec.fileId or spec.id or ""),
		canonicalPath = tostring(spec.path or fullPath(inst)),
		placement = tostring(spec.placement or ""),
		kind = tostring(spec.kind or "module"),
		className = inst.ClassName,
		lastAppliedSourceHash = knownSourceHash or stableHash(sourceText),
		lastResolvedStudioPath = fullPath(inst),
	}
end

local function applyArtifact(payload)
	if tonumber(payload.schemaVersion or 1) < 2 then
		return applyArtifactLegacy(payload)
	end

	local operations = payload.operations or {}
	local snapshots = {}
	local seenPaths = {}
	local fileResults = {}
	local indexes = buildManagedIndexes(payload)
	local validationErrors = validateManagedOperations(operations)
	local contextValidation = ScriptContextGuard.validateManagedScriptContexts(payload, indexes)
	local managedFiles = {}
	local finalFiles = {}

	for _, spec in pairs(indexes.fileById) do
		table.insert(finalFiles, spec)
	end
	if not contextValidation.ok then
		return ScriptContextGuard.failure(contextValidation)
	end
	if #validationErrors > 0 then
		return {
			ok = false,
			error = table.concat(validationErrors, " | "),
			files = fileResults,
			validation = { failures = #validationErrors, total = #operations },
			snapshots = snapshots,
		}
	end

	local function pushResult(base, ok, err)
		local row = base
		row.ok = ok
		if not ok then
			row.error = tostring(err or "Unknown Studio apply failure")
		end
		table.insert(fileResults, row)
	end

	local executionOk, executionErr = pcall(function()
		for _, phase in ipairs({ "rename", "delete", "upsert" }) do
			for _, op in ipairs(operations) do
				if op.type == phase then
					if phase == "rename" then
						local manifestEntry = indexes.manifestById[tostring(op.id or "")] or indexes.manifestByPath[tostring(op.fromPath or "")]
						local spec = indexes.fileById[tostring(op.id or "")] or indexes.fileByPath[tostring(op.toPath or "")]
						spec = spec or {
							fileId = tostring(op.id or ""),
							id = tostring(op.id or ""),
							path = tostring(op.toPath or ""),
							kind = manifestEntry and manifestEntry.kind,
							placement = manifestEntry and manifestEntry.placement or splitPath(op.toPath)[1],
							className = ScriptContextGuard.resolveScriptClassName(manifestEntry and manifestEntry.className),
						}
						spec.artifactId = payload.artifactId
						local resolved = resolveManagedTarget(spec, indexes, tostring(op.fromPath or ""))
						if not resolved.ok then
							pushResult({ type = phase, path = tostring(op.fromPath or ""), toPath = tostring(op.toPath or "") }, false, resolved.message)
							error(resolved.message)
						end
						if not resolved.instance then
							pushResult({ type = phase, path = tostring(op.fromPath or ""), toPath = tostring(op.toPath or "") }, false, "Rename source not found")
							error("Rename source not found")
						end
						local ok, preconditionError = checkStudioPreconditions(resolved.instance, spec, manifestEntry, indexes)
						if not ok then
							pushResult({ type = phase, path = tostring(op.fromPath or ""), toPath = tostring(op.toPath or "") }, false, preconditionError)
							error(preconditionError)
						end
						snapshotOnce(resolved.instance, snapshots, seenPaths)
						snapshotOnce(tostring(op.toPath or ""), snapshots, seenPaths)
						local parent, leaf = ensureParent(tostring(op.toPath or ""), true)
						if not parent or not leaf then
							pushResult({ type = phase, path = tostring(op.fromPath or ""), toPath = tostring(op.toPath or "") }, false, "Could not resolve rename target parent")
							error("Could not resolve rename target parent")
						end
						resolved.instance.Name = leaf
						resolved.instance.Parent = parent
						resolved.instance:SetAttribute(AGENT_ARTIFACT_ID_ATTRIBUTE, tostring(payload.artifactId or ""))
						resolved.instance:SetAttribute(AGENT_FILE_ID_ATTRIBUTE, tostring(spec.fileId or spec.id or ""))
						pushResult({ type = phase, path = tostring(op.fromPath or ""), toPath = tostring(op.toPath or "") }, true, nil)
					elseif phase == "delete" then
						local manifestEntry = indexes.manifestById[tostring(op.id or "")] or indexes.manifestByPath[tostring(op.path or "")]
						local spec = manifestEntry and {
							fileId = tostring(manifestEntry.fileId or op.id or ""),
							id = tostring(manifestEntry.fileId or op.id or ""),
							path = tostring(manifestEntry.canonicalPath or op.path or ""),
							kind = manifestEntry.kind,
							placement = manifestEntry.placement,
							className = ScriptContextGuard.resolveScriptClassName(manifestEntry.className),
						} or {
							fileId = tostring(op.id or ""),
							id = tostring(op.id or ""),
							path = tostring(op.path or ""),
							kind = nil,
							placement = splitPath(op.path)[1],
							className = "",
						}
						local resolved = resolveManagedTarget(spec, indexes, tostring(op.path or ""))
						if not resolved.ok then
							pushResult({ type = phase, path = tostring(op.path or "") }, false, resolved.message)
							error(resolved.message)
						end
						if resolved.instance then
							local ok, preconditionError = checkStudioPreconditions(resolved.instance, spec, manifestEntry, indexes)
							if not ok then
								pushResult({ type = phase, path = tostring(op.path or "") }, false, preconditionError)
								error(preconditionError)
							end
							snapshotOnce(resolved.instance, snapshots, seenPaths)
							resolved.instance:Destroy()
						else
							snapshotOnce(tostring(op.path or ""), snapshots, seenPaths)
						end
						pushResult({ type = phase, path = tostring(op.path or "") }, true, nil)
					else
						local spec = indexes.fileById[tostring(op.id or "")] or indexes.fileByPath[tostring(op.path or "")]
						if not spec then
							pushResult({ type = phase, path = tostring(op.path or "") }, false, "Upsert is missing an explicit file descriptor")
							error("Upsert is missing an explicit file descriptor")
						end
						spec.allowClassChange = op.allowClassChange == true or spec.allowClassChange == true
						if tostring(op.inspectedClassName or "") ~= "" then
							spec.inspectedClassName = op.inspectedClassName
						end
						if tostring(op.expectedSourceHash or "") ~= "" then
							spec.expectedSourceHash = op.expectedSourceHash
						end
						spec.artifactId = payload.artifactId
						local resolved = resolveManagedTarget(spec, indexes, tostring(op.path or spec.path or ""))
						if not resolved.ok then
							pushResult({ type = phase, path = tostring(op.path or "") }, false, resolved.message)
							error(resolved.message)
						end
						local inst, applyErr, appliedHash = applyManagedUpsert(spec, resolved, indexes, snapshots, seenPaths)
						if not inst then
							pushResult({ type = phase, path = tostring(op.path or "") }, false, applyErr)
							error(applyErr)
						end
						managedFiles[tostring(spec.fileId or spec.id or "")] = buildManagedFileRecord(inst, spec, appliedHash)
						pushResult({ type = phase, path = tostring(op.path or "") }, true, nil)
					end
				end
			end
		end

		for _, spec in ipairs(finalFiles) do
			local resolved = resolveManagedTarget(spec, indexes, tostring(spec.path or ""))
			local fileId = tostring(spec.fileId or spec.id or "")
			if resolved.ok and resolved.instance and managedFiles[fileId] == nil then
				managedFiles[fileId] = buildManagedFileRecord(resolved.instance, spec)
			end
		end
	end)

	if not executionOk then
		return rollbackMutation(snapshots, "apply_artifact_failed", tostring(executionErr), {
			files = fileResults,
			validation = { failures = 1, total = #operations },
			managedFiles = {},
		})
	end

	local managedList = {}
	for _, record in pairs(managedFiles) do
		table.insert(managedList, record)
	end

	return {
		ok = true,
		artifactId = payload.artifactId,
		revision = payload.revision,
		files = fileResults,
		managedFiles = managedList,
		validation = { failures = 0, total = #operations },
		warnings = payload.warnings or {},
		snapshots = snapshots,
	}
end
