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

-- Last-line execution-context guard. The backend performs the same checks and
-- may disclose a safe adjustment before a command is queued; the plugin never
-- guesses or adjusts. It rejects the full mutation before snapshots or writes.
local ScriptContextGuard = {}

function ScriptContextGuard.resolveScriptClassName(value)
	local className = tostring(value or "")
	return SCRIPT_CLASSES[className] and className or ""
end

function ScriptContextGuard.stripCommentsAndStrings(source)
	local input = tostring(source or "")
	local output = {}
	local length = #input

	local function blankSegment(segment)
		return (segment:gsub("[^\r\n]", " "))
	end

	local function longBracketAt(index)
		if input:sub(index, index) ~= "[" then
			return nil, nil
		end
		local cursor = index + 1
		while input:sub(cursor, cursor) == "=" do
			cursor = cursor + 1
		end
		if input:sub(cursor, cursor) ~= "[" then
			return nil, nil
		end
		local equals = cursor - index - 1
		return cursor + 1, "]" .. string.rep("=", equals) .. "]"
	end

	local index = 1
	while index <= length do
		local current = input:sub(index, index)
		local nextChar = input:sub(index + 1, index + 1)
		if current == "-" and nextChar == "-" then
			local contentStart, closing = longBracketAt(index + 2)
			local finish
			if contentStart then
				local closeStart = string.find(input, closing, contentStart, true)
				finish = closeStart and (closeStart + #closing - 1) or length
			else
				local newline = string.find(input, "\n", index + 2, true)
				finish = newline and (newline - 1) or length
			end
			table.insert(output, blankSegment(input:sub(index, finish)))
			index = finish + 1
		elseif current == "'" or current == '"' then
			local quote = current
			local cursor = index + 1
			local prefix = input:sub(math.max(1, index - 120), index - 1)
			local isGetServiceArgument = prefix:match("GetService%s*%(%s*$") ~= nil
			while cursor <= length do
				local value = input:sub(cursor, cursor)
				if value == "\\" then
					cursor = cursor + 2
				elseif value == quote then
					cursor = cursor + 1
					break
				else
					cursor = cursor + 1
				end
			end
			local segment = input:sub(index, cursor - 1)
			table.insert(output, isGetServiceArgument and segment or blankSegment(segment))
			index = cursor
		elseif current == "[" then
			local contentStart, closing = longBracketAt(index)
			if contentStart then
				local closeStart = string.find(input, closing, contentStart, true)
				local finish = closeStart and (closeStart + #closing - 1) or length
				table.insert(output, blankSegment(input:sub(index, finish)))
				index = finish + 1
			else
				table.insert(output, current)
				index = index + 1
			end
		else
			table.insert(output, current)
			index = index + 1
		end
	end
	return table.concat(output)
end

function ScriptContextGuard.placementContext(path)
	local normalized = tostring(path or "")
		:gsub("\\", "/")
		:gsub("^game[./]", "")
		:gsub("/+", "/")
		:gsub("^/", "")
		:gsub("/$", "")
	local parts = splitPath(normalized)
	local root = parts[1] or ""
	local second = parts[2] or ""
	if root == "StarterPlayer" and (second == "StarterPlayerScripts" or second == "StarterCharacterScripts") then
		return "client"
	end
	if root == "StarterGui" or root == "StarterPack" or root == "ReplicatedFirst"
		or root == "StarterPlayerScripts" or root == "StarterCharacterScripts" then
		return "client"
	end
	if root == "ServerScriptService" or root == "Workspace" then
		return "server"
	end
	if root == "ServerStorage" then
		return "non_executing"
	end
	if root == "ReplicatedStorage" then
		return "shared"
	end
	return "unknown"
end

function ScriptContextGuard.validate(descriptor)
	local source = ScriptContextGuard.stripCommentsAndStrings(descriptor.source or descriptor.content or "")
	local className = tostring(descriptor.className or "")
	local path = tostring(descriptor.path or descriptor.placement or "")
	local placement = ScriptContextGuard.placementContext(path)
	local findings = {}
	local clientFeatures = {
		{ name = "Players.LocalPlayer", token = "LocalPlayer" },
		{ name = "UserInputService", token = "UserInputService" },
		{ name = "workspace.CurrentCamera", token = "CurrentCamera" },
		{ name = "RunService.RenderStepped", token = "RenderStepped" },
		{ name = "RunService:BindToRenderStep", token = "BindToRenderStep" },
		{ name = "StarterGui", token = "StarterGui" },
	}
	local serverFeatures = {
		{ name = "DataStoreService", token = "DataStoreService" },
		{ name = "MemoryStoreService", token = "MemoryStoreService" },
		{ name = "MessagingService", token = "MessagingService" },
		{ name = "ServerStorage", token = "ServerStorage" },
		{ name = "ServerScriptService", token = "ServerScriptService" },
	}
	local clientMatch = nil
	local serverMatch = nil
	local function findIdentifier(token)
		local searchFrom = 1
		while true do
			local startIndex, endIndex = string.find(source, token, searchFrom, true)
			if not startIndex then
				return nil
			end
			local before = startIndex > 1 and source:sub(startIndex - 1, startIndex - 1) or ""
			local after = endIndex < #source and source:sub(endIndex + 1, endIndex + 1) or ""
			if not before:match("[%w_]") and not after:match("[%w_]") then
				return startIndex
			end
			searchFrom = endIndex + 1
		end
	end
	for _, feature in ipairs(clientFeatures) do
		if findIdentifier(feature.token) then
			clientMatch = feature
			break
		end
	end
	for _, feature in ipairs(serverFeatures) do
		if findIdentifier(feature.token) then
			serverMatch = feature
			break
		end
	end

	local function sourceLine(token)
		local startIndex = token and findIdentifier(token) or nil
		if not startIndex then
			return nil
		end
		local prefix = source:sub(1, startIndex - 1)
		local _, count = prefix:gsub("\n", "\n")
		return count + 1
	end

	local function addFinding(code, explanation, token)
		local finding = {
			ruleCode = code,
			code = code,
			severity = "blocking",
			explanation = explanation,
			message = explanation,
			path = path ~= "" and path or "Unknown",
		}
		local line = sourceLine(token)
		if line then
			finding.line = line
		end
		table.insert(findings, finding)
	end

	local requiredContext = "unknown"
	if clientMatch and serverMatch then
		requiredContext = "mixed"
	elseif className == "ModuleScript" then
		requiredContext = "module"
	elseif clientMatch then
		requiredContext = "client"
	elseif serverMatch then
		requiredContext = "server"
	elseif placement == "client" or placement == "server" then
		requiredContext = placement
	elseif className == "LocalScript" then
		requiredContext = "client"
	elseif className == "Script" then
		requiredContext = "server"
	end

	if not SCRIPT_CLASSES[className] then
		addFinding("SCRIPT_CLASS_REQUIRED", "Every Studio script must declare Script, LocalScript, or ModuleScript explicitly.")
	end
	if placement == "unknown" then
		addFinding("SCRIPT_LOCATION_MISMATCH", "Every Studio script must declare a supported, explicit Studio location.")
	end
	if source:find("%.%s*Source%s*=") then
		addFinding(
			"RUNTIME_SCRIPT_SOURCE_WRITE",
			"Roblox game scripts cannot assign Script.Source at runtime. Create or update the target Script or LocalScript in Studio before play begins.",
			"Source"
		)
	end
	if requiredContext == "mixed" then
		addFinding(
			"MIXED_RUNTIME_CONTEXT",
			"This source combines client-only and server-only behavior. Split it into client and server scripts connected by remotes.",
			clientMatch and clientMatch.token
		)
	end
	if className ~= "ModuleScript" then
		if clientMatch and className == "Script" then
			addFinding("CLIENT_API_ON_SERVER", clientMatch.name .. " requires client execution, but this is a server Script.", clientMatch.token)
		end
		if serverMatch and className == "LocalScript" then
			addFinding("SERVER_API_ON_CLIENT", serverMatch.name .. " requires trusted server execution, but this is a LocalScript.", serverMatch.token)
		end
		if className == "LocalScript" and placement ~= "client" then
			addFinding("SCRIPT_LOCATION_MISMATCH", "LocalScript must be placed in a supported client container.")
		end
		if className == "Script" and placement ~= "server" and placement ~= "non_executing" then
			addFinding("SCRIPT_LOCATION_MISMATCH", "Script must be placed in ServerScriptService or Workspace.")
		end
		if placement == "non_executing" then
			addFinding("SCRIPT_LOCATION_MISMATCH", "Runnable scripts do not execute from ServerStorage.")
		end
	end

	return {
		ok = #findings == 0,
		status = #findings == 0 and "valid" or "blocked",
		requiredContext = requiredContext,
		findings = findings,
		adjustments = {},
	}
end

function ScriptContextGuard.failure(validation)
	return {
		ok = false,
		success = false,
		code = "SCRIPT_CONTEXT_MISMATCH",
		error = validation.findings[1] and validation.findings[1].message or "Script execution context is invalid",
		status = validation.status,
		requiredContext = validation.requiredContext,
		findings = validation.findings,
		adjustments = validation.adjustments,
		validation = validation,
		retryable = false,
	}
end

local function writeScript(payload)
	local path = payload.path
	local className = payload.className
	if type(className) ~= "string" or className == "" then
		return ScriptContextGuard.failure(ScriptContextGuard.validate({
			className = className,
			path = path,
			source = payload.source,
		}))
	end
	if not SCRIPT_CLASSES[className] then
		return ScriptContextGuard.failure(ScriptContextGuard.validate({
			className = className,
			path = path,
			source = payload.source,
		}))
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
	if existing and existing.ClassName ~= className then
		local hasConversionAuthorization = payload.allowClassChange == true
			and tostring(payload.inspectedClassName or "") == existing.ClassName
			and tostring(payload.expectedSourceHash or "") ~= ""
		if not hasConversionAuthorization then
			return ScriptContextGuard.failure({
				ok = false,
				status = "blocked",
				requiredContext = "unknown",
				findings = {
					{
						ruleCode = "SCRIPT_LOCATION_MISMATCH",
						code = "SCRIPT_LOCATION_MISMATCH",
						severity = "blocking",
						message = "Changing an existing script class requires allowClassChange, the inspected class, and the inspected source hash.",
					},
				},
				adjustments = {},
			})
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
	if existing then
		local hashOk, hashResult = verifyExpectedScriptHash(existing, payload.expectedSourceHash, fullPath(existing))
		if not hashOk then
			return hashResult
		end
	end
	local contextValidation = ScriptContextGuard.validate({
		className = className,
		path = existing and fullPath(existing) or path,
		source = payload.source,
	})
	if not contextValidation.ok then
		return ScriptContextGuard.failure(contextValidation)
	end

	if existing then
		appendSnapshotTree(existing, snapshots)
	else
		appendMissingPathSnapshots(path, snapshots, {})
	end
	local mutationOk, mutationResult = pcall(function()
		local inst = existing
		if not inst then
			local parent, name = ensureParent(path, payload.createParents ~= false)
			if not parent or not name then
				error("Could not resolve parent for " .. tostring(path))
			end
			inst = Instance.new(className)
			inst.Name = name
			inst.Parent = parent
		elseif inst.ClassName ~= className and payload.allowClassChange == true then
			local previous = inst
			local parent = previous.Parent
			local name = previous.Name
			local attributes = previous:GetAttributes()
			previous:Destroy()
			inst = Instance.new(className)
			inst.Name = name
			for attributeName, attributeValue in pairs(attributes) do
				inst:SetAttribute(attributeName, attributeValue)
			end
			inst.Parent = parent
		end
		ensureManagedId(inst)
		local wrote, writeErr = writeScriptSource(inst, payload.source or "")
		if not wrote then
			error(writeErr or "Could not write script source")
		end
		return inst
	end)
	if not mutationOk then
		return rollbackMutation(snapshots, "write_failed", mutationResult, { path = tostring(path) })
	end
	local inst = mutationResult
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
	local existing = resolvePath(path)
	if existing and SCRIPT_CLASSES[existing.ClassName] then
		local hashOk, hashResult = verifyExpectedScriptHash(existing, payload.expectedSourceHash, fullPath(existing))
		if not hashOk then
			return hashResult
		end
	end

	if existing then
		appendSnapshotTree(existing, snapshots)
	else
		appendMissingPathSnapshots(path, snapshots, {})
	end
	local mutationOk, mutationResult = pcall(function()
		local inst = createOrReplaceInstance(path, className, payload.properties or {}, payload.createParents ~= false)
		for key, value in pairs(payload.attributes or {}) do
			inst:SetAttribute(tostring(key), value)
		end
		for _, tag in ipairs(payload.tags or {}) do
			CollectionService:AddTag(inst, tostring(tag))
		end
		ensureManagedId(inst)
		return inst
	end)
	if not mutationOk then
		return rollbackMutation(snapshots, "create_instance_failed", mutationResult, { path = tostring(path) })
	end
	local inst = mutationResult
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
		local hashOk, hashResult = verifyExpectedScriptHash(inst, payload.expectedSourceHash, fullPath(inst))
		if not hashOk then
			return hashResult
		end
		appendSnapshotTree(inst, snapshots)
	else
		table.insert(snapshots, snapshotInstance(path))
	end
	if inst then
		local mutationOk, mutationErr = pcall(function()
			inst:Destroy()
		end)
		if not mutationOk then
			return rollbackMutation(snapshots, "delete_instance_failed", mutationErr, { path = tostring(path) })
		end
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
