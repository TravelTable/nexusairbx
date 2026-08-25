-- Compact multiline composer shared by Plan, Ask, and Agent modes.

local function nexusComposerRounded(parent, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = parent
end

local function nexusComposerButton(parent, name, text, size, background, textColor)
	local button = Instance.new("TextButton")
	button.Name = name
	button.Size = size
	button.BackgroundColor3 = background
	button.BorderSizePixel = 0
	button.AutoButtonColor = false
	button.Font = Enum.Font.GothamBold
	button.TextSize = 11
	button.TextColor3 = textColor
	button.Text = text
	button.Parent = parent
	nexusComposerRounded(button, 6)
	return button
end

function createNexusComposer(parent, colors, initialMode)
	colors = colors or {}
	local composer = Instance.new("Frame")
	composer.Name = "Composer"
	composer.AnchorPoint = Vector2.new(0, 1)
	composer.Position = UDim2.new(0, 10, 1, -10)
	composer.Size = UDim2.new(1, -20, 0, 122)
	composer.BackgroundColor3 = colors.surface or Color3.fromRGB(24, 25, 29)
	composer.BorderSizePixel = 0
	composer.ZIndex = 5
	composer.Parent = parent
	nexusComposerRounded(composer, 10)
	local stroke = Instance.new("UIStroke")
	stroke.Color = colors.border or Color3.fromRGB(52, 54, 61)
	stroke.Transparency = 0.25
	stroke.Parent = composer

	local input = Instance.new("TextBox")
	input.Name = "PromptInput"
	input.Position = UDim2.new(0, 10, 0, 9)
	input.Size = UDim2.new(1, -20, 0, 58)
	input.BackgroundTransparency = 1
	input.ClearTextOnFocus = false
	input.MultiLine = true
	input.TextWrapped = true
	input.TextXAlignment = Enum.TextXAlignment.Left
	input.TextYAlignment = Enum.TextYAlignment.Top
	input.Font = Enum.Font.Gotham
	input.TextSize = 13
	input.TextColor3 = colors.text or Color3.fromRGB(239, 239, 236)
	input.PlaceholderColor3 = colors.muted or Color3.fromRGB(158, 160, 168)
	input.PlaceholderText = "Ask Nexus..."
	input.Text = ""
	input.ZIndex = 6
	input.Parent = composer

	local selection = Instance.new("TextButton")
	selection.Name = "SelectionChip"
	selection.Position = UDim2.new(0, 10, 0, 69)
	selection.Size = UDim2.new(1, -20, 0, 20)
	selection.BackgroundColor3 = colors.raised or Color3.fromRGB(32, 33, 38)
	selection.BorderSizePixel = 0
	selection.Font = Enum.Font.Gotham
	selection.TextSize = 10
	selection.TextColor3 = colors.muted or Color3.fromRGB(158, 160, 168)
	selection.TextXAlignment = Enum.TextXAlignment.Left
	selection.TextTruncate = Enum.TextTruncate.AtEnd
	selection.Text = ""
	selection.Visible = false
	selection.ZIndex = 6
	selection.Parent = composer
	nexusComposerRounded(selection, 5)
	local chipPadding = Instance.new("UIPadding")
	chipPadding.PaddingLeft = UDim.new(0, 7)
	chipPadding.PaddingRight = UDim.new(0, 7)
	chipPadding.Parent = selection

	local footer = Instance.new("Frame")
	footer.Name = "ComposerFooter"
	footer.AnchorPoint = Vector2.new(0, 1)
	footer.Position = UDim2.new(0, 8, 1, -8)
	footer.Size = UDim2.new(1, -16, 0, 26)
	footer.BackgroundTransparency = 1
	footer.ZIndex = 6
	footer.Parent = composer

	local modes = {}
	for index, mode in ipairs({ "Plan", "Ask", "Agent" }) do
		local button = nexusComposerButton(
			footer,
			"Mode" .. mode,
			mode,
			UDim2.new(0, 52, 1, 0),
			colors.raised or Color3.fromRGB(32, 33, 38),
			colors.muted or Color3.fromRGB(158, 160, 168)
		)
		button.Position = UDim2.new(0, (index - 1) * 56, 0, 0)
		button.ZIndex = 7
		modes[string.lower(mode)] = button
	end

	local send = nexusComposerButton(
		footer,
		"PromptSend",
		"↑",
		UDim2.new(0, 30, 1, 0),
		colors.primary or Color3.fromRGB(124, 58, 237),
		Color3.fromRGB(255, 255, 255)
	)
	send.AnchorPoint = Vector2.new(1, 0)
	send.Position = UDim2.new(1, 0, 0, 0)
	send.TextSize = 16
	send.ZIndex = 7

	local stop = nexusComposerButton(
		footer,
		"StopGeneration",
		"Stop",
		UDim2.new(0, 48, 1, 0),
		colors.raised or Color3.fromRGB(32, 33, 38),
		colors.text or Color3.fromRGB(239, 239, 236)
	)
	stop.AnchorPoint = Vector2.new(1, 0)
	stop.Position = UDim2.new(1, -36, 0, 0)
	stop.Visible = false
	stop.ZIndex = 7

	local controller = {
		root = composer,
		input = input,
		selection = selection,
		send = send,
		stop = stop,
		modeButtons = modes,
		mode = string.lower(tostring(initialMode or "agent")),
		onSubmit = nil,
		onStop = nil,
		onClearSelection = nil,
	}

	function controller:setMode(mode)
		local normalized = string.lower(tostring(mode or "agent"))
		if not modes[normalized] then normalized = "agent" end
		self.mode = normalized
		for name, button in pairs(modes) do
			local active = name == normalized
			button.BackgroundColor3 = active and (colors.primary or Color3.fromRGB(124, 58, 237))
				or (colors.raised or Color3.fromRGB(32, 33, 38))
			button.TextColor3 = active and Color3.fromRGB(255, 255, 255)
				or (colors.muted or Color3.fromRGB(158, 160, 168))
		end
	end

	function controller:setStreaming(streaming)
		self.send.Visible = streaming ~= true
		self.stop.Visible = streaming == true
		self.input.TextEditable = streaming ~= true
	end

	function controller:setSelection(label)
		local text = tostring(label or "")
		self.selection.Text = text ~= "" and ("  " .. text .. "   ×") or ""
		self.selection.Visible = text ~= ""
	end

	for name, button in pairs(modes) do
		button.MouseButton1Click:Connect(function()
			controller:setMode(name)
			pcall(function() plugin:SetSetting("nexusrbxChatMode", name) end)
		end)
	end
	selection.MouseButton1Click:Connect(function()
		if controller.onClearSelection then controller.onClearSelection() end
	end)
	send.MouseButton1Click:Connect(function()
		if controller.onSubmit then controller.onSubmit() end
	end)
	stop.MouseButton1Click:Connect(function()
		if controller.onStop then controller.onStop() end
	end)
	input.FocusLost:Connect(function(enterPressed)
		if enterPressed and controller.onSubmit then controller.onSubmit() end
	end)
	controller:setMode(controller.mode)
	return controller
end
