	for _, inst in ipairs(selectionService:Get()) do
		table.insert(out, serializeFlat(inst, false, true, true))
	end
	return { selection = out }
end

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
	local ok, source = readScriptSource(inst)
	if not ok then
		return { ok = false, error = "Could not read script source", path = path }
	end
	local currentHash = stableHash(source)
	if payload.expectedSourceHash and payload.expectedSourceHash ~= "" and payload.expectedSourceHash ~= currentHash then
		return {
			ok = false,
			code = "source_conflict",
			error = "Source hash conflict",
			path = fullPath(inst),
			expectedSourceHash = payload.expectedSourceHash,
			currentSourceHash = currentHash,
		}
	end
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
	local snapshots = {}
	if payload.snapshot ~= false then
		table.insert(snapshots, snapshotInstance(fullPath(inst)))
	end
	local wrote, writeErr = writeScriptSource(inst, nextSource)
	if not wrote then
		return { ok = false, error = writeErr or "Could not write patched source", path = fullPath(inst), snapshots = snapshots }
	end
	return {
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
	local snapshots = {}
	if payload.snapshot ~= false then
		table.insert(snapshots, snapshotInstance(fullPath(inst)))
	end
	local oldPath = fullPath(inst)
	inst.Name = tostring(payload.newName or payload.name or inst.Name)
	return { previousPath = oldPath, path = fullPath(inst), snapshots = snapshots }
end

local function moveInstanceTool(payload)
	local inst = resolvePath(payload.path)
	if not inst then
		return { ok = false, error = "Instance not found", path = payload.path }
	end
	local targetPath = tostring(payload.newPath or "")
	local parent = nil
	local leaf = nil
	if targetPath ~= "" then
		parent, leaf = ensureParent(targetPath, payload.createParents ~= false)
	else
		parent = resolvePath(payload.newParentPath)
	end
	if not parent then
		return { ok = false, error = "Target parent not found", path = payload.path }
	end
	local snapshots = {}
	if payload.snapshot ~= false then
		table.insert(snapshots, snapshotInstance(fullPath(inst)))
	end
	local oldPath = fullPath(inst)
	if leaf and leaf ~= "" then
		inst.Name = leaf
	end
	inst.Parent = parent
	return { previousPath = oldPath, path = fullPath(inst), snapshots = snapshots }
end

local function duplicateInstanceTool(payload)
	local inst = resolvePath(payload.path)
	if not inst then
		return { ok = false, error = "Instance not found", path = payload.path }
	end
	local parent, leaf = ensureParent(payload.newPath, payload.createParents ~= false)
	if not parent or not leaf then
		return { ok = false, error = "Could not resolve duplicate target", path = payload.newPath }
	end
	local existing = parent:FindFirstChild(leaf)
	local snapshots = {}
	if payload.snapshot ~= false then
		if existing then
			appendSnapshotTree(existing, snapshots)
		else
			table.insert(snapshots, snapshotInstance(payload.newPath))
		end
	end
	if existing then
		existing:Destroy()
	end
	local clone = inst:Clone()
	clone.Name = leaf
	clone.Parent = parent
	ensureManagedId(clone)
	return { path = fullPath(clone), sourcePath = fullPath(inst), snapshots = snapshots }
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
	local snapshots = {}
	if payload.snapshot ~= false then
		table.insert(snapshots, snapshotInstance(fullPath(inst)))
	end
	local errors = {}
	for key, value in pairs(payload.properties or {}) do
		local ok, err = safeSetProperty(inst, key, value)
		if not ok then
			table.insert(errors, { property = key, message = err })
		end
	end
	return { path = fullPath(inst), properties = propertiesOf(inst), errors = errors, snapshots = snapshots, ok = #errors == 0 }
end

local function updateAttributes(payload)
	local inst = resolvePath(payload.path)
	if not inst then
		return { ok = false, error = "Instance not found", path = payload.path }
	end
	local snapshots = {}
	if payload.snapshot ~= false then
		table.insert(snapshots, snapshotInstance(fullPath(inst)))
	end
	for key, value in pairs(payload.attributes or payload.values or {}) do
		inst:SetAttribute(tostring(key), value)
	end
	return { path = fullPath(inst), attributes = attributesOf(inst), snapshots = snapshots }
end

local function updateTags(payload)
	local inst = resolvePath(payload.path)
	if not inst then
		return { ok = false, error = "Instance not found", path = payload.path }
	end
	local snapshots = {}
	if payload.snapshot ~= false then
		table.insert(snapshots, snapshotInstance(fullPath(inst)))
	end
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
	return { path = fullPath(inst), tags = CollectionService:GetTags(inst), snapshots = snapshots }
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
	local results = {}
	local snapshots = {}
	local find = tostring(payload.find or "")
	local replace = tostring(payload.replace or "")
	if find == "" then
		return { ok = false, error = "find is required" }
	end
	for _, path in ipairs(paths) do
		if #results >= maxFiles then
			break
		end
		local inst = resolvePath(path)
		if inst and SCRIPT_CLASSES[inst.ClassName] then
			local ok, source = readScriptSource(inst)
			if ok then
				local hay = source
				local needle = find
				if payload.caseSensitive == false then
					hay = string.lower(source)
					needle = string.lower(find)
				end
				if string.find(hay, needle, 1, true) then
				if payload.snapshot ~= false then
					table.insert(snapshots, snapshotInstance(fullPath(inst)))
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
				writeScriptSource(inst, nextSource)
				table.insert(results, { path = fullPath(inst), previousHash = stableHash(source), sourceHash = stableHash(nextSource) })
				end
			end
		end
	end
	return { filesChanged = #results, files = results, snapshots = snapshots }
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

local function restoreSnapshots(payload)
	local restored = 0
	local removed = 0
	local snapshots = payload.snapshots or localSnapshots
	for i = #snapshots, 1, -1 do
		local snap = snapshots[i]
		if snap.existed == false then
			local current = resolvePath(snap.path)
			if current then
				current:Destroy()
				removed = removed + 1
			end
		elseif snap.path and snap.className and snap.className ~= "" then
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
	return { restored = restored, removed = removed }
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
				if source:find("TODO", 1, true) then
					table.insert(issues, { path = fullPath(inst), message = "Contains TODO marker" })
				end
				if source:find("while true do", 1, true) and not source:find("task.wait", 1, true) then
					table.insert(issues, { path = fullPath(inst), message = "Possible unthrottled while true loop" })
				end
				if inst.ClassName == "LocalScript" and source:find("DataStoreService", 1, true) then
					table.insert(issues, { path = fullPath(inst), message = "LocalScript references DataStoreService" })
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

local function applyArtifactLegacy(payload)
	local projectName = payload.projectName or "NexusRBX_Project"
	local serviceFolders = {}
	local fileResults = {}
	local validationFailures = 0
	local snapshots = {}

	for _, scriptSpec in ipairs(payload.scripts or {}) do
		local serviceName = scriptSpec.service or "ReplicatedStorage"
		local serviceRoot = getServiceRoot(serviceName)
		if not serviceFolders[serviceName] then
			serviceFolders[serviceName] = ensureCleanFolder(serviceRoot, projectName, snapshots)
		end
		local name = scriptSpec.name or (scriptSpec.className or "Script")
		local valid, issues = validateLuauSource(scriptSpec.source)
		if not valid then
			validationFailures = validationFailures + 1
		end
		local applyOk, applyErr = pcall(function()
			local inst = Instance.new(scriptSpec.className or "ModuleScript")
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
	end

	if #(payload.remotes or {}) > 0 then
		local remoteFolder = serviceFolders.ReplicatedStorage or ensureCleanFolder(ReplicatedStorage, projectName, snapshots)
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
			table.insert(snapshots, snapshotInstance(screenPath))
		end
		createOrReplaceInstance(screenPath, "ScreenGui", {
			ResetOnSpawn = screenSpec.resetOnSpawn ~= false,
			IgnoreGuiInset = screenSpec.ignoreGuiInset ~= false,
		}, true)
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

local function classNameForKind(kind)
	local normalized = string.lower(tostring(kind or "module"))
	if normalized == "server" then
		return "Script"
	elseif normalized == "client" then
		return "LocalScript"
	end
	return "ModuleScript"
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
			className = file.className or classNameForKind(file.kind),
			name = file.name or leafNameFromPath(path),
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
	seenPaths[path] = true
	if typeof(target) == "Instance" then
		appendSnapshotTree(target, snapshots)
	else
		table.insert(snapshots, snapshotInstance(path))
	end
end

local function findManagedInstanceByFileId(fileId, expectedClass)
	if not fileId or fileId == "" then
		return nil, nil
	end
	local matches = {}
	for _, inst in ipairs(game:GetDescendants()) do
		if inst:GetAttribute(AGENT_FILE_ID_ATTRIBUTE) == fileId and inst.ClassName == expectedClass then
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
	local expectedClass = tostring(spec.className or classNameForKind(spec.kind))
	local canonicalPath = tostring(currentPathOverride or spec.path or "")
	local attrMatch, attrError = findManagedInstanceByFileId(fileId, expectedClass)
	if attrError == "ambiguous" then
		return { ok = false, code = "ambiguous", message = "Multiple Studio instances share the same AgentFileId" }
	end
	if attrMatch then
		return { ok = true, instance = attrMatch, expectedClass = expectedClass, matchType = "file_id" }
	end

	local exact = canonicalPath ~= "" and resolvePath(canonicalPath) or nil
	if exact then
		if exact.ClassName ~= expectedClass then
			return {
				ok = false,
				code = "class_mismatch",
				message = ("Expected %s at %s but found %s"):format(expectedClass, canonicalPath, exact.ClassName),
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
	if precondition and tostring(precondition.sourceHash or "") ~= "" and tostring(precondition.sourceHash) ~= currentHash then
		return false, "Studio source precondition hash mismatch", currentHash
	end
	if manifestEntry and tostring(manifestEntry.lastAppliedSourceHash or "") ~= "" and tostring(manifestEntry.lastAppliedSourceHash) ~= currentHash then
		return false, "Studio source changed independently since the last managed apply", currentHash
	end
	return true, nil, currentHash
end

local function applyManagedUpsert(spec, resolved, indexes, snapshots, seenPaths)
	local targetPath = tostring(spec.path or "")
	local expectedClass = tostring(spec.className or classNameForKind(spec.kind))
	local inst = resolved.instance
	if inst then
		snapshotOnce(inst, snapshots, seenPaths)
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

	local manifestEntry = indexes.manifestById[tostring(spec.fileId or spec.id or "")] or indexes.manifestByPath[targetPath]
	local ok, preconditionError = checkStudioPreconditions(inst, spec, manifestEntry, indexes)
	if not ok then
		return nil, preconditionError
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
	return inst, nil
end

local function buildManagedFileRecord(inst, spec)
	local ok, source = readScriptSource(inst)
	local sourceText = ok and source or (spec.content or "")
	return {
		fileId = tostring(spec.fileId or spec.id or ""),
		canonicalPath = tostring(spec.path or fullPath(inst)),
		placement = tostring(spec.placement or ""),
		kind = tostring(spec.kind or "module"),
		className = inst.ClassName,
		lastAppliedSourceHash = stableHash(sourceText),
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
	local managedFiles = {}
	local finalFiles = {}

	for _, spec in pairs(indexes.fileById) do
		table.insert(finalFiles, spec)
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
							kind = manifestEntry and manifestEntry.kind or "module",
							placement = manifestEntry and manifestEntry.placement or splitPath(op.toPath)[1],
							className = manifestEntry and manifestEntry.className or classNameForKind(manifestEntry and manifestEntry.kind or "module"),
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
							className = manifestEntry.className or classNameForKind(manifestEntry.kind),
						} or {
							fileId = tostring(op.id or ""),
							id = tostring(op.id or ""),
							path = tostring(op.path or ""),
							kind = "module",
							placement = splitPath(op.path)[1],
							className = classNameForKind("module"),
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
						spec = spec or {
							fileId = tostring(op.id or ""),
							id = tostring(op.id or ""),
							path = tostring(op.path or ""),
							placement = tostring(op.placement or splitPath(op.path)[1] or "ReplicatedStorage"),
							kind = tostring(op.kind or "module"),
							content = tostring(op.content or ""),
							className = classNameForKind(op.kind),
						}
						spec.artifactId = payload.artifactId
						local resolved = resolveManagedTarget(spec, indexes, tostring(op.path or spec.path or ""))
						if not resolved.ok then
							pushResult({ type = phase, path = tostring(op.path or "") }, false, resolved.message)
							error(resolved.message)
						end
						local inst, applyErr = applyManagedUpsert(spec, resolved, indexes, snapshots, seenPaths)
						if not inst then
							pushResult({ type = phase, path = tostring(op.path or "") }, false, applyErr)
							error(applyErr)
						end
						managedFiles[tostring(spec.fileId or spec.id or "")] = buildManagedFileRecord(inst, spec)
						pushResult({ type = phase, path = tostring(op.path or "") }, true, nil)
					end
				end
			end
		end

		for _, spec in ipairs(finalFiles) do
			local resolved = resolveManagedTarget(spec, indexes, tostring(spec.path or ""))
			if resolved.ok and resolved.instance then
				managedFiles[tostring(spec.fileId or spec.id or "")] = buildManagedFileRecord(resolved.instance, spec)
			end
		end
	end)

	if not executionOk then
		restoreSnapshots({ snapshots = snapshots })
		return {
			ok = false,
			error = tostring(executionErr),
			files = fileResults,
			validation = { failures = 1, total = #operations },
			snapshots = snapshots,
			managedFiles = {},
		}
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
