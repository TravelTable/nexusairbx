-- Nexus inside Roblox Studio.
-- The normal surface is intentionally only a header, conversation, and composer;
-- legacy connection and recovery controls remain available inside Settings.

local TweenService = game:GetService("TweenService")

local displayPluginVersion, displayProtocolVersion, MAX_ACTIVITY_ENTRIES = PLUGIN_VERSION or "0.13.0-project-first", STUDIO_PROTOCOL_VERSION or "2026-07-30-script-context", 25

local toolbar = plugin:CreateToolbar("NexusRBX")
local toggleButton = toolbar:CreateButton("NexusRBX", "Open Nexus", "")
toggleButton.ClickableWhenViewportHidden = true

-- Open as a floating, draggable window instead of docked to the side. Studio
-- still lets the user re-dock it; this only changes the initial state.
local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Float,
	false,
	false,
	420,
	620,
	320,
	360
)

local widget = plugin:CreateDockWidgetPluginGui("NexusRBXStudioBridge", widgetInfo)
widget.Title = "NexusRBX"

-- `localSnapshots` is initialized in the bundled shared preamble before snapshot.lua.
local applying, pollingActive, lastErrorText, diagnosticsOpen, pendingApproval, selectedSnapshotIds = false, false, nil, false, nil, {}

-- Tabbed navigation state. Sections are grouped into tabs and shown/hidden by
-- `setActiveTab`; `refreshControls` derives per-section visibility from the
-- active tab plus the paired state. Declared on one line to conserve the
-- bundler's top-level local budget.
local tabButtons, activeTab, setActiveTab, tabBar, promptSection = {}, "Chat", nil, nil, nil
local conversationSection, chatMessageList, chatEmptyLabel, chatSuggestions, appendChatMessage, updateChatMessage, syncChatMessages
local nexusHeader, chatComposer, chatRuntime, UI_HELPERS
UI_HELPERS = {}

chatRuntime = {
	chatId = tostring(plugin:GetSetting("nexusrbxActiveChatId") or ""),
	runId = "",
	messageId = "",
	requestId = "",
	afterSeq = 0,
	afterCursor = "",
	streaming = false,
	resumeRunId = "",
	resumeMessageId = "",
	selection = nil,
	settingsOpen = false,
	bootstrapping = false,
}

local function themeColor(color)
	-- NexusRBX remains a dark, low-glare workspace even when Studio itself uses
	-- the light theme. Semantic mapping keeps contrast predictable throughout the
	-- dock instead of scattering one-off dark overrides across every component.
	if color == Enum.StudioStyleGuideColor.MainText then
		return Color3.fromRGB(241, 241, 238)
	elseif color == Enum.StudioStyleGuideColor.DimmedText then
		return Color3.fromRGB(166, 168, 174)
	elseif color == Enum.StudioStyleGuideColor.MainBackground then
		return Color3.fromRGB(17, 18, 20)
	elseif color == Enum.StudioStyleGuideColor.InputFieldBackground then
		return Color3.fromRGB(24, 25, 29)
	elseif color == Enum.StudioStyleGuideColor.InputFieldBorder then
		return Color3.fromRGB(52, 54, 61)
	elseif color == Enum.StudioStyleGuideColor.Button then
		return Color3.fromRGB(38, 39, 45)
	end
	return Color3.fromRGB(24, 25, 29)
end

local function blendColor(a, b, alpha)
	return Color3.new(
		a.R + (b.R - a.R) * alpha,
		a.G + (b.G - a.G) * alpha,
		a.B + (b.B - a.B) * alpha
	)
end

local COLORS = {
	canvas = Color3.fromRGB(17, 18, 20),
	surface = Color3.fromRGB(24, 25, 29),
	surfaceRaised = Color3.fromRGB(32, 33, 38),
	border = Color3.fromRGB(52, 54, 61),
	text = Color3.fromRGB(241, 241, 238),
	textMuted = Color3.fromRGB(166, 168, 174),
	primary = Color3.fromRGB(124, 58, 237),
	accent = Color3.fromRGB(132, 92, 223),
	error = Color3.fromRGB(214, 69, 80),
	warning = Color3.fromRGB(211, 145, 39),
	success = Color3.fromRGB(57, 166, 92),
	muted = Color3.fromRGB(108, 117, 125),
	live = Color3.fromRGB(0, 200, 150),
}

-- Single source of truth for the connection state machine. Every visible status
-- (pill, header tint) is derived from one of these entries so the UI can
-- never claim "connected" while it is actually failing or idle.
local BRIDGE_STATES = {
	unpaired = { label = "Offline", color = COLORS.muted, pulse = false },
	connecting = { label = "Connecting", color = COLORS.warning, pulse = true },
	live = { label = "Live", color = COLORS.live, pulse = false },
	working = { label = "Working", color = COLORS.accent, pulse = true },
	degraded = { label = "Reconnecting", color = COLORS.warning, pulse = true },
	reconciling = { label = "Confirming", color = COLORS.warning, pulse = true },
	target_changed = { label = "Wrong place", color = COLORS.error, pulse = false },
	target_stale = { label = "Target stale", color = COLORS.error, pulse = false },
	error = { label = "Action needed", color = COLORS.error, pulse = false },
}

local currentBridgeState = "unpaired"
local STATUS_PILL_HEIGHT, STATUS_PILL_TEXT_SIZE = 20, 9
local STATUS_PILL_MIN_WIDTH, STATUS_PILL_PAD, STATUS_PILL_HEADER_RESERVE = 40, 8, 108

local root = Instance.new("Frame")
root.Name = "NexusBridgeRoot"
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = COLORS.canvas
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

do
	local rootPadding = Instance.new("UIPadding")
	rootPadding.PaddingTop = UDim.new(0, 12)
	rootPadding.PaddingBottom = UDim.new(0, 12)
	rootPadding.PaddingLeft = UDim.new(0, 12)
	rootPadding.PaddingRight = UDim.new(0, 18)
	rootPadding.Parent = scrollRoot

	local rootList = Instance.new("UIListLayout")
	rootList.Padding = UDim.new(0, 10)
	rootList.SortOrder = Enum.SortOrder.LayoutOrder
	rootList.Parent = scrollRoot
end

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

local statusPill
do
	local header = Instance.new("Frame")
	header.Name = "Header"
	header.BackgroundTransparency = 1
	header.Size = UDim2.new(1, 0, 0, 0)
	header.AutomaticSize = Enum.AutomaticSize.Y
	header.Parent = scrollRoot

	local title = makeText(header, "Title", "NexusRBX", 22, 16, true)
	title.Size = UDim2.new(1, -STATUS_PILL_HEADER_RESERVE, 0, 22)
	title.LayoutOrder = 1
	local subtitle = makeText(header, "Subtitle", tostring(game.Name or "Studio place"), 18, 12, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))
	subtitle.Size = UDim2.new(1, -STATUS_PILL_HEADER_RESERVE, 0, 18)
	subtitle.LayoutOrder = 2
	healthLabel = makeText(header, "Health", "Not synced yet", 16, 11, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))
	healthLabel.Size = UDim2.new(1, -STATUS_PILL_HEADER_RESERVE, 0, 16)
	healthLabel.LayoutOrder = 3

	local headerList = Instance.new("UIListLayout")
	headerList.Padding = UDim.new(0, 2)
	headerList.SortOrder = Enum.SortOrder.LayoutOrder
	headerList.Parent = header

	statusPill = Instance.new("TextLabel")
	statusPill.Name = "StatusPill"
	statusPill.AnchorPoint = Vector2.new(1, 0)
	statusPill.Position = UDim2.new(1, 0, 0, 3)
	statusPill.Size = UDim2.new(0, STATUS_PILL_MIN_WIDTH, 0, STATUS_PILL_HEIGHT)
	statusPill.BackgroundColor3 = COLORS.muted
	statusPill.TextColor3 = Color3.fromRGB(255, 255, 255)
	statusPill.Font = Enum.Font.GothamBold
	statusPill.TextSize = STATUS_PILL_TEXT_SIZE
	statusPill.Text = "Offline"
	statusPill.TextXAlignment = Enum.TextXAlignment.Center
	statusPill.Parent = header
	applyCorner(statusPill, STATUS_PILL_HEIGHT / 2)
	local statusPillPad = Instance.new("UIPadding")
	statusPillPad.PaddingLeft = UDim.new(0, STATUS_PILL_PAD)
	statusPillPad.PaddingRight = UDim.new(0, STATUS_PILL_PAD)
	statusPillPad.Parent = statusPill
	header.Visible = false
	nexusHeader = createNexusPluginHeader(root, COLORS)
	scroll.Position = UDim2.new(0, 0, 0, 53)
	scroll.Size = UDim2.new(1, 0, 1, -53)
end

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

-- Tab bar: one button per top-level view. Only shown once paired (unpaired the
-- panel is just the pairing card). Click handlers are wired after setActiveTab
-- is defined further down. Wrapped in a do-block so its locals stay off the
-- bundler's top-level budget.
do
	tabBar = Instance.new("Frame")
	tabBar.Name = "TabBar"
	tabBar.BackgroundTransparency = 1
	tabBar.Size = UDim2.new(1, 0, 0, 32)
	tabBar.Visible = false
	tabBar.Parent = scrollRoot
	local tabBarLayout = Instance.new("UIListLayout")
	tabBarLayout.FillDirection = Enum.FillDirection.Horizontal
	tabBarLayout.HorizontalAlignment = Enum.HorizontalAlignment.Left
	tabBarLayout.VerticalAlignment = Enum.VerticalAlignment.Center
	tabBarLayout.SortOrder = Enum.SortOrder.LayoutOrder
	tabBarLayout.Padding = UDim.new(0, 6)
	tabBarLayout.Parent = tabBar
	local TAB_ORDER = { "Chat", "Activity", "Recovery", "Settings" }
	for index, tabName in ipairs(TAB_ORDER) do
		local tabButton = Instance.new("TextButton")
		tabButton.Name = "Tab_" .. tabName
		tabButton.Size = UDim2.new(0.25, -5, 1, 0)
		tabButton.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.Button)
		tabButton.TextColor3 = themeColor(Enum.StudioStyleGuideColor.DimmedText)
		tabButton.Font = Enum.Font.GothamBold
		tabButton.TextSize = 12
		tabButton.Text = tabName
		tabButton.AutoButtonColor = false
		tabButton.LayoutOrder = index
		tabButton.Parent = tabBar
		applyCorner(tabButton, 6)
		tabButton.MouseButton1Click:Connect(function()
			if setActiveTab then
				setActiveTab(tabName)
			end
		end)
		tabButtons[tabName] = tabButton
	end
end

UI_HELPERS.pairSection = makeSection("Pairing")
makeText(UI_HELPERS.pairSection, "PairTitle", "Sign in to Nexus", 22, 15, true)
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
codeBox.Parent = UI_HELPERS.pairSection
applyCorner(codeBox, 6)
applyStroke(codeBox, COLORS.primary, 0.45)
pairButton = makeButton(UI_HELPERS.pairSection, "PairButton", "Continue", COLORS.primary)

setupSteps = makeText(
	UI_HELPERS.pairSection,
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
setupSteps.Text = "Enter the one-time code from Nexus. You will return straight to chat next time."

checkSetupButton = makeButton(UI_HELPERS.pairSection, "CheckSetupButton", "Check setup", themeColor(Enum.StudioStyleGuideColor.Button))
checkSetupButton.Visible = false

setupResult = makeText(UI_HELPERS.pairSection, "SetupResult", "", nil, 11, false, themeColor(Enum.StudioStyleGuideColor.DimmedText), true)
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

UI_HELPERS.agentSection = makeSection("AgentActivity")
makeText(UI_HELPERS.agentSection, "AgentTitle", "Agent", 18, 13, true)
-- Construction-only instances stay in a short scope so the bundled module
-- remains comfortably below Luau's 200-live-register ceiling.
do
	local phaseStrip = Instance.new("Frame")
	phaseStrip.Name = "PhaseStrip"
	phaseStrip.BackgroundTransparency = 1
	phaseStrip.Size = UDim2.new(1, 0, 0, 22)
	phaseStrip.Parent = UI_HELPERS.agentSection
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
end

UI_HELPERS.manifestSection = makeSection("Manifest")
makeText(UI_HELPERS.manifestSection, "ManifestTitle", "Project Index", 18, 13, true)
manifestSummaryLabel = makeText(UI_HELPERS.manifestSection, "ManifestSummary", "Not indexed yet", 18, 12, false, themeColor(Enum.StudioStyleGuideColor.MainText))
manifestFreshnessLabel = makeText(UI_HELPERS.manifestSection, "ManifestFreshness", "Rescan runs from the website when needed.", 16, 11, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))

-- Conversation is the plugin's primary surface. Tool execution stays visible,
-- but it is rendered as compact Studio events between the user's prompt and the
-- assistant result instead of requiring a separate activity dashboard.
conversationSection = makeSection("Conversation")
conversationSection.BackgroundColor3 = COLORS.canvas
do
	local conversationTitle = makeText(conversationSection, "ConversationTitle", "Nexus chat", 20, 14, true, COLORS.text)
	conversationTitle.Visible = false
end
chatEmptyLabel = makeText(
	conversationSection,
	"ChatEmpty",
	"What do you want to build?",
	nil,
	13,
	false,
	COLORS.textMuted
)
chatEmptyLabel.TextWrapped = true

chatSuggestions = Instance.new("Frame")
chatSuggestions.Name = "ChatSuggestions"
chatSuggestions.BackgroundTransparency = 1
chatSuggestions.Size = UDim2.new(1, 0, 0, 34)
chatSuggestions.Parent = conversationSection
do
	local chatSuggestionLayout = Instance.new("UIListLayout")
	chatSuggestionLayout.FillDirection = Enum.FillDirection.Horizontal
	chatSuggestionLayout.HorizontalAlignment = Enum.HorizontalAlignment.Left
	chatSuggestionLayout.VerticalAlignment = Enum.VerticalAlignment.Center
	chatSuggestionLayout.SortOrder = Enum.SortOrder.LayoutOrder
	chatSuggestionLayout.Padding = UDim.new(0, 6)
	chatSuggestionLayout.Parent = chatSuggestions
end

chatMessageList = Instance.new("Frame")
chatMessageList.Name = "ChatMessages"
chatMessageList.BackgroundTransparency = 1
chatMessageList.Size = UDim2.new(1, 0, 0, 0)
chatMessageList.AutomaticSize = Enum.AutomaticSize.Y
chatMessageList.Parent = conversationSection
do
	local chatMessageLayout = Instance.new("UIListLayout")
	chatMessageLayout.Padding = UDim.new(0, 8)
	chatMessageLayout.SortOrder = Enum.SortOrder.LayoutOrder
	chatMessageLayout.Parent = chatMessageList
end

local function chatStateText(state, detail)
	local normalized = string.lower(tostring(state or ""))
	local prefix = normalized == "failed" and "Failed"
		or (normalized == "working" and "Working"
		or (normalized == "completed" and "Completed" or ""))
	local cleanDetail = tostring(detail or "")
	if cleanDetail == "" then
		return prefix
	end
	if prefix == "" or string.lower(cleanDetail) == string.lower(prefix) then
		return cleanDetail
	end
	return prefix .. "  ·  " .. cleanDetail
end

appendChatMessage = function(id, role, content, state, detail)
	local messageId = tostring(id or HttpService:GenerateGUID(false))
	for _, child in ipairs(chatMessageList:GetChildren()) do
		if child:GetAttribute("ChatMessageId") == messageId then
			updateChatMessage(messageId, content, state, detail)
			return child
		end
	end
	chatEmptyLabel.Visible = false
	chatSuggestions.Visible = false
	local wasNearBottom = nexusChatNearBottom(scroll, 84)
	local message = createNexusChatMessage(chatMessageList, {
		id = messageId,
		role = role,
		content = tostring(content or ""),
		status = chatStateText(state, detail),
		failed = state == "failed",
		colors = {
			canvas = COLORS.canvas,
			raised = COLORS.surfaceRaised,
			user = Color3.fromRGB(56, 35, 94),
			text = COLORS.text,
			muted = COLORS.textMuted,
			accentText = Color3.fromRGB(183, 157, 239),
			error = COLORS.error,
		},
	})
	if wasNearBottom then scrollNexusChatToBottom(scroll) end
	return message
end

updateChatMessage = function(id, content, state, detail)
	local messageId = tostring(id or "")
	for _, child in ipairs(chatMessageList:GetChildren()) do
		if child:GetAttribute("ChatMessageId") == messageId then
			local wasNearBottom = nexusChatNearBottom(scroll, 84)
			updateNexusChatMessage(child, {
				content = content,
				status = chatStateText(state, detail),
				statusColor = state == "failed" and COLORS.error or COLORS.textMuted,
			})
			if wasNearBottom then scrollNexusChatToBottom(scroll) end
			return child
		end
	end
	return appendChatMessage(messageId, "assistant", content, state, detail)
end

syncChatMessages = function()
	local token = getToken and getToken() or nil
	if not token or chatRuntime.chatId == "" then return false end
	local ok, data = studioChatLoadMessages(token, chatRuntime.chatId, 50)
	if not ok or type(data) ~= "table" or type(data.messages) ~= "table" then
		return false
	end
	chatRuntime.resumeRunId = ""
	chatRuntime.resumeMessageId = ""
	for _, child in ipairs(chatMessageList:GetChildren()) do
		if child:IsA("Frame") and child:GetAttribute("ChatMessageId") then child:Destroy() end
	end
	for _, message in ipairs(data.messages) do
		local content = tostring(message.content or "")
		local resumableRunId = message.state == "working" and tostring(message.runId or "") or ""
		if resumableRunId ~= "" then
			chatRuntime.resumeRunId = resumableRunId
			chatRuntime.resumeMessageId = tostring(message.id or "")
		elseif content == "" and message.state == "working" then
			content = "Working on the Studio request..."
		elseif content == "" and message.error then
			content = tostring(message.error)
		end
		local detail = tostring(message.stage or message.runState or "")
		if type(message.files) == "table" and #message.files > 0 then
			detail = detail .. (detail ~= "" and "  ·  " or "") .. tostring(#message.files) .. " file(s)"
		end
		appendChatMessage(message.id, message.role, content, message.state, detail)
	end
	chatEmptyLabel.Visible = #data.messages == 0
	chatSuggestions.Visible = #data.messages == 0
	return true
end

-- Compact conversational composer. Studio identity and project association are
-- resolved by the authenticated session, so the user never selects a project.
do
	local storedMode = tostring(plugin:GetSetting("nexusrbxChatMode") or "agent")
	chatComposer = createNexusComposer(root, COLORS, storedMode)
	promptSection = chatComposer.root
	for index, suggestion in ipairs({
		{ "Fix a bug", "Investigate the current game and fix the most relevant error." },
		{ "Build a system", "Build the gameplay system I describe in this game." },
		{ "Improve selection", "Improve the selected Studio UI or instance." },
	}) do
		local suggestionButton = makeButton(chatSuggestions, "Suggestion" .. tostring(index), suggestion[1], COLORS.surfaceRaised, true)
		suggestionButton.Size = UDim2.new(0.333, -4, 0, 32)
		suggestionButton.MouseButton1Click:Connect(function()
			chatComposer.input.Text = suggestion[2]
			chatComposer.input:CaptureFocus()
		end)
	end

	local function messageById(messageId)
		for _, child in ipairs(chatMessageList:GetChildren()) do
			if child:GetAttribute("ChatMessageId") == tostring(messageId or "") then return child end
		end
		return nil
	end

	local function clearConversationView()
		for _, child in ipairs(chatMessageList:GetChildren()) do
			if child:IsA("Frame") and child:GetAttribute("ChatMessageId") then child:Destroy() end
		end
		chatEmptyLabel.Visible = true
		chatSuggestions.Visible = true
	end

	local function addUndoAction(message, runId)
		if not message or runId == "" then return end
		local bubble = message:FindFirstChild("Bubble") or message
		if bubble:FindFirstChild("UndoAction") then return end
		local undo = makeButton(bubble, "UndoAction", "Undo", COLORS.surfaceRaised, true)
		undo.Size = UDim2.new(0, 64, 0, 26)
		undo.MouseButton1Click:Connect(function()
			setButtonEnabled(undo, false, "Undoing...")
			local token = getToken and getToken() or nil
			local ok, result
			if token then
				ok, result = studioChatUndoRun(
					token,
					runId,
					chatRuntime.chatId,
					HttpService:GenerateGUID(false)
				)
			else
				ok, result = false, "Studio is disconnected"
			end
			if ok then
				undo.Text = "Undo queued"
				showToast("Restoring the previous version", "success")
			else
				setButtonEnabled(undo, true, "Undo")
				showToast(tostring(result or "Undo is unavailable"), "error")
			end
		end)
	end

	local function addApprovalAction(message, runId, stepId)
		if not message or runId == "" or tostring(stepId or "") == "" then return end
		local bubble = message:FindFirstChild("Bubble") or message
		local actionName = "ApprovalAction-" .. tostring(stepId)
		if bubble:FindFirstChild(actionName) then return end
		local actions = makeRow(bubble, actionName, 32)
		local apply = makeButton(actions, "Apply", "Apply", COLORS.primary, true)
		apply.Size = UDim2.new(0.5, -4, 0, 32)
		local decline = makeButton(actions, "Decline", "Cancel", COLORS.surfaceRaised, true)
		decline.Size = UDim2.new(0.5, -4, 0, 32)
		local function decide(decision)
			setButtonEnabled(apply, false, decision == "approve" and "Applying..." or "Apply")
			setButtonEnabled(decline, false, decision == "decline" and "Cancelling..." or "Cancel")
			task.spawn(function()
				local ok, result = studioChatApproveRun(getToken(), runId, chatRuntime.chatId, stepId, decision)
				if ok then
					actions:Destroy()
					updateChatMessage(message:GetAttribute("ChatMessageId"), nil, "working", decision == "approve" and "Applying approved change" or "Cancelled")
				else
					setButtonEnabled(apply, true, "Apply")
					setButtonEnabled(decline, true, "Cancel")
					showToast(tostring(result or "That decision could not be saved"), "error")
				end
			end)
		end
		apply.MouseButton1Click:Connect(function() decide("approve") end)
		decline.MouseButton1Click:Connect(function() decide("decline") end)
	end

	local function streamRun(runId, messageId)
		chatRuntime.runId = tostring(runId or "")
		chatRuntime.messageId = tostring(messageId or "")
		chatRuntime.afterSeq = 0
		chatRuntime.afterCursor = ""
		chatRuntime.streaming = chatRuntime.runId ~= ""
		chatRuntime.seenEvents = {}
		chatComposer:setStreaming(chatRuntime.streaming)
		local failures = 0
		while chatRuntime.streaming and chatRuntime.runId == runId and getToken and getToken() do
			local ok, data = studioChatReadEvents(
				getToken(),
				runId,
				chatRuntime.chatId,
				chatRuntime.afterSeq,
				chatRuntime.afterCursor,
				12000
			)
			if not chatRuntime.streaming or chatRuntime.runId ~= runId then break end
			if not ok then
				failures = failures + 1
				updateChatMessage(messageId, nil, "working", failures < 3 and "Reconnecting..." or "Studio connection interrupted")
				if failures >= 6 then
					updateChatMessage(messageId, "I lost the connection while following that task. Your last confirmed Studio changes are safe.", "failed", "Reconnect · Try again")
					break
				end
				task.wait(math.min(failures * 1.5, 8))
				continue
			end
			failures = 0
			chatRuntime.afterSeq = tonumber(data.nextSeq) or chatRuntime.afterSeq
			chatRuntime.afterCursor = tostring(data.nextCursor or chatRuntime.afterCursor)
			for _, event in ipairs(type(data.events) == "table" and data.events or {}) do
				local eventId = tostring(event.eventId or (event.type .. ":" .. tostring(event.seq or "")))
				if chatRuntime.seenEvents[eventId] then continue end
				chatRuntime.seenEvents[eventId] = true
				local eventType = tostring(event.type or "")
				local eventData = type(event.data) == "table" and event.data or {}
				local message = messageById(messageId)
				if eventType == "delta" then
					local shouldFollow = nexusChatNearBottom(scroll, 84)
					updateNexusChatMessage(message, { delta = tostring(eventData.text or ""), status = "" })
					if shouldFollow then scrollNexusChatToBottom(scroll) end
				elseif eventType == "tool_step" then
					local label, state = friendlyStudioActivity(eventData.type, eventData.label, eventData.status)
					updateChatMessage(messageId, nil, state, label)
					if eventData.requiresApproval == true then
						addApprovalAction(messageById(messageId), runId, eventData.id)
					end
				elseif eventType == "stage" or eventType == "heartbeat" then
					updateChatMessage(messageId, nil, "working", tostring(eventData.message or "Working"))
				elseif eventType == "done" then
					local content = tostring(eventData.content or "Done.")
					local detail = type(eventData.files) == "table" and #eventData.files > 0
						and (tostring(#eventData.files) .. " file(s) changed") or "Done"
					updateChatMessage(messageId, content, "completed", detail)
					if eventData.undoAvailable == true then addUndoAction(messageById(messageId), runId) end
				elseif eventType == "error" then
					updateChatMessage(messageId, tostring(eventData.message or "That request did not complete."), "failed", eventData.retryable and "Try again" or "")
				end
			end
			if data.terminal == true then break end
		end
		if chatRuntime.runId == runId then
			chatRuntime.streaming = false
			chatRuntime.runId = ""
			chatComposer:setStreaming(false)
			syncChatMessages()
		end
	end

	function bootstrapStudioConversation(force, freshConversation)
		local token = getToken and getToken() or nil
		if not token or chatRuntime.bootstrapping then return false end
		if not force and chatRuntime.chatId ~= "" and conversationSection:GetAttribute("HistoryLoaded") == true then
			return true
		end
		chatRuntime.bootstrapping = true
		local ok, data = studioChatBootstrap(token, freshConversation and "" or chatRuntime.chatId)
		if not ok or type(data) ~= "table" then
			chatRuntime.bootstrapping = false
			showToast(tostring(data or "Nexus could not load this game yet"), "error")
			return false
		end
		local project = type(data.project) == "table" and data.project or {}
		local studioContext = type(data.studioContext) == "table" and data.studioContext or {}
		nexusHeader.gameLabel.Text = tostring(project.title or studioContext.placeName or game.Name)
		local active = freshConversation ~= true and type(data.activeConversation) == "table" and data.activeConversation or nil
		if freshConversation == true or not active then
			local createdOk, createdData = studioChatCreateConversation(token, chatComposer.mode)
			if createdOk and type(createdData) == "table" then active = createdData.conversation end
		end
		if type(active) ~= "table" or tostring(active.id or "") == "" then
			chatRuntime.bootstrapping = false
			showToast("Nexus could not open a conversation for this game", "error")
			return false
		end
		local nextChatId = tostring(active.id)
		if chatRuntime.streaming and chatRuntime.chatId ~= "" and chatRuntime.chatId ~= nextChatId then
			local previousRunId, previousChatId = chatRuntime.runId, chatRuntime.chatId
			chatRuntime.streaming = false
			chatRuntime.runId = ""
			chatComposer:setStreaming(false)
			task.spawn(function()
				if previousRunId ~= "" then studioChatCancelRun(token, previousRunId, previousChatId) end
			end)
		end
		chatRuntime.chatId = nextChatId
		plugin:SetSetting("nexusrbxActiveChatId", chatRuntime.chatId)
		chatComposer:setMode(active.activeMode or chatComposer.mode)
		local historyLoaded = syncChatMessages()
		conversationSection:SetAttribute("HistoryLoaded", historyLoaded)
		chatRuntime.bootstrapping = false
		if historyLoaded and not chatRuntime.streaming and chatRuntime.resumeRunId ~= "" then
			local resumeRunId, resumeMessageId = chatRuntime.resumeRunId, chatRuntime.resumeMessageId
			task.spawn(function() streamRun(resumeRunId, resumeMessageId) end)
		end
		return true
	end

	function refreshStudioSelection()
		local ok, result = pcall(function() return getSelectionTool() end)
		local selected = ok and type(result) == "table" and result.selection or {}
		if type(selected) ~= "table" or #selected == 0 then
			chatRuntime.selection = nil
			chatComposer:setSelection("")
			return
		end
		local items = {}
		for index = 1, math.min(#selected, 5) do
			local item = selected[index]
			table.insert(items, {
				name = tostring(item.name or item.path or "Selection"),
				className = tostring(item.className or "Instance"),
				path = tostring(item.path or ""),
			})
		end
		local targetOk, target = pcall(function() return currentStudioTargetAttestation(false) end)
		chatRuntime.selection = {
			items = items,
			capturedAt = DateTime.now().UnixTimestampMillis,
			targetGeneration = targetOk and tonumber(target.targetGeneration) or 1,
		}
		local first = items[1]
		local suffix = #items > 1 and (" +" .. tostring(#items - 1)) or ""
		chatComposer:setSelection(first.className .. " “" .. first.name .. "”" .. suffix)
	end

	chatComposer.onClearSelection = function()
		chatRuntime.selection = nil
		chatComposer:setSelection("")
	end

	chatComposer.onStop = function()
		if not chatRuntime.streaming or chatRuntime.runId == "" then return end
		local runId = chatRuntime.runId
		chatRuntime.streaming = false
		chatRuntime.runId = ""
		chatComposer:setStreaming(false)
		updateChatMessage(chatRuntime.messageId, nil, "working", "Stopping...")
		task.spawn(function()
			local ok, result = studioChatCancelRun(getToken(), runId, chatRuntime.chatId)
			updateChatMessage(chatRuntime.messageId, nil, ok and "completed" or "failed", ok and "Stopped" or tostring(result or "Could not stop"))
		end)
	end

	chatComposer.onSubmit = function()
		if chatRuntime.streaming then return end
		local token = getToken and getToken() or nil
		if not token then showToast("Sign in to Nexus first", "error") return end
		local text = tostring(chatComposer.input.Text or ""):gsub("^%s+", ""):gsub("%s+$", "")
		if text == "" then chatComposer.input:CaptureFocus() return end
		if chatRuntime.chatId == "" and not bootstrapStudioConversation(true) then return end
		local requestId = HttpService:GenerateGUID(false)
		local messageId = requestId .. "-assistant"
		appendChatMessage(requestId .. "-user", "user", text, "", "")
		appendChatMessage(messageId, "assistant", "", "working", "Thinking...")
		chatRuntime.streaming = true
		chatComposer:setStreaming(true)
		local ok, data = studioChatSendMessage(
			token,
			chatRuntime.chatId,
			text,
			chatComposer.mode,
			chatRuntime.selection,
			requestId
		)
		if not ok or type(data) ~= "table" then
			chatRuntime.streaming = false
			chatComposer:setStreaming(false)
			updateChatMessage(messageId, tostring(data or "Nexus could not start that request."), "failed", "Try again")
			return
		end
		chatComposer.input.Text = ""
		local runId = tostring(data.runId or "")
		if runId == "" then
			chatRuntime.streaming = false
			chatComposer:setStreaming(false)
			updateChatMessage(messageId, nil, "working", "Queued")
			task.delay(2, syncChatMessages)
			return
		end
		task.spawn(function() streamRun(runId, messageId) end)
	end

	nexusHeader.newChat.MouseButton1Click:Connect(function()
		if chatRuntime.streaming then showToast("Stop the current response before starting a new chat", "info") return end
		local token = getToken and getToken() or nil
		if not token then return end
		local ok, data = studioChatCreateConversation(token, chatComposer.mode)
		if ok and type(data) == "table" and type(data.conversation) == "table" then
			chatRuntime.chatId = tostring(data.conversation.id or "")
			plugin:SetSetting("nexusrbxActiveChatId", chatRuntime.chatId)
			conversationSection:SetAttribute("HistoryLoaded", true)
			clearConversationView()
			chatComposer.input:CaptureFocus()
		else
			showToast(tostring(data or "Could not start a new chat"), "error")
		end
	end)
end

UI_HELPERS.activitySection = makeSection("Activity")
makeText(UI_HELPERS.activitySection, "ActivityTitle", "Bridge Activity", 18, 13, true)
progressLabel = makeText(UI_HELPERS.activitySection, "Progress", "Run: none", 20, 12, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))
activeLabel = makeText(UI_HELPERS.activitySection, "Active", "Active tool: none", 20, 13, false)

-- Playtest observer surface: reads captured LogService output on demand. Wired in
-- Main.server.lua where the collectOutput handler is in scope. Exported (no local)
-- so it lands on the bundler's shared export table without a new top-level local.
playtestLogsButton = makeButton(UI_HELPERS.activitySection, "PlaytestLogs", "Check playtest output", themeColor(Enum.StudioStyleGuideColor.Button))
playtestStrip = makeText(UI_HELPERS.activitySection, "PlaytestStrip", "", nil, 11, false, themeColor(Enum.StudioStyleGuideColor.DimmedText), true)
playtestStrip.TextWrapped = true
playtestStrip.Visible = false

UI_HELPERS.feedList = Instance.new("Frame")
do
	local feedScroll = Instance.new("ScrollingFrame")
	feedScroll.Name = "ActivityFeed"
	feedScroll.Size = UDim2.new(1, 0, 0, 140)
	feedScroll.BackgroundTransparency = 1
	feedScroll.BorderSizePixel = 0
	feedScroll.ScrollBarThickness = 4
	feedScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
	feedScroll.CanvasSize = UDim2.new()
	feedScroll.Parent = UI_HELPERS.activitySection

	UI_HELPERS.feedList.Name = "FeedList"
	UI_HELPERS.feedList.Size = UDim2.new(1, 0, 0, 0)
	UI_HELPERS.feedList.AutomaticSize = Enum.AutomaticSize.Y
	UI_HELPERS.feedList.BackgroundTransparency = 1
	UI_HELPERS.feedList.Parent = feedScroll

	local feedLayout = Instance.new("UIListLayout")
	feedLayout.Padding = UDim.new(0, 4)
	feedLayout.SortOrder = Enum.SortOrder.LayoutOrder
	feedLayout.Parent = UI_HELPERS.feedList
end

feedEmptyLabel = makeText(UI_HELPERS.feedList, "FeedEmpty", "No commands yet. Pair Studio and push from the website.", 36, 11, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))
feedEmptyLabel.TextWrapped = true

UI_HELPERS.safetySection = makeSection("Safety")
makeText(UI_HELPERS.safetySection, "SafetyTitle", "Recovery", 18, 13, true)
snapshotLabel = makeText(UI_HELPERS.safetySection, "Snapshots", "Snapshots: 0 local", 18, 12, false)

UI_HELPERS.snapshotScroll = Instance.new("ScrollingFrame")
UI_HELPERS.snapshotScroll.Name = "SnapshotList"
UI_HELPERS.snapshotScroll.Size = UDim2.new(1, 0, 0, 96)
UI_HELPERS.snapshotScroll.BackgroundTransparency = 1
UI_HELPERS.snapshotScroll.BorderSizePixel = 0
UI_HELPERS.snapshotScroll.ScrollBarThickness = 4
UI_HELPERS.snapshotScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
UI_HELPERS.snapshotScroll.CanvasSize = UDim2.new()
UI_HELPERS.snapshotScroll.Visible = false
UI_HELPERS.snapshotScroll.Parent = UI_HELPERS.safetySection

UI_HELPERS.snapshotList = Instance.new("Frame")
UI_HELPERS.snapshotList.Name = "SnapshotRows"
UI_HELPERS.snapshotList.Size = UDim2.new(1, 0, 0, 0)
UI_HELPERS.snapshotList.AutomaticSize = Enum.AutomaticSize.Y
UI_HELPERS.snapshotList.BackgroundTransparency = 1
UI_HELPERS.snapshotList.Parent = UI_HELPERS.snapshotScroll

do
	local snapshotLayout = Instance.new("UIListLayout")
	snapshotLayout.Padding = UDim.new(0, 4)
	snapshotLayout.SortOrder = Enum.SortOrder.LayoutOrder
	snapshotLayout.Parent = UI_HELPERS.snapshotList
end

restoreButton = makeButton(UI_HELPERS.safetySection, "RestoreButton", "Restore Selected Snapshots", COLORS.accent)
undoBatchButton = makeButton(UI_HELPERS.safetySection, "UndoBatchButton", "Undo Last Batch", themeColor(Enum.StudioStyleGuideColor.Button))

UI_HELPERS.settingsSection = makeSection("Settings")
makeText(UI_HELPERS.settingsSection, "SettingsTitle", "Settings", 18, 13, true)
approvalToggleButton = makeButton(UI_HELPERS.settingsSection, "ApprovalToggle", "Review before apply: OFF", themeColor(Enum.StudioStyleGuideColor.Button))
makeText(UI_HELPERS.settingsSection, "AccountStatus", "Signed in to Nexus", 18, 12, false, COLORS.text)
makeText(UI_HELPERS.settingsSection, "StudioTargetTitle", "Studio connection", 17, 12, true)
studioTargetLabel = makeText(UI_HELPERS.settingsSection, "StudioTargetStatus", "Checking the open place...", nil, 11, false, themeColor(Enum.StudioStyleGuideColor.DimmedText), true)
studioTargetLabel.TextWrapped = true
studioFreshnessLabel = makeText(UI_HELPERS.settingsSection, "StudioFreshness", "Heartbeat -- · Commands -- · Place --", nil, 10, false, themeColor(Enum.StudioStyleGuideColor.DimmedText), true)
studioFreshnessLabel.TextWrapped = true
-- Informational only: this does not pair, start, stop, or otherwise control
-- the desktop MCP companion.
do
	local companionSection = Instance.new("Frame")
	companionSection.Name = "McpCompanion"
	companionSection.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.MainBackground)
	companionSection.BackgroundTransparency = 0.25
	companionSection.Size = UDim2.new(1, 0, 0, 0)
	companionSection.AutomaticSize = Enum.AutomaticSize.Y
	companionSection.Parent = UI_HELPERS.settingsSection
	applyCorner(companionSection, 6)
	applyStroke(companionSection, COLORS.accent, 0.55)
	local companionPadding = Instance.new("UIPadding")
	companionPadding.PaddingTop = UDim.new(0, 8)
	companionPadding.PaddingBottom = UDim.new(0, 8)
	companionPadding.PaddingLeft = UDim.new(0, 8)
	companionPadding.PaddingRight = UDim.new(0, 8)
	companionPadding.Parent = companionSection
	local companionList = Instance.new("UIListLayout")
	companionList.Padding = UDim.new(0, 3)
	companionList.SortOrder = Enum.SortOrder.LayoutOrder
	companionList.Parent = companionSection
	makeText(companionSection, "McpCompanionTitle", "Enhanced connection", 17, 12, true)
	mcpCompanionLabel = makeText(companionSection, "McpCompanionStatus", "Not configured", 17, 11, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))
	mcpCompanionHelpLabel = makeText(
		companionSection,
		"McpCompanionHelp",
		"Recommended for the best Nexus experience. The Studio plugin works independently.",
		nil,
		11,
		false,
		themeColor(Enum.StudioStyleGuideColor.DimmedText)
	)
	mcpCompanionHelpLabel.TextWrapped = true
end
-- Team Create awareness: who else is editing this place (masked identity).
-- Populated from the consolidated /api/studio/session/ping heartbeat response.
collaboratorsLabel = makeText(UI_HELPERS.settingsSection, "Collaborators", "Collaborators: checking...", nil, 11, false, themeColor(Enum.StudioStyleGuideColor.DimmedText), true)
collaboratorsLabel.TextWrapped = true
collaboratorsLabel.Visible = false
studioFreshnessLabel.Visible = false

do
	local advancedButton = makeButton(UI_HELPERS.settingsSection, "AdvancedToggle", "Advanced", themeColor(Enum.StudioStyleGuideColor.Button))
	advancedButton.MouseButton1Click:Connect(function()
		local visible = studioFreshnessLabel.Visible ~= true
		studioFreshnessLabel.Visible = visible
		collaboratorsLabel.Visible = visible
		advancedButton.Text = visible and "Hide advanced" or "Advanced"
	end)
	local openWebButton = makeButton(UI_HELPERS.settingsSection, "OpenOnWeb", "Open conversation on web", COLORS.primary)
	openWebButton.MouseButton1Click:Connect(function()
		if chatRuntime.chatId == "" then return end
		local ok = pcall(function()
			Services.GuiService:OpenBrowserWindow(
				"https://nexusrbx.com/ai?chat=" .. HttpService:UrlEncode(chatRuntime.chatId)
			)
		end)
		if not ok then showToast("Open nexusrbx.com to continue this conversation", "info") end
	end)
end

UI_HELPERS.footer = Instance.new("Frame")
UI_HELPERS.footer.Name = "Footer"
UI_HELPERS.footer.BackgroundTransparency = 1
UI_HELPERS.footer.Size = UDim2.new(1, 0, 0, 0)
UI_HELPERS.footer.AutomaticSize = Enum.AutomaticSize.Y
UI_HELPERS.footer.Parent = scrollRoot
do
	local footerList = Instance.new("UIListLayout")
	footerList.Padding = UDim.new(0, 8)
	footerList.SortOrder = Enum.SortOrder.LayoutOrder
	footerList.Parent = UI_HELPERS.footer
end
pullButton = makeButton(UI_HELPERS.footer, "PullButton", "Pull Latest", COLORS.primary)
disconnectButton = makeButton(UI_HELPERS.footer, "DisconnectButton", "Disconnect Studio", COLORS.error)

UI_HELPERS.toast = Instance.new("TextLabel")
UI_HELPERS.toast.Name = "Toast"
UI_HELPERS.toast.AnchorPoint = Vector2.new(0.5, 1)
UI_HELPERS.toast.Position = UDim2.new(0.5, 0, 1, -8)
UI_HELPERS.toast.Size = UDim2.new(1, -24, 0, 0)
UI_HELPERS.toast.AutomaticSize = Enum.AutomaticSize.Y
UI_HELPERS.toast.BackgroundColor3 = Color3.fromRGB(30, 32, 38)
UI_HELPERS.toast.BackgroundTransparency = 0.08
UI_HELPERS.toast.TextColor3 = Color3.fromRGB(255, 255, 255)
UI_HELPERS.toast.Font = Enum.Font.Gotham
UI_HELPERS.toast.TextSize = 12
UI_HELPERS.toast.TextWrapped = true
UI_HELPERS.toast.Visible = false
UI_HELPERS.toast.ZIndex = 20
UI_HELPERS.toast.Parent = root
applyCorner(UI_HELPERS.toast, 6)
applyStroke(UI_HELPERS.toast, COLORS.primary, 0.5)

UI_HELPERS.confirmOverlay = Instance.new("Frame")
UI_HELPERS.confirmOverlay.Name = "RestoreConfirmation"
UI_HELPERS.confirmOverlay.Size = UDim2.fromScale(1, 1)
UI_HELPERS.confirmOverlay.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
UI_HELPERS.confirmOverlay.BackgroundTransparency = 0.35
UI_HELPERS.confirmOverlay.Visible = false
UI_HELPERS.confirmOverlay.ZIndex = 10
UI_HELPERS.confirmOverlay.Parent = root

UI_HELPERS.confirmSheet = Instance.new("Frame")
UI_HELPERS.confirmSheet.Name = "Sheet"
UI_HELPERS.confirmSheet.AnchorPoint = Vector2.new(0.5, 0.5)
UI_HELPERS.confirmSheet.Position = UDim2.fromScale(0.5, 0.52)
UI_HELPERS.confirmSheet.Size = UDim2.new(1, -32, 0, 0)
UI_HELPERS.confirmSheet.AutomaticSize = Enum.AutomaticSize.Y
UI_HELPERS.confirmSheet.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.MainBackground)
UI_HELPERS.confirmSheet.ZIndex = 11
UI_HELPERS.confirmSheet.Parent = UI_HELPERS.confirmOverlay
applyCorner(UI_HELPERS.confirmSheet, 6)
applyStroke(UI_HELPERS.confirmSheet)
local sheetPadding = Instance.new("UIPadding")
sheetPadding.PaddingTop = UDim.new(0, 12)
sheetPadding.PaddingBottom = UDim.new(0, 12)
sheetPadding.PaddingLeft = UDim.new(0, 12)
sheetPadding.PaddingRight = UDim.new(0, 12)
sheetPadding.Parent = UI_HELPERS.confirmSheet
local sheetList = Instance.new("UIListLayout")
sheetList.Padding = UDim.new(0, 8)
sheetList.SortOrder = Enum.SortOrder.LayoutOrder
sheetList.Parent = UI_HELPERS.confirmSheet
makeText(UI_HELPERS.confirmSheet, "ConfirmTitle", "Restore snapshots?", 22, 14, true)
UI_HELPERS.confirmCopy = makeText(UI_HELPERS.confirmSheet, "ConfirmCopy", "This restores selected local snapshots from NexusRBX changes.", 38, 12, false, themeColor(Enum.StudioStyleGuideColor.DimmedText))
UI_HELPERS.confirmCopy.TextWrapped = true
-- By default restore keeps instances the user edited after the agent's write.
-- This toggle forces a full revert. State is stored on confirmRestoreButton so no
-- extra module-scope local is needed. Wrapped in a do-block to keep its locals
-- off the bundler's top-level budget.
do
	local forceToggleButton = makeButton(UI_HELPERS.confirmSheet, "ForceToggle", "Also revert my edits: OFF", themeColor(Enum.StudioStyleGuideColor.Button))
	forceToggleButton.MouseButton1Click:Connect(function()
		local nextValue = confirmRestoreButton:GetAttribute("ForceRestore") ~= true
		confirmRestoreButton:SetAttribute("ForceRestore", nextValue)
		local baseColor = nextValue and COLORS.warning or themeColor(Enum.StudioStyleGuideColor.Button)
		forceToggleButton:SetAttribute("BaseColor", baseColor)
		forceToggleButton.BackgroundColor3 = baseColor
		forceToggleButton.Text = nextValue and "Also revert my edits: ON" or "Also revert my edits: OFF"
	end)
end
local confirmRow = makeRow(UI_HELPERS.confirmSheet, "ConfirmActions", 34)
confirmRestoreButton = makeButton(confirmRow, "ConfirmRestoreButton", "Restore", COLORS.accent)
confirmRestoreButton.Size = UDim2.new(0.5, -4, 0, 34)
cancelRestoreButton = makeButton(confirmRow, "CancelRestoreButton", "Cancel", themeColor(Enum.StudioStyleGuideColor.Button))
cancelRestoreButton.Size = UDim2.new(0.5, -4, 0, 34)

UI_HELPERS.approvalOverlay = Instance.new("Frame")
UI_HELPERS.approvalOverlay.Name = "ApprovalOverlay"
UI_HELPERS.approvalOverlay.Size = UDim2.fromScale(1, 1)
UI_HELPERS.approvalOverlay.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
UI_HELPERS.approvalOverlay.BackgroundTransparency = 0.35
UI_HELPERS.approvalOverlay.Visible = false
UI_HELPERS.approvalOverlay.ZIndex = 12
UI_HELPERS.approvalOverlay.Parent = root

UI_HELPERS.approvalSheet = Instance.new("Frame")
UI_HELPERS.approvalSheet.Name = "ApprovalSheet"
UI_HELPERS.approvalSheet.AnchorPoint = Vector2.new(0.5, 0.5)
UI_HELPERS.approvalSheet.Position = UDim2.fromScale(0.5, 0.5)
UI_HELPERS.approvalSheet.Size = UDim2.new(1, -32, 0, 0)
UI_HELPERS.approvalSheet.AutomaticSize = Enum.AutomaticSize.Y
UI_HELPERS.approvalSheet.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.MainBackground)
UI_HELPERS.approvalSheet.ZIndex = 13
UI_HELPERS.approvalSheet.Parent = UI_HELPERS.approvalOverlay
applyCorner(UI_HELPERS.approvalSheet, 6)
applyStroke(UI_HELPERS.approvalSheet)
local approvalPadding = Instance.new("UIPadding")
approvalPadding.PaddingTop = UDim.new(0, 12)
approvalPadding.PaddingBottom = UDim.new(0, 12)
approvalPadding.PaddingLeft = UDim.new(0, 12)
approvalPadding.PaddingRight = UDim.new(0, 12)
approvalPadding.Parent = UI_HELPERS.approvalSheet
local approvalList = Instance.new("UIListLayout")
approvalList.Padding = UDim.new(0, 8)
approvalList.SortOrder = Enum.SortOrder.LayoutOrder
approvalList.Parent = UI_HELPERS.approvalSheet
makeText(UI_HELPERS.approvalSheet, "ApprovalTitle", "Review command", 22, 14, true)
approvalCopy = makeText(UI_HELPERS.approvalSheet, "ApprovalCopy", "", nil, 12, false, themeColor(Enum.StudioStyleGuideColor.DimmedText), true)
approvalCopy.TextWrapped = true
local approvalRow = makeRow(UI_HELPERS.approvalSheet, "ApprovalActions", 34)
approvalConfirmButton = makeButton(approvalRow, "ApprovalConfirm", "Apply", COLORS.primary)
approvalConfirmButton.Size = UDim2.new(0.5, -4, 0, 34)
approvalDeclineButton = makeButton(approvalRow, "ApprovalDecline", "Decline", COLORS.error)
approvalDeclineButton.Size = UDim2.new(0.5, -4, 0, 34)

UI_HELPERS.onboardingOverlay = Instance.new("Frame")
UI_HELPERS.onboardingOverlay.Name = "OnboardingOverlay"
UI_HELPERS.onboardingOverlay.Size = UDim2.fromScale(1, 1)
UI_HELPERS.onboardingOverlay.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
UI_HELPERS.onboardingOverlay.BackgroundTransparency = 0.35
UI_HELPERS.onboardingOverlay.Visible = false
UI_HELPERS.onboardingOverlay.ZIndex = 14
UI_HELPERS.onboardingOverlay.Active = false
UI_HELPERS.onboardingOverlay.Parent = root

UI_HELPERS.onboardingSheet = Instance.new("Frame")
UI_HELPERS.onboardingSheet.Name = "OnboardingSheet"
UI_HELPERS.onboardingSheet.AnchorPoint = Vector2.new(0.5, 0.5)
UI_HELPERS.onboardingSheet.Position = UDim2.fromScale(0.5, 0.5)
UI_HELPERS.onboardingSheet.Size = UDim2.new(1, -32, 0, 0)
UI_HELPERS.onboardingSheet.AutomaticSize = Enum.AutomaticSize.Y
UI_HELPERS.onboardingSheet.BackgroundColor3 = themeColor(Enum.StudioStyleGuideColor.MainBackground)
UI_HELPERS.onboardingSheet.ZIndex = 15
UI_HELPERS.onboardingSheet.Parent = UI_HELPERS.onboardingOverlay
applyCorner(UI_HELPERS.onboardingSheet, 6)
applyStroke(UI_HELPERS.onboardingSheet)
local onboardingPadding = Instance.new("UIPadding")
onboardingPadding.PaddingTop = UDim.new(0, 14)
onboardingPadding.PaddingBottom = UDim.new(0, 14)
onboardingPadding.PaddingLeft = UDim.new(0, 14)
onboardingPadding.PaddingRight = UDim.new(0, 14)
onboardingPadding.Parent = UI_HELPERS.onboardingSheet
local onboardingList = Instance.new("UIListLayout")
onboardingList.Padding = UDim.new(0, 10)
onboardingList.SortOrder = Enum.SortOrder.LayoutOrder
onboardingList.Parent = UI_HELPERS.onboardingSheet
makeText(UI_HELPERS.onboardingSheet, "OnboardingTitle", "Welcome to NexusRBX", 24, 15, true)
local onboardingCopy = makeText(
	UI_HELPERS.onboardingSheet,
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
onboardingDismissButton = makeButton(UI_HELPERS.onboardingSheet, "OnboardingDismiss", "Got it", COLORS.primary)

function UI_HELPERS.formatTime(ts)
	if not ts then
		return "--:--"
	end
	return os.date("%H:%M:%S", ts)
end

-- Map legacy free-text status strings onto the structured state machine so old
-- call sites keep working without ever mislabeling the connection.
function UI_HELPERS.stateFromLegacy(text)
	local lowered = string.lower(tostring(text or ""))
	if string.find(lowered, "wrong place") or string.find(lowered, "target changed") then
		return "target_changed"
	elseif string.find(lowered, "target stale") then
		return "target_stale"
	elseif string.find(lowered, "confirming") or string.find(lowered, "reconcil") then
		return "reconciling"
	elseif string.find(lowered, "expired") then
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

function UI_HELPERS.clearErrorBanner()
	lastErrorText = nil
	diagnosticsOpen = false
	banner.Visible = false
	banner.Text = ""
	banner.Size = UDim2.new(1, 0, 0, 0)
end

function UI_HELPERS.setBanner(kind, text)
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

function UI_HELPERS.getApprovalModeEnabled()
	return plugin:GetSetting("nexusrbxApprovalMode") == true
end

function UI_HELPERS.refreshApprovalToggle()
	local enabled = UI_HELPERS.getApprovalModeEnabled()
	approvalToggleButton:SetAttribute("BaseColor", enabled and COLORS.warning or themeColor(Enum.StudioStyleGuideColor.Button))
	approvalToggleButton.BackgroundColor3 = approvalToggleButton:GetAttribute("BaseColor")
	approvalToggleButton.Text = enabled and "Automatic apply: OFF" or "Automatic apply: ON"
end

function UI_HELPERS.rebuildSnapshotList()
	for _, child in ipairs(UI_HELPERS.snapshotList:GetChildren()) do
		if child:IsA("Frame") then
			child:Destroy()
		end
	end
	selectedSnapshotIds = {}
	if #localSnapshots == 0 then
		UI_HELPERS.snapshotScroll.Visible = false
		return
	end
	UI_HELPERS.snapshotScroll.Visible = true
	for index, snap in ipairs(localSnapshots) do
		if type(snap) ~= "table" then
			continue
		end
		local row = Instance.new("Frame")
		row.Name = "SnapshotRow" .. tostring(index)
		row.Size = UDim2.new(1, 0, 0, 0)
		row.AutomaticSize = Enum.AutomaticSize.Y
		row.BackgroundTransparency = 1
		row.Parent = UI_HELPERS.snapshotList
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
			-- Explicit per-row restore is a clear intent, so force it past the
			-- keep-my-edits guard.
			local ok, resultOrError = pcall(function()
				return restoreSnapshots({ snapshots = { snap }, force = true })
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
	-- The default plugin is chat, not a dashboard. Settings is a temporary
	-- secondary surface opened from the header.
	tabBar.Visible = false
	UI_HELPERS.pairSection.Visible = not paired
	UI_HELPERS.agentSection.Visible = false
	UI_HELPERS.manifestSection.Visible = false
	conversationSection.Visible = paired and not chatRuntime.settingsOpen
	if promptSection then
		promptSection.Visible = paired and not chatRuntime.settingsOpen
	end
	UI_HELPERS.activitySection.Visible = false
	UI_HELPERS.safetySection.Visible = paired and chatRuntime.settingsOpen
	UI_HELPERS.settingsSection.Visible = paired and chatRuntime.settingsOpen
	UI_HELPERS.footer.Visible = paired and chatRuntime.settingsOpen
	local composerReserve = promptSection and promptSection.Visible and (promptSection.Size.Y.Offset + 24) or 0
	scroll.Position = UDim2.new(0, 0, 0, 53)
	scroll.Size = UDim2.new(1, 0, 1, -(53 + composerReserve))
	if paired and conversationSection:GetAttribute("HistoryLoaded") ~= true then
		task.spawn(function()
			bootstrapStudioConversation(false)
		end)
	elseif not paired then
		conversationSection:SetAttribute("HistoryLoaded", false)
	end
	local cleanCode = string.upper((codeBox.Text or ""):gsub("%s+", ""))
	setButtonEnabled(pairButton, (not paired) and (not busy) and cleanCode ~= "", busy and "Signing in..." or "Continue")
	setButtonEnabled(pullButton, paired and (not busy), busy and "Working..." or "Pull Latest")
	local hasSnapshots = #localSnapshots > 0
	setButtonEnabled(restoreButton, paired and (not busy) and hasSnapshots, hasSnapshots and "Restore All Snapshots" or "No Snapshots Yet")
	local hasBatch = type(lastBatchSnapshots) == "table" and #lastBatchSnapshots > 0
	setButtonEnabled(undoBatchButton, paired and (not busy) and hasBatch, hasBatch and "Undo Last Batch" or "No Batch To Undo")
	setButtonEnabled(disconnectButton, paired and (not busy), busy and "Command Running" or "Disconnect Studio")
	if nexusHeader then
		nexusHeader.indicator.BackgroundColor3 = paired and BRIDGE_STATES[currentBridgeState].color or COLORS.muted
		nexusHeader.settings.TextColor3 = chatRuntime.settingsOpen and Color3.fromRGB(255, 255, 255) or COLORS.textMuted
	end
	UI_HELPERS.refreshApprovalToggle()
end

nexusHeader.settings.MouseButton1Click:Connect(function()
	chatRuntime.settingsOpen = not chatRuntime.settingsOpen
	refreshControls()
	if not chatRuntime.settingsOpen then scrollNexusChatToBottom(scroll) end
end)

-- Restyle the tab buttons for the active view, persist the choice, and refresh
-- section visibility. Assigned to the forward-declared `setActiveTab` upvalue so
-- the tab button click handlers created earlier can call it.
function setActiveTab(name)
	if not tabButtons[name] then
		name = "Chat"
	end
	activeTab = name
	pcall(function()
		plugin:SetSetting("nexusrbxActiveTab", name)
	end)
	for tabName, tabButton in pairs(tabButtons) do
		local isActive = tabName == name
		local baseColor = isActive and COLORS.accent or themeColor(Enum.StudioStyleGuideColor.Button)
		tabButton:SetAttribute("BaseColor", baseColor)
		TweenService:Create(tabButton, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { BackgroundColor3 = baseColor }):Play()
		tabButton.TextColor3 = isActive and Color3.fromRGB(255, 255, 255) or themeColor(Enum.StudioStyleGuideColor.DimmedText)
	end
	refreshControls()
end

do
	local stored = nil
	pcall(function()
		stored = plugin:GetSetting("nexusrbxActiveTab")
	end)
	if type(stored) == "string" and tabButtons[stored] then
		activeTab = stored
	end
end

function UI_HELPERS.resizeStatusPill(label)
	local bounds = game:GetService("TextService"):GetTextSize(
		label,
		statusPill.TextSize,
		statusPill.Font,
		Vector2.new(512, STATUS_PILL_HEIGHT)
	)
	local width = math.ceil((STATUS_PILL_PAD * 2) + bounds.X)
	statusPill.Size = UDim2.new(0, math.max(STATUS_PILL_MIN_WIDTH, width), 0, STATUS_PILL_HEIGHT)
end

-- Central state setter. `state` is one of BRIDGE_STATES keys.
function setBridgeState(state, detail)
	local key = BRIDGE_STATES[state] and state or "unpaired"
	local def = BRIDGE_STATES[key]
	currentBridgeState = key
	statusPill.Text = def.label
	UI_HELPERS.resizeStatusPill(def.label)
	TweenService:Create(statusPill, TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { BackgroundColor3 = def.color }):Play()
	if nexusHeader then
		TweenService:Create(nexusHeader.indicator, TweenInfo.new(0.16), { BackgroundColor3 = def.color }):Play()
	end
	if detail ~= nil and tostring(detail) ~= "" and (key == "working" or key == "degraded" or key == "reconciling" or key == "target_changed" or key == "target_stale") then
		activeLabel.Text = "Active tool: " .. tostring(detail)
	end
	refreshControls()
end

function setStatus(text)
	setBridgeState(UI_HELPERS.stateFromLegacy(text), text)
end

function setPollingPulse(active)
	pollingActive = active == true
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

function setConnectionDiagnostics(summary)
	if type(summary) ~= "table" then return end
	local target = type(summary.target) == "table" and summary.target or {}
	local freshness = type(summary.freshness) == "table" and summary.freshness or {}
	local function freshnessText(channel)
		local entry = freshness[channel]
		if type(entry) ~= "table" or entry.at == nil then return "--" end
		local age = math.max(0, os.time() - (tonumber(entry.at) or os.time()))
		local latency = entry.latencyMs and ("/" .. tostring(math.floor(entry.latencyMs)) .. "ms") or ""
		if entry.ok ~= true then return "failed " .. tostring(age) .. "s" end
		return tostring(age) .. "s" .. latency
	end
	if studioFreshnessLabel then
		studioFreshnessLabel.Text = ("Heartbeat %s · Commands %s · Place %s"):format(
			freshnessText("heartbeat"), freshnessText("poll"), freshnessText("attestation")
		)
	end
	if studioTargetLabel then
		local identity = tostring(target.placeName or "Open Studio game")
		if target.targetBound and target.targetReady == false then
			studioTargetLabel.Text = "Blocked · " .. identity
			studioTargetLabel.TextColor3 = COLORS.error
		elseif target.targetBound then
			studioTargetLabel.Text = "Ready · " .. identity
			studioTargetLabel.TextColor3 = COLORS.success
		else
			studioTargetLabel.Text = "Open · " .. identity .. " · awaiting website target"
			studioTargetLabel.TextColor3 = COLORS.muted
		end
	end
	if target.targetBound and target.targetReady == false and currentBridgeState ~= "working" then
		setBridgeState("target_changed", target.detail or "Website target does not match this open place")
	end
end

function setMcpCompanionStatus(summary)
	if not mcpCompanionLabel or not mcpCompanionHelpLabel or type(summary) ~= "table" then return end
	local state = tostring(summary.state or "not_configured")
	local labels = {
		not_configured = "Not configured",
		connector_offline = "Offline",
		studio_mcp_unavailable = "Unavailable",
		ready = "Ready",
	}
	local colors = {
		not_configured = COLORS.muted,
		connector_offline = COLORS.warning,
		studio_mcp_unavailable = COLORS.warning,
		ready = COLORS.success,
	}
	local help = {
		not_configured = "Recommended for the best Nexus experience. The Studio plugin remains fully available.",
		connector_offline = "The enhanced connection is offline. Nexus will continue through the Studio plugin.",
		studio_mcp_unavailable = "The enhanced connection is unavailable. Nexus will continue through the Studio plugin.",
		ready = "The enhanced connection is ready.",
	}
	local commandCount = tonumber(summary.supportedCommandCount) or 0
	mcpCompanionLabel.Text = labels[state] or "Unavailable"
	mcpCompanionLabel.TextColor3 = colors[state] or COLORS.muted
	mcpCompanionHelpLabel.Text = help[state] or "The Studio connection remains available while Nexus reconnects enhanced features."
end

function UI_HELPERS.errorHelpFor(value)
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
	elseif string.find(lowered, "attempt to call a nil value") then
		return "Plugin bundle is outdated. Run npm run plugin:install from the repo, restart Studio, and try again."
	elseif string.find(lowered, "cloud_") then
		return "A Creator Store copy of this plugin may still be enabled. Plugins -> Manage Plugins -> disable the NexusRBX cloud plugin, use only the local install from npm run plugin:install, then restart Studio."
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
		local hint = UI_HELPERS.errorHelpFor(value)
		lastErrorText = hint and (value .. "\n" .. hint) or value
		UI_HELPERS.setBanner("error", value .. "  ·  Click for details")
	elseif string.find(string.lower(value), "succeeded") or string.find(string.lower(value), "studio paired") or string.find(string.lower(value), "restore complete") or string.find(string.lower(value), "restored snapshot") then
		UI_HELPERS.setBanner("success", value)
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
	if commandType ~= "agent_prompt" and commandType ~= "pair" and chatRuntime.streaming and chatRuntime.messageId ~= "" then
		local friendly, chatState = friendlyStudioActivity(commandType, entry.label, status)
		updateChatMessage(chatRuntime.messageId, nil, chatState, friendly)
	end
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
		UI_HELPERS.formatTime(entry.at or os.time()),
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
	row.Parent = UI_HELPERS.feedList

	local entries = {}
	for _, child in ipairs(UI_HELPERS.feedList:GetChildren()) do
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
	UI_HELPERS.toast.Text = "  " .. text .. "  "
	UI_HELPERS.toast.BackgroundColor3 = kind == "error" and COLORS.error or (kind == "success" and COLORS.success or Color3.fromRGB(30, 32, 38))
	UI_HELPERS.toast.Visible = true
	UI_HELPERS.toast.BackgroundTransparency = 0.08
	TweenService:Create(UI_HELPERS.toast, TweenInfo.new(0.15), { BackgroundTransparency = 0 }):Play()
	task.delay(3.5, function()
		if UI_HELPERS.toast.Text:find(text, 1, true) then
			local fade = TweenService:Create(UI_HELPERS.toast, TweenInfo.new(0.25), { BackgroundTransparency = 1 })
			fade:Play()
			fade.Completed:Connect(function()
				UI_HELPERS.toast.Visible = false
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
	UI_HELPERS.rebuildSnapshotList()
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
	UI_HELPERS.confirmCopy.Text = ("Restore all %d local snapshot(s)? Edits you made after the agent's changes are kept unless you turn on full revert."):format(#localSnapshots)
	-- Reset the force toggle each time the sheet opens.
	confirmRestoreButton:SetAttribute("ForceRestore", false)
	local forceToggleButton = UI_HELPERS.confirmSheet:FindFirstChild("ForceToggle")
	if forceToggleButton then
		local baseColor = themeColor(Enum.StudioStyleGuideColor.Button)
		forceToggleButton:SetAttribute("BaseColor", baseColor)
		forceToggleButton.BackgroundColor3 = baseColor
		forceToggleButton.Text = "Also revert my edits: OFF"
	end
	UI_HELPERS.confirmOverlay.Visible = true
	return true
end

function hideRestoreConfirmation()
	UI_HELPERS.confirmOverlay.Visible = false
end

-- Render the same-place collaborators list into the Connect tab.
function updateCollaborators(list)
	if not collaboratorsLabel then
		return
	end
	if type(list) ~= "table" or #list == 0 then
		collaboratorsLabel.Text = "Collaborators: none on this place"
		return
	end
	local parts = {}
	for _, collaborator in ipairs(list) do
		local who = tostring(collaborator.label or "collaborator")
		local paths = ""
		if type(collaborator.activePaths) == "table" and #collaborator.activePaths > 0 then
			paths = " - " .. tostring(collaborator.activePaths[1])
			if #collaborator.activePaths > 1 then
				paths = paths .. (" (+%d)"):format(#collaborator.activePaths - 1)
			end
		end
		table.insert(parts, "- " .. who .. paths)
		if #parts >= 5 then
			break
		end
	end
	collaboratorsLabel.Text = ("<b>Collaborators (%d)</b>\n%s"):format(#list, table.concat(parts, "\n"))
end

function UI_HELPERS.describeAffectedPaths(command)
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
	local approvalId = "approval-" .. tostring(command.id or HttpService:GenerateGUID(false))
	pendingApproval = {
		command = command,
		resolved = false,
		approved = false,
		messageId = approvalId,
	}
	local commandType = tostring(command.type or "command")
	local label = tostring(command.label or commandType)
	local runText = command.runId and ("\nRun: " .. tostring(command.runId)) or ""
	local stepText = command.stepId and ("\nStep: " .. tostring(command.stepId)) or ""
	local paths = UI_HELPERS.describeAffectedPaths(command)
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
	local summary = "Review before applying " .. label .. "."
	if #paths > 0 then
		summary = summary .. " This affects " .. tostring(#paths) .. " item(s)."
	end
	local message = appendChatMessage(approvalId, "assistant", summary, "working", "Approval required")
	local bubble = message:FindFirstChild("Bubble") or message
	if not bubble:FindFirstChild("ApprovalActions") then
		local actions = makeRow(bubble, "ApprovalActions", 36)
		local applyButton = makeButton(actions, "Apply", "Apply", COLORS.primary, true)
		applyButton.Size = UDim2.new(0.5, -4, 0, 36)
		local declineButton = makeButton(actions, "Decline", "Decline", COLORS.surfaceRaised, true)
		declineButton.Size = UDim2.new(0.5, -4, 0, 36)
		applyButton.MouseButton1Click:Connect(function()
			if pendingApproval and pendingApproval.messageId == approvalId then
				pendingApproval.approved = true
				pendingApproval.resolved = true
			end
		end)
		declineButton.MouseButton1Click:Connect(function()
			if pendingApproval and pendingApproval.messageId == approvalId then
				pendingApproval.approved = false
				pendingApproval.resolved = true
			end
		end)
	end
	UI_HELPERS.approvalOverlay.Visible = false
	setActiveTab("Chat")
end

function hideApprovalGate()
	UI_HELPERS.approvalOverlay.Visible = false
	if pendingApproval and pendingApproval.messageId then
		local message = updateChatMessage(
			pendingApproval.messageId,
			nil,
			pendingApproval.approved and "completed" or "failed",
			pendingApproval.approved and "Approved" or "Declined"
		)
		local bubble = message and (message:FindFirstChild("Bubble") or message)
		local actions = bubble and bubble:FindFirstChild("ApprovalActions")
		if actions then actions.Visible = false end
	end
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
	return UI_HELPERS.getApprovalModeEnabled()
end

function handleSessionExpired(reason)
	setToken(nil)
	plugin:SetSetting("nexusrbxStudioSessionId", nil)
	local replaced = reason == "replaced"
	setStatus(replaced and "replaced by another Studio" or "session expired - re-pair")
	setLast(replaced and "Another Studio became active for this account" or "session expired - enter a new pairing code")
	UI_HELPERS.setBanner("error", replaced and "This session was replaced. Pair again to make this Studio active." or "Session expired. Pair Studio again from the website.")
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
	local nextValue = not UI_HELPERS.getApprovalModeEnabled()
	plugin:SetSetting("nexusrbxApprovalMode", nextValue)
	UI_HELPERS.refreshApprovalToggle()
	showToast(nextValue and "Automatic apply disabled" or "Automatic apply enabled", "info")
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
		local keptText = (resultOrError.kept or 0) > 0 and (", %d kept (you edited them)"):format(resultOrError.kept) or ""
		setLast(("undo batch complete: %d restored, %d removed%s"):format(resultOrError.restored or 0, resultOrError.removed or 0, keptText))
		pushActivity({ commandType = "undo_last_batch", status = "succeeded", detail = tostring(#batch) .. " snapshots" .. keptText })
		showToast((resultOrError.kept or 0) > 0 and ("Batch undone; kept %d of your edits"):format(resultOrError.kept) or "Batch undone", "success")
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
		UI_HELPERS.clearErrorBanner()
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
	UI_HELPERS.onboardingOverlay.Visible = true
end

function hideOnboarding()
	UI_HELPERS.onboardingOverlay.Visible = false
	plugin:SetSetting("nexusrbxOnboardingSeen", true)
end

checkSetupButton.MouseButton1Click:Connect(function()
	if checkSetupButton:GetAttribute("NexusEnabled") ~= true then
		return
	end
	runSetupCheck()
end)

onboardingDismissButton.MouseButton1Click:Connect(hideOnboarding)

UI_HELPERS.refreshApprovalToggle()
setActiveTab(activeTab)
