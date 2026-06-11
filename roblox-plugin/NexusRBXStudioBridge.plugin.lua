-- NexusRBX Studio Bridge
-- Save this script as a local Roblox Studio plugin for v1 testing.

local BACKEND_URL = "https://nexusrbx-backend-production.up.railway.app"
local PLUGIN_VERSION = "0.1.0"

local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local StarterGui = game:GetService("StarterGui")
local StarterPlayer = game:GetService("StarterPlayer")

local toolbar = plugin:CreateToolbar("NexusRBX")
local toggleButton = toolbar:CreateButton("NexusRBX", "Open NexusRBX Studio Bridge", "")
toggleButton.ClickableWhenViewportHidden = true

local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Right,
	false,
	false,
	340,
	260,
	260,
	220
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

local function makeLabel(text, size)
	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Size = UDim2.new(1, 0, 0, size or 24)
	label.Font = Enum.Font.Gotham
	label.TextSize = 13
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.TextColor3 = settings().Studio.Theme:GetColor(Enum.StudioStyleGuideColor.MainText)
	label.Text = text
	label.Parent = root
	return label
end

local titleLabel = makeLabel("NexusRBX Studio Bridge", 26)
titleLabel.Font = Enum.Font.GothamBold
titleLabel.TextSize = 16

local statusLabel = makeLabel("Status: not paired", 40)
statusLabel.TextWrapped = true

local codeBox = Instance.new("TextBox")
codeBox.Size = UDim2.new(1, 0, 0, 34)
codeBox.BackgroundColor3 = settings().Studio.Theme:GetColor(Enum.StudioStyleGuideColor.InputFieldBackground)
codeBox.TextColor3 = settings().Studio.Theme:GetColor(Enum.StudioStyleGuideColor.MainText)
codeBox.PlaceholderText = "Pairing code from website"
codeBox.ClearTextOnFocus = false
codeBox.Text = ""
codeBox.Font = Enum.Font.Gotham
codeBox.TextSize = 14
codeBox.Parent = root

local pairButton = Instance.new("TextButton")
pairButton.Size = UDim2.new(1, 0, 0, 34)
pairButton.BackgroundColor3 = Color3.fromRGB(0, 170, 140)
pairButton.TextColor3 = Color3.fromRGB(255, 255, 255)
pairButton.Font = Enum.Font.GothamBold
pairButton.TextSize = 13
pairButton.Text = "Pair Studio"
pairButton.Parent = root

local pullButton = Instance.new("TextButton")
pullButton.Size = UDim2.new(1, 0, 0, 34)
pullButton.BackgroundColor3 = settings().Studio.Theme:GetColor(Enum.StudioStyleGuideColor.Button)
pullButton.TextColor3 = settings().Studio.Theme:GetColor(Enum.StudioStyleGuideColor.ButtonText)
pullButton.Font = Enum.Font.GothamBold
pullButton.TextSize = 13
pullButton.Text = "Pull Latest Command"
pullButton.Parent = root

local lastLabel = makeLabel("Last command: none", 72)
lastLabel.TextWrapped = true

local function setStatus(text)
	statusLabel.Text = "Status: " .. text
end

local function setLast(text)
	lastLabel.Text = "Last command: " .. text
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

local function getStarterPlayerScripts()
	local folder = StarterPlayer:FindFirstChild("StarterPlayerScripts")
	if not folder then
		folder = Instance.new("StarterPlayerScripts")
		folder.Parent = StarterPlayer
	end
	return folder
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

local function placeScript(parent, spec)
	local className = spec.className or "ModuleScript"
	if className ~= "Script" and className ~= "LocalScript" and className ~= "ModuleScript" then
		className = "ModuleScript"
	end

	local scriptObject = Instance.new(className)
	scriptObject.Name = spec.name or className
	scriptObject.Source = spec.source or ""
	scriptObject.Parent = parent
	return scriptObject
end

local function placeRemote(parent, spec)
	local className = spec.className == "RemoteFunction" and "RemoteFunction" or "RemoteEvent"
	local remote = Instance.new(className)
	remote.Name = spec.name or className
	remote.Parent = parent
	return remote
end

local function placeScreenGui(spec)
	local name = spec.name or "NexusRBXScreen"
	local existing = StarterGui:FindFirstChild(name)
	if existing then
		existing:Destroy()
	end
	local gui = Instance.new("ScreenGui")
	gui.Name = name
	gui.ResetOnSpawn = spec.resetOnSpawn ~= false
	gui.IgnoreGuiInset = spec.ignoreGuiInset ~= false
	gui.Parent = StarterGui
	return gui
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

local function applyPayload(payload)
	if type(payload) ~= "table" then
		error("Missing payload")
	end

	local projectName = payload.projectName or "NexusRBX_Project"
	local serviceFolders = {}

	for _, scriptSpec in ipairs(payload.scripts or {}) do
		local serviceName = scriptSpec.service or "ReplicatedStorage"
		local serviceRoot = getServiceRoot(serviceName)
		if not serviceFolders[serviceName] then
			serviceFolders[serviceName] = ensureCleanFolder(serviceRoot, projectName)
		end
		placeScript(serviceFolders[serviceName], scriptSpec)
	end

	if #(payload.remotes or {}) > 0 then
		local remoteFolder = serviceFolders.ReplicatedStorage
		if not remoteFolder then
			remoteFolder = ensureCleanFolder(ReplicatedStorage, projectName)
			serviceFolders.ReplicatedStorage = remoteFolder
		end
		for _, remoteSpec in ipairs(payload.remotes or {}) do
			placeRemote(remoteFolder, remoteSpec)
		end
	end

	for _, screenSpec in ipairs(payload.screenGuis or {}) do
		placeScreenGui(screenSpec)
	end

	return {
		scripts = #(payload.scripts or {}),
		remotes = #(payload.remotes or {}),
		screenGuis = #(payload.screenGuis or {}),
		warnings = payload.warnings or {},
	}
end

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

local applying = false

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
		applying = false
		return
	end

	local command = data.command
	setStatus("applying " .. tostring(command.id))
	local recording = beginRecording("NexusRBX apply artifact")
	local applyOk, resultOrError = pcall(function()
		return applyPayload(command.payload)
	end)

	if applyOk then
		finishRecording(recording, true)
		ack(command.id, "succeeded", resultOrError, nil)
		local warningCount = #(resultOrError.warnings or {})
		setLast(("applied %d script(s), %d remote(s), %d gui(s)%s"):format(
			resultOrError.scripts or 0,
			resultOrError.remotes or 0,
			resultOrError.screenGuis or 0,
			warningCount > 0 and (" with " .. warningCount .. " warning(s)") or ""
		))
		setStatus("connected")
	else
		finishRecording(recording, false)
		ack(command.id, "failed", nil, tostring(resultOrError))
		setLast("failed: " .. tostring(resultOrError))
		setStatus("connected")
	end

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

if getToken() then
	setStatus("connected")
else
	setStatus("not paired")
end
