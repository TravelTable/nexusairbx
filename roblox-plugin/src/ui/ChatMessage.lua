-- Incremental chat message renderer. Messages update in place while streaming,
-- so token deltas do not rebuild the conversation tree.

local function nexusChatAddCorner(parent, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = parent
end

local function nexusChatAddPadding(parent, amount)
	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, amount)
	padding.PaddingBottom = UDim.new(0, amount)
	padding.PaddingLeft = UDim.new(0, amount)
	padding.PaddingRight = UDim.new(0, amount)
	padding.Parent = parent
end

function createNexusChatMessage(container, options)
	options = options or {}
	local role = tostring(options.role or "assistant")
	local colors = options.colors or {}
	local row = Instance.new("Frame")
	row.Name = "ChatMessage"
	row:SetAttribute("ChatMessageId", tostring(options.id or HttpService:GenerateGUID(false)))
	row:SetAttribute("ChatRole", role)
	row.Size = UDim2.new(1, 0, 0, 0)
	row.AutomaticSize = Enum.AutomaticSize.Y
	row.BackgroundTransparency = 1
	row.BorderSizePixel = 0
	row.Parent = container

	local bubble = Instance.new("Frame")
	bubble.Name = "Bubble"
	bubble.Size = role == "user" and UDim2.new(0.88, 0, 0, 0) or UDim2.new(1, 0, 0, 0)
	bubble.Position = role == "user" and UDim2.new(0.12, 0, 0, 0) or UDim2.new()
	bubble.AutomaticSize = Enum.AutomaticSize.Y
	bubble.BackgroundColor3 = role == "user" and (colors.user or Color3.fromRGB(49, 36, 75))
		or (role == "event" and (colors.raised or Color3.fromRGB(29, 30, 35)) or (colors.canvas or Color3.fromRGB(17, 18, 20)))
	bubble.BackgroundTransparency = role == "assistant" and 1 or (role == "event" and 0.18 or 0)
	bubble.BorderSizePixel = 0
	bubble.Parent = row
	nexusChatAddCorner(bubble, role == "user" and 9 or 6)
	nexusChatAddPadding(bubble, role == "event" and 7 or 9)

	local layout = Instance.new("UIListLayout")
	layout.Padding = UDim.new(0, 4)
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Parent = bubble

	local author = Instance.new("TextLabel")
	author.Name = "Author"
	author.Size = UDim2.new(1, 0, 0, 15)
	author.BackgroundTransparency = 1
	author.Font = Enum.Font.GothamBold
	author.TextSize = 10
	author.TextXAlignment = Enum.TextXAlignment.Left
	author.TextColor3 = role == "assistant" and (colors.accentText or Color3.fromRGB(189, 166, 242))
		or (colors.muted or Color3.fromRGB(158, 160, 168))
	author.Text = role == "user" and "You" or (role == "event" and "Studio" or "Nexus")
	author.Parent = bubble

	local body = Instance.new("TextLabel")
	body.Name = "Body"
	body.Size = UDim2.new(1, 0, 0, 0)
	body.AutomaticSize = Enum.AutomaticSize.Y
	body.BackgroundTransparency = 1
	body.Font = Enum.Font.Gotham
	body.TextSize = role == "event" and 11 or 13
	body.TextXAlignment = Enum.TextXAlignment.Left
	body.TextYAlignment = Enum.TextYAlignment.Top
	body.TextWrapped = true
	body.RichText = false
	body.TextColor3 = colors.text or Color3.fromRGB(239, 239, 236)
	body.Text = tostring(options.content or "")
	body.Parent = bubble

	local status = Instance.new("TextLabel")
	status.Name = "Status"
	status.Size = UDim2.new(1, 0, 0, 0)
	status.AutomaticSize = Enum.AutomaticSize.Y
	status.BackgroundTransparency = 1
	status.Font = Enum.Font.Gotham
	status.TextSize = 10
	status.TextXAlignment = Enum.TextXAlignment.Left
	status.TextWrapped = true
	status.TextColor3 = options.failed and (colors.error or Color3.fromRGB(225, 86, 96))
		or (colors.muted or Color3.fromRGB(158, 160, 168))
	status.Text = tostring(options.status or "")
	status.Visible = status.Text ~= ""
	status.Parent = bubble
	return row
end

function updateNexusChatMessage(message, options)
	if not message then return nil end
	options = options or {}
	local bubble = message:FindFirstChild("Bubble") or message
	local body = bubble:FindFirstChild("Body")
	local status = bubble:FindFirstChild("Status")
	if body and options.content ~= nil then
		body.Text = tostring(options.content)
	end
	if body and options.delta ~= nil then
		body.Text = body.Text .. tostring(options.delta)
	end
	if status and options.status ~= nil then
		status.Text = tostring(options.status)
		status.Visible = status.Text ~= ""
		if options.statusColor then status.TextColor3 = options.statusColor end
	end
	return message
end

function nexusChatNearBottom(scroller, threshold)
	if not scroller then return true end
	local remaining = scroller.AbsoluteCanvasSize.Y - scroller.AbsoluteSize.Y - scroller.CanvasPosition.Y
	return remaining <= (tonumber(threshold) or 72)
end

function scrollNexusChatToBottom(scroller)
	if not scroller then return end
	task.defer(function()
		local maxY = math.max(0, scroller.AbsoluteCanvasSize.Y - scroller.AbsoluteSize.Y)
		scroller.CanvasPosition = Vector2.new(0, maxY)
	end)
end
