-- NexusRBX Studio Bridge UI
-- Compact dock panel for pairing, command activity, diagnostics, and recovery.

local TweenService = game:GetService("TweenService")

local displayPluginVersion = PLUGIN_VERSION or "0.9.0-phases1-9"
local displayProtocolVersion = STUDIO_PROTOCOL_VERSION or "2026-06-20-phases1-9"

local toolbar = plugin:CreateToolbar("NexusRBX")
local toggleButton = toolbar:CreateButton("NexusRBX", "Open NexusRBX Studio Bridge", "")
toggleButton.ClickableWhenViewportHidden = true

local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Right,
	false,
	false,
	400,
	520,
	320,
	320
)

local widget = plugin:CreateDockWidgetPluginGui("NexusRBXStudioBridge", widgetInfo)
widget.Title = "NexusRBX Studio Bridge"

local function themeColor(color)
	return settings().Studio.Theme:GetColor(color)
end

local function blendColor(a, b, alpha)
	return Color3.new(
		a.R + (b.R - a.R) * alpha,
		a.G + (b.G - a.G) * alpha,
		a.B + (b.B - a.B) * alpha
	)
end

local COLORS = {
	primary = Color3.fromRGB(0, 170, 140),
	accent = Color3.fromRGB(132, 92, 223),
	error = Color3.fromRGB(214, 69, 80),
	warning = Color3.fromRGB(211, 145, 39),
	success = Color3.fromRGB(57, 166, 92),
	muted = Color3.fromRGB(108, 117, 125),
}

local localSnapshots = {}
local applying = false

local root = Instance.new("Frame")
root.Name = "NexusBridgeRoot"
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.MainBackground)
root.BorderSizePixel = 0
root.Parent = widget

local rootPadding = Instance.new("UIPadding")
rootPadding.PaddingTop = UDim.new(0, 12)
rootPadding.PaddingBottom = UDim.new(0, 12)
rootPadding.PaddingLeft = UDim.new(0, 12)
rootPadding.PaddingRight = UDim.new(0, 12)
rootPadding.Parent = root

local list = Instance.new("UIListLayout")
list.Padding = UDim.new(0, 12)
list.SortOrder = Enum.SortOrder.LayoutOrder
list.Parent = root

local function applyCorner(parent, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius or 6)
	corner.Parent = parent
	return corner
end

local function applyStroke(parent, color, transparency)
	local stroke = Instance.new("UIStroke")
	stroke.Color = color or themeColor(Enum.StudioStyleGuideColor.InputFieldBorder)
	stroke.Transparency = transparency or 0.25
	stroke.Thickness = 1
	stroke.Parent = parent
	return stroke
end

local function makeSection(name, height)
	local section = Instance.new("Frame")
	section.Name = name
	section.Size = UDim2.new(1, 0, 0, height)
	section.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.InputFieldBackground)
	section.BorderSizePixel = 0
	section.Parent = root
	applyCorner(section, 6)
	applyStroke(section)
	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, 10)
	padding.PaddingBottom = UDim.new(0, 10)
	padding.PaddingLeft = UDim.new(0, 10)
	padding.PaddingRight = UDim.new(0, 10)
	padding.Parent = section
	local sectionList = Instance.new("UIListLayout")
	sectionList.Padding = UDim.new(0, 8)
	sectionList.SortOrder = Enum.SortOrder.LayoutOrder
	sectionList.Parent = section
	return section
end

local function makeText(parent, name, text, height, textSize, bold, color)
	local label = Instance.new("TextLabel")
	label.Name = name
	label.BackgroundTransparency = 1
	label.Size = UDim2.new(1, 0, 0, height)
	label.Font = bold and Enum.Font.GothamBold or Enum.Font.Gotham
	label.TextSize = textSize or 13
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.TextYAlignment = Enum.TextYAlignment.Center
	label.TextTruncate = Enum.TextTruncate.AtEnd
	label.TextWrapped = false
	label.TextColor3 = color or themeColor(Enum.StudioStyleGuideColor.MainText)
	label.Text = text
	label.Parent = parent
	return label
end

local function makeRow(parent, name, height)
	local row = Instance.new("Frame")
	row.Name = name
	row.BackgroundTransparency = 1
	row.Size = UDim2.new(1, 0, 0, height or 24)
	row.Parent = parent
	local rowList = Instance.new("UIListLayout")
	rowList.FillDirection = Enum.FillDirection.Horizontal
	rowList.HorizontalAlignment = Enum.HorizontalAlignment.Left
	rowList.VerticalAlignment = Enum.VerticalAlignment.Center
	rowList.SortOrder = Enum.SortOrder.LayoutOrder
	rowList.Padding = UDim.new(0, 8)
	rowList.Parent = row
	return row
end

local function setButtonEnabled(button, enabled, labelOverride)
	button:SetAttribute("NexusEnabled", enabled == true)
	button.Active = enabled == true
	button.AutoButtonColor = false
	button.TextTransparency = enabled and 0 or 0.35
	button.BackgroundTransparency = enabled and 0 or 0.45
	if labelOverride then
		button.Text = labelOverride
	end
end

local function makeButton(parent, name, text, color)
	local button = Instance.new("TextButton")
	button.Name = name
	button.Size = UDim2.new(1, 0, 0, 34)
	button.BackgroundColor3 = color or themeColor(Enum.StudioStyleGuideColor.Button)
	button.TextColor3 = Color3.fromRGB(255, 255, 255)
	button.Font = Enum.Font.GothamBold
	button.TextSize = 13
	button.Text = text
	button.AutoButtonColor = false
	button.Parent = parent
	button:SetAttribute("BaseColor", button.BackgroundColor3)
	button:SetAttribute("NexusEnabled", true)
	applyCorner(button, 6)
	button.MouseEnter:Connect(function()
		if button:GetAttribute("NexusEnabled") ~= true then return end
		local base = button:GetAttribute("BaseColor") or button.BackgroundColor3
		TweenService:Create(button, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { BackgroundColor3 = blendColor(base, Color3.new(1, 1, 1), 0.08) }):Play()
	end)
	button.MouseLeave:Connect(function()
		local base = button:GetAttribute("BaseColor") or button.BackgroundColor3
		TweenService:Create(button, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { BackgroundColor3 = base }):Play()
	end)
	button.MouseButton1Down:Connect(function()
		if button:GetAttribute("NexusEnabled") ~= true then return end
		local base = button:GetAttribute("BaseColor") or button.BackgroundColor3
		TweenService:Create(button, TweenInfo.new(0.08, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { BackgroundColor3 = blendColor(base, Color3.new(0, 0, 0), 0.08) }):Play()
	end)
	button.MouseButton1Up:Connect(function()
		if button:GetAttribute("NexusEnabled") ~= true then return end
		local base = button:GetAttribute("BaseColor") or button.BackgroundColor3
		TweenService:Create(button, TweenInfo.new(0.08, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { BackgroundColor3 = base }):Play()
	end)
	return button
end

local header = Instance.new("Frame")
header.Name = "Header"
header.BackgroundTransparency = 1
header.Size = UDim2.new(1, 0, 0, 44)
header.Parent = root

local title = makeText(header, "Title", "NexusRBX", 22, 16, true)
title.Position = UDim2.new(0, 0, 0, 0)
title.Size = UDim2.new(1, -120, 0, 22)
local subtitle = makeText(header, "Subtitle", "Plugin " .. displayPluginVersion, 18, 11, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))
subtitle.Position = UDim2.new(0, 0, 0, 22)
subtitle.Size = UDim2.new(1, -120, 0, 18)

local statusPill = Instance.new("TextLabel")
statusPill.Name = "StatusPill"
statusPill.AnchorPoint = Vector2.new(1, 0)
statusPill.Position = UDim2.new(1, 0, 0, 3)
statusPill.Size = UDim2.new(0, 108, 0, 26)
statusPill.BackgroundColor3 = COLORS.muted
statusPill.TextColor3 = Color3.fromRGB(255, 255, 255)
statusPill.Font = Enum.Font.GothamBold
statusPill.TextSize = 11
statusPill.Text = "NOT PAIRED"
statusPill.Parent = header
applyCorner(statusPill, 13)

local banner = Instance.new("TextButton")
banner.Name = "Banner"
banner.Size = UDim2.new(1, 0, 0, 0)
banner.BackgroundColor3 = COLORS.warning
banner.TextColor3 = Color3.fromRGB(255, 255, 255)
banner.Font = Enum.Font.GothamBold
banner.TextSize = 12
banner.TextWrapped = true
banner.Text = ""
banner.Visible = false
banner.AutoButtonColor = false
banner.Parent = root
applyCorner(banner, 6)

local pairSection = makeSection("Pairing", 124)
makeText(pairSection, "PairTitle", "Pair Studio", 18, 13, true)
codeBox = Instance.new("TextBox")
codeBox.Name = "PairingCode"
codeBox.Size = UDim2.new(1, 0, 0, 34)
codeBox.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.MainBackground)
codeBox.TextColor3 = themeColor(Enum.StudioStyleGuideColor.MainText)
codeBox.PlaceholderText = "Pairing code from website"
codeBox.ClearTextOnFocus = false
codeBox.Text = ""
codeBox.Font = Enum.Font.Gotham
codeBox.TextSize = 14
codeBox.Parent = pairSection
applyCorner(codeBox, 6)
applyStroke(codeBox, COLORS.primary, 0.45)
pairButton = makeButton(pairSection, "PairButton", "Pair Studio", COLORS.primary)

local activitySection = makeSection("Activity", 142)
makeText(activitySection, "ActivityTitle", "Bridge Activity", 18, 13, true)
runLabel = makeText(activitySection, "Run", "Run: none", 22, 12, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))
activeLabel = makeText(activitySection, "Active", "Active tool: none", 24, 13, false)
lastLabel = makeText(activitySection, "Last", "Last command: none", 44, 12, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))

local safetySection = makeSection("Safety", 104)
makeText(safetySection, "SafetyTitle", "Recovery", 18, 13, true)
snapshotLabel = makeText(safetySection, "Snapshots", "Snapshots: 0 local", 20, 12, false)
restoreButton = makeButton(safetySection, "RestoreButton", "Restore Local Snapshots", COLORS.accent)

local footer = Instance.new("Frame")
footer.Name = "Footer"
footer.BackgroundTransparency = 1
footer.Size = UDim2.new(1, 0, 0, 76)
footer.Parent = root
local footerList = Instance.new("UIListLayout")
footerList.Padding = UDim.new(0, 8)
footerList.SortOrder = Enum.SortOrder.LayoutOrder
footerList.Parent = footer
pullButton = makeButton(footer, "PullButton", "Pull Latest", COLORS.primary)
disconnectButton = makeButton(footer, "DisconnectButton", "Disconnect Studio", COLORS.error)

local confirmOverlay = Instance.new("Frame")
confirmOverlay.Name = "RestoreConfirmation"
confirmOverlay.Size = UDim2.fromScale(1, 1)
confirmOverlay.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
confirmOverlay.BackgroundTransparency = 0.35
confirmOverlay.Visible = false
confirmOverlay.ZIndex = 10
confirmOverlay.Parent = root

local confirmSheet = Instance.new("Frame")
confirmSheet.Name = "Sheet"
confirmSheet.AnchorPoint = Vector2.new(0.5, 0.5)
confirmSheet.Position = UDim2.fromScale(0.5, 0.52)
confirmSheet.Size = UDim2.new(1, -32, 0, 154)
confirmSheet.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.MainBackground)
confirmSheet.ZIndex = 11
confirmSheet.Parent = confirmOverlay
applyCorner(confirmSheet, 6)
applyStroke(confirmSheet)
local sheetPadding = Instance.new("UIPadding")
sheetPadding.PaddingTop = UDim.new(0, 12)
sheetPadding.PaddingBottom = UDim.new(0, 12)
sheetPadding.PaddingLeft = UDim.new(0, 12)
sheetPadding.PaddingRight = UDim.new(0, 12)
sheetPadding.Parent = confirmSheet
local sheetList = Instance.new("UIListLayout")
sheetList.Padding = UDim.new(0, 8)
sheetList.SortOrder = Enum.SortOrder.LayoutOrder
sheetList.Parent = confirmSheet
makeText(confirmSheet, "ConfirmTitle", "Restore snapshots?", 22, 14, true)
local confirmCopy = makeText(confirmSheet, "ConfirmCopy", "This restores the local snapshot set from the last NexusRBX change.", 38, 12, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))
confirmCopy.TextWrapped = true
local confirmRow = makeRow(confirmSheet, "ConfirmActions", 34)
confirmRestoreButton = makeButton(confirmRow, "ConfirmRestoreButton", "Restore", COLORS.accent)
confirmRestoreButton.Size = UDim2.new(0.5, -4, 0, 34)
cancelRestoreButton = makeButton(confirmRow, "CancelRestoreButton", "Cancel", themeColor(Enum.StudioStyleGuideColor.Button))
cancelRestoreButton.Size = UDim2.new(0.5, -4, 0, 34)

local lastErrorText = nil
local diagnosticsOpen = false

local function statusColor(text)
	local lowered = string.lower(tostring(text or ""))
	if string.find(lowered, "connected") or string.find(lowered, "paired") then
		return COLORS.success, "CONNECTED"
	elseif string.find(lowered, "failed") or string.find(lowered, "error") or string.find(lowered, "unsupported") then
		return COLORS.error, "ACTION NEEDED"
	elseif string.find(lowered, "pairing") or string.find(lowered, "poll") or string.find(lowered, "disconnecting") then
		return COLORS.warning, "WORKING"
	end
	return COLORS.muted, "NOT PAIRED"
end

local function setBanner(kind, text)
	local hasText = text and tostring(text) ~= ""
	banner.Visible = hasText
	banner.Text = hasText and tostring(text) or ""
	banner.Size = hasText and UDim2.new(1, 0, 0, 42) or UDim2.new(1, 0, 0, 0)
	if hasText then
		banner.BackgroundColor3 = kind == "error" and COLORS.error or (kind == "success" and COLORS.success or COLORS.warning)
		banner.BackgroundTransparency = 0.08
		TweenService:Create(banner, TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { BackgroundTransparency = 0 }):Play()
	end
end

local function refreshControls()
	local paired = getToken ~= nil and getToken() ~= nil
	local busy = applying == true
	pairSection.Visible = not paired
	pairSection.Size = not paired and UDim2.new(1, 0, 0, 124) or UDim2.new(1, 0, 0, 0)
	activitySection.Visible = paired
	activitySection.Size = paired and UDim2.new(1, 0, 0, 142) or UDim2.new(1, 0, 0, 0)
	safetySection.Visible = paired
	safetySection.Size = paired and UDim2.new(1, 0, 0, 104) or UDim2.new(1, 0, 0, 0)
	footer.Visible = paired
	footer.Size = paired and UDim2.new(1, 0, 0, 76) or UDim2.new(1, 0, 0, 0)
	local cleanCode = string.upper((codeBox.Text or ""):gsub("%s+", ""))
	setButtonEnabled(pairButton, (not paired) and (not busy) and cleanCode ~= "", busy and "Pairing..." or "Pair Studio")
	setButtonEnabled(pullButton, paired and (not busy), busy and "Working..." or "Pull Latest")
	setButtonEnabled(restoreButton, paired and (not busy) and #localSnapshots > 0, #localSnapshots > 0 and "Restore Local Snapshots" or "No Snapshots Yet")
	setButtonEnabled(disconnectButton, paired and (not busy), busy and "Command Running" or "Disconnect Studio")
end

function setStatus(text)
	local color, label = statusColor(text)
	statusPill.Text = label
	TweenService:Create(statusPill, TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { BackgroundColor3 = color }):Play()
	refreshControls()
end

function setLast(text)
	local value = tostring(text or "none")
	lastLabel.Text = "Last command: " .. value
	if string.find(string.lower(value), "failed") or string.find(string.lower(value), "unsupported") then
		lastErrorText = value
		setBanner("error", value .. "  -  Click for details")
	elseif string.find(string.lower(value), "succeeded") or string.find(string.lower(value), "paired session") or string.find(string.lower(value), "restore complete") then
		setBanner("success", value)
	end
end

function setRun(runId)
	local value = runId and tostring(runId) or "none"
	runLabel.Text = "Run: " .. value
end

function setActive(text)
	local value = tostring(text or "none")
	activeLabel.Text = "Active tool: " .. value
end

function updateSnapshotLabel()
	snapshotLabel.Text = ("Snapshots: %d local"):format(#localSnapshots)
	refreshControls()
end

function setBusy(isBusy)
	applying = isBusy == true
	refreshControls()
end

function showRestoreConfirmation()
	if #localSnapshots == 0 then
		setLast("no local snapshots to restore")
		return false
	end
	confirmCopy.Text = ("Restore %d local snapshot(s) from NexusRBX? This can undo recent generated changes."):format(#localSnapshots)
	confirmOverlay.Visible = true
	confirmSheet.Size = UDim2.new(1, -56, 0, 144)
	TweenService:Create(confirmSheet, TweenInfo.new(0.22, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Size = UDim2.new(1, -32, 0, 154), Position = UDim2.fromScale(0.5, 0.5) }):Play()
	return true
end

function hideRestoreConfirmation()
	confirmOverlay.Visible = false
end

banner.MouseButton1Click:Connect(function()
	if lastErrorText then
		diagnosticsOpen = not diagnosticsOpen
		if diagnosticsOpen then
			banner.Text = lastErrorText .. "\nPlugin " .. displayPluginVersion .. " - Protocol " .. displayProtocolVersion
			banner.Size = UDim2.new(1, 0, 0, 62)
		else
			banner.Text = lastErrorText .. "  -  Click for details"
			banner.Size = UDim2.new(1, 0, 0, 42)
		end
	end
end)

codeBox:GetPropertyChangedSignal("Text"):Connect(function()
	local cleaned = string.upper((codeBox.Text or ""):gsub("%s+", ""))
	if cleaned ~= codeBox.Text then
		codeBox.Text = cleaned
	end
	refreshControls()
end)
