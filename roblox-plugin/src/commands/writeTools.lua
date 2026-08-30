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

UiArtifact = {}
UiArtifact.NODE_CLASSES = {
	Frame = true,
	TextLabel = true,
	TextButton = true,
	ImageLabel = true,
	ImageButton = true,
	TextBox = true,
	ScrollingFrame = true,
}

UiArtifact.color = function(hex, fallback)
	local value = tostring(hex or "")
	if not value:match("^#%x%x%x%x%x%x$") then
		return fallback or Color3.new(1, 1, 1)
	end
	return Color3.fromRGB(
		tonumber(value:sub(2, 3), 16),
		tonumber(value:sub(4, 5), 16),
		tonumber(value:sub(6, 7), 16)
	)
end

UiArtifact.udim2 = function(value)
	value = type(value) == "table" and value or {}
	local x = type(value.x) == "table" and value.x or {}
	local y = type(value.y) == "table" and value.y or {}
	return UDim2.new(tonumber(x.scale) or 0, tonumber(x.offset) or 0, tonumber(y.scale) or 0, tonumber(y.offset) or 0)
end

UiArtifact.applyProperties = function(inst, properties, order)
	properties = type(properties) == "table" and properties or {}
	local ok, err = pcall(function()
		inst.Position = UiArtifact.udim2(properties.position)
		inst.Size = UiArtifact.udim2(properties.size)
		inst.AnchorPoint = Vector2.new(
			tonumber(properties.anchorPoint and properties.anchorPoint.x) or 0,
			tonumber(properties.anchorPoint and properties.anchorPoint.y) or 0
		)
		inst.BackgroundColor3 = UiArtifact.color(properties.backgroundColor, Color3.fromRGB(36, 31, 37))
		inst.BackgroundTransparency = tonumber(properties.backgroundTransparency) or 0
		inst.Visible = properties.visible ~= false
		inst.ClipsDescendants = properties.clipsDescendants == true
		inst.Rotation = tonumber(properties.rotation) or 0
		inst.ZIndex = tonumber(properties.zIndex) or 1
		inst.LayoutOrder = tonumber(order) or 0
		inst.BorderSizePixel = 0
		if inst:IsA("TextLabel") or inst:IsA("TextButton") or inst:IsA("TextBox") then
			inst.Text = tostring(properties.text or "")
			inst.TextColor3 = UiArtifact.color(properties.textColor, Color3.new(1, 1, 1))
			inst.TextSize = tonumber(properties.textSize) or 18
			inst.TextWrapped = properties.textWrapped ~= false
			inst.TextXAlignment = Enum.TextXAlignment[tostring(properties.textXAlignment or "Center")] or Enum.TextXAlignment.Center
			inst.TextYAlignment = Enum.TextYAlignment[tostring(properties.textYAlignment or "Center")] or Enum.TextYAlignment.Center
			inst.TextTransparency = tonumber(properties.textTransparency) or 0
			inst.Font = Enum.Font[tostring(properties.font or "Gotham")] or Enum.Font.Gotham
			if inst:IsA("TextBox") then
				inst.PlaceholderText = tostring(properties.placeholderText or "")
			end
		end
		if inst:IsA("TextButton") or inst:IsA("ImageButton") then
			inst.AutoButtonColor = false
		end
		if inst:IsA("ImageLabel") or inst:IsA("ImageButton") then
			inst.Image = tostring(properties.image or "")
			inst.ImageColor3 = UiArtifact.color(properties.imageColor, Color3.new(1, 1, 1))
			inst.ImageTransparency = tonumber(properties.imageTransparency) or 0
			inst.ScaleType = Enum.ScaleType[tostring(properties.scaleType or "Fit")] or Enum.ScaleType.Fit
		end
		if inst:IsA("ScrollingFrame") then
			inst.CanvasSize = UiArtifact.udim2(properties.canvasSize)
			inst.AutomaticCanvasSize = Enum.AutomaticSize[tostring(properties.automaticCanvasSize or "Y")] or Enum.AutomaticSize.Y
			inst.ScrollBarThickness = tonumber(properties.scrollBarThickness) or 6
		end
	end)
	return ok, ok and nil or tostring(err)
end

UiArtifact.applyDecorators = function(inst, spec)
	local style = type(spec.style) == "table" and spec.style or {}
	local layout = type(spec.layout) == "table" and spec.layout or nil
	local constraints = type(spec.constraints) == "table" and spec.constraints or {}
	local ok, err = pcall(function()
		if (tonumber(style.cornerRadius) or 0) > 0 then
			local corner = Instance.new("UICorner")
			corner.Name = "NexusCorner"
			corner.CornerRadius = UDim.new(0, tonumber(style.cornerRadius) or 0)
			corner.Parent = inst
		end
		if type(style.stroke) == "table" then
			local stroke = Instance.new("UIStroke")
			stroke.Name = "NexusStroke"
			stroke.Color = UiArtifact.color(style.stroke.color, Color3.new(1, 1, 1))
			stroke.Thickness = tonumber(style.stroke.thickness) or 1
			stroke.Transparency = tonumber(style.stroke.transparency) or 0
			stroke.Parent = inst
		end
		if type(style.gradient) == "table" then
			local gradient = Instance.new("UIGradient")
			gradient.Name = "NexusGradient"
			gradient.Color = ColorSequence.new({
				ColorSequenceKeypoint.new(0, UiArtifact.color(style.gradient.from, Color3.new(0, 0, 0))),
				ColorSequenceKeypoint.new(1, UiArtifact.color(style.gradient.to, Color3.new(1, 1, 1))),
			})
			gradient.Rotation = tonumber(style.gradient.rotation) or 90
			gradient.Parent = inst
		end
		if type(style.padding) == "table" then
			local padding = Instance.new("UIPadding")
			padding.Name = "NexusPadding"
			padding.PaddingTop = UDim.new(0, tonumber(style.padding.top) or 0)
			padding.PaddingRight = UDim.new(0, tonumber(style.padding.right) or 0)
			padding.PaddingBottom = UDim.new(0, tonumber(style.padding.bottom) or 0)
			padding.PaddingLeft = UDim.new(0, tonumber(style.padding.left) or 0)
			padding.Parent = inst
		end
		if layout then
			if layout.type == "grid" then
				local grid = Instance.new("UIGridLayout")
				grid.Name = "NexusGridLayout"
				grid.CellSize = UiArtifact.udim2(layout.cellSize)
				grid.CellPadding = UDim2.fromOffset(tonumber(layout.padding) or 0, tonumber(layout.padding) or 0)
				grid.HorizontalAlignment = Enum.HorizontalAlignment[tostring(layout.horizontalAlignment or "Left")] or Enum.HorizontalAlignment.Left
				grid.VerticalAlignment = Enum.VerticalAlignment[tostring(layout.verticalAlignment or "Top")] or Enum.VerticalAlignment.Top
				grid.Parent = inst
			else
				local list = Instance.new("UIListLayout")
				list.Name = "NexusListLayout"
				list.FillDirection = layout.direction == "horizontal" and Enum.FillDirection.Horizontal or Enum.FillDirection.Vertical
				list.Padding = UDim.new(0, tonumber(layout.padding) or 0)
				list.HorizontalAlignment = Enum.HorizontalAlignment[tostring(layout.horizontalAlignment or "Left")] or Enum.HorizontalAlignment.Left
				list.VerticalAlignment = Enum.VerticalAlignment[tostring(layout.verticalAlignment or "Top")] or Enum.VerticalAlignment.Top
				list.SortOrder = Enum.SortOrder.LayoutOrder
				list.Parent = inst
			end
		end
		if constraints.aspectRatio then
			local aspect = Instance.new("UIAspectRatioConstraint")
			aspect.Name = "NexusAspectConstraint"
			aspect.AspectRatio = tonumber(constraints.aspectRatio) or 1
			aspect.Parent = inst
		end
		if type(constraints.minSize) == "table" or type(constraints.maxSize) == "table" then
			local sizeConstraint = Instance.new("UISizeConstraint")
			sizeConstraint.Name = "NexusSizeConstraint"
			if type(constraints.minSize) == "table" then
				sizeConstraint.MinSize = Vector2.new(
					tonumber(constraints.minSize.x and constraints.minSize.x.offset) or 0,
					tonumber(constraints.minSize.y and constraints.minSize.y.offset) or 0
				)
			end
			if type(constraints.maxSize) == "table" then
				sizeConstraint.MaxSize = Vector2.new(
					tonumber(constraints.maxSize.x and constraints.maxSize.x.offset) or 100000,
					tonumber(constraints.maxSize.y and constraints.maxSize.y.offset) or 100000
				)
			end
			sizeConstraint.Parent = inst
		end
		if constraints.textSizeMin or constraints.textSizeMax then
			local textConstraint = Instance.new("UITextSizeConstraint")
			textConstraint.Name = "NexusTextConstraint"
			textConstraint.MinTextSize = tonumber(constraints.textSizeMin) or 1
			textConstraint.MaxTextSize = tonumber(constraints.textSizeMax) or 100
			textConstraint.Parent = inst
			if inst:IsA("TextLabel") or inst:IsA("TextButton") or inst:IsA("TextBox") then
				inst.TextScaled = true
			end
		end
		if tonumber(spec.properties and spec.properties.uiScale) and tonumber(spec.properties.uiScale) ~= 1 then
			local scale = Instance.new("UIScale")
			scale.Name = "NexusScale"
			scale.Scale = tonumber(spec.properties.uiScale)
			scale.Parent = inst
		end
	end)
	return ok, ok and nil or tostring(err)
end

UiArtifact.treeHash = function(root)
	local rows = {}
	local instances = { root }
	for _, descendant in ipairs(root:GetDescendants()) do
		table.insert(instances, descendant)
	end
	for _, inst in ipairs(instances) do
		local values = {
			fullPath(inst),
			inst.ClassName,
			tostring(inst:GetAttribute(AGENT_ARTIFACT_ID_ATTRIBUTE) or ""),
			tostring(inst:GetAttribute(AGENT_FILE_ID_ATTRIBUTE) or ""),
			tostring(inst:GetAttribute("NexusRootId") or ""),
			tostring(inst:GetAttribute("NexusNodeId") or ""),
			tostring(inst:GetAttribute("NexusDesignId") or ""),
			tostring(inst:GetAttribute("NexusRevision") or ""),
			tostring(inst:GetAttribute("NexusDesiredTreeHash") or ""),
		}
		for _, propertyName in ipairs({
			"ResetOnSpawn", "IgnoreGuiInset", "DisplayOrder", "Enabled",
			"Position", "Size", "AnchorPoint", "BackgroundColor3", "BackgroundTransparency", "Visible",
			"ClipsDescendants", "Rotation", "ZIndex", "LayoutOrder", "BorderSizePixel",
			"Text", "PlaceholderText", "TextColor3", "TextSize", "TextWrapped", "TextScaled",
			"TextXAlignment", "TextYAlignment", "TextTransparency", "Font",
			"Image", "ImageColor3", "ImageTransparency", "ScaleType", "AutoButtonColor",
			"CanvasSize", "AutomaticCanvasSize", "ScrollBarThickness",
			"CornerRadius", "Color", "Transparency", "Thickness",
			"Padding", "PaddingTop", "PaddingRight", "PaddingBottom", "PaddingLeft",
			"FillDirection", "HorizontalAlignment", "VerticalAlignment", "SortOrder", "CellSize", "CellPadding",
			"AspectRatio", "MinSize", "MaxSize", "MinTextSize", "MaxTextSize", "Scale",
		}) do
			local propertyOk, propertyValue = pcall(function()
				return inst[propertyName]
			end)
			if propertyOk then
				table.insert(values, propertyName .. "=" .. tostring(propertyValue))
			end
		end
		if SCRIPT_CLASSES[inst.ClassName] then
			table.insert(values, "SourceHash=" .. tostring(scriptHash(inst) or ""))
		end
		table.insert(rows, table.concat(values, "|"))
	end
	table.sort(rows)
	return stableHash(table.concat(rows, "\n"))
end

UiArtifact.preflightRoot = function(rootSpec, artifactId)
	local targetPath = tostring(rootSpec.targetPath or "")
	if not targetPath:match("^StarterGui/NexusRBX_UI/[^/]+$") then
		return { ok = false, code = "ui_root_path_invalid", error = "UI roots must be direct children of StarterGui/NexusRBX_UI", path = targetPath }
	end
	if tostring(rootSpec.rootId or "") == "" or tostring(rootSpec.designId or "") == "" or tostring(rootSpec.documentRevision or "") == "" then
		return { ok = false, code = "ui_root_identity_invalid", error = "UI roots require root, design, and revision identity", path = targetPath }
	end
	if tostring(artifactId or "") == "" or tostring(rootSpec.designId or "") ~= tostring(artifactId or "") then
		return { ok = false, code = "ui_artifact_identity_mismatch", error = "UI root design identity does not match the artifact", path = targetPath }
	end
	local container = resolvePath("StarterGui/NexusRBX_UI")
	if container and (container.ClassName ~= "Folder"
		or (container:GetAttribute("NexusUiContainer") ~= true and #container:GetChildren() > 0)) then
		return {
			ok = false,
			code = "ui_foreign_collision",
			error = "StarterGui/NexusRBX_UI is not an empty or Nexus-managed UI container",
			path = "StarterGui/NexusRBX_UI",
		}
	end
	if #(rootSpec.nodes or {}) > 240 then
		return { ok = false, code = "ui_node_limit_exceeded", error = "UI roots support at most 240 nodes", path = targetPath }
	end
	local byId = {}
	for _, nodeSpec in ipairs(rootSpec.nodes or {}) do
		local nodeId = tostring(nodeSpec.nodeId or "")
		local parentId = tostring(nodeSpec.parentId or "")
		local nodeName = tostring(nodeSpec.name or "")
		if nodeId == "" or byId[nodeId] then
			return { ok = false, code = "ui_node_id_invalid", error = "UI node IDs must be non-empty and unique", path = targetPath }
		end
		if not UiArtifact.NODE_CLASSES[tostring(nodeSpec.className or "")] then
			return { ok = false, code = "ui_node_class_unsupported", error = "Unsupported UI node class", path = targetPath }
		end
		if parentId == "" and (nodeName == "Hooks" or nodeName == "NexusInteractions") then
			return { ok = false, code = "ui_node_name_reserved", error = nodeName .. " is reserved for the generated UI runtime", path = targetPath }
		end
		byId[nodeId] = nodeSpec
	end
	for nodeId, nodeSpec in pairs(byId) do
		local parentId = tostring(nodeSpec.parentId or "")
		local visited = { [nodeId] = true }
		local depth = 0
		while parentId ~= "" do
			if not byId[parentId] then
				return { ok = false, code = "ui_node_parent_invalid", error = "UI node parent does not exist", path = targetPath }
			end
			if visited[parentId] then
				return { ok = false, code = "ui_node_parent_cycle", error = "UI node parent cycle detected", path = targetPath }
			end
			visited[parentId] = true
			depth = depth + 1
			if depth > 32 then
				return { ok = false, code = "ui_node_depth_exceeded", error = "UI node depth exceeds 32", path = targetPath }
			end
			parentId = tostring(byId[parentId].parentId or "")
		end
	end

	local existing = resolvePath(targetPath)
	if not existing then
		return {
			ok = true,
			path = targetPath,
			container = container,
			adoptContainer = container ~= nil and container:GetAttribute("NexusUiContainer") ~= true,
		}
	end
	local identityMatches = existing.ClassName == "ScreenGui"
		and tostring(existing:GetAttribute(AGENT_ARTIFACT_ID_ATTRIBUTE) or "") == tostring(artifactId or "")
		and tostring(existing:GetAttribute("NexusRootId") or "") == tostring(rootSpec.rootId or "")
		and tostring(existing:GetAttribute("NexusDesignId") or "") == tostring(rootSpec.designId or "")
	if not identityMatches then
		return {
			ok = false,
			code = "ui_foreign_collision",
			error = "A non-managed or differently managed instance already exists at the UI root path",
			path = targetPath,
		}
	end
	local expectedTreeHash = tostring(rootSpec.expectedTreeHash or "")
	local actualTreeHash = UiArtifact.treeHash(existing)
	if expectedTreeHash == "" and rootSpec.replaceModifiedRoot ~= true then
		return {
			ok = false,
			code = "ui_tree_precondition_required",
			error = "Keep the Studio copy or explicitly replace it",
			path = targetPath,
			currentTreeHash = actualTreeHash,
		}
	end
	if expectedTreeHash ~= "" and actualTreeHash ~= expectedTreeHash and rootSpec.replaceModifiedRoot ~= true then
		return {
			ok = false,
			code = "ui_tree_conflict",
			error = ("Expected UI tree %s but found %s"):format(expectedTreeHash, actualTreeHash),
			path = targetPath,
			expectedTreeHash = expectedTreeHash,
			currentTreeHash = actualTreeHash,
		}
	end
	return {
		ok = true,
		path = targetPath,
		existing = existing,
		container = container,
		adoptContainer = container ~= nil and container:GetAttribute("NexusUiContainer") ~= true,
		currentTreeHash = actualTreeHash,
	}
end

UiArtifact.applyRoot = function(rootSpec, artifactId, snapshots, seenPaths)
	local targetPath = tostring(rootSpec.targetPath or "")
	local preflight = UiArtifact.preflightRoot(rootSpec, artifactId)
	if not preflight.ok then
		error(tostring(preflight.code or "ui_root_invalid") .. ": " .. tostring(preflight.error or "UI root preflight failed"))
	end
	local existing = preflight.existing
	if preflight.adoptContainer and preflight.container then
		snapshotOnce(preflight.container, snapshots, seenPaths)
	end
	if existing then
		snapshotOnce(existing, snapshots, seenPaths)
		existing:Destroy()
	else
		snapshotOnce(targetPath, snapshots, seenPaths)
	end

	local parent, leaf = ensureParent(targetPath, true)
	if not parent or not leaf then
		error("ui_root_parent_missing: could not create " .. targetPath)
	end
	if parent.ClassName ~= "Folder" then
		error("ui_foreign_collision: StarterGui/NexusRBX_UI is not a Folder")
	end
	parent:SetAttribute("NexusUiContainer", true)
	local root = Instance.new("ScreenGui")
	root.Name = leaf
	root.ResetOnSpawn = rootSpec.properties and rootSpec.properties.resetOnSpawn ~= false
	root.IgnoreGuiInset = rootSpec.properties and rootSpec.properties.ignoreGuiInset ~= false
	root.DisplayOrder = tonumber(rootSpec.properties and rootSpec.properties.displayOrder) or 0
	root.Enabled = not rootSpec.properties or rootSpec.properties.enabled ~= false
	root:SetAttribute(AGENT_ARTIFACT_ID_ATTRIBUTE, tostring(artifactId or ""))
	root:SetAttribute("NexusRootId", tostring(rootSpec.rootId or ""))
	root:SetAttribute("NexusDesignId", tostring(rootSpec.designId or ""))
	root:SetAttribute("NexusRevision", tostring(rootSpec.documentRevision or ""))
	root:SetAttribute("NexusDesiredTreeHash", tostring(rootSpec.treeHash or ""))
	root.Parent = parent

	local byId = {}
	local remaining = {}
	local expectedNodeIds = {}
	for _, nodeSpec in ipairs(rootSpec.nodes or {}) do
		table.insert(remaining, nodeSpec)
		table.insert(expectedNodeIds, tostring(nodeSpec.nodeId or ""))
	end
	table.sort(expectedNodeIds)
	local applied = 0
	while #remaining > 0 do
		local progressed = false
		for index = #remaining, 1, -1 do
			local nodeSpec = remaining[index]
			local parentId = tostring(nodeSpec.parentId or "")
			local nodeParent = parentId == "" and root or byId[parentId]
			if nodeParent then
				if not UiArtifact.NODE_CLASSES[tostring(nodeSpec.className or "")] then
					error("ui_node_class_unsupported: " .. tostring(nodeSpec.className or ""))
				end
				local node = Instance.new(nodeSpec.className)
				node.Name = tostring(nodeSpec.name or nodeSpec.nodeId or nodeSpec.className)
				local propertiesOk, propertiesError = UiArtifact.applyProperties(node, nodeSpec.properties, nodeSpec.order)
				if not propertiesOk then
					error("ui_property_apply_failed: " .. tostring(propertiesError))
				end
				local decoratorOk, decoratorError = UiArtifact.applyDecorators(node, nodeSpec)
				if not decoratorOk then
					error("ui_decorator_apply_failed: " .. tostring(decoratorError))
				end
				node:SetAttribute(AGENT_ARTIFACT_ID_ATTRIBUTE, tostring(artifactId or ""))
				node:SetAttribute("NexusDesignId", tostring(rootSpec.designId or ""))
				node:SetAttribute("NexusNodeId", tostring(nodeSpec.nodeId or ""))
				node:SetAttribute("NexusRevision", tostring(rootSpec.documentRevision or ""))
				node.Parent = nodeParent
				byId[tostring(nodeSpec.nodeId or "")] = node
				table.remove(remaining, index)
				applied = applied + 1
				progressed = true
			end
		end
		if not progressed then
			error("ui_tree_invalid: node parents could not be resolved")
		end
	end

	local appliedTreeHash = UiArtifact.treeHash(root)
	root:SetAttribute("NexusTreeHash", appliedTreeHash)
	return {
		rootId = tostring(rootSpec.rootId or ""),
		designId = tostring(rootSpec.designId or ""),
		artifactId = tostring(artifactId or ""),
		path = fullPath(root),
		nodeCount = applied,
		nodeIds = expectedNodeIds,
		treeHash = appliedTreeHash,
		documentTreeHash = tostring(rootSpec.treeHash or ""),
		expectedPreviousTreeHash = tostring(rootSpec.expectedTreeHash or ""),
		documentRevision = tostring(rootSpec.documentRevision or ""),
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
	local uiRootResults = {}

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
	for _, rootSpec in ipairs(payload.uiRoots or {}) do
		local preflight = UiArtifact.preflightRoot(rootSpec, payload.artifactId)
		if not preflight.ok then
			return {
				ok = false,
				code = tostring(preflight.code or "ui_root_invalid"),
				error = tostring(preflight.error or "UI root preflight failed"),
				retryable = false,
				files = fileResults,
				managedFiles = {},
				uiRoots = {
					{
						rootId = tostring(rootSpec.rootId or ""),
						designId = tostring(rootSpec.designId or ""),
						path = tostring(preflight.path or rootSpec.targetPath or ""),
						expectedTreeHash = preflight.expectedTreeHash,
						currentTreeHash = preflight.currentTreeHash,
					},
				},
				validation = { failures = 1, total = #operations + #(payload.uiRoots or {}) },
				snapshots = snapshots,
			}
		end
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
		for _, rootSpec in ipairs(payload.uiRoots or {}) do
			table.insert(uiRootResults, UiArtifact.applyRoot(rootSpec, payload.artifactId, snapshots, seenPaths))
		end

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

		for _, uiResult in ipairs(uiRootResults) do
			local root = resolvePath(uiResult.path)
			if not root or root.ClassName ~= "ScreenGui" then
				error("ui_readback_failed: managed ScreenGui is missing at " .. tostring(uiResult.path or ""))
			end
			if tostring(root:GetAttribute(AGENT_ARTIFACT_ID_ATTRIBUTE) or "") ~= tostring(uiResult.artifactId or "")
				or tostring(root:GetAttribute("NexusRootId") or "") ~= tostring(uiResult.rootId or "")
				or tostring(root:GetAttribute("NexusDesignId") or "") ~= tostring(uiResult.designId or "")
				or tostring(root:GetAttribute("NexusRevision") or "") ~= tostring(uiResult.documentRevision or "") then
				error("ui_readback_failed: managed ScreenGui identity does not match the applied UI root")
			end
			local readbackNodeCount = 0
			local readbackNodeIds = {}
			local sourceHashes = {}
			for _, descendant in ipairs(root:GetDescendants()) do
				local nodeId = tostring(descendant:GetAttribute("NexusNodeId") or "")
				if nodeId ~= "" then
					readbackNodeCount = readbackNodeCount + 1
					table.insert(readbackNodeIds, nodeId)
				end
				if SCRIPT_CLASSES[descendant.ClassName] then
					table.insert(sourceHashes, {
						path = fullPath(descendant),
						className = descendant.ClassName,
						sourceHash = scriptHash(descendant),
					})
				end
			end
			table.sort(readbackNodeIds)
			table.sort(sourceHashes, function(a, b)
				return tostring(a.path or "") < tostring(b.path or "")
			end)
			if readbackNodeCount ~= tonumber(uiResult.nodeCount) then
				error(("ui_readback_failed: expected %d nodes but found %d at %s"):format(
					tonumber(uiResult.nodeCount) or 0,
					readbackNodeCount,
					tostring(uiResult.path or "")
				))
			end
			for index, expectedNodeId in ipairs(uiResult.nodeIds or {}) do
				if readbackNodeIds[index] ~= expectedNodeId then
					error("ui_readback_failed: managed UI node IDs do not match the applied document")
				end
			end
			uiResult.nodeIds = readbackNodeIds
			uiResult.sourceHashes = sourceHashes
			uiResult.treeHash = UiArtifact.treeHash(root)
			root:SetAttribute("NexusTreeHash", uiResult.treeHash)
		end
	end)

	if not executionOk then
		local executionMessage = tostring(executionErr)
		local mutationCode = executionMessage:match("(ui_[%w_]+):") or "apply_artifact_failed"
		return rollbackMutation(snapshots, mutationCode, executionMessage, {
			files = fileResults,
			validation = { failures = 1, total = #operations + #(payload.uiRoots or {}) },
			managedFiles = {},
			uiRoots = uiRootResults,
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
		uiRoots = uiRootResults,
		validation = { failures = 0, total = #operations + #(payload.uiRoots or {}) },
		warnings = payload.warnings or {},
		snapshots = snapshots,
	}
end
