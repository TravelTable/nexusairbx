-- Minimal Nexus header: game context, live state, conversation affordances,
-- and settings. Technical identifiers stay out of the primary surface.

local function nexusHeaderButton(parent, name, text, x)
	local button = Instance.new("TextButton")
	button.Name = name
	button.AnchorPoint = Vector2.new(1, 0)
	button.Position = UDim2.new(1, x, 0, 5)
	button.Size = UDim2.new(0, 28, 0, 28)
	button.BackgroundTransparency = 1
	button.BorderSizePixel = 0
	button.Font = Enum.Font.GothamBold
	button.TextSize = 15
	button.TextColor3 = Color3.fromRGB(185, 186, 192)
	button.Text = text
	button.Parent = parent
	return button
end

function createNexusPluginHeader(parent, colors)
	colors = colors or {}
	local header = Instance.new("Frame")
	header.Name = "PluginHeader"
	header.Size = UDim2.new(1, 0, 0, 52)
	header.BackgroundColor3 = colors.canvas or Color3.fromRGB(17, 18, 20)
	header.BorderSizePixel = 0
	header.Parent = parent

	local title = Instance.new("TextLabel")
	title.Name = "NexusTitle"
	title.Position = UDim2.new(0, 12, 0, 7)
	title.Size = UDim2.new(1, -132, 0, 19)
	title.BackgroundTransparency = 1
	title.Font = Enum.Font.GothamBold
	title.TextSize = 15
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.TextColor3 = colors.text or Color3.fromRGB(239, 239, 236)
	title.Text = "Nexus"
	title.Parent = header

	local gameLabel = Instance.new("TextLabel")
	gameLabel.Name = "GameName"
	gameLabel.Position = UDim2.new(0, 12, 0, 27)
	gameLabel.Size = UDim2.new(1, -132, 0, 16)
	gameLabel.BackgroundTransparency = 1
	gameLabel.Font = Enum.Font.Gotham
	gameLabel.TextSize = 10
	gameLabel.TextXAlignment = Enum.TextXAlignment.Left
	gameLabel.TextTruncate = Enum.TextTruncate.AtEnd
	gameLabel.TextColor3 = colors.muted or Color3.fromRGB(158, 160, 168)
	gameLabel.Text = tostring(game.Name or "Studio game")
	gameLabel.Parent = header

	local indicator = Instance.new("Frame")
	indicator.Name = "ConnectionIndicator"
	indicator.AnchorPoint = Vector2.new(1, 0)
	indicator.Position = UDim2.new(1, -74, 0, 15)
	indicator.Size = UDim2.new(0, 7, 0, 7)
	indicator.BackgroundColor3 = colors.muted or Color3.fromRGB(108, 117, 125)
	indicator.BorderSizePixel = 0
	indicator.Parent = header
	local indicatorCorner = Instance.new("UICorner")
	indicatorCorner.CornerRadius = UDim.new(1, 0)
	indicatorCorner.Parent = indicator

	local newChat = nexusHeaderButton(header, "NewChat", "+", -38)
	local settings = nexusHeaderButton(header, "Settings", "•••", -6)
	settings.TextSize = 11

	local border = Instance.new("Frame")
	border.Name = "HeaderBorder"
	border.AnchorPoint = Vector2.new(0, 1)
	border.Position = UDim2.new(0, 0, 1, 0)
	border.Size = UDim2.new(1, 0, 0, 1)
	border.BackgroundColor3 = colors.border or Color3.fromRGB(52, 54, 61)
	border.BackgroundTransparency = 0.45
	border.BorderSizePixel = 0
	border.Parent = header

	return {
		root = header,
		gameLabel = gameLabel,
		indicator = indicator,
		newChat = newChat,
		settings = settings,
	}
end
