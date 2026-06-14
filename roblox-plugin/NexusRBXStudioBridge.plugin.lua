-- NexusRBX Studio Bridge
-- Local Studio plugin: website-controlled apply + agent tool runner.

local BACKEND_URL = "https://nexusrbx-backend-production.up.railway.app"
local PLUGIN_VERSION = "0.3.1-agent"

local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")
local ScriptEditorService = game:GetService("ScriptEditorService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local ServerStorage = game:GetService("ServerStorage")
local StarterGui = game:GetService("StarterGui")
local StarterPlayer = game:GetService("StarterPlayer")
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")

local toolbar = plugin:CreateToolbar("NexusRBX")
local toggleButton = toolbar:CreateButton("NexusRBX", "Open NexusRBX Studio Bridge", "")
toggleButton.ClickableWhenViewportHidden = true

local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Right,
	false,
	false,
	380,
	420,
	300,
	260
)

local widget = plugin:CreateDockWidgetPluginGui("NexusRBXStudioBridge", widgetInfo)
widget.Title = "NexusRBX Studio Bridge"

local root = Instance.new("Frame")
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = settings().Studio.Theme:GetColor(Enum.StudioStyleGuideColor.MainBackground)
root.BorderSizePixel = 0
root.Parent = widget

local list = Instance.new("UIListLayout")
list.Padding = UDim.new(0, 8)
list.SortOrder = Enum.SortOrder.LayoutOrder
list.Parent = root

local padding = Instance.new("UIPadding")
padding.PaddingTop = UDim.new(0, 12)
padding.PaddingBottom = UDim.new(0, 12)
padding.PaddingLeft = UDim.new(0, 12)
padding.PaddingRight = UDim.new(0, 12)
padding.Parent = root

local function themeColor(color)
	return settings().Studio.Theme:GetColor(color)
end

local function makeLabel(text, size, bold)
	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Size = UDim2.new(1, 0, 0, size or 24)
	label.Font = bold and Enum.Font.GothamBold or Enum.Font.Gotham
	label.TextSize = bold and 16 or 13
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.TextYAlignment = Enum.TextYAlignment.Top
	label.TextWrapped = true
	label.TextColor3 = themeColor(Enum.StudioStyleGuideColor.MainText)
	label.Text = text
	label.Parent = root
	return label
end

local function makeButton(text, color)
	local button = Instance.new("TextButton")
	button.Size = UDim2.new(1, 0, 0, 34)
	button.BackgroundColor3 = color or themeColor(Enum.StudioStyleGuideColor.Button)
	button.TextColor3 = Color3.fromRGB(255, 255, 255)
	button.Font = Enum.Font.GothamBold
	button.TextSize = 13
	button.Text = text
	button.Parent = root
	return button
end

makeLabel("NexusRBX Studio Agent", 26, true)
local statusLabel = makeLabel("Status: not paired", 40)
local runLabel = makeLabel("Run: none", 34)
local activeLabel = makeLabel("Active tool: none", 44)
local snapshotLabel = makeLabel("Snapshots: 0 local", 24)

local codeBox = Instance.new("TextBox")
codeBox.Size = UDim2.new(1, 0, 0, 34)
codeBox.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.InputFieldBackground)
codeBox.TextColor3 = themeColor(Enum.StudioStyleGuideColor.MainText)
codeBox.PlaceholderText = "Pairing code from website"
codeBox.ClearTextOnFocus = false
codeBox.Text = ""
codeBox.Font = Enum.Font.Gotham
codeBox.TextSize = 14
codeBox.Parent = root

local pairButton = makeButton("Pair Studio", Color3.fromRGB(0, 170, 140))
local pullButton = makeButton("Pull Latest Command")
local restoreButton = makeButton("Restore Local Snapshots", Color3.fromRGB(155, 93, 229))
local lastLabel = makeLabel("Last command: none", 96)

local localSnapshots = {}
local applying = false

local SERVICE_ROOTS = {
	ReplicatedStorage = ReplicatedStorage,
	ServerScriptService = ServerScriptService,
	ServerStorage = ServerStorage,
	StarterGui = StarterGui,
	StarterPlayer = StarterPlayer,
	Workspace = Workspace,
	Lighting = Lighting,
}

local SCRIPT_CLASSES = {
	Script = true,
	LocalScript = true,
	ModuleScript = true,
}

local CREATABLE_CLASSES = {
	Folder = true,
	RemoteEvent = true,
	RemoteFunction = true,
	BindableEvent = true,
	BindableFunction = true,
	ScreenGui = true,
	Frame = true,
	StringValue = true,
	BoolValue = true,
	NumberValue = true,
	IntValue = true,
	Script = true,
	LocalScript = true,
	ModuleScript = true,
}

local AGENT_ARTIFACT_ID_ATTRIBUTE = "AgentArtifactId"
local AGENT_FILE_ID_ATTRIBUTE = "AgentFileId"

local function setStatus(text)
	statusLabel.Text = "Status: " .. tostring(text)
end

local function setLast(text)
	lastLabel.Text = "Last command: " .. tostring(text)
end

local function setRun(runId)
	runLabel.Text = "Run: " .. (runId and tostring(runId) or "none")
end

local function setActive(text)
	activeLabel.Text = "Active tool: " .. tostring(text or "none")
end

local function updateSnapshotLabel()
	snapshotLabel.Text = ("Snapshots: %d local"):format(#localSnapshots)
end

local function jsonEncode(value)
	return HttpService:JSONEncode(value)
end

local function jsonDecode(value)
	return HttpService:JSONDecode(value)
end

local function stableHash(value)
	local hash = 2166136261
	local text = tostring(value or "")
	for i = 1, #text do
		hash = bit32.bxor(hash, string.byte(text, i))
		hash = (hash * 16777619) % 4294967296
	end
	return string.format("%08x", hash)
end

local function request(method, path, body, token)
	local headers = {
		["Content-Type"] = "application/json",
		["Accept"] = "application/json",
	}
	if token then
		headers["Authorization"] = "Bearer " .. token
	end

	local ok, response = pcall(function()
		return HttpService:RequestAsync({
			Url = BACKEND_URL .. path,
			Method = method,
			Headers = headers,
			Body = body and jsonEncode(body) or nil,
		})
	end)

	if not ok then
		return false, tostring(response)
	end
	if response.StatusCode == 204 then
		return true, nil, response.StatusCode
	end
	if not response.Success then
		return false, response.Body ~= "" and response.Body or ("HTTP " .. tostring(response.StatusCode)), response.StatusCode
	end
	if response.Body == nil or response.Body == "" then
		return true, nil, response.StatusCode
	end

	local decodedOk, decoded = pcall(jsonDecode, response.Body)
	if not decodedOk then
		return false, "Invalid JSON response: " .. tostring(decoded)
	end
	return true, decoded, response.StatusCode
end

local function getToken()
	return plugin:GetSetting("nexusrbxStudioToken")
end

local function setToken(token)
	plugin:SetSetting("nexusrbxStudioToken", token)
end

local function splitPath(path)
	local parts = {}
	for part in tostring(path or ""):gmatch("[^/]+") do
		if part ~= "" and part ~= "game" then
			table.insert(parts, part)
		end
	end
	return parts
end

local function getStarterPlayerScripts()
	local folder = StarterPlayer:FindFirstChild("StarterPlayerScripts")
	if not folder then
		folder = Instance.new("StarterPlayerScripts")
		folder.Parent = StarterPlayer
	end
	return folder
end

local function rootFromParts(parts)
	local first = parts[1]
	if first == "StarterPlayerScripts" then
		return getStarterPlayerScripts(), 2
	end
	if first == "StarterPlayer" and parts[2] == "StarterPlayerScripts" then
		return getStarterPlayerScripts(), 3
	end
	if SERVICE_ROOTS[first] then
		return SERVICE_ROOTS[first], 2
	end
	return nil, 1
end

local function fullPath(inst)
	if not inst then
		return ""
	end
	local names = {}
	local cur = inst
	while cur and cur ~= game do
		table.insert(names, 1, cur.Name)
		cur = cur.Parent
	end
	return table.concat(names, "/")
end

local function resolvePath(path)
	local parts = splitPath(path)
	local rootInst, startIndex = rootFromParts(parts)
	if not rootInst then
		return nil
	end
	local current = rootInst
	for i = startIndex, #parts do
		current = current:FindFirstChild(parts[i])
		if not current then
			return nil
		end
	end
	return current
end

local function ensureParent(path, createParents)
	local parts = splitPath(path)
	local rootInst, startIndex = rootFromParts(parts)
	if not rootInst or #parts < startIndex then
		return nil, nil
	end
	local current = rootInst
	for i = startIndex, #parts - 1 do
		local child = current:FindFirstChild(parts[i])
		if not child then
			if not createParents then
				return nil, nil
			end
			child = Instance.new("Folder")
			child.Name = parts[i]
			child.Parent = current
		end
		current = child
	end
	return current, parts[#parts]
end

local function safeSetProperty(inst, key, value)
	pcall(function()
		if key == "Value" and inst:IsA("ValueBase") then
			inst.Value = value
		elseif key == "ResetOnSpawn" and inst:IsA("ScreenGui") then
			inst.ResetOnSpawn = value ~= false
		elseif key == "IgnoreGuiInset" and inst:IsA("ScreenGui") then
			inst.IgnoreGuiInset = value ~= false
		elseif key == "Enabled" and inst:IsA("ScreenGui") then
			inst.Enabled = value ~= false
		elseif key == "Name" then
			inst.Name = tostring(value)
		end
	end)
end

local function readScriptSource(inst)
	if not inst or not SCRIPT_CLASSES[inst.ClassName] then
		return false, ""
	end
	if ScriptEditorService and ScriptEditorService.GetEditorSource then
		local ok, source = pcall(function()
			return ScriptEditorService:GetEditorSource(inst)
		end)
		if ok and type(source) == "string" then
			return true, source
		end
	end
	local ok, source = pcall(function()
		return inst.Source
	end)
	return ok, ok and source or ""
end

local function writeScriptSource(inst, source)
	if not inst or not SCRIPT_CLASSES[inst.ClassName] then
		return false, "Not a script instance"
	end
	local nextSource = tostring(source or "")
	if ScriptEditorService and ScriptEditorService.UpdateSourceAsync then
		local ok, err = pcall(function()
			ScriptEditorService:UpdateSourceAsync(inst, function()
				return nextSource
			end)
		end)
		if ok then
			return true
		end
	end
	local ok, err = pcall(function()
		inst.Source = nextSource
	end)
	return ok, ok and nil or tostring(err)
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
		properties = {},
	}

	if SCRIPT_CLASSES[inst.ClassName] then
		local ok, source = readScriptSource(inst)
		snap.source = ok and source or ""
	end
	if inst:IsA("ScreenGui") then
		snap.properties.ResetOnSpawn = inst.ResetOnSpawn
		snap.properties.IgnoreGuiInset = inst.IgnoreGuiInset
		snap.properties.Enabled = inst.Enabled
	end
	if inst:IsA("ValueBase") then
		local ok, value = pcall(function()
			return inst.Value
		end)
		if ok then
			snap.properties.Value = value
		end
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
		safeSetProperty(inst, key, value)
	end
	inst.Parent = parent
	return inst
end

local function serializeInstance(inst, path, depth, maxDepth, state, includeSource, sourceMaxChars)
	state.count = state.count + 1
	local item = {
		name = inst.Name,
		className = inst.ClassName,
		path = path,
		tags = CollectionService:GetTags(inst),
		children = {},
	}

	if SCRIPT_CLASSES[inst.ClassName] then
		item.isScript = true
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

	if depth >= maxDepth or state.count >= state.maxInstances then
		item.truncated = #inst:GetChildren() > 0
		return item
	end

	for _, child in ipairs(inst:GetChildren()) do
		if state.count >= state.maxInstances then
			item.truncated = true
			break
		end
		table.insert(item.children, serializeInstance(child, path .. "/" .. child.Name, depth + 1, maxDepth, state, includeSource, sourceMaxChars))
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
		return tostring(a.Name) < tostring(b.Name)
	end)
	return roots
end

local function inspectPlace(payload)
	local maxDepth = math.clamp(tonumber(payload.maxDepth) or 5, 1, 8)
	local maxInstances = math.clamp(tonumber(payload.maxInstances) or 500, 20, 1500)
	local includeSource = payload.includeSource == true
	local sourceMaxChars = math.clamp(tonumber(payload.sourceMaxChars) or 0, 0, 8000)
	local state = { count = 0, maxInstances = maxInstances }
	local roots = {}
	for _, inst in ipairs(getInspectionRoots()) do
		table.insert(roots, serializeInstance(inst, inst.Name, 1, maxDepth, state, includeSource, sourceMaxChars))
	end
	return {
		placeName = game.Name,
		placeId = tostring(game.PlaceId),
		count = state.count,
		truncated = state.count >= maxInstances,
		roots = roots,
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
	local className = payload.className or "ModuleScript"
	if not SCRIPT_CLASSES[className] then
		error("write_script requires Script, LocalScript, or ModuleScript")
	end
	local snapshots = {}
	if payload.snapshot ~= false then
		table.insert(snapshots, snapshotInstance(path))
	end
	local inst = createOrReplaceInstance(path, className, {}, payload.createParents ~= false)
	local ok, err = writeScriptSource(inst, payload.source or "")
	if not ok then
		error(err or "Could not write script source")
	end
	return {
		path = fullPath(inst),
		className = inst.ClassName,
		sourceLength = #(payload.source or ""),
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
	return {
		path = fullPath(inst),
		className = inst.ClassName,
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

local function getServiceRoot(serviceName)
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
	}
end

local TOOL_HANDLERS = {
	apply_artifact = applyArtifact,
	inspect_place = inspectPlace,
	read_script = readScript,
	write_script = writeScript,
	create_instance = createInstanceTool,
	delete_instance = deleteInstanceTool,
	restore_snapshot = restoreSnapshots,
	run_smoke_check = runSmokeCheck,
}

local function ack(commandId, status, result, errorMessage)
	local token = getToken()
	if not token then
		return
	end
	request("POST", "/api/studio/commands/" .. HttpService:UrlEncode(commandId) .. "/ack", {
		status = status,
		result = result,
		error = errorMessage,
	}, token)
end

local function executeCommand(command)
	local commandType = command.type or "apply_artifact"
	local handler = TOOL_HANDLERS[commandType]
	if not handler then
		error("Unsupported Studio command: " .. tostring(commandType))
	end
	setRun(command.runId)
	setActive((command.label or commandType) .. " (" .. commandType .. ")")
	local payload = command.payload or {}
	return handler(payload)
end

local function pullOnce()
	if applying then
		return
	end
	local token = getToken()
	if not token then
		setStatus("not paired")
		return
	end
	applying = true
	local ok, data, statusCode = request("GET", "/api/studio/commands/next?waitMs=1000", nil, token)
	if not ok then
		setStatus("poll failed")
		setLast(tostring(data))
		applying = false
		return
	end
	if statusCode == 204 or not data or not data.command then
		setStatus("connected")
		setActive("none")
		applying = false
		return
	end

	local command = data.command
	local recording = beginRecording("NexusRBX " .. tostring(command.type or "command"))
	local applyOk, resultOrError = pcall(function()
		return executeCommand(command)
	end)

	if applyOk and type(resultOrError) == "table" and resultOrError.ok == false then
		finishRecording(recording, false)
		ack(command.id, "failed", resultOrError, tostring(resultOrError.error or "Studio command failed"))
		setLast((command.type or "command") .. " failed: " .. tostring(resultOrError.error or "Studio command failed"))
		setStatus("connected")
	elseif applyOk then
		finishRecording(recording, true)
		ack(command.id, "succeeded", resultOrError, nil)
		local snapshotCount = (type(resultOrError) == "table" and #(resultOrError.snapshots or {})) or 0
		local extra = ""
		if type(resultOrError) == "table" and resultOrError.validation then
			local v = resultOrError.validation
			if (v.failures or 0) > 0 then
				extra = (" — %d/%d file(s) flagged"):format(v.failures, v.total or 0)
			end
		end
		if snapshotCount > 0 then
			extra = extra .. (" (" .. snapshotCount .. " snapshot(s))")
		end
		setLast(("%s succeeded%s"):format(command.type or "command", extra))
		setStatus("connected")
	else
		finishRecording(recording, false)
		ack(command.id, "failed", nil, tostring(resultOrError))
		setLast((command.type or "command") .. " failed: " .. tostring(resultOrError))
		setStatus("connected")
	end
	setActive("none")
	applying = false
end

pairButton.MouseButton1Click:Connect(function()
	local code = string.upper((codeBox.Text or ""):gsub("%s+", ""))
	if code == "" then
		setStatus("enter pairing code")
		return
	end

	setStatus("pairing...")
	local ok, dataOrError = request("POST", "/api/studio/pair/claim", {
		code = code,
		studio = {
			placeName = game.Name,
			placeId = tostring(game.PlaceId),
			pluginVersion = PLUGIN_VERSION,
		},
	}, nil)

	if not ok then
		setStatus("pair failed")
		setLast(tostring(dataOrError))
		return
	end

	setToken(dataOrError.token)
	plugin:SetSetting("nexusrbxStudioSessionId", dataOrError.sessionId)
	setStatus("connected")
	setLast("paired session " .. tostring(dataOrError.sessionId))
end)

pullButton.MouseButton1Click:Connect(pullOnce)

restoreButton.MouseButton1Click:Connect(function()
	if #localSnapshots == 0 then
		setLast("no local snapshots to restore")
		return
	end
	local recording = beginRecording("NexusRBX restore local snapshots")
	local ok, resultOrError = pcall(function()
		return restoreSnapshots({ snapshots = localSnapshots })
	end)
	if ok then
		finishRecording(recording, true)
		setLast(("local restore complete: %d restored, %d removed"):format(resultOrError.restored or 0, resultOrError.removed or 0))
	else
		finishRecording(recording, false)
		setLast("local restore failed: " .. tostring(resultOrError))
	end
end)

toggleButton.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)

task.spawn(function()
	while true do
		task.wait(2)
		if getToken() then
			pullOnce()
		end
	end
end)

updateSnapshotLabel()
if getToken() then
	setStatus("connected")
else
	setStatus("not paired")
end
