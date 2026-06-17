-- NexusRBX Studio Bridge
-- Local Studio plugin: website-controlled apply + agent tool runner.

local BACKEND_URL = "https://nexusrbx-backend-production.up.railway.app"
local PLUGIN_VERSION = "0.4.1-protocol"

local HttpService = game:GetService("HttpService")
local AssetService = game:GetService("AssetService")
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
makeLabel("Plugin " .. PLUGIN_VERSION, 20)
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
local disconnectButton = makeButton("Disconnect Studio", Color3.fromRGB(214, 69, 80))
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
	TextLabel = true,
	TextButton = true,
	TextBox = true,
	ImageLabel = true,
	ImageButton = true,
	ScrollingFrame = true,
	UIListLayout = true,
	UIGridLayout = true,
	UIPadding = true,
	UICorner = true,
	UIStroke = true,
	StringValue = true,
	BoolValue = true,
	NumberValue = true,
	IntValue = true,
	ObjectValue = true,
	Configuration = true,
	Script = true,
	LocalScript = true,
	ModuleScript = true,
}

local AGENT_ARTIFACT_ID_ATTRIBUTE = "AgentArtifactId"
local AGENT_FILE_ID_ATTRIBUTE = "AgentFileId"
local NEXUS_MANAGED_ID_ATTRIBUTE = "NexusManagedId"
local lastBatchSnapshots = {}

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

local readScriptSource

local function stableHash(value)
	local hash = 2166136261
	local text = tostring(value or "")
	for i = 1, #text do
		hash = bit32.bxor(hash, string.byte(text, i))
		hash = (hash * 16777619) % 4294967296
	end
	return string.format("%08x", hash)
end

local function nowMs()
	return math.floor(os.clock() * 1000)
end

local function ensureManagedId(inst)
	if not inst or inst == game then
		return nil
	end
	local existing = inst:GetAttribute(NEXUS_MANAGED_ID_ATTRIBUTE)
	if existing and tostring(existing) ~= "" then
		return tostring(existing)
	end
	local nextId = HttpService:GenerateGUID(false)
	local ok = pcall(function()
		inst:SetAttribute(NEXUS_MANAGED_ID_ATTRIBUTE, nextId)
	end)
	return ok and nextId or nil
end

local function readManagedId(inst)
	if not inst or inst == game then
		return nil
	end
	local existing = inst:GetAttribute(NEXUS_MANAGED_ID_ATTRIBUTE)
	return existing and tostring(existing) or nil
end

local function attributesOf(inst)
	local ok, attrs = pcall(function()
		return inst:GetAttributes()
	end)
	return ok and attrs or {}
end

local function safePropertyValue(inst, key)
	local ok, value = pcall(function()
		return inst[key]
	end)
	if not ok then
		return nil
	end
	local valueType = typeof(value)
	if valueType == "string" or valueType == "number" or valueType == "boolean" then
		return value
	elseif valueType == "Color3" then
		return { r = value.R, g = value.G, b = value.B, type = "Color3" }
	elseif valueType == "UDim2" then
		return {
			type = "UDim2",
			xScale = value.X.Scale,
			xOffset = value.X.Offset,
			yScale = value.Y.Scale,
			yOffset = value.Y.Offset,
		}
	elseif valueType == "UDim" then
		return { type = "UDim", scale = value.Scale, offset = value.Offset }
	elseif valueType == "Vector2" then
		return { type = "Vector2", x = value.X, y = value.Y }
	elseif valueType == "Vector3" then
		return { type = "Vector3", x = value.X, y = value.Y, z = value.Z }
	elseif valueType == "EnumItem" then
		return tostring(value)
	end
	return nil
end

local function propertiesOf(inst)
	local props = {
		Name = inst.Name,
		ClassName = inst.ClassName,
	}
	local candidates = {
		"Value",
		"Enabled",
		"ResetOnSpawn",
		"IgnoreGuiInset",
		"Text",
		"Visible",
		"Size",
		"Position",
		"AnchorPoint",
		"BackgroundTransparency",
		"TextTransparency",
		"ImageTransparency",
		"ZIndex",
		"LayoutOrder",
		"SortOrder",
		"Padding",
		"CornerRadius",
		"Thickness",
	}
	for _, key in ipairs(candidates) do
		local value = safePropertyValue(inst, key)
		if value ~= nil then
			props[key] = value
		end
	end
	return props
end

local function propertyHash(inst)
	return stableHash(jsonEncode(propertiesOf(inst)) .. jsonEncode(attributesOf(inst)) .. table.concat(CollectionService:GetTags(inst), ","))
end

local function scriptHash(inst)
	if not inst or not SCRIPT_CLASSES[inst.ClassName] then
		return nil
	end
	local ok, source = readScriptSource(inst)
	return ok and stableHash(source) or nil
end

local function structuredUnsupported(operation, message)
	return {
		ok = false,
		success = false,
		operation = operation,
		error = {
			code = "unsupported_in_studio_plugin",
			message = message or (operation .. " is not supported by this Studio plugin runtime"),
			retryable = false,
		},
		warnings = {},
		diagnostics = {},
		affectedPaths = {},
	}
end

local function escapePattern(text)
	return tostring(text or ""):gsub("([^%w])", "%%%1")
end

local function escapeReplacement(text)
	return tostring(text or ""):gsub("%%", "%%%%")
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
	local ok, err = pcall(function()
		if typeof(value) == "table" and value.type == "UDim2" then
			value = UDim2.new(value.xScale or 0, value.xOffset or 0, value.yScale or 0, value.yOffset or 0)
		elseif typeof(value) == "table" and value.type == "UDim" then
			value = UDim.new(value.scale or 0, value.offset or 0)
		elseif typeof(value) == "table" and value.type == "Color3" then
			value = Color3.new(value.r or 0, value.g or 0, value.b or 0)
		elseif typeof(value) == "table" and value.type == "Vector2" then
			value = Vector2.new(value.x or 0, value.y or 0)
		elseif typeof(value) == "table" and value.type == "Vector3" then
			value = Vector3.new(value.x or 0, value.y or 0, value.z or 0)
		end
		if key == "Value" and inst:IsA("ValueBase") then
			inst.Value = value
		elseif key == "ResetOnSpawn" and inst:IsA("ScreenGui") then
			inst.ResetOnSpawn = value ~= false
		elseif key == "IgnoreGuiInset" and inst:IsA("ScreenGui") then
			inst.IgnoreGuiInset = value ~= false
		elseif key == "Enabled" and inst:IsA("ScreenGui") then
			inst.Enabled = value ~= false
		elseif key == "Text" and (inst:IsA("TextLabel") or inst:IsA("TextButton") or inst:IsA("TextBox")) then
			inst.Text = tostring(value)
		elseif key == "Visible" and inst:IsA("GuiObject") then
			inst.Visible = value ~= false
		elseif key == "Size" and inst:IsA("GuiObject") and typeof(value) == "UDim2" then
			inst.Size = value
		elseif key == "Position" and inst:IsA("GuiObject") and typeof(value) == "UDim2" then
			inst.Position = value
		elseif key == "BackgroundTransparency" and inst:IsA("GuiObject") then
			inst.BackgroundTransparency = tonumber(value) or inst.BackgroundTransparency
		elseif key == "TextTransparency" and (inst:IsA("TextLabel") or inst:IsA("TextButton") or inst:IsA("TextBox")) then
			inst.TextTransparency = tonumber(value) or inst.TextTransparency
		elseif key == "ImageTransparency" and (inst:IsA("ImageLabel") or inst:IsA("ImageButton")) then
			inst.ImageTransparency = tonumber(value) or inst.ImageTransparency
		elseif key == "AnchorPoint" and inst:IsA("GuiObject") and typeof(value) == "Vector2" then
			inst.AnchorPoint = value
		elseif key == "ZIndex" and inst:IsA("GuiObject") then
			inst.ZIndex = tonumber(value) or inst.ZIndex
		elseif key == "LayoutOrder" and inst:IsA("GuiObject") then
			inst.LayoutOrder = tonumber(value) or inst.LayoutOrder
		elseif key == "Padding" and inst:IsA("UIPadding") and typeof(value) == "UDim" then
			inst.PaddingTop = value
			inst.PaddingBottom = value
			inst.PaddingLeft = value
			inst.PaddingRight = value
		elseif key == "CornerRadius" and inst:IsA("UICorner") and typeof(value) == "UDim" then
			inst.CornerRadius = value
		elseif key == "Thickness" and inst:IsA("UIStroke") then
			inst.Thickness = tonumber(value) or inst.Thickness
		elseif key == "Name" then
			inst.Name = tostring(value)
		else
			error("Unsupported or unsafe property: " .. tostring(key))
		end
	end)
	return ok, ok and nil or tostring(err)
end

function readScriptSource(inst)
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
		properties = propertiesOf(inst),
		attributes = attributesOf(inst),
		tags = CollectionService:GetTags(inst),
	}
	snap.properties.ClassName = nil

	if SCRIPT_CLASSES[inst.ClassName] then
		local ok, source = readScriptSource(inst)
		snap.source = ok and source or ""
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
		local ok, err = safeSetProperty(inst, key, value)
		if not ok then
			error(err)
		end
	end
	inst.Parent = parent
	return inst
end

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

	if depth >= maxDepth or state.count >= state.maxInstances then
		item.truncated = #inst:GetChildren() > 0
		return item
	end

	for _, child in ipairs(inst:GetChildren()) do
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
		return tostring(a.Name) < tostring(b.Name)
	end)
	return roots
end

local function inspectPlace(payload)
	local maxDepth = math.clamp(tonumber(payload.maxDepth) or 12, 1, 32)
	local maxInstances = math.clamp(tonumber(payload.maxInstances) or 500, 20, 10000)
	local includeSource = payload.includeSource == true
	local sourceMaxChars = math.clamp(tonumber(payload.sourceMaxChars) or 0, 0, 8000)
	local pageSize = math.clamp(tonumber(payload.pageSize) or maxInstances, 20, 1000)
	local cursor = math.max(0, tonumber(payload.cursor) or 0)
	local state = { count = 0, maxInstances = maxInstances, items = {} }
	local roots = {}
	for _, inst in ipairs(getInspectionRoots()) do
		table.insert(roots, serializeInstance(inst, inst.Name, 1, maxDepth, state, includeSource, sourceMaxChars, ""))
	end
	local page = {}
	for i = cursor + 1, math.min(#state.items, cursor + pageSize) do
		table.insert(page, state.items[i])
	end
	return {
		protocolVersion = "2026-06-15",
		revision = tostring(payload.manifestRevision or "") ~= "" and tostring(payload.manifestRevision) or stableHash(tostring(game.PlaceId) .. ":" .. tostring(os.time())),
		placeName = game.Name,
		placeId = tostring(game.PlaceId),
		count = state.count,
		totalInstances = state.count,
		truncated = state.count >= maxInstances,
		items = page,
		nextCursor = (cursor + pageSize < #state.items) and tostring(cursor + pageSize) or nil,
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
	local className = payload.className or "ModuleScript"
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
	local selectionService = game:GetService("Selection")
	local out = {}
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

local function runProjectValidation(payload)
	local smoke = runSmokeCheck(payload or {})
	local diagnostics = {}
	for _, issue in ipairs(smoke.issues or {}) do
		table.insert(diagnostics, {
			severity = "warning",
			path = issue.path,
			message = issue.message,
		})
	end
	return {
		ok = smoke.ok,
		checkedScripts = smoke.checkedScripts,
		diagnostics = diagnostics,
		issues = smoke.issues,
	}
end

local function collectDiagnostics(payload)
	return runProjectValidation(payload or {})
end

local function collectOutput()
	return {
		warnings = { "Roblox Studio output log collection is not exposed to plugins in this bridge runtime." },
		output = {},
	}
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

local CREATOR_STORE_IMPORT_MAX_DESCENDANTS = 10000
local CREATOR_STORE_IMPORT_MAX_DEPTH = 64
local CREATOR_STORE_IMPORT_RECEIPTS_SETTING = "nexusrbxCreatorStoreImportReceipts"
local CREATOR_STORE_IMPORT_RECEIPT_ORDER_SETTING = "nexusrbxCreatorStoreImportReceiptOrder"

local function creatorStoreFailure(assetId, code, message, warnings)
	return {
		ok = false,
		type = "insert_creator_store_asset",
		assetId = tostring(assetId or ""),
		code = code,
		message = message,
		warnings = warnings or {},
	}
end

local function importSettingTable(key)
	local ok, value = pcall(function()
		return plugin:GetSetting(key)
	end)
	if ok and type(value) == "table" then
		return value
	end
	return {}
end

local function getStoredImportReceipt(idempotencyKey)
	if tostring(idempotencyKey or "") == "" then
		return nil
	end
	local receipts = importSettingTable(CREATOR_STORE_IMPORT_RECEIPTS_SETTING)
	return receipts[tostring(idempotencyKey)]
end

local function storeImportReceipt(idempotencyKey, receipt)
	if tostring(idempotencyKey or "") == "" or type(receipt) ~= "table" then
		return
	end
	local key = tostring(idempotencyKey)
	local receipts = importSettingTable(CREATOR_STORE_IMPORT_RECEIPTS_SETTING)
	local order = importSettingTable(CREATOR_STORE_IMPORT_RECEIPT_ORDER_SETTING)
	if not receipts[key] then
		table.insert(order, key)
	end
	receipts[key] = receipt
	while #order > 50 do
		local oldKey = table.remove(order, 1)
		receipts[oldKey] = nil
	end
	pcall(function()
		plugin:SetSetting(CREATOR_STORE_IMPORT_RECEIPTS_SETTING, receipts)
		plugin:SetSetting(CREATOR_STORE_IMPORT_RECEIPT_ORDER_SETTING, order)
	end)
end

local function cleanImportName(value, fallback)
	local text = tostring(value or ""):gsub("[%c]", ""):gsub("^%s+", ""):gsub("%s+$", "")
	if text == "" then
		text = fallback or "CreatorStoreAsset"
	end
	if #text > 100 then
		text = string.sub(text, 1, 100)
	end
	return text
end

local function uniqueChildName(parent, desiredName)
	local base = cleanImportName(desiredName, "CreatorStoreAsset")
	if not parent:FindFirstChild(base) then
		return base
	end
	for index = 2, 500 do
		local candidate = string.format("%s (%d)", base, index)
		if not parent:FindFirstChild(candidate) then
			return candidate
		end
	end
	return base .. " (" .. tostring(HttpService:GenerateGUID(false)) .. ")"
end

local function isAllowedCreatorStoreImportTarget(path)
	local parts = splitPath(path)
	local root = parts[1]
	if root ~= "Workspace" and root ~= "ReplicatedStorage" and root ~= "ServerStorage" then
		return false
	end
	for _, part in ipairs(parts) do
		if part == "." or part == ".." then
			return false
		end
	end
	return #parts >= 1
end

local function safeIsA(inst, className)
	local ok, result = pcall(function()
		return inst:IsA(className)
	end)
	return ok and result == true
end

local function countTreeDepth(inst, depth)
	local maxDepth = depth or 0
	for _, child in ipairs(inst:GetChildren()) do
		maxDepth = math.max(maxDepth, countTreeDepth(child, (depth or 0) + 1))
	end
	return maxDepth
end

local function belongsToRoot(value, root)
	return typeof(value) == "Instance" and (value == root or value:IsDescendantOf(root))
end

local function scanAndSanitizeCreatorStoreRoot(root, requestedAssetType)
	local scan = {
		totalDescendants = 0,
		scriptsRemoved = 0,
		remoteObjectsRemoved = 0,
		bindableObjectsRemoved = 0,
		behaviouralObjectsFlagged = 0,
		invalidReferencesFound = 0,
		meshParts = 0,
		parts = 0,
		models = 0,
		constraints = 0,
		sounds = 0,
		tools = 0,
		prompts = 0,
		clickDetectors = 0,
		packages = 0,
	}
	local warnings = {}
	local blocked = {}
	local descendants = root:GetDescendants()
	scan.totalDescendants = #descendants
	if scan.totalDescendants > CREATOR_STORE_IMPORT_MAX_DESCENDANTS then
		return nil, "ASSET_TREE_TOO_LARGE", "The Creator Store asset contains too many descendants.", scan, warnings
	end
	if countTreeDepth(root, 0) > CREATOR_STORE_IMPORT_MAX_DEPTH then
		return nil, "ASSET_TREE_TOO_DEEP", "The Creator Store asset tree is too deeply nested.", scan, warnings
	end
	if root:IsA("MeshPart") then
		scan.meshParts = scan.meshParts + 1
	elseif root:IsA("BasePart") then
		scan.parts = scan.parts + 1
	elseif root:IsA("Model") then
		scan.models = scan.models + 1
	end

	for _, inst in ipairs(descendants) do
		if safeIsA(inst, "LuaSourceContainer") or SCRIPT_CLASSES[inst.ClassName] then
			scan.scriptsRemoved = scan.scriptsRemoved + 1
			table.insert(blocked, inst)
		elseif inst:IsA("RemoteEvent") or inst:IsA("RemoteFunction") or safeIsA(inst, "UnreliableRemoteEvent") then
			scan.remoteObjectsRemoved = scan.remoteObjectsRemoved + 1
			table.insert(blocked, inst)
		elseif inst:IsA("BindableEvent") or inst:IsA("BindableFunction") then
			scan.bindableObjectsRemoved = scan.bindableObjectsRemoved + 1
			table.insert(blocked, inst)
		end

		if inst:IsA("MeshPart") then
			scan.meshParts = scan.meshParts + 1
		elseif inst:IsA("BasePart") then
			scan.parts = scan.parts + 1
		elseif inst:IsA("Model") then
			scan.models = scan.models + 1
		end

		if inst:IsA("Tool") then
			scan.tools = scan.tools + 1
			scan.behaviouralObjectsFlagged = scan.behaviouralObjectsFlagged + 1
		elseif inst.ClassName == "HopperBin" or inst:IsA("Humanoid") or inst:IsA("AnimationController") then
			scan.behaviouralObjectsFlagged = scan.behaviouralObjectsFlagged + 1
		elseif inst:IsA("Sound") then
			scan.sounds = scan.sounds + 1
			scan.behaviouralObjectsFlagged = scan.behaviouralObjectsFlagged + 1
		elseif inst:IsA("ProximityPrompt") then
			scan.prompts = scan.prompts + 1
			scan.behaviouralObjectsFlagged = scan.behaviouralObjectsFlagged + 1
		elseif inst:IsA("ClickDetector") then
			scan.clickDetectors = scan.clickDetectors + 1
			scan.behaviouralObjectsFlagged = scan.behaviouralObjectsFlagged + 1
		elseif inst.ClassName == "TouchTransmitter" then
			scan.behaviouralObjectsFlagged = scan.behaviouralObjectsFlagged + 1
		elseif inst.ClassName == "PackageLink" or inst.Name == "PackageLink" then
			scan.packages = scan.packages + 1
			scan.behaviouralObjectsFlagged = scan.behaviouralObjectsFlagged + 1
		end

		if safeIsA(inst, "Constraint") then
			scan.constraints = scan.constraints + 1
			local okAttachment0, attachment0 = pcall(function()
				return inst.Attachment0
			end)
			local okAttachment1, attachment1 = pcall(function()
				return inst.Attachment1
			end)
			if (okAttachment0 and attachment0 and not belongsToRoot(attachment0, root)) or (okAttachment1 and attachment1 and not belongsToRoot(attachment1, root)) then
				scan.invalidReferencesFound = scan.invalidReferencesFound + 1
			end
		end
	end

	for _, inst in ipairs(blocked) do
		if inst and inst.Parent then
			inst:Destroy()
		end
	end

	if scan.scriptsRemoved > 0 then
		table.insert(warnings, string.format("Removed %d script object(s).", scan.scriptsRemoved))
	end
	if scan.remoteObjectsRemoved > 0 then
		table.insert(warnings, string.format("Removed %d networking object(s).", scan.remoteObjectsRemoved))
	end
	if scan.bindableObjectsRemoved > 0 then
		table.insert(warnings, string.format("Removed %d bindable object(s).", scan.bindableObjectsRemoved))
	end
	if scan.behaviouralObjectsFlagged > 0 then
		table.insert(warnings, string.format("Flagged %d behavioural object(s) for review.", scan.behaviouralObjectsFlagged))
	end
	if scan.invalidReferencesFound > 0 then
		table.insert(warnings, string.format("Found %d constraint reference(s) outside the imported tree.", scan.invalidReferencesFound))
	end

	local remainingVisuals = root:IsA("BasePart") and 1 or 0
	for _, inst in ipairs(root:GetDescendants()) do
		if inst:IsA("BasePart") then
			remainingVisuals = remainingVisuals + 1
		end
	end
	if remainingVisuals == 0 then
		return nil, "NO_USABLE_CONTENT", "No usable visual content remained after sanitization.", scan, warnings
	end
	if requestedAssetType == "Mesh" and scan.meshParts == 0 then
		return nil, "UNSUPPORTED_ASSET_TYPE", "The loaded asset did not contain a compatible mesh.", scan, warnings
	end
	return true, nil, nil, scan, warnings
end

local function targetCFrameForPlacement(placement)
	local mode = tostring((placement or {}).mode or "camera_focus")
	if mode == "explicit_position" and type(placement.position) == "table" then
		local pos = placement.position
		return CFrame.new(Vector3.new(tonumber(pos.x) or 0, tonumber(pos.y) or 0, tonumber(pos.z) or 0))
	end
	if mode == "camera_focus" then
		local camera = Workspace.CurrentCamera
		if camera then
			local cameraFrame = camera.CFrame
			local target = cameraFrame.Position + cameraFrame.LookVector * 24
			if target.Y < 3 then
				target = Vector3.new(target.X, 3, target.Z)
			end
			return CFrame.new(target)
		end
	end
	return CFrame.new(0, 3, 0)
end

local function pivotImportedRoot(root, placement)
	local target = targetCFrameForPlacement(placement)
	if root:IsA("Model") then
		root:PivotTo(target)
	elseif root:IsA("BasePart") then
		root.CFrame = target
	else
		local primary = root:FindFirstChildWhichIsA("BasePart", true)
		if primary then
			local delta = target.Position - primary.Position
			for _, inst in ipairs(root:GetDescendants()) do
				if inst:IsA("BasePart") then
					inst.CFrame = inst.CFrame + delta
				end
			end
		end
	end
	return target
end

local function insertCreatorStoreAsset(payload)
	payload = payload or {}
	local assetId = tostring(payload.assetId or "")
	local idempotencyKey = tostring(payload.idempotencyKey or "")
	local replay = getStoredImportReceipt(idempotencyKey)
	if replay then
		replay.replayed = true
		replay.code = "COMMAND_ALREADY_APPLIED"
		return replay
	end

	if not assetId:match("^[1-9]%d*$") then
		return creatorStoreFailure(assetId, "INVALID_ASSET_ID", "assetId must be a positive integer.")
	end
	local assetType = tostring(payload.assetType or "")
	if assetType ~= "Model" and assetType ~= "Mesh" then
		return creatorStoreFailure(assetId, "UNSUPPORTED_ASSET_TYPE", "Only Model and Mesh Creator Store assets can be imported.")
	end
	local targetParentPath = tostring(payload.targetParentPath or "Workspace/NexusImports")
	if not isAllowedCreatorStoreImportTarget(targetParentPath) then
		return creatorStoreFailure(assetId, "INVALID_TARGET_PATH", "Creator Store imports can only target Workspace, ReplicatedStorage, or ServerStorage.")
	end

	local allowFreeAssets = false
	pcall(function()
		allowFreeAssets = AssetService.AllowInsertFreeAssets == true
	end)
	if not allowFreeAssets then
		return creatorStoreFailure(assetId, "THIRD_PARTY_ASSETS_DISABLED", "Enable Allow Loading Third Party Assets in Studio Experience Settings.", {
			"Roblox Studio blocked public Creator Store asset loading for this experience.",
		})
	end

	local loadedOk, loadedOrErr = pcall(function()
		return AssetService:LoadAssetAsync(tonumber(assetId))
	end)
	if not loadedOk then
		local message = tostring(loadedOrErr or "")
		local lower = string.lower(message)
		local code = "ASSET_LOAD_FAILED"
		if string.find(lower, "permission") or string.find(lower, "not allowed") or string.find(lower, "third") then
			code = "THIRD_PARTY_ASSETS_DISABLED"
			message = "Enable Allow Loading Third Party Assets in Studio Experience Settings."
		elseif string.find(lower, "not found") or string.find(lower, "access") then
			code = "ASSET_NOT_ACCESSIBLE"
			message = "The Creator Store asset is not accessible from this Studio session."
		else
			message = "The Creator Store asset could not be loaded."
		end
		return creatorStoreFailure(assetId, code, message)
	end

	local loadedRoot = loadedOrErr
	if typeof(loadedRoot) ~= "Instance" then
		return creatorStoreFailure(assetId, "ASSET_LOAD_FAILED", "The Creator Store asset returned an invalid object.")
	end
	loadedRoot.Parent = nil

	local scanOk, scanCode, scanMessage, scan, warnings = scanAndSanitizeCreatorStoreRoot(loadedRoot, assetType)
	if not scanOk then
		loadedRoot:Destroy()
		return creatorStoreFailure(assetId, scanCode or "SANITIZATION_FAILED", scanMessage or "Creator Store import sanitization failed.", warnings)
	end

	local targetExisted = resolvePath(targetParentPath) ~= nil
	local parent = ensureParent(targetParentPath .. "/ImportedAsset", true)
	if not parent then
		loadedRoot:Destroy()
		return creatorStoreFailure(assetId, "INVALID_TARGET_PATH", "Could not resolve the Creator Store import destination.", warnings)
	end

	local requestedName = cleanImportName(payload.requestedName, cleanImportName(payload.assetName, "CreatorStoreAsset_" .. assetId))
	local insertedName = uniqueChildName(parent, requestedName)
	loadedRoot.Name = insertedName
	local placementCFrame = nil
	local placementOk = pcall(function()
		loadedRoot.Parent = parent
		placementCFrame = pivotImportedRoot(loadedRoot, payload.placement or {})
	end)
	if not placementOk then
		if loadedRoot and loadedRoot.Parent then
			loadedRoot:Destroy()
		else
			loadedRoot:Destroy()
		end
		if not targetExisted then
			local target = resolvePath(targetParentPath)
			if target and #target:GetChildren() == 0 then
				target:Destroy()
			end
		end
		return creatorStoreFailure(assetId, "PLACEMENT_FAILED", "The sanitized asset could not be placed in Studio.", warnings)
	end

	local insertedPath = fullPath(loadedRoot)
	local receipt = {
		ok = true,
		type = "insert_creator_store_asset",
		assetId = assetId,
		assetName = cleanImportName(payload.assetName, requestedName),
		insertedName = insertedName,
		insertedRootPath = insertedPath,
		insertedRootClass = loadedRoot.ClassName,
		sanitizationMode = "strict",
		scan = scan,
		warnings = warnings,
		placement = {
			mode = tostring((payload.placement or {}).mode or "camera_focus"),
			pivot = {
				x = placementCFrame and placementCFrame.Position.X or 0,
				y = placementCFrame and placementCFrame.Position.Y or 0,
				z = placementCFrame and placementCFrame.Position.Z or 0,
			},
		},
		history = { recorded = true },
		affectedPaths = { insertedPath },
	}
	storeImportReceipt(idempotencyKey, receipt)
	return receipt
end

local TOOL_HANDLERS = {
	apply_artifact = applyArtifact,
	insert_creator_store_asset = insertCreatorStoreAsset,
	get_project_manifest = inspectPlace,
	list_children = listChildren,
	inspect_place = inspectPlace,
	inspect_instances = inspectInstances,
	search_project = searchProject,
	search_source = searchSource,
	read_script = readScript,
	read_scripts = readScript,
	read_instance = readInstance,
	read_properties = readProperties,
	get_selection = getSelectionTool,
	get_studio_context = getStudioContext,
	get_change_history = function()
		return { snapshots = localSnapshots, snapshotCount = #localSnapshots }
	end,
	get_output_logs = collectOutput,
	collect_output = collectOutput,
	create_script = createScript,
	write_script = writeScript,
	patch_script = patchScript,
	rename_script = renameInstanceTool,
	move_script = moveInstanceTool,
	duplicate_script = duplicateInstanceTool,
	delete_script = deleteScript,
	format_script = function(payload)
		return structuredUnsupported("format_script", "Formatting Luau source requires a formatter outside this Studio plugin runtime.")
	end,
	replace_in_files = replaceInFiles,
	create_instance = createInstanceTool,
	update_properties = updateProperties,
	update_attributes = updateAttributes,
	update_tags = updateTags,
	rename_instance = renameInstanceTool,
	move_instance = moveInstanceTool,
	duplicate_instance = duplicateInstanceTool,
	delete_instance = deleteInstanceTool,
	parse_luau = parseLuau,
	run_project_validation = runProjectValidation,
	collect_diagnostics = collectDiagnostics,
	run_test_service = function()
		return structuredUnsupported("run_test_service", "Running TestService from a plugin is not safely supported by this bridge.")
	end,
	run_play_test = function()
		return structuredUnsupported("run_play_test", "Starting play tests from this plugin bridge is not supported.")
	end,
	stop_play_test = function()
		return structuredUnsupported("stop_play_test", "Stopping play tests from this plugin bridge is not supported.")
	end,
	create_snapshot = createSnapshotTool,
	restore_snapshot = restoreSnapshots,
	undo_last_batch = function()
		return restoreSnapshots({ snapshots = lastBatchSnapshots })
	end,
	run_smoke_check = runSmokeCheck,
}

local function batchOperations(payload)
	local snapshots = {}
	local results = {}
	local previousBatch = lastBatchSnapshots
	lastBatchSnapshots = snapshots
	local ok, err = pcall(function()
		for index, op in ipairs(payload.operations or {}) do
			local opType = tostring(op.type or "")
			if opType == "apply_artifact" or opType == "batch_operations" then
				error("Nested or artifact batch operation is not supported")
			end
			local handler = TOOL_HANDLERS[opType]
			if not handler then
				error("Unsupported batch operation: " .. opType)
			end
			local result = handler(op.payload or {})
			if type(result) == "table" and result.snapshots then
				for _, snap in ipairs(result.snapshots) do
					table.insert(snapshots, snap)
				end
			end
			if type(result) == "table" and result.ok == false then
				table.insert(results, { index = index, type = opType, ok = false, error = result.error or result.message, result = result })
				error(result.error or "Batch operation failed")
			end
			table.insert(results, { index = index, type = opType, ok = true, result = result })
		end
	end)
	if not ok then
		if payload.atomic ~= false then
			restoreSnapshots({ snapshots = snapshots })
		end
		if #snapshots == 0 then
			lastBatchSnapshots = previousBatch
		end
		return {
			ok = false,
			error = tostring(err),
			atomic = payload.atomic ~= false,
			rolledBack = payload.atomic ~= false,
			results = results,
			snapshots = snapshots,
		}
	end
	return { ok = true, results = results, snapshots = snapshots, snapshotCount = #snapshots }
end

TOOL_HANDLERS.batch_operations = batchOperations

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
		error(string.format(
			"Unsupported Studio command: %s (plugin %s). Reinstall the latest NexusRBXStudioBridge.plugin.lua via Plugins > Manage Plugins.",
			tostring(commandType),
			PLUGIN_VERSION
		))
	end
	setRun(command.runId)
	setActive((command.label or commandType) .. " (" .. commandType .. ")")
	local payload = command.payload or {}
	local started = nowMs()
	local result = handler(payload)
	if type(result) ~= "table" then
		result = { output = result }
	end
	local affected = {}
	if result.path then
		table.insert(affected, result.path)
	end
	if result.previousPath then
		table.insert(affected, result.previousPath)
	end
	if result.files then
		for _, file in ipairs(result.files) do
			if type(file) == "table" and file.path then
				table.insert(affected, file.path)
			end
		end
	end
	if result.managedFiles then
		for _, file in ipairs(result.managedFiles) do
			if type(file) == "table" and file.canonicalPath then
				table.insert(affected, file.canonicalPath)
			end
		end
	end
	local snapshots = result.snapshots
	local snapshotIds = {}
	if type(snapshots) == "table" then
		for _, snap in ipairs(snapshots) do
			if type(snap) == "table" and snap.id then
				table.insert(snapshotIds, snap.id)
			end
		end
	end
	result.success = result.ok ~= false
	result.ok = result.ok ~= false
	result.commandId = command.id
	result.runId = command.runId
	result.stepId = command.stepId
	result.operation = commandType
	result.affectedPaths = result.affectedPaths or affected
	result.previousHashes = result.previousHashes or {}
	result.resultingHashes = result.resultingHashes or {}
	result.warnings = result.warnings or {}
	result.diagnostics = result.diagnostics or {}
	result.output = result.output or {}
	result.duration = math.max(0, nowMs() - started)
	result.snapshotIds = result.snapshotIds or snapshotIds
	result.retryable = result.retryable == true
	if result.ok == false and type(result.error) ~= "table" then
		result.error = {
			code = tostring(result.code or "studio_command_failed"),
			message = tostring(result.error or "Studio command failed"),
			retryable = result.retryable,
		}
	end
	return result
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

disconnectButton.MouseButton1Click:Connect(function()
	local token = getToken()
	if not token then
		setStatus("not paired")
		setLast("already disconnected")
		return
	end
	setStatus("disconnecting...")
	-- Best-effort: tell the backend to drop this session before clearing locally.
	pcall(function()
		request("POST", "/api/studio/session/disconnect", {}, token)
	end)
	plugin:SetSetting("nexusrbxStudioToken", nil)
	plugin:SetSetting("nexusrbxStudioSessionId", nil)
	codeBox.Text = ""
	setRun(nil)
	setActive("none")
	setStatus("not paired")
	setLast("disconnected")
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
