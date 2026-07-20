local function serializeInstance(inst, path, depth, maxDepth, state, includeSource, sourceMaxChars, parentPath)
	state.count = state.count + 1
	local managedId = readManagedId(inst)
	local item = {
		name = inst.Name,
		className = inst.ClassName,
		path = path,
		parentPath = parentPath or "",
		managedId = managedId,
		tags = CollectionService:GetTags(inst),
		attributes = attributesOf(inst),
		propertyHash = propertyHash(inst),
		children = {},
	}

	if SCRIPT_CLASSES[inst.ClassName] then
		item.isScript = true
		item.sourceHash = scriptHash(inst)
		if includeSource then
			local ok, source = readScriptSource(inst)
			if ok then
				item.source = string.sub(source, 1, sourceMaxChars or 0)
				item.sourceLength = #source
			end
		end
	elseif inst:IsA("RemoteEvent") or inst:IsA("RemoteFunction") then
		item.isRemote = true
	elseif inst:IsA("ScreenGui") then
		item.isScreenGui = true
	end
	if not state.seenPaths[path] then
		state.seenPaths[path] = true
		table.insert(state.items, {
			name = item.name,
			className = item.className,
			path = item.path,
			parentPath = item.parentPath,
			managedId = item.managedId,
			sourceHash = item.sourceHash,
			propertyHash = item.propertyHash,
			updatedAt = os.time(),
		})
	else
		state.duplicateCanonicalPaths = state.duplicateCanonicalPaths + 1
	end

	if depth >= maxDepth or state.count >= state.maxInstances then
		item.truncated = #inst:GetChildren() > 0
		return item
	end

	local children = inst:GetChildren()
	table.sort(children, function(a, b)
		if a.Name ~= b.Name then
			return a.Name < b.Name
		end
		if a.ClassName ~= b.ClassName then
			return a.ClassName < b.ClassName
		end
		return tostring(a) < tostring(b)
	end)
	for _, child in ipairs(children) do
		if state.count >= state.maxInstances then
			item.truncated = true
			break
		end
		table.insert(item.children, serializeInstance(child, path .. "/" .. child.Name, depth + 1, maxDepth, state, includeSource, sourceMaxChars, path))
	end

	return item
end

local function getInspectionRoots()
	local roots = {}
	local seen = {}
	local preferred = {
		ReplicatedStorage,
		ServerScriptService,
		ServerStorage,
		StarterGui,
		StarterPlayer,
		Workspace,
		Lighting,
	}
	for _, inst in ipairs(preferred) do
		if inst and not seen[inst] then
			seen[inst] = true
			table.insert(roots, inst)
		end
	end
	for _, child in ipairs(game:GetChildren()) do
		if not seen[child] then
			seen[child] = true
			table.insert(roots, child)
		end
	end
	table.sort(roots, function(a, b)
		if a.Name ~= b.Name then
			return tostring(a.Name) < tostring(b.Name)
		end
		return tostring(a.ClassName) < tostring(b.ClassName)
	end)
	return roots
end

-- Cheap top-level fingerprint of the place (service child counts). Used as a
-- fast "did anything structurally change?" signal so the backend can skip a
-- full re-index when the project is unchanged.
function computePlaceSignature()
	local parts = {}
	for _, inst in ipairs(getInspectionRoots()) do
		local ok, count = pcall(function()
			return #inst:GetChildren()
		end)
		table.insert(parts, tostring(inst.Name) .. ":" .. tostring(inst.ClassName) .. ":" .. tostring(ok and count or 0))
	end
	return stableHash(table.concat(parts, "|"))
end

local function inspectPlace(payload)
	local maxDepth = math.clamp(tonumber(payload.maxDepth) or 12, 1, 32)
	local maxInstances = math.clamp(tonumber(payload.maxInstances) or 500, 20, 10000)
	local includeSource = payload.includeSource == true
	local sourceMaxChars = math.clamp(tonumber(payload.sourceMaxChars) or 0, 0, 8000)
	local pageSize = math.clamp(tonumber(payload.pageSize) or maxInstances, 20, 1000)
	local cursor = math.max(0, tonumber(payload.cursor) or 0)
	local requestedRevision = tostring(payload.manifestRevision or "")
	-- Elapsed-time TTL (10 minutes). Prefer tick() so wall-clock jumps do not keep
	-- expired snapshots alive; fall back to os.time() when tick is unavailable.
	local MANIFEST_SNAPSHOT_TTL_SEC = 600
	local function snapshotNow()
		if typeof(tick) == "function" then
			return tick()
		end
		return os.time()
	end
	NEXUS_RBX_MANIFEST_SNAPSHOTS = NEXUS_RBX_MANIFEST_SNAPSHOTS or {}
	for revision, snapshot in pairs(NEXUS_RBX_MANIFEST_SNAPSHOTS) do
		local createdAt = snapshot.createdAtElapsed or snapshot.createdAt or 0
		if snapshotNow() - createdAt > MANIFEST_SNAPSHOT_TTL_SEC then
			NEXUS_RBX_MANIFEST_SNAPSHOTS[revision] = nil
		end
	end
	if cursor > 0 and requestedRevision == "" then
		return {
			ok = false,
			code = "manifest_revision_required",
			error = "Manifest continuation requires the revision from the first page",
			retryable = true,
		}
	end
	local snapshot = requestedRevision ~= "" and NEXUS_RBX_MANIFEST_SNAPSHOTS[requestedRevision] or nil
	if cursor > 0 and not snapshot then
		return {
			ok = false,
			code = "manifest_revision_expired",
			error = "The manifest snapshot expired; start a new scan from the first page",
			retryable = true,
		}
	end
	local supersedesRevision = nil
	if not snapshot then
		local state = {
			count = 0,
			maxInstances = maxInstances,
			items = {},
			seenPaths = {},
			duplicateCanonicalPaths = 0,
		}
		local roots = {}
		for _, inst in ipairs(getInspectionRoots()) do
			if state.count >= state.maxInstances then
				break
			end
			table.insert(roots, serializeInstance(inst, inst.Name, 1, maxDepth, state, includeSource, sourceMaxChars, ""))
		end
		-- Revision immutability: never rebuild under a previously requested revision
		-- when the snapshot is gone. Always mint a new GUID.
		if requestedRevision ~= "" then
			supersedesRevision = requestedRevision
		end
		requestedRevision = HttpService:GenerateGUID(false)
		snapshot = {
			createdAt = os.time(),
			createdAtElapsed = snapshotNow(),
			items = state.items,
			roots = roots,
			scannedInstances = state.count,
			truncated = state.count >= maxInstances,
			duplicateCanonicalPaths = state.duplicateCanonicalPaths,
			placeSignature = computePlaceSignature(),
		}
		NEXUS_RBX_MANIFEST_SNAPSHOTS[requestedRevision] = snapshot
	end
	local page = {}
	for i = cursor + 1, math.min(#snapshot.items, cursor + pageSize) do
		table.insert(page, snapshot.items[i])
	end
	return {
		pluginVersion = PLUGIN_VERSION,
		protocolVersion = STUDIO_PROTOCOL_VERSION,
		revision = requestedRevision,
		supersedesRevision = supersedesRevision,
		placeName = game.Name,
		placeId = tostring(game.PlaceId),
		count = #snapshot.items,
		totalInstances = #snapshot.items,
		scannedInstances = snapshot.scannedInstances,
		truncated = snapshot.truncated,
		duplicateCanonicalPaths = snapshot.duplicateCanonicalPaths,
		items = page,
		nextCursor = (cursor + pageSize < #snapshot.items) and tostring(cursor + pageSize) or nil,
		roots = cursor == 0 and snapshot.roots or nil,
		placeSignature = snapshot.placeSignature,
	}
end

local function readScript(payload)
	local out = {}
	local maxChars = math.clamp(tonumber(payload.maxChars) or 20000, 500, 60000)
	for _, path in ipairs(payload.paths or {}) do
		local inst = resolvePath(path)
		if inst and SCRIPT_CLASSES[inst.ClassName] then
			local ok, source = readScriptSource(inst)
			table.insert(out, {
				path = fullPath(inst),
				className = inst.ClassName,
				name = inst.Name,
				source = ok and string.sub(source, 1, maxChars) or "",
				sourceLength = ok and #source or 0,
				sourceHash = ok and stableHash(source) or nil,
				truncated = ok and #source > maxChars or false,
			})
		else
			table.insert(out, { path = path, error = "Script not found" })
		end
	end
	return { scripts = out }
end

local function writeScript(payload)
	local path = payload.path
	local className = payload.className
	if type(className) ~= "string" or className == "" then
		className = "ModuleScript"
	end
	if not SCRIPT_CLASSES[className] then
		error("write_script requires Script, LocalScript, or ModuleScript")
	end
	local snapshots = {}
	local existing = resolvePath(path)
	if existing and not SCRIPT_CLASSES[existing.ClassName] then
		return {
			ok = false,
			code = "class_conflict",
			error = "Refusing to replace non-script instance hierarchy with a script",
			path = fullPath(existing),
			currentClassName = existing.ClassName,
			expectedClassName = className,
			retryable = false,
		}
	end
	if existing and existing.ClassName ~= className and payload.allowClassChange ~= true then
		return {
			ok = false,
			code = "class_conflict",
			error = "Refusing to change script class without allowClassChange",
			path = fullPath(existing),
			currentClassName = existing.ClassName,
			expectedClassName = className,
			retryable = false,
		}
	end
	if existing and SCRIPT_CLASSES[existing.ClassName] and payload.expectedSourceHash and payload.expectedSourceHash ~= "" then
		local currentHash = scriptHash(existing)
		if currentHash ~= payload.expectedSourceHash then
			return {
				ok = false,
				code = "source_conflict",
				error = "Source hash conflict",
				path = fullPath(existing),
				expectedSourceHash = payload.expectedSourceHash,
				currentSourceHash = currentHash,
				retryable = false,
			}
		end
	end
	if existing and not payload.allowOverwrite and payload.createOnly == true then
		return {
			ok = false,
			code = "already_exists",
			error = "Script already exists",
			path = fullPath(existing),
			retryable = false,
		}
	end
	if payload.snapshot ~= false then
		if existing then
			appendSnapshotTree(existing, snapshots)
		else
			table.insert(snapshots, snapshotInstance(path))
		end
	end
	local inst = existing
	if not inst then
		local parent, name = ensureParent(path, payload.createParents ~= false)
		if not parent or not name then
			return { ok = false, error = "Could not resolve parent for " .. tostring(path), path = path }
		end
		inst = Instance.new(className)
		inst.Name = name
		inst.Parent = parent
	elseif inst.ClassName ~= className and payload.allowClassChange == true then
		local previous = inst
		local parent = previous.Parent
		local name = previous.Name
		previous:Destroy()
		inst = Instance.new(className)
		inst.Name = name
		inst.Parent = parent
	end
	ensureManagedId(inst)
	local ok, err = writeScriptSource(inst, payload.source or "")
	if not ok then
		error(err or "Could not write script source")
	end
	return {
		path = fullPath(inst),
		className = inst.ClassName,
		sourceLength = #(payload.source or ""),
		sourceHash = scriptHash(inst),
		snapshots = snapshots,
	}
end

local function createInstanceTool(payload)
	local path = payload.path
	local className = payload.className or "Folder"
	local snapshots = {}
	if payload.snapshot ~= false then
		local existing = resolvePath(path)
		if existing then
			appendSnapshotTree(existing, snapshots)
		else
			table.insert(snapshots, snapshotInstance(path))
		end
	end
	local inst = createOrReplaceInstance(path, className, payload.properties or {}, payload.createParents ~= false)
	for key, value in pairs(payload.attributes or {}) do
		inst:SetAttribute(tostring(key), value)
	end
	for _, tag in ipairs(payload.tags or {}) do
		CollectionService:AddTag(inst, tostring(tag))
	end
	ensureManagedId(inst)
	return {
		path = fullPath(inst),
		className = inst.ClassName,
		properties = propertiesOf(inst),
		attributes = attributesOf(inst),
		tags = CollectionService:GetTags(inst),
		snapshots = snapshots,
	}
end

local function deleteInstanceTool(payload)
	local path = payload.path
	local inst = resolvePath(path)
	local snapshots = {}
	if inst then
		appendSnapshotTree(inst, snapshots)
	else
		table.insert(snapshots, snapshotInstance(path))
	end
	if inst then
		inst:Destroy()
	end
	return { path = path, deleted = inst ~= nil, snapshots = snapshots }
end

local function serializeFlat(inst, includeProperties, includeAttributes, includeTags)
	local row = {
		name = inst.Name,
		className = inst.ClassName,
		path = fullPath(inst),
		parentPath = inst.Parent and fullPath(inst.Parent) or "",
		managedId = readManagedId(inst),
		propertyHash = propertyHash(inst),
	}
	if includeProperties ~= false then
		row.properties = propertiesOf(inst)
	end
	if includeAttributes ~= false then
		row.attributes = attributesOf(inst)
	end
	if includeTags ~= false then
		row.tags = CollectionService:GetTags(inst)
	end
	if SCRIPT_CLASSES[inst.ClassName] then
		row.isScript = true
		row.sourceHash = scriptHash(inst)
	end
	return row
end

local function listChildren(payload)
	local inst = resolvePath(payload.path)
	if not inst then
		return { ok = false, error = "Instance not found", path = payload.path, children = {} }
	end
	local pageSize = math.clamp(tonumber(payload.pageSize) or 250, 20, 1000)
	local cursor = math.max(0, tonumber(payload.cursor) or 0)
	local children = inst:GetChildren()
	table.sort(children, function(a, b)
		return a.Name < b.Name
	end)
	local out = {}
	for i = cursor + 1, math.min(#children, cursor + pageSize) do
		table.insert(out, serializeFlat(children[i], payload.includeProperties == true, true, true))
	end
	return {
		path = fullPath(inst),
		total = #children,
		children = out,
		nextCursor = (cursor + pageSize < #children) and tostring(cursor + pageSize) or nil,
	}
end

local function inspectInstances(payload)
	local paths = payload.paths or {}
	local out = {}
	for _, path in ipairs(paths) do
		local inst = resolvePath(path)
		if inst then
			local row = serializeFlat(inst, payload.includeProperties ~= false, payload.includeAttributes ~= false, payload.includeTags ~= false)
			if payload.includeChildren == true then
				row.children = {}
				for _, child in ipairs(inst:GetChildren()) do
					table.insert(row.children, serializeFlat(child, false, true, true))
				end
			end
			table.insert(out, row)
		else
			table.insert(out, { path = path, error = "Instance not found" })
		end
	end
	return { instances = out }
end

local function searchProject(payload)
	local query = tostring(payload.query or "")
	local maxResults = math.clamp(tonumber(payload.maxResults) or 100, 1, 500)
	local caseSensitive = payload.caseSensitive == true
	local needle = caseSensitive and query or string.lower(query)
	local classes = {}
	for _, className in ipairs(payload.classes or {}) do
		classes[tostring(className)] = true
	end
	local results = {}
	for _, inst in ipairs(game:GetDescendants()) do
		if #results >= maxResults then
			break
		end
		if next(classes) == nil or classes[inst.ClassName] then
			local hay = fullPath(inst) .. " " .. inst.Name .. " " .. inst.ClassName
			if not caseSensitive then
				hay = string.lower(hay)
			end
			if query == "" or string.find(hay, needle, 1, true) then
				table.insert(results, serializeFlat(inst, false, true, true))
			end
		end
	end
	return { query = query, results = results, truncated = #results >= maxResults }
end

local function searchSource(payload)
	local query = tostring(payload.query or "")
	local maxResults = math.clamp(tonumber(payload.maxResults) or 100, 1, 500)
	local maxContext = math.clamp(tonumber(payload.maxContextChars) or 300, 0, 2000)
	local caseSensitive = payload.caseSensitive == true
	local needle = caseSensitive and query or string.lower(query)
	local allowedPaths = {}
	for _, path in ipairs(payload.paths or {}) do
		allowedPaths[tostring(path)] = true
	end
	local results = {}
	for _, inst in ipairs(game:GetDescendants()) do
		if #results >= maxResults then
			break
		end
		if SCRIPT_CLASSES[inst.ClassName] then
			local path = fullPath(inst)
			if next(allowedPaths) == nil or allowedPaths[path] then
				local ok, source = readScriptSource(inst)
				if ok then
					local hay = caseSensitive and source or string.lower(source)
					local startIndex, endIndex = string.find(hay, needle, 1, true)
					if query == "" or startIndex then
						local contextStart = math.max(1, (startIndex or 1) - maxContext)
						local contextEnd = math.min(#source, (endIndex or 1) + maxContext)
						table.insert(results, {
							path = path,
							className = inst.ClassName,
							sourceHash = stableHash(source),
							matchStart = startIndex,
							matchEnd = endIndex,
							context = string.sub(source, contextStart, contextEnd),
						})
					end
				end
			end
		end
	end
	return { query = query, results = results, truncated = #results >= maxResults }
end

local function readInstance(payload)
	local paths = payload.paths or {}
	if payload.path and payload.path ~= "" then
		paths = { payload.path }
	end
	local out = {}
	for _, path in ipairs(paths) do
		local inst = resolvePath(path)
		if inst then
			table.insert(out, serializeFlat(inst, true, payload.includeAttributes ~= false, payload.includeTags ~= false))
		else
			table.insert(out, { path = path, error = "Instance not found" })
		end
	end
	return { instances = out }
end

local function readProperties(payload)
	return readInstance(payload)
end

local function getSelectionTool()
	local out = {}
	for _, inst in ipairs(Selection:Get()) do
		table.insert(out, serializeFlat(inst, false, true, true))
	end
	return { selection = out }
end
