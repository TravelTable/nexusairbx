-- NexusRBX Studio Bridge
-- Local Studio plugin: website-controlled apply + agent tool runner.

local BACKEND_URL = "https://nexusrbx-backend-production.up.railway.app"
local PLUGIN_VERSION = "0.2.0-agent"

local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")
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
		local ok, source = pcall(function()
			return inst.Source
		end)
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
			local ok, source = pcall(function()
				return inst.Source
			end)
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

local function inspectPlace(payload)
	local maxDepth = math.clamp(tonumber(payload.maxDepth) or 5, 1, 8)
	local maxInstances = math.clamp(tonumber(payload.maxInstances) or 500, 20, 1500)
	local includeSource = payload.includeSource == true
	local sourceMaxChars = math.clamp(tonumber(payload.sourceMaxChars) or 0, 0, 8000)
	local state = { count = 0, maxInstances = maxInstances }
	local roots = {}
	local rootNames = {
		"ReplicatedStorage",
		"ServerScriptService",
		"ServerStorage",
		"StarterGui",
		"StarterPlayer",
		"Workspace",
		"Lighting",
	}
	for _, name in ipairs(rootNames) do
		local inst = SERVICE_ROOTS[name]
		table.insert(roots, serializeInstance(inst, name, 1, maxDepth, state, includeSource, sourceMaxChars))
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
			local ok, source = pcall(function()
				return inst.Source
			end)
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
	inst.Source = payload.source or ""
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
		table.insert(snapshots, snapshotInstance(path))
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
	local snapshots = { snapshotInstance(path) }
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
				inst.Source = snap.source
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
			local ok, source = pcall(function()
				return inst.Source
			end)
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

local function ensureCleanFolder(parent, folderName)
	local existing = parent:FindFirstChild(folderName)
	if existing then
		existing:Destroy()
	end
	local folder = Instance.new("Folder")
	folder.Name = folderName
	folder.Parent = parent
	return folder
end

local function applyArtifact(payload)
	local projectName = payload.projectName or "NexusRBX_Project"
	local serviceFolders = {}
	for _, scriptSpec in ipairs(payload.scripts or {}) do
		local serviceName = scriptSpec.service or "ReplicatedStorage"
		local serviceRoot = getServiceRoot(serviceName)
		if not serviceFolders[serviceName] then
			serviceFolders[serviceName] = ensureCleanFolder(serviceRoot, projectName)
		end
		local inst = Instance.new(scriptSpec.className or "ModuleScript")
		inst.Name = scriptSpec.name or inst.ClassName
		inst.Source = scriptSpec.source or ""
		inst.Parent = serviceFolders[serviceName]
	end
	if #(payload.remotes or {}) > 0 then
		local remoteFolder = serviceFolders.ReplicatedStorage or ensureCleanFolder(ReplicatedStorage, projectName)
		for _, remoteSpec in ipairs(payload.remotes or {}) do
			local remote = Instance.new(remoteSpec.className == "RemoteFunction" and "RemoteFunction" or "RemoteEvent")
			remote.Name = remoteSpec.name or remote.ClassName
			remote.Parent = remoteFolder
		end
	end
	for _, screenSpec in ipairs(payload.screenGuis or {}) do
		createOrReplaceInstance("StarterGui/" .. (screenSpec.name or "NexusRBXScreen"), "ScreenGui", {
			ResetOnSpawn = screenSpec.resetOnSpawn ~= false,
			IgnoreGuiInset = screenSpec.ignoreGuiInset ~= false,
		}, true)
	end
	return {
		scripts = #(payload.scripts or {}),
		remotes = #(payload.remotes or {}),
		screenGuis = #(payload.screenGuis or {}),
		warnings = payload.warnings or {},
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

	if applyOk then
		finishRecording(recording, true)
		ack(command.id, "succeeded", resultOrError, nil)
		local snapshotCount = #(resultOrError.snapshots or {})
		setLast(("%s succeeded%s"):format(command.type or "command", snapshotCount > 0 and (" with " .. snapshotCount .. " snapshot(s)") or ""))
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
