-- NexusRBX Studio Bridge UI
-- Dock panel: pairing, activity feed, recovery, approval gate, health.

local TweenService = game:GetService("TweenService")

local displayPluginVersion = PLUGIN_VERSION or "0.9.3-creator-store-create-instance"
local displayProtocolVersion = STUDIO_PROTOCOL_VERSION or "2026-06-20-creator-store"
local MAX_ACTIVITY_ENTRIES = 25

local toolbar = plugin:CreateToolbar("NexusRBX")
local toggleButton = toolbar:CreateButton("NexusRBX", "Open NexusRBX Studio Bridge", "")
toggleButton.ClickableWhenViewportHidden = true

local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Right,
	false,
	false,
	400,
	560,
	320,
	360
)

local widget = plugin:CreateDockWidgetPluginGui("NexusRBXStudioBridge", widgetInfo)
widget.Title = "NexusRBX Studio Bridge"

local localSnapshots = {}
local applying = false
local pollingActive = false
local lastErrorText = nil
local diagnosticsOpen = false
local pendingApproval = nil
local selectedSnapshotIds = {}

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
	live = Color3.fromRGB(0, 200, 150),
}

-- Single source of truth for the connection state machine. Every visible status
-- (orb, pill, header tint) is derived from one of these entries so the UI can
-- never claim "connected" while it is actually failing or idle.
local BRIDGE_STATES = {
	unpaired = { label = "NOT PAIRED", color = COLORS.muted, pulse = false },
	connecting = { label = "CONNECTING", color = COLORS.warning, pulse = true },
	live = { label = "LIVE", color = COLORS.live, pulse = false },
	working = { label = "WORKING", color = COLORS.accent, pulse = true },
	degraded = { label = "RECONNECTING", color = COLORS.warning, pulse = true },
	error = { label = "ACTION NEEDED", color = COLORS.error, pulse = false },
}

local currentBridgeState = "unpaired"

local root = Instance.new("Frame")
root.Name = "NexusBridgeRoot"
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.MainBackground)
root.BorderSizePixel = 0
root.ClipsDescendants = true
root.Parent = widget

local scroll = Instance.new("ScrollingFrame")
scroll.Name = "Scroll"
scroll.Size = UDim2.fromScale(1, 1)
scroll.BackgroundTransparency = 1
scroll.BorderSizePixel = 0
scroll.ScrollBarThickness = 6
scroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
scroll.CanvasSize = UDim2.new()
scroll.Parent = root

local scrollRoot = Instance.new("Frame")
scrollRoot.Name = "ScrollRoot"
scrollRoot.Size = UDim2.new(1, -12, 0, 0)
scrollRoot.AutomaticSize = Enum.AutomaticSize.Y
scrollRoot.BackgroundTransparency = 1
scrollRoot.Parent = scroll

local rootPadding = Instance.new("UIPadding")
rootPadding.PaddingTop = UDim.new(0, 12)
rootPadding.PaddingBottom = UDim.new(0, 12)
rootPadding.PaddingLeft = UDim.new(0, 12)
rootPadding.PaddingRight = UDim.new(0, 18)
rootPadding.Parent = scrollRoot

local list = Instance.new("UIListLayout")
list.Padding = UDim.new(0, 10)
list.SortOrder = Enum.SortOrder.LayoutOrder
list.Parent = scrollRoot

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

local function makeSection(name)
	local section = Instance.new("Frame")
	section.Name = name
	section.Size = UDim2.new(1, 0, 0, 0)
	section.AutomaticSize = Enum.AutomaticSize.Y
	section.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.InputFieldBackground)
	section.BorderSizePixel = 0
	section.Parent = scrollRoot
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

local function makeText(parent, name, text, height, textSize, bold, color, rich)
	local label = Instance.new("TextLabel")
	label.Name = name
	label.BackgroundTransparency = 1
	label.Size = UDim2.new(1, 0, 0, height or 20)
	label.AutomaticSize = height and Enum.AutomaticSize.None or Enum.AutomaticSize.Y
	label.Font = bold and Enum.Font.GothamBold or Enum.Font.Gotham
	label.TextSize = textSize or 13
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.TextYAlignment = Enum.TextYAlignment.Top
	label.TextTruncate = Enum.TextTruncate.AtEnd
	label.TextWrapped = height == nil or height >= 36
	label.RichText = rich == true
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
	row.AutomaticSize = height and Enum.AutomaticSize.None or Enum.AutomaticSize.Y
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

local function makeButton(parent, name, text, color, compact)
	local button = Instance.new("TextButton")
	button.Name = name
	button.Size = compact and UDim2.new(0, 88, 0, 28) or UDim2.new(1, 0, 0, 34)
	button.BackgroundColor3 = color or themeColor(Enum.StudioStyleGuideColor.Button)
	button.TextColor3 = Color3.fromRGB(255, 255, 255)
	button.Font = Enum.Font.GothamBold
	button.TextSize = compact and 11 or 13
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
	return button
end

local header = Instance.new("Frame")
header.Name = "Header"
header.BackgroundTransparency = 1
header.Size = UDim2.new(1, 0, 0, 0)
header.AutomaticSize = Enum.AutomaticSize.Y
header.Parent = scrollRoot

local title = makeText(header, "Title", "NexusRBX", 22, 16, true)
title.Size = UDim2.new(1, -120, 0, 22)
title.LayoutOrder = 1
local subtitle = makeText(header, "Subtitle", "Plugin " .. displayPluginVersion, 18, 11, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))
subtitle.Size = UDim2.new(1, -120, 0, 18)
subtitle.LayoutOrder = 2
healthLabel = makeText(header, "Health", "Not synced yet", 16, 11, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))
healthLabel.Size = UDim2.new(1, -120, 0, 16)
healthLabel.LayoutOrder = 3

local headerList = Instance.new("UIListLayout")
headerList.Padding = UDim.new(0, 2)
headerList.SortOrder = Enum.SortOrder.LayoutOrder
headerList.Parent = header

local statusPill = Instance.new("TextLabel")
statusPill.Name = "StatusPill"
statusPill.AnchorPoint = Vector2.new(1, 0)
statusPill.Position = UDim2.new(1, 0, 0, 3)
statusPill.Size = UDim2.new(0, 118, 0, 26)
statusPill.BackgroundColor3 = COLORS.muted
statusPill.TextColor3 = Color3.fromRGB(255, 255, 255)
statusPill.Font = Enum.Font.GothamBold
statusPill.TextSize = 11
statusPill.Text = "NOT PAIRED"
statusPill.TextXAlignment = Enum.TextXAlignment.Right
statusPill.Parent = header
applyCorner(statusPill, 13)
local statusPillPad = Instance.new("UIPadding")
statusPillPad.PaddingLeft = UDim.new(0, 24)
statusPillPad.PaddingRight = UDim.new(0, 10)
statusPillPad.Parent = statusPill

-- Animated status orb sits inside the left of the pill.
local statusOrb = Instance.new("Frame")
statusOrb.Name = "StatusOrb"
statusOrb.AnchorPoint = Vector2.new(0, 0.5)
statusOrb.Position = UDim2.new(0, 8, 0.5, 0)
statusOrb.Size = UDim2.new(0, 10, 0, 10)
statusOrb.BackgroundColor3 = COLORS.muted
statusOrb.BorderSizePixel = 0
statusOrb.ZIndex = 3
statusOrb.Parent = statusPill
applyCorner(statusOrb, 5)

local statusOrbRing = Instance.new("Frame")
statusOrbRing.Name = "OrbRing"
statusOrbRing.AnchorPoint = Vector2.new(0.5, 0.5)
statusOrbRing.Position = UDim2.new(0.5, 0, 0.5, 0)
statusOrbRing.Size = UDim2.new(1, 0, 1, 0)
statusOrbRing.BackgroundTransparency = 1
statusOrbRing.ZIndex = 2
statusOrbRing.Parent = statusOrb
applyCorner(statusOrbRing, 8)
local statusOrbStroke = Instance.new("UIStroke")
statusOrbStroke.Color = COLORS.muted
statusOrbStroke.Thickness = 2
statusOrbStroke.Transparency = 1
statusOrbStroke.Parent = statusOrbRing

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
banner.Parent = scrollRoot
applyCorner(banner, 6)

local pairSection = makeSection("Pairing")
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

setupSteps = makeText(
	pairSection,
	"SetupSteps",
	table.concat({
		"<b>Setup</b>",
		"1. On nexusrbx.com: Pair Studio, generate a code",
		"2. Paste the code above",
		"3. Click Pair Studio (Enter works too)",
		"4. Accept the HTTP permission prompt for " .. BACKEND_HOST,
		"5. Game Settings -> Security -> Allow HTTP Requests",
		"6. If commands fail with cloud_ in the error, disable the Creator Store NexusRBX plugin and restart Studio",
	}, "\n"),
	nil,
	11,
	false,
	themeColor(Enum.StudioStyleGuideColor.DimmedText),
	true
)
setupSteps.TextWrapped = true

checkSetupButton = makeButton(pairSection, "CheckSetupButton", "Check setup", themeColor(Enum.StudioStyleGuideColor.Button))

setupResult = makeText(pairSection, "SetupResult", "", nil, 11, false, themeColor(Enum.StudioStyleGuideColor.DimmedText), true)
setupResult.TextWrapped = true
setupResult.Visible = false

-- Live "what's happening now" strip: reading -> writing -> verifying -> done.
local AGENT_PHASES, agentPhaseDots = { "idle", "thinking", "reading", "writing", "verifying", "done" }, {}
local AGENT_PHASE_LABELS = {
	idle = "Idle",
	thinking = "Thinking",
	reading = "Reading",
	writing = "Writing",
	verifying = "Verifying",
	done = "Done",
}

local agentSection = makeSection("AgentActivity")
makeText(agentSection, "AgentTitle", "Agent", 18, 13, true)
local phaseStrip = Instance.new("Frame")
phaseStrip.Name = "PhaseStrip"
phaseStrip.BackgroundTransparency = 1
phaseStrip.Size = UDim2.new(1, 0, 0, 22)
phaseStrip.Parent = agentSection
local phaseLayout = Instance.new("UIListLayout")
phaseLayout.FillDirection = Enum.FillDirection.Horizontal
phaseLayout.VerticalAlignment = Enum.VerticalAlignment.Center
phaseLayout.SortOrder = Enum.SortOrder.LayoutOrder
phaseLayout.Padding = UDim.new(0, 6)
phaseLayout.Parent = phaseStrip
for index, phase in ipairs(AGENT_PHASES) do
	if phase ~= "idle" then
		local chip = Instance.new("TextLabel")
		chip.Name = "Phase_" .. phase
		chip.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.MainBackground)
		chip.BackgroundTransparency = 0.2
		chip.TextColor3 = themeColor(Enum.StudioStyleGuideColor.DimmedText)
		chip.Font = Enum.Font.GothamMedium
		chip.TextSize = 10
		chip.Text = " " .. AGENT_PHASE_LABELS[phase] .. " "
		chip.AutomaticSize = Enum.AutomaticSize.X
		chip.Size = UDim2.new(0, 0, 1, 0)
		chip.LayoutOrder = index
		chip.Parent = phaseStrip
		applyCorner(chip, 9)
		local chipPad = Instance.new("UIPadding")
		chipPad.PaddingLeft = UDim.new(0, 8)
		chipPad.PaddingRight = UDim.new(0, 8)
		chipPad.Parent = chip
		agentPhaseDots[phase] = chip
	end
end

local manifestSection = makeSection("Manifest")
makeText(manifestSection, "ManifestTitle", "Project Index", 18, 13, true)
manifestSummaryLabel = makeText(manifestSection, "ManifestSummary", "Not indexed yet", 18, 12, false, themeColor(Enum.StudioStyleGuideColor.MainText))
manifestFreshnessLabel = makeText(manifestSection, "ManifestFreshness", "Rescan runs from the website when needed.", 16, 11, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))

local activitySection = makeSection("Activity")
makeText(activitySection, "ActivityTitle", "Bridge Activity", 18, 13, true)
progressLabel = makeText(activitySection, "Progress", "Run: none", 20, 12, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))
activeLabel = makeText(activitySection, "Active", "Active tool: none", 20, 13, false)

local feedScroll = Instance.new("ScrollingFrame")
feedScroll.Name = "ActivityFeed"
feedScroll.Size = UDim2.new(1, 0, 0, 140)
feedScroll.BackgroundTransparency = 1
feedScroll.BorderSizePixel = 0
feedScroll.ScrollBarThickness = 4
feedScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
feedScroll.CanvasSize = UDim2.new()
feedScroll.Parent = activitySection

local feedList = Instance.new("Frame")
feedList.Name = "FeedList"
feedList.Size = UDim2.new(1, 0, 0, 0)
feedList.AutomaticSize = Enum.AutomaticSize.Y
feedList.BackgroundTransparency = 1
feedList.Parent = feedScroll

local feedLayout = Instance.new("UIListLayout")
feedLayout.Padding = UDim.new(0, 4)
feedLayout.SortOrder = Enum.SortOrder.LayoutOrder
feedLayout.Parent = feedList

feedEmptyLabel = makeText(feedList, "FeedEmpty", "No commands yet. Pair Studio and push from the website.", 36, 11, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))
feedEmptyLabel.TextWrapped = true

local safetySection = makeSection("Safety")
makeText(safetySection, "SafetyTitle", "Recovery", 18, 13, true)
snapshotLabel = makeText(safetySection, "Snapshots", "Snapshots: 0 local", 18, 12, false)

local snapshotScroll = Instance.new("ScrollingFrame")
snapshotScroll.Name = "SnapshotList"
snapshotScroll.Size = UDim2.new(1, 0, 0, 96)
snapshotScroll.BackgroundTransparency = 1
snapshotScroll.BorderSizePixel = 0
snapshotScroll.ScrollBarThickness = 4
snapshotScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
snapshotScroll.CanvasSize = UDim2.new()
snapshotScroll.Visible = false
snapshotScroll.Parent = safetySection

local snapshotList = Instance.new("Frame")
snapshotList.Name = "SnapshotRows"
snapshotList.Size = UDim2.new(1, 0, 0, 0)
snapshotList.AutomaticSize = Enum.AutomaticSize.Y
snapshotList.BackgroundTransparency = 1
snapshotList.Parent = snapshotScroll

local snapshotLayout = Instance.new("UIListLayout")
snapshotLayout.Padding = UDim.new(0, 4)
snapshotLayout.SortOrder = Enum.SortOrder.LayoutOrder
snapshotLayout.Parent = snapshotList

restoreButton = makeButton(safetySection, "RestoreButton", "Restore Selected Snapshots", COLORS.accent)
undoBatchButton = makeButton(safetySection, "UndoBatchButton", "Undo Last Batch", themeColor(Enum.StudioStyleGuideColor.Button))

local settingsSection = makeSection("Settings")
makeText(settingsSection, "SettingsTitle", "Settings", 18, 13, true)
approvalToggleButton = makeButton(settingsSection, "ApprovalToggle", "Review before apply: OFF", themeColor(Enum.StudioStyleGuideColor.Button))

local footer = Instance.new("Frame")
footer.Name = "Footer"
footer.BackgroundTransparency = 1
footer.Size = UDim2.new(1, 0, 0, 0)
footer.AutomaticSize = Enum.AutomaticSize.Y
footer.Parent = scrollRoot
local footerList = Instance.new("UIListLayout")
footerList.Padding = UDim.new(0, 8)
footerList.SortOrder = Enum.SortOrder.LayoutOrder
footerList.Parent = footer
pullButton = makeButton(footer, "PullButton", "Pull Latest", COLORS.primary)
disconnectButton = makeButton(footer, "DisconnectButton", "Disconnect Studio", COLORS.error)

local toast = Instance.new("TextLabel")
toast.Name = "Toast"
toast.AnchorPoint = Vector2.new(0.5, 1)
toast.Position = UDim2.new(0.5, 0, 1, -8)
toast.Size = UDim2.new(1, -24, 0, 0)
toast.AutomaticSize = Enum.AutomaticSize.Y
toast.BackgroundColor3 = Color3.fromRGB(30, 32, 38)
toast.BackgroundTransparency = 0.08
toast.TextColor3 = Color3.fromRGB(255, 255, 255)
toast.Font = Enum.Font.Gotham
toast.TextSize = 12
toast.TextWrapped = true
toast.Visible = false
toast.ZIndex = 20
toast.Parent = root
applyCorner(toast, 6)
applyStroke(toast, COLORS.primary, 0.5)

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
local confirmCopy = makeText(confirmSheet, "ConfirmCopy", "This restores selected local snapshots from NexusRBX changes.", 38, 12, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))
confirmCopy.TextWrapped = true
local confirmRow = makeRow(confirmSheet, "ConfirmActions", 34)
confirmRestoreButton = makeButton(confirmRow, "ConfirmRestoreButton", "Restore", COLORS.accent)
confirmRestoreButton.Size = UDim2.new(0.5, -4, 0, 34)
cancelRestoreButton = makeButton(confirmRow, "CancelRestoreButton", "Cancel", themeColor(Enum.StudioStyleGuideColor.Button))
cancelRestoreButton.Size = UDim2.new(0.5, -4, 0, 34)

local approvalOverlay = Instance.new("Frame")
approvalOverlay.Name = "ApprovalOverlay"
approvalOverlay.Size = UDim2.fromScale(1, 1)
approvalOverlay.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
approvalOverlay.BackgroundTransparency = 0.35
approvalOverlay.Visible = false
approvalOverlay.ZIndex = 12
approvalOverlay.Parent = root

local approvalSheet = Instance.new("Frame")
approvalSheet.Name = "ApprovalSheet"
approvalSheet.AnchorPoint = Vector2.new(0.5, 0.5)
approvalSheet.Position = UDim2.fromScale(0.5, 0.5)
approvalSheet.Size = UDim2.new(1, -32, 0, 0)
approvalSheet.AutomaticSize = Enum.AutomaticSize.Y
approvalSheet.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.MainBackground)
approvalSheet.ZIndex = 13
approvalSheet.Parent = approvalOverlay
applyCorner(approvalSheet, 6)
applyStroke(approvalSheet)
local approvalPadding = Instance.new("UIPadding")
approvalPadding.PaddingTop = UDim.new(0, 12)
approvalPadding.PaddingBottom = UDim.new(0, 12)
approvalPadding.PaddingLeft = UDim.new(0, 12)
approvalPadding.PaddingRight = UDim.new(0, 12)
approvalPadding.Parent = approvalSheet
local approvalList = Instance.new("UIListLayout")
approvalList.Padding = UDim.new(0, 8)
approvalList.SortOrder = Enum.SortOrder.LayoutOrder
approvalList.Parent = approvalSheet
makeText(approvalSheet, "ApprovalTitle", "Review command", 22, 14, true)
approvalCopy = makeText(approvalSheet, "ApprovalCopy", "", nil, 12, false, themeColor(Enum.StudioStyleGuideColor.DimmedText), true)
approvalCopy.TextWrapped = true
local approvalRow = makeRow(approvalSheet, "ApprovalActions", 34)
approvalConfirmButton = makeButton(approvalRow, "ApprovalConfirm", "Apply", COLORS.primary)
approvalConfirmButton.Size = UDim2.new(0.5, -4, 0, 34)
approvalDeclineButton = makeButton(approvalRow, "ApprovalDecline", "Decline", COLORS.error)
approvalDeclineButton.Size = UDim2.new(0.5, -4, 0, 34)

local onboardingOverlay = Instance.new("Frame")
onboardingOverlay.Name = "OnboardingOverlay"
onboardingOverlay.Size = UDim2.fromScale(1, 1)
onboardingOverlay.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
onboardingOverlay.BackgroundTransparency = 0.35
onboardingOverlay.Visible = false
onboardingOverlay.ZIndex = 14
onboardingOverlay.Active = false
onboardingOverlay.Parent = root

local onboardingSheet = Instance.new("Frame")
onboardingSheet.Name = "OnboardingSheet"
onboardingSheet.AnchorPoint = Vector2.new(0.5, 0.5)
onboardingSheet.Position = UDim2.fromScale(0.5, 0.5)
onboardingSheet.Size = UDim2.new(1, -32, 0, 0)
onboardingSheet.AutomaticSize = Enum.AutomaticSize.Y
onboardingSheet.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.MainBackground)
onboardingSheet.ZIndex = 15
onboardingSheet.Parent = onboardingOverlay
applyCorner(onboardingSheet, 6)
applyStroke(onboardingSheet)
local onboardingPadding = Instance.new("UIPadding")
onboardingPadding.PaddingTop = UDim.new(0, 14)
onboardingPadding.PaddingBottom = UDim.new(0, 14)
onboardingPadding.PaddingLeft = UDim.new(0, 14)
onboardingPadding.PaddingRight = UDim.new(0, 14)
onboardingPadding.Parent = onboardingSheet
local onboardingList = Instance.new("UIListLayout")
onboardingList.Padding = UDim.new(0, 10)
onboardingList.SortOrder = Enum.SortOrder.LayoutOrder
onboardingList.Parent = onboardingSheet
makeText(onboardingSheet, "OnboardingTitle", "Welcome to NexusRBX", 24, 15, true)
local onboardingCopy = makeText(
	onboardingSheet,
	"OnboardingCopy",
	table.concat({
		"Connect this plugin to your NexusRBX workspace:",
		"",
		"1. On nexusrbx.com, open the AI workspace and click Pair Studio.",
		"2. Copy the pairing code it shows.",
		"3. Paste the code here and click Pair Studio.",
		"4. If Studio asks, allow HTTP access to " .. BACKEND_HOST .. ".",
		"5. Enable Game Settings -> Security -> Allow HTTP Requests.",
	}, "\n"),
	nil,
	12,
	false,
	themeColor(Enum.StudioStyleGuideColor.DimmedText)
)
onboardingCopy.TextWrapped = true
onboardingDismissButton = makeButton(onboardingSheet, "OnboardingDismiss", "Got it", COLORS.primary)

local function formatTime(ts)
	if not ts then
		return "--:--"
	end
	return os.date("%H:%M:%S", ts)
end

-- Map legacy free-text status strings onto the structured state machine so old
-- call sites keep working without ever mislabeling the connection.
local function stateFromLegacy(text)
	local lowered = string.lower(tostring(text or ""))
	if string.find(lowered, "expired") then
		return "error"
	elseif string.find(lowered, "unsupported") or string.find(lowered, "pair failed") then
		return "error"
	elseif string.find(lowered, "poll failed") then
		return "degraded"
	elseif string.find(lowered, "failed") or string.find(lowered, "error") then
		return "error"
	elseif string.find(lowered, "connected") and not string.find(lowered, "not connected") then
		return "live"
	elseif string.find(lowered, "pairing") or string.find(lowered, "disconnecting") then
		return "connecting"
	elseif string.find(lowered, "poll") or string.find(lowered, "working") or string.find(lowered, "approval") then
		return "working"
	elseif string.find(lowered, "ready to pair") then
		return "connecting"
	end
	return "unpaired"
end

local function clearErrorBanner()
	lastErrorText = nil
	diagnosticsOpen = false
	banner.Visible = false
	banner.Text = ""
	banner.Size = UDim2.new(1, 0, 0, 0)
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

local function getApprovalModeEnabled()
	return plugin:GetSetting("nexusrbxApprovalMode") == true
end

local function refreshApprovalToggle()
	local enabled = getApprovalModeEnabled()
	approvalToggleButton:SetAttribute("BaseColor", enabled and COLORS.warning or themeColor(Enum.StudioStyleGuideColor.Button))
	approvalToggleButton.BackgroundColor3 = approvalToggleButton:GetAttribute("BaseColor")
	approvalToggleButton.Text = enabled and "Review before apply: ON" or "Review before apply: OFF"
end

local function rebuildSnapshotList()
	for _, child in ipairs(snapshotList:GetChildren()) do
		if child:IsA("Frame") then
			child:Destroy()
		end
	end
	selectedSnapshotIds = {}
	if #localSnapshots == 0 then
		snapshotScroll.Visible = false
		return
	end
	snapshotScroll.Visible = true
	for index, snap in ipairs(localSnapshots) do
		if type(snap) ~= "table" then
			continue
		end
		local row = Instance.new("Frame")
		row.Name = "SnapshotRow" .. tostring(index)
		row.Size = UDim2.new(1, 0, 0, 0)
		row.AutomaticSize = Enum.AutomaticSize.Y
		row.BackgroundTransparency = 1
		row.Parent = snapshotList
		local rowLayout = Instance.new("UIListLayout")
		rowLayout.Padding = UDim.new(0, 2)
		rowLayout.SortOrder = Enum.SortOrder.LayoutOrder
		rowLayout.Parent = row
		local pathText = tostring(snap.path or snap.name or ("snapshot " .. index))
		local classText = snap.className and snap.className ~= "" and (" · " .. snap.className) or ""
		makeText(row, "Path", pathText .. classText, nil, 11, false, themeColor(Enum.StudioStyleGuideColor.MainText))
		local actionRow = makeRow(row, "Actions", 28)
		local restoreOne = makeButton(actionRow, "RestoreOne", "Restore", COLORS.accent, true)
		restoreOne.MouseButton1Click:Connect(function()
			if restoreOne:GetAttribute("NexusEnabled") ~= true then
				return
			end
			local recording = beginRecording("NexusRBX restore snapshot")
			local ok, resultOrError = pcall(function()
				return restoreSnapshots({ snapshots = { snap } })
			end)
			if ok then
				finishRecording(recording, true)
				setLast(("restored snapshot: %s"):format(pathText))
				pushActivity({
					commandType = "restore_snapshot",
					status = "succeeded",
					detail = pathText,
				})
			else
				finishRecording(recording, false)
				setLast("restore failed: " .. tostring(resultOrError))
			end
		end)
		if snap.id then
			table.insert(selectedSnapshotIds, snap.id)
		end
	end
end

local function refreshControls()
	local paired = getToken ~= nil and getToken() ~= nil
	local busy = applying == true
	pairSection.Visible = not paired
	agentSection.Visible = paired
	manifestSection.Visible = paired
	activitySection.Visible = paired
	safetySection.Visible = paired
	settingsSection.Visible = paired
	footer.Visible = paired
	local cleanCode = string.upper((codeBox.Text or ""):gsub("%s+", ""))
	setButtonEnabled(pairButton, (not paired) and (not busy) and cleanCode ~= "", busy and "Pairing..." or "Pair Studio")
	setButtonEnabled(pullButton, paired and (not busy), busy and "Working..." or "Pull Latest")
	local hasSnapshots = #localSnapshots > 0
	setButtonEnabled(restoreButton, paired and (not busy) and hasSnapshots, hasSnapshots and "Restore All Snapshots" or "No Snapshots Yet")
	local hasBatch = type(lastBatchSnapshots) == "table" and #lastBatchSnapshots > 0
	setButtonEnabled(undoBatchButton, paired and (not busy) and hasBatch, hasBatch and "Undo Last Batch" or "No Batch To Undo")
	setButtonEnabled(disconnectButton, paired and (not busy), busy and "Command Running" or "Disconnect Studio")
	refreshApprovalToggle()
end

local orbSizeTween, orbFadeTween = nil, nil

local function applyOrbPulse(active)
	if orbSizeTween then orbSizeTween:Cancel() orbSizeTween = nil end
	if orbFadeTween then orbFadeTween:Cancel() orbFadeTween = nil end
	statusOrbRing.Size = UDim2.new(1, 0, 1, 0)
	statusOrbStroke.Transparency = 1
	if active then
		local info = TweenInfo.new(1.1, Enum.EasingStyle.Sine, Enum.EasingDirection.Out, -1, false)
		statusOrbStroke.Transparency = 0.15
		orbSizeTween = TweenService:Create(statusOrbRing, info, { Size = UDim2.new(3, 0, 3, 0) })
		orbFadeTween = TweenService:Create(statusOrbStroke, info, { Transparency = 1 })
		orbSizeTween:Play()
		orbFadeTween:Play()
	end
end

-- Central state setter. `state` is one of BRIDGE_STATES keys.
function setBridgeState(state, detail)
	local key = BRIDGE_STATES[state] and state or "unpaired"
	local def = BRIDGE_STATES[key]
	currentBridgeState = key
	statusPill.Text = def.label
	TweenService:Create(statusPill, TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { BackgroundColor3 = def.color }):Play()
	TweenService:Create(statusOrb, TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { BackgroundColor3 = def.color }):Play()
	applyOrbPulse(def.pulse)
	if detail ~= nil and tostring(detail) ~= "" and (key == "working" or key == "degraded") then
		activeLabel.Text = "Active tool: " .. tostring(detail)
	end
	refreshControls()
end

function setStatus(text)
	setBridgeState(stateFromLegacy(text), text)
end

function setPollingPulse(active)
	pollingActive = active == true
	statusOrb.BackgroundTransparency = active and 0.35 or 0
end

function setHealth(syncedAt, latencyMs)
	local ago = syncedAt and math.max(0, os.time() - syncedAt) or nil
	local latencyText = latencyMs and (" · " .. tostring(latencyMs) .. "ms") or ""
	if ago == nil then
		healthLabel.Text = "Not synced yet"
	else
		healthLabel.Text = ("Synced %ds ago%s"):format(ago, latencyText)
	end
end

local function errorHelpFor(value)
	local lowered = string.lower(tostring(value or ""))
	if string.find(lowered, "http") and (string.find(lowered, "disabled") or string.find(lowered, "not enabled") or string.find(lowered, "not allowed")) then
		return "Enable Game Settings -> Security -> Allow HTTP Requests."
	elseif string.find(lowered, "code expired") or string.find(lowered, "pairing code expired") then
		return "Generate a fresh code on nexusrbx.com (codes are single-use)."
	elseif string.find(lowered, "already used") then
		return "That code was used. Generate a new one on the website."
	elseif string.find(lowered, "not found") then
		return "Copy the code exactly, or generate a fresh one."
	elseif string.find(lowered, "firebase id token") then
		return "Backend is updating. Try again shortly."
	elseif string.find(lowered, "unsupported") then
		return "Reinstall the latest plugin via Plugins -> Manage Plugins."
	elseif string.find(lowered, "cloud_") or string.find(lowered, "attempt to call a nil value") then
		return "The Creator Store copy of this plugin is still running. Plugins -> Manage Plugins -> disable NexusRBX cloud plugin -> restart Studio. Keep only the local install from npm run plugin:install."
	elseif string.find(lowered, "expired") then
		return "Session expired. Pair Studio again from the website."
	elseif string.find(lowered, "dnsresolve") or string.find(lowered, "could not resolve") then
		return "The plugin API host could not be resolved. Reinstall the latest plugin (npm run plugin:install) and allow HTTP for " .. BACKEND_HOST .. "."
	elseif string.find(lowered, "http") or string.find(lowered, "connect") or string.find(lowered, "request") then
		return "Allow HTTP Requests and accept the " .. BACKEND_HOST .. " permission."
	end
	return nil
end

function setLast(text)
	local value = tostring(text or "none")
	if string.find(string.lower(value), "failed") or string.find(string.lower(value), "unsupported") or string.find(string.lower(value), "expired") then
		local hint = errorHelpFor(value)
		lastErrorText = hint and (value .. "\n" .. hint) or value
		setBanner("error", value .. "  ·  Click for details")
	elseif string.find(string.lower(value), "succeeded") or string.find(string.lower(value), "paired session") or string.find(string.lower(value), "restore complete") or string.find(string.lower(value), "restored snapshot") then
		setBanner("success", value)
	end
end

function setRun(runId)
	setProgress({ runId = runId })
end

function setProgress(info)
	info = info or {}
	local runText = info.runId and tostring(info.runId) or "none"
	local stepText = info.stepId and (" · step " .. tostring(info.stepId)) or ""
	local countText = info.executedCount and (" · executed " .. tostring(info.executedCount)) or ""
	progressLabel.Text = "Run: " .. runText .. stepText .. countText
end

function setActive(text)
	local value = tostring(text or "none")
	activeLabel.Text = "Active tool: " .. value
end

function setAgentPhase(phase)
	local activeIndex = 0
	for index, candidate in ipairs(AGENT_PHASES) do
		if candidate == phase then
			activeIndex = index
			break
		end
	end
	for index, candidate in ipairs(AGENT_PHASES) do
		local chip = agentPhaseDots[candidate]
		if chip then
			local isCurrent = candidate == phase
			local reached = activeIndex > 0 and index <= activeIndex
			local targetColor
			local textColor
			if isCurrent and candidate ~= "done" then
				targetColor = COLORS.accent
				textColor = Color3.fromRGB(255, 255, 255)
			elseif candidate == "done" and isCurrent then
				targetColor = COLORS.success
				textColor = Color3.fromRGB(255, 255, 255)
			elseif reached then
				targetColor = COLORS.primary
				textColor = Color3.fromRGB(255, 255, 255)
			else
				targetColor = themeColor(Enum.StudioStyleGuideColor.MainBackground)
				textColor = themeColor(Enum.StudioStyleGuideColor.DimmedText)
			end
			chip.TextColor3 = textColor
			chip.BackgroundTransparency = reached and 0 or 0.35
			TweenService:Create(chip, TweenInfo.new(0.15), { BackgroundColor3 = targetColor }):Play()
		end
	end
end

function setManifestInfo(info)
	info = info or {}
	local itemCount = tonumber(info.itemCount) or 0
	local revision = info.revision and tostring(info.revision) or nil
	local revShort = revision and (#revision > 10 and ("#" .. string.sub(revision, 1, 8)) or ("#" .. revision)) or "none"
	manifestSummaryLabel.Text = ("%d instance(s) indexed  ·  %s"):format(itemCount, revShort)
	local indexedAt = tonumber(info.indexedAt)
	if indexedAt then
		local ago = math.max(0, os.time() - indexedAt)
		local fresh = ago < (info.staleAfter or 300)
		local freshWord = fresh and "fresh" or "stale"
		local color = fresh and COLORS.success or COLORS.warning
		manifestFreshnessLabel.TextColor3 = color
		manifestFreshnessLabel.Text = ("Indexed %ds ago (%s). Rescan from the website to refresh."):format(ago, freshWord)
	else
		manifestFreshnessLabel.TextColor3 = themeColor(Enum.StudioStyleGuideColor.DimmedText)
		manifestFreshnessLabel.Text = "Rescan runs from the website when needed."
	end
end

function pushActivity(entry)
	entry = entry or {}
	feedEmptyLabel.Visible = false
	local row = Instance.new("TextLabel")
	row.Name = "ActivityEntry"
	row.BackgroundTransparency = 1
	row.Size = UDim2.new(1, 0, 0, 0)
	row.AutomaticSize = Enum.AutomaticSize.Y
	row.Font = Enum.Font.Gotham
	row.TextSize = 11
	row.TextXAlignment = Enum.TextXAlignment.Left
	row.TextYAlignment = Enum.TextYAlignment.Top
	row.TextWrapped = true
	row.RichText = true
	row.TextColor3 = themeColor(Enum.StudioStyleGuideColor.MainText)
	local status = tostring(entry.status or "info")
	local colorHex = status == "succeeded" and "#39A65C" or (status == "failed" and "#D64550" or "#6C757D")
	local commandType = tostring(entry.commandType or "command")
	local icon
	if string.find(commandType, "read") or string.find(commandType, "inspect") or string.find(commandType, "manifest") or string.find(commandType, "search") then
		icon = "R"
	elseif string.find(commandType, "delete") then
		icon = "D"
	elseif string.find(commandType, "restore") or string.find(commandType, "undo") or string.find(commandType, "snapshot") then
		icon = "S"
	elseif string.find(commandType, "write") or string.find(commandType, "patch") or string.find(commandType, "create") or string.find(commandType, "apply") or string.find(commandType, "update") then
		icon = "W"
	else
		icon = "*"
	end
	local durationText = entry.duration and (" · " .. tostring(entry.duration) .. "ms") or ""
	local snapshotText = entry.snapshotCount and entry.snapshotCount > 0 and (" · " .. tostring(entry.snapshotCount) .. " snap") or ""
	local detailText = entry.detail and (" · " .. tostring(entry.detail)) or ""
	local verifiedText = ""
	if status == "succeeded" then
		if entry.verified == true then
			verifiedText = ' <font color="#39A65C">[verified]</font>'
		elseif entry.verified == false then
			verifiedText = ' <font color="#D39127">[unverified]</font>'
		end
	end
	row.Text = string.format(
		'<font color="#666666">%s</font> <font color="#845CDF">%s</font> <b>%s</b> <font color="%s">%s</font>%s%s%s%s',
		formatTime(entry.at or os.time()),
		icon,
		commandType,
		colorHex,
		status,
		verifiedText,
		durationText,
		snapshotText,
		detailText
	)
	row.LayoutOrder = os.time()
	row.Parent = feedList

	local entries = {}
	for _, child in ipairs(feedList:GetChildren()) do
		if child:IsA("TextLabel") and child.Name == "ActivityEntry" then
			table.insert(entries, child)
		end
	end
	while #entries > MAX_ACTIVITY_ENTRIES do
		table.sort(entries, function(a, b)
			return a.LayoutOrder < b.LayoutOrder
		end)
		entries[1]:Destroy()
		table.remove(entries, 1)
	end
end

function showToast(message, kind)
	local text = tostring(message or "")
	if text == "" then
		return
	end
	toast.Text = "  " .. text .. "  "
	toast.BackgroundColor3 = kind == "error" and COLORS.error or (kind == "success" and COLORS.success or Color3.fromRGB(30, 32, 38))
	toast.Visible = true
	toast.BackgroundTransparency = 0.08
	TweenService:Create(toast, TweenInfo.new(0.15), { BackgroundTransparency = 0 }):Play()
	task.delay(3.5, function()
		if toast.Text:find(text, 1, true) then
			local fade = TweenService:Create(toast, TweenInfo.new(0.25), { BackgroundTransparency = 1 })
			fade:Play()
			fade.Completed:Connect(function()
				toast.Visible = false
			end)
		end
	end)
	if not widget.Enabled then
		pcall(function()
			plugin:PromptNotification("NexusRBX: " .. text, 4)
		end)
	end
end

function updateSnapshotLabel()
	snapshotLabel.Text = ("Snapshots: %d local"):format(#localSnapshots)
	rebuildSnapshotList()
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
	confirmCopy.Text = ("Restore all %d local snapshot(s)? This can undo recent generated changes."):format(#localSnapshots)
	confirmOverlay.Visible = true
	return true
end

function hideRestoreConfirmation()
	confirmOverlay.Visible = false
end

local function describeAffectedPaths(command)
	local payload = command.payload or {}
	local paths = {}
	local seen = {}
	local function add(value)
		if type(value) == "string" and value ~= "" and not seen[value] then
			seen[value] = true
			table.insert(paths, value)
		end
	end
	add(payload.path)
	add(payload.newPath)
	add(payload.newParentPath)
	for _, p in ipairs(payload.paths or {}) do
		add(p)
	end
	for _, file in ipairs(payload.files or {}) do
		if type(file) == "table" then
			add(file.canonicalPath or file.path)
		end
	end
	for _, op in ipairs(payload.operations or {}) do
		if type(op) == "table" and type(op.payload) == "table" then
			add(op.payload.path)
			add(op.payload.newPath)
		end
	end
	return paths
end

function showApprovalGate(command)
	pendingApproval = {
		command = command,
		resolved = false,
		approved = false,
	}
	local commandType = tostring(command.type or "command")
	local label = tostring(command.label or commandType)
	local runText = command.runId and ("\nRun: " .. tostring(command.runId)) or ""
	local stepText = command.stepId and ("\nStep: " .. tostring(command.stepId)) or ""
	local paths = describeAffectedPaths(command)
	local pathsText = ""
	if #paths > 0 then
		local shown = {}
		for index = 1, math.min(#paths, 6) do
			table.insert(shown, '<font color="#845CDF">•</font> ' .. paths[index])
		end
		if #paths > 6 then
			table.insert(shown, ("...and %d more"):format(#paths - 6))
		end
		pathsText = "\n\n<b>Affects:</b>\n" .. table.concat(shown, "\n")
	end
	approvalCopy.Text = ("Apply <b>%s</b> (%s)?%s%s%s"):format(label, commandType, runText, stepText, pathsText)
	approvalOverlay.Visible = true
end

function hideApprovalGate()
	approvalOverlay.Visible = false
	pendingApproval = nil
end

function waitForApproval(command)
	showApprovalGate(command)
	while pendingApproval and pendingApproval.resolved ~= true do
		task.wait(0.05)
	end
	local approved = pendingApproval and pendingApproval.approved == true
	hideApprovalGate()
	return approved
end

function getApprovalModeEnabledExport()
	return getApprovalModeEnabled()
end

function handleSessionExpired()
	setToken(nil)
	plugin:SetSetting("nexusrbxStudioSessionId", nil)
	setStatus("session expired - re-pair")
	setLast("session expired - enter a new pairing code")
	setBanner("error", "Session expired. Pair Studio again from the website.")
	setProgress({})
	setActive("none")
	refreshControls()
end

approvalConfirmButton.MouseButton1Click:Connect(function()
	if pendingApproval then
		pendingApproval.approved = true
		pendingApproval.resolved = true
	end
end)

approvalDeclineButton.MouseButton1Click:Connect(function()
	if pendingApproval then
		pendingApproval.approved = false
		pendingApproval.resolved = true
	end
end)

approvalToggleButton.MouseButton1Click:Connect(function()
	local nextValue = not getApprovalModeEnabled()
	plugin:SetSetting("nexusrbxApprovalMode", nextValue)
	refreshApprovalToggle()
	showToast(nextValue and "Review before apply enabled" or "Review before apply disabled", "info")
end)

undoBatchButton.MouseButton1Click:Connect(function()
	if undoBatchButton:GetAttribute("NexusEnabled") ~= true then
		return
	end
	local batch = lastBatchSnapshots
	if type(batch) ~= "table" or #batch == 0 then
		setLast("no batch to undo")
		showToast("Nothing to undo", "info")
		return
	end
	local recording = beginRecording("NexusRBX undo last batch")
	local ok, resultOrError = pcall(function()
		return restoreSnapshots({ snapshots = batch })
	end)
	if ok then
		finishRecording(recording, true)
		setLast(("undo batch complete: %d restored, %d removed"):format(resultOrError.restored or 0, resultOrError.removed or 0))
		pushActivity({ commandType = "undo_last_batch", status = "succeeded", detail = tostring(#batch) .. " snapshots" })
		showToast("Batch undone", "success")
	else
		finishRecording(recording, false)
		setLast("undo batch failed: " .. tostring(resultOrError))
		showToast("Undo failed", "error")
	end
	updateSnapshotLabel()
end)

banner.MouseButton1Click:Connect(function()
	if lastErrorText then
		diagnosticsOpen = not diagnosticsOpen
		if diagnosticsOpen then
			banner.Text = lastErrorText .. "\nPlugin " .. displayPluginVersion .. " · Protocol " .. displayProtocolVersion
			banner.Size = UDim2.new(1, 0, 0, 62)
		else
			banner.Text = lastErrorText .. "  ·  Click for details"
			banner.Size = UDim2.new(1, 0, 0, 42)
		end
	end
end)

codeBox:GetPropertyChangedSignal("Text"):Connect(function()
	local cleaned = string.upper((codeBox.Text or ""):gsub("%s+", ""))
	if cleaned ~= codeBox.Text then
		codeBox.Text = cleaned
	end
	if getToken() == nil then
		clearErrorBanner()
		if cleaned ~= "" then
			setStatus("ready to pair")
		else
			setStatus("not paired")
		end
	end
	refreshControls()
end)

pcall(function()
	settings().Studio.ThemeChanged:Connect(function()
		root.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.MainBackground)
		scrollRoot.BackgroundTransparency = 1
	end)
end)

function runSetupCheck()
	setupResult.Visible = true
	setupResult.Text = "Checking setup..."
	local httpOk = false
	pcall(function()
		httpOk = game:GetService("HttpService").HttpEnabled == true
	end)
	local healthOk, latency = false, nil
	pcall(function()
		healthOk, latency = pingHealth()
	end)
	local lines = {}
	if httpOk then
		table.insert(lines, '<font color="#39A65C">OK</font> HTTP requests enabled')
	else
		table.insert(lines, '<font color="#D64550">X</font> Enable Game Settings -> Security -> Allow HTTP Requests')
	end
	if healthOk then
		local latencyText = latency and (" (" .. tostring(latency) .. "ms)") or ""
		table.insert(lines, '<font color="#39A65C">OK</font> Backend reachable' .. latencyText)
	elseif not httpOk then
		table.insert(lines, '<font color="#D39127">--</font> Backend check skipped until HTTP is on')
	else
		table.insert(lines, '<font color="#D64550">X</font> Backend unreachable. Accept the ' .. BACKEND_HOST .. ' permission.')
	end
	setupResult.Text = table.concat(lines, "\n")
end

function showOnboarding()
	onboardingOverlay.Visible = true
end

function hideOnboarding()
	onboardingOverlay.Visible = false
	plugin:SetSetting("nexusrbxOnboardingSeen", true)
end

checkSetupButton.MouseButton1Click:Connect(function()
	if checkSetupButton:GetAttribute("NexusEnabled") ~= true then
		return
	end
	runSetupCheck()
end)

onboardingDismissButton.MouseButton1Click:Connect(hideOnboarding)

refreshApprovalToggle()
refreshControls()
