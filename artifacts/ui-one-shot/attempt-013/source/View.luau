local View = {}

local function fontFace(weight)
	return Font.new("rbxasset://fonts/families/Montserrat.json", weight, Enum.FontStyle.Normal)
end

local function applyShadow(guiObject)
	local ok, shadow = pcall(Instance.new, "UIShadow")
	if ok then
		shadow.Name = "Shadow"
		shadow.Color = Color3.fromRGB(4, 10, 20)
		shadow.Transparency = 0.42
		shadow.BlurRadius = UDim.new(0, 20)
		shadow.Offset = UDim2.fromOffset(0, 8)
		shadow.Parent = guiObject
		return shadow
	end
	return nil
end

local function makeCorner(parent, radius)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, radius)
	c.Parent = parent
	return c
end

local function makeStroke(parent, color, thickness, transparency)
	local s = Instance.new("UIStroke")
	s.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	s.Color = color
	s.Thickness = thickness or 1
	s.Transparency = transparency or 0
	s.Parent = parent
	return s
end

local function makeGradient(parent, rotation, colors, transparency)
	local g = Instance.new("UIGradient")
	g.Rotation = rotation or 90
	g.Color = colors
	if transparency then
		g.Transparency = transparency
	end
	g.Parent = parent
	return g
end

local function createTextLabel(name, parent, text, size, weight, color, transparency)
	local label = Instance.new("TextLabel")
	label.Name = name
	label.BackgroundTransparency = transparency == nil and 1 or transparency
	label.BorderSizePixel = 0
	label.Text = text
	label.TextColor3 = color
	label.TextTransparency = 0
	label.TextScaled = false
	label.TextWrapped = true
	label.RichText = false
	label.FontFace = fontFace(weight)
	label.TextSize = size
	label.ZIndex = 10
	label.Parent = parent
	return label
end

local function createIcon(name, parent, image, size, anchorPoint, position)
	local icon = Instance.new("ImageLabel")
	icon.Name = name
	icon.BackgroundTransparency = 1
	icon.BorderSizePixel = 0
	icon.Image = image
	icon.ImageColor3 = Color3.new(1, 1, 1)
	icon.ScaleType = Enum.ScaleType.Fit
	icon.Size = size
	icon.AnchorPoint = anchorPoint or Vector2.new(0, 0.5)
	icon.Position = position or UDim2.new(0, 0, 0.5, 0)
	icon.ZIndex = 12
	icon.Parent = parent
	return icon
end

local function createButton(name, parent, buttonImage, sliceCenter, sliceScale, iconImage, text, isPrimary)
	local button = Instance.new("ImageButton")
	button.Name = name
	button.BackgroundTransparency = 1
	button.AutoButtonColor = false
	button.Image = buttonImage
	button.ImageColor3 = Color3.new(1, 1, 1)
	button.ScaleType = Enum.ScaleType.Slice
	button.SliceCenter = Rect.new(sliceCenter[1], sliceCenter[2], sliceCenter[3], sliceCenter[4])
	button.SliceScale = sliceScale
	button.ZIndex = 5
	button.Parent = parent

	local shadow = Instance.new("Frame")
	shadow.Name = "ShadowPlate"
	shadow.BackgroundColor3 = Color3.fromRGB(7, 20, 43)
	shadow.BackgroundTransparency = 0.45
	shadow.BorderSizePixel = 0
	shadow.AnchorPoint = Vector2.new(0.5, 0.5)
	shadow.Position = UDim2.new(0.5, 0, 0.5, 10)
	shadow.Size = UDim2.new(0.94, 0, 0.78, 0)
	shadow.ZIndex = 4
	shadow.Parent = button
	makeCorner(shadow, isPrimary and 24 or 20)
	applyShadow(shadow)

	local visual = Instance.new("Frame")
	visual.Name = "Visual"
	visual.BackgroundTransparency = 1
	visual.Size = UDim2.fromScale(1, 1)
	visual.ZIndex = 6
	visual.Parent = button

	local gloss = Instance.new("Frame")
	gloss.Name = "Gloss"
	gloss.BackgroundColor3 = Color3.new(1, 1, 1)
	gloss.BackgroundTransparency = 0.82
	gloss.BorderSizePixel = 0
	gloss.AnchorPoint = Vector2.new(0.5, 0)
	gloss.Position = UDim2.new(0.5, 0, 0.07, 0)
	gloss.Size = UDim2.new(0.86, 0, 0.28, 0)
	gloss.ZIndex = 7
	gloss.Parent = visual
	makeCorner(gloss, 999)
	makeGradient(gloss, 90, ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 255, 255)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(173, 244, 255)),
	}), NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.15),
		NumberSequenceKeypoint.new(1, 1),
	}))

	local rim = Instance.new("Frame")
	rim.Name = "InnerRim"
	rim.BackgroundTransparency = 1
	rim.Position = UDim2.new(0.04, 0, 0.08, 0)
	rim.Size = UDim2.new(0.92, 0, 0.84, 0)
	rim.ZIndex = 8
	rim.Parent = visual
	makeCorner(rim, isPrimary and 22 or 18)
	makeStroke(rim, Color3.fromRGB(242, 198, 109), 2, 0.35)

	local textLabel = createTextLabel("TextLabel", visual, text, isPrimary and 25 or 22, Enum.FontWeight.SemiBold, Color3.fromRGB(244, 251, 255))
	textLabel.BackgroundTransparency = 1
	textLabel.Size = UDim2.new(1, -88, 1, 0)
	textLabel.Position = UDim2.new(0, 72, 0, 0)
	textLabel.TextXAlignment = Enum.TextXAlignment.Left
	textLabel.TextYAlignment = Enum.TextYAlignment.Center
	local textConstraint = Instance.new("UITextSizeConstraint")
	textConstraint.MinTextSize = 16
	textConstraint.MaxTextSize = isPrimary and 25 or 22
	textConstraint.Parent = textLabel

	createIcon(name .. "Icon", visual, iconImage, UDim2.fromOffset(30, 30), Vector2.new(0, 0.5), UDim2.new(0, 26, 0.5, 0))
	return button
end

local function createTitlePlate(parent)
	local plate = Instance.new("Frame")
	plate.Name = "TitlePlate"
	plate.BackgroundColor3 = Color3.fromRGB(19, 55, 99)
	plate.BorderSizePixel = 0
	plate.Size = UDim2.new(0.72, 0, 0, 120)
	plate.AnchorPoint = Vector2.new(0.5, 0)
	plate.Position = UDim2.new(0.5, 0, 0, 0)
	plate.ZIndex = 5
	plate.Parent = parent
	makeCorner(plate, 28)
	makeStroke(plate, Color3.fromRGB(10, 35, 66), 6, 0)
	makeGradient(plate, 90, ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(74, 223, 255)),
		ColorSequenceKeypoint.new(0.52, Color3.fromRGB(44, 98, 209)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(20, 46, 90)),
	}))
	applyShadow(plate)

	local trim = Instance.new("Frame")
	trim.Name = "Trim"
	trim.BackgroundTransparency = 1
	trim.Position = UDim2.new(0.025, 0, 0.12, 0)
	trim.Size = UDim2.new(0.95, 0, 0.76, 0)
	trim.ZIndex = 6
	trim.Parent = plate
	makeCorner(trim, 24)
	makeStroke(trim, Color3.fromRGB(242, 198, 109), 2, 0.15)

	local gloss = Instance.new("Frame")
	gloss.Name = "Gloss"
	gloss.BackgroundColor3 = Color3.new(1, 1, 1)
	gloss.BackgroundTransparency = 0.84
	gloss.BorderSizePixel = 0
	gloss.AnchorPoint = Vector2.new(0.5, 0)
	gloss.Position = UDim2.new(0.5, 0, 0.08, 0)
	gloss.Size = UDim2.new(0.84, 0, 0.28, 0)
	gloss.ZIndex = 7
	gloss.Parent = plate
	makeCorner(gloss, 999)

	local leftGem = Instance.new("Frame")
	leftGem.Name = "LeftGem"
	leftGem.BackgroundColor3 = Color3.fromRGB(242, 198, 109)
	leftGem.BorderSizePixel = 0
	leftGem.Size = UDim2.fromOffset(18, 18)
	leftGem.AnchorPoint = Vector2.new(0.5, 0.5)
	leftGem.Position = UDim2.new(0.08, 0, 0.5, 0)
	leftGem.Rotation = 45
	leftGem.ZIndex = 7
	leftGem.Parent = plate

	local rightGem = leftGem:Clone()
	rightGem.Name = "RightGem"
	rightGem.Position = UDim2.new(0.92, 0, 0.5, 0)
	rightGem.Parent = plate

	local title = createTextLabel("AuroraTitle", plate, "AURORA", 42, Enum.FontWeight.ExtraBold, Color3.fromRGB(244, 251, 255))
	title.Size = UDim2.new(1, -80, 1, 0)
	title.Position = UDim2.new(0, 40, 0, 0)
	title.TextXAlignment = Enum.TextXAlignment.Center
	title.TextYAlignment = Enum.TextYAlignment.Center
	local titleConstraint = Instance.new("UITextSizeConstraint")
	titleConstraint.MinTextSize = 22
	titleConstraint.MaxTextSize = 42
	titleConstraint.Parent = title

	return plate
end

local function createBackgroundOrnaments(parent)
	local ornaments = Instance.new("Frame")
	ornaments.Name = "BackgroundOrnaments"
	ornaments.BackgroundTransparency = 1
	ornaments.Size = UDim2.fromScale(1, 1)
	ornaments.ZIndex = 1
	ornaments.Parent = parent

	local function corner(name, xScale, yScale, flipX, flipY)
		local holder = Instance.new("Frame")
		holder.Name = name
		holder.BackgroundTransparency = 1
		holder.Size = UDim2.fromOffset(170, 170)
		holder.AnchorPoint = Vector2.new(xScale == 1 and 1 or 0, yScale == 1 and 1 or 0)
		holder.Position = UDim2.new(xScale, 0, yScale, 0)
		holder.ZIndex = 2
		holder.Parent = ornaments

		local lineA = Instance.new("Frame")
		lineA.BackgroundColor3 = Color3.fromRGB(55, 129, 225)
		lineA.BackgroundTransparency = 0.2
		lineA.BorderSizePixel = 0
		lineA.Size = UDim2.new(0, 120, 0, 4)
		lineA.Position = UDim2.new(0, flipX and 50 or 0, 0, flipY and 166 or 0)
		lineA.AnchorPoint = Vector2.new(0, 0.5)
		lineA.Rotation = flipY and 180 or 0
		lineA.ZIndex = 2
		lineA.Parent = holder

		local lineB = Instance.new("Frame")
		lineB.BackgroundColor3 = Color3.fromRGB(55, 129, 225)
		lineB.BackgroundTransparency = 0.2
		lineB.BorderSizePixel = 0
		lineB.Size = UDim2.new(0, 4, 0, 120)
		lineB.Position = UDim2.new(0, flipX and 166 or 0, 0, flipY and 50 or 0)
		lineB.ZIndex = 2
		lineB.Parent = holder

		local gold = Instance.new("Frame")
		gold.BackgroundColor3 = Color3.fromRGB(242, 198, 109)
		gold.BackgroundTransparency = 0.08
		gold.BorderSizePixel = 0
		gold.Size = UDim2.fromOffset(16, 16)
		gold.Rotation = 45
		gold.AnchorPoint = Vector2.new(0.5, 0.5)
		gold.Position = UDim2.new(0, flipX and 116 or 54, 0, flipY and 116 or 54)
		gold.ZIndex = 3
		gold.Parent = holder
	end

	corner("TopLeft", 0, 0, false, false)
	corner("TopRight", 1, 0, true, false)
	corner("BottomLeft", 0, 1, false, true)
	corner("BottomRight", 1, 1, true, true)

	return ornaments
end

local function createBackgroundRoot(parent)
	local bg = Instance.new("Frame")
	bg.Name = "BackgroundRoot"
	bg.BackgroundColor3 = Color3.fromRGB(8, 18, 31)
	bg.BorderSizePixel = 0
	bg.Size = UDim2.fromScale(1, 1)
	bg.Parent = parent

	makeGradient(bg, 90, ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(12, 24, 40)),
		ColorSequenceKeypoint.new(0.45, Color3.fromRGB(8, 18, 31)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(4, 10, 20)),
	}))

	local bloom = Instance.new("Frame")
	bloom.Name = "Bloom"
	bloom.BackgroundColor3 = Color3.fromRGB(57, 213, 255)
	bloom.BackgroundTransparency = 0.88
	bloom.BorderSizePixel = 0
	bloom.AnchorPoint = Vector2.new(0.5, 0.35)
	bloom.Position = UDim2.new(0.5, 0, 0.3, 0)
	bloom.Size = UDim2.new(0.74, 0, 0.5, 0)
	bloom.ZIndex = 1
	bloom.Parent = bg
	makeCorner(bloom, 999)
	makeGradient(bloom, 0, ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(30, 93, 200)),
		ColorSequenceKeypoint.new(0.5, Color3.fromRGB(57, 213, 255)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(30, 93, 200)),
	}), NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.65),
		NumberSequenceKeypoint.new(1, 1),
	}))

	local bottomFade = Instance.new("Frame")
	bottomFade.Name = "BottomFade"
	bottomFade.BackgroundColor3 = Color3.fromRGB(4, 10, 20)
	bottomFade.BackgroundTransparency = 0.15
	bottomFade.BorderSizePixel = 0
	bottomFade.AnchorPoint = Vector2.new(0.5, 1)
	bottomFade.Position = UDim2.new(0.5, 0, 1, 0)
	bottomFade.Size = UDim2.new(1, 0, 0.28, 0)
	bottomFade.ZIndex = 1
	bottomFade.Parent = bg
	makeGradient(bottomFade, 90, ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(4, 10, 20)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(4, 10, 20)),
	}), NumberSequence.new({
		NumberSequenceKeypoint.new(0, 1),
		NumberSequenceKeypoint.new(1, 0.05),
	}))

	createBackgroundOrnaments(bg)
	return bg
end

local function createModal(name, parent, titleText, bodyText, closeName)
	local modal = Instance.new("CanvasGroup")
	modal.Name = name
	modal.BackgroundTransparency = 1
	modal.Size = UDim2.fromScale(1, 1)
	modal.GroupTransparency = 1
	modal.Visible = false
	modal.ZIndex = 30
	modal.Parent = parent

	local blocker = Instance.new("TextButton")
	blocker.Name = "Blocker"
	blocker.BackgroundColor3 = Color3.fromRGB(2, 7, 15)
	blocker.BackgroundTransparency = 0.35
	blocker.BorderSizePixel = 0
	blocker.Text = ""
	blocker.AutoButtonColor = false
	blocker.Size = UDim2.fromScale(1, 1)
	blocker.ZIndex = 31
	blocker.Parent = modal

	local panel = Instance.new("Frame")
	panel.Name = "Panel"
	panel.BackgroundColor3 = Color3.fromRGB(17, 36, 61)
	panel.BorderSizePixel = 0
	panel.AnchorPoint = Vector2.new(0.5, 0.5)
	panel.Position = UDim2.new(0.5, 0, 0.5, 0)
	panel.Size = name == "CreditsModal" and UDim2.new(0.8, 0, 0, 220) or UDim2.new(0.86, 0, 0, 300)
	panel.ZIndex = 32
	panel.Parent = modal
	makeCorner(panel, 24)
	makeStroke(panel, Color3.fromRGB(10, 35, 66), 5, 0)
	makeGradient(panel, 90, ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(60, 178, 245)),
		ColorSequenceKeypoint.new(0.22, Color3.fromRGB(39, 87, 186)),
		ColorSequenceKeypoint.new(0.7, Color3.fromRGB(17, 36, 61)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(12, 24, 40)),
	}))
	applyShadow(panel)

	local trim = Instance.new("Frame")
	trim.Name = "Trim"
	trim.BackgroundTransparency = 1
	trim.Position = UDim2.new(0.03, 0, 0.05, 0)
	trim.Size = UDim2.new(0.94, 0, 0.9, 0)
	trim.ZIndex = 33
	trim.Parent = panel
	makeCorner(trim, 20)
	makeStroke(trim, Color3.fromRGB(242, 198, 109), 2, 0.2)

	local cornerA = Instance.new("Frame")
	cornerA.Name = "CornerA"
	cornerA.BackgroundColor3 = Color3.fromRGB(242, 198, 109)
	cornerA.BorderSizePixel = 0
	cornerA.Size = UDim2.fromOffset(14, 14)
	cornerA.Position = UDim2.new(0, 18, 0, 18)
	cornerA.Rotation = 45
	cornerA.ZIndex = 34
	cornerA.Parent = panel

	local cornerB = cornerA:Clone()
	cornerB.Name = "CornerB"
	cornerB.Position = UDim2.new(1, -32, 1, -32)
	cornerB.Parent = panel

	local title = createTextLabel(name == "CreditsModal" and "CreditsTitle" or "SettingsTitle", panel, titleText, 24, Enum.FontWeight.Bold, Color3.fromRGB(244, 251, 255))
	title.Size = UDim2.new(1, -100, 0, 34)
	title.Position = UDim2.new(0, 24, 0, 18)
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.TextYAlignment = Enum.TextYAlignment.Center
	title.ZIndex = 35

	local closeButton = Instance.new("ImageButton")
	closeButton.Name = closeName
	closeButton.BackgroundTransparency = 1
	closeButton.AutoButtonColor = false
	closeButton.Image = "nexusasset://asset_c7c38ebbfb204596884f7b60988a3d6f"
	closeButton.ImageColor3 = Color3.new(1, 1, 1)
	closeButton.ScaleType = Enum.ScaleType.Slice
	closeButton.SliceCenter = Rect.new(184, 185, 834, 839)
	closeButton.SliceScale = 0.2
	closeButton.AnchorPoint = Vector2.new(1, 0)
	closeButton.Position = UDim2.new(1, -18, 0, 16)
	closeButton.Size = UDim2.fromOffset(50, 50)
	closeButton.ZIndex = 35
	closeButton.Parent = panel

	local closeVisual = Instance.new("Frame")
	closeVisual.Name = "Visual"
	closeVisual.BackgroundTransparency = 1
	closeVisual.Size = UDim2.fromScale(1, 1)
	closeVisual.ZIndex = 36
	closeVisual.Parent = closeButton
	createIcon(closeName .. "Icon", closeVisual, "nexusasset://asset_5faf258a5e6d409587d9b679f2343eea", UDim2.fromOffset(22, 22), Vector2.new(0.5, 0.5), UDim2.new(0.5, 0, 0.5, 0))

	if bodyText then
		local body = createTextLabel("CreditsBody", panel, bodyText, 17, Enum.FontWeight.Medium, Color3.fromRGB(184, 212, 232))
		body.Size = UDim2.new(1, -48, 1, -82)
		body.Position = UDim2.new(0, 24, 0, 64)
		body.TextXAlignment = Enum.TextXAlignment.Left
		body.TextYAlignment = Enum.TextYAlignment.Top
		body.ZIndex = 35
	end

	return modal, panel
end

local function createSettingsContent(panel, mobile)
	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.Size = UDim2.new(1, -40, 1, -86)
	content.Position = UDim2.new(0, 20, 0, 64)
	content.ZIndex = 35
	content.Parent = panel

	local list = Instance.new("UIListLayout")
	list.FillDirection = Enum.FillDirection.Vertical
	list.HorizontalAlignment = Enum.HorizontalAlignment.Center
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Padding = UDim.new(0, 14)
	list.Parent = content

	local function row(name, order, height)
		local r = Instance.new("Frame")
		r.Name = name
		r.BackgroundColor3 = Color3.fromRGB(10, 26, 46)
		r.BackgroundTransparency = 0.18
		r.BorderSizePixel = 0
		r.Size = UDim2.new(1, 0, 0, height)
		r.LayoutOrder = order
		r.ZIndex = 35
		r.Parent = content
		makeCorner(r, 16)
		makeStroke(r, Color3.fromRGB(26, 84, 156), 2, 0.3)

		local shine = Instance.new("Frame")
		shine.Name = "Shine"
		shine.BackgroundColor3 = Color3.new(1, 1, 1)
		shine.BackgroundTransparency = 0.9
		shine.BorderSizePixel = 0
		shine.Position = UDim2.new(0.02, 0, 0.08, 0)
		shine.Size = UDim2.new(0.96, 0, 0.28, 0)
		shine.ZIndex = 36
		shine.Parent = r
		makeCorner(shine, 999)

		return r
	end

	local musicRow = row("MusicRow", 1, 72)
	local musicLabel = createTextLabel("MusicLabel", musicRow, "Music", 18, Enum.FontWeight.Medium, Color3.fromRGB(244, 251, 255))
	musicLabel.Size = UDim2.new(0.45, 0, 1, 0)
	musicLabel.Position = UDim2.new(0, 18, 0, 0)
	musicLabel.TextXAlignment = Enum.TextXAlignment.Left
	musicLabel.TextYAlignment = Enum.TextYAlignment.Center
	musicLabel.ZIndex = 37

	local musicToggle = Instance.new("TextButton")
	musicToggle.Name = "MusicToggle"
	musicToggle.BackgroundTransparency = 1
	musicToggle.Text = ""
	musicToggle.AutoButtonColor = false
	musicToggle.AnchorPoint = Vector2.new(1, 0.5)
	musicToggle.Position = UDim2.new(1, -18, 0.5, 0)
	musicToggle.Size = UDim2.fromOffset(mobile and 92 or 84, mobile and 42 or 38)
	musicToggle.ZIndex = 37
	musicToggle.Parent = musicRow

	local toggleVisual = Instance.new("Frame")
	toggleVisual.Name = "Visual"
	toggleVisual.BackgroundColor3 = Color3.fromRGB(11, 33, 59)
	toggleVisual.BorderSizePixel = 0
	toggleVisual.Size = UDim2.fromScale(1, 1)
	toggleVisual.ZIndex = 37
	toggleVisual.Parent = musicToggle
	makeCorner(toggleVisual, 999)
	makeStroke(toggleVisual, Color3.fromRGB(10, 35, 66), 3, 0.05)

	local toggleFill = Instance.new("Frame")
	toggleFill.Name = "ToggleFill"
	toggleFill.BackgroundColor3 = Color3.fromRGB(39, 93, 177)
	toggleFill.BorderSizePixel = 0
	toggleFill.Size = UDim2.fromScale(1, 1)
	toggleFill.ZIndex = 38
	toggleFill.Parent = toggleVisual
	makeCorner(toggleFill, 999)
	makeGradient(toggleFill, 0, ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(32, 79, 153)),
		ColorSequenceKeypoint.new(0.5, Color3.fromRGB(57, 213, 255)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(36, 89, 186)),
	}))

	local toggleAccent = Instance.new("Frame")
	toggleAccent.Name = "ToggleAccent"
	toggleAccent.BackgroundColor3 = Color3.fromRGB(242, 198, 109)
	toggleAccent.BackgroundTransparency = 0.35
	toggleAccent.BorderSizePixel = 0
	toggleAccent.AnchorPoint = Vector2.new(0.5, 0.5)
	toggleAccent.Position = UDim2.new(0.2, 0, 0.5, 0)
	toggleAccent.Size = UDim2.new(0, 12, 0, 12)
	toggleAccent.ZIndex = 39
	toggleAccent.Parent = toggleVisual
	makeCorner(toggleAccent, 999)

	local toggleThumb = Instance.new("Frame")
	toggleThumb.Name = "ToggleThumb"
	toggleThumb.BackgroundColor3 = Color3.fromRGB(244, 251, 255)
	toggleThumb.BorderSizePixel = 0
	toggleThumb.AnchorPoint = Vector2.new(0, 0.5)
	toggleThumb.Position = UDim2.new(0, 4, 0.5, 0)
	toggleThumb.Size = UDim2.new(0, mobile and 34 or 30, 0, mobile and 34 or 30)
	toggleThumb.ZIndex = 40
	toggleThumb.Parent = toggleVisual
	makeCorner(toggleThumb, 999)
	makeStroke(toggleThumb, Color3.fromRGB(242, 198, 109), 2, 0.35)

	local toggleState = createTextLabel("StateLabel", toggleVisual, "ON", 13, Enum.FontWeight.Bold, Color3.fromRGB(244, 251, 255))
	toggleState.Size = UDim2.new(1, -18, 1, 0)
	toggleState.Position = UDim2.new(0, 12, 0, 0)
	toggleState.TextXAlignment = Enum.TextXAlignment.Right
	toggleState.TextYAlignment = Enum.TextYAlignment.Center
	toggleState.ZIndex = 39

	local volumeRow = row("VolumeRow", 2, mobile and 116 or 88)
	local volumeLabel = createTextLabel("VolumeLabel", volumeRow, "Volume", 18, Enum.FontWeight.Medium, Color3.fromRGB(244, 251, 255))
	volumeLabel.ZIndex = 37

	local volumeValue = createTextLabel("VolumeValue", volumeRow, "75%", 16, Enum.FontWeight.SemiBold, Color3.fromRGB(184, 212, 232))
	volumeValue.ZIndex = 37

	local volumeSlider = Instance.new("Frame")
	volumeSlider.Name = "VolumeSlider"
	volumeSlider.BackgroundTransparency = 1
	volumeSlider.BorderSizePixel = 0
	volumeSlider.ZIndex = 37
	volumeSlider.Parent = volumeRow

	local sliderHit = Instance.new("TextButton")
	sliderHit.Name = "DragHitTarget"
	sliderHit.Text = ""
	sliderHit.AutoButtonColor = false
	sliderHit.BackgroundTransparency = 1
	sliderHit.Size = UDim2.fromScale(1, 1)
	sliderHit.ZIndex = 41
	sliderHit.Parent = volumeSlider

	local sliderTrack = Instance.new("Frame")
	sliderTrack.Name = "Track"
	sliderTrack.BackgroundColor3 = Color3.fromRGB(10, 35, 66)
	sliderTrack.BorderSizePixel = 0
	sliderTrack.AnchorPoint = Vector2.new(0, 0.5)
	sliderTrack.Position = UDim2.new(0, 0, 0.5, 0)
	sliderTrack.Size = UDim2.new(1, 0, 0, 16)
	sliderTrack.ZIndex = 37
	sliderTrack.Parent = volumeSlider
	makeCorner(sliderTrack, 999)
	makeStroke(sliderTrack, Color3.fromRGB(8, 18, 31), 2, 0.2)

	local sliderFill = Instance.new("Frame")
	sliderFill.Name = "Fill"
	sliderFill.BackgroundColor3 = Color3.fromRGB(57, 213, 255)
	sliderFill.BorderSizePixel = 0
	sliderFill.Size = UDim2.new(0.75, 0, 1, 0)
	sliderFill.ZIndex = 38
	sliderFill.Parent = sliderTrack
	makeCorner(sliderFill, 999)
	makeGradient(sliderFill, 0, ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(47, 93, 204)),
		ColorSequenceKeypoint.new(0.6, Color3.fromRGB(57, 213, 255)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(242, 198, 109)),
	}))

	local sliderHandle = Instance.new("Frame")
	sliderHandle.Name = "Handle"
	sliderHandle.BackgroundColor3 = Color3.fromRGB(244, 251, 255)
	sliderHandle.BorderSizePixel = 0
	sliderHandle.AnchorPoint = Vector2.new(0.5, 0.5)
	sliderHandle.Position = UDim2.new(0.75, 0, 0.5, 0)
	sliderHandle.Size = UDim2.fromOffset(mobile and 30 or 26, mobile and 30 or 26)
	sliderHandle.ZIndex = 39
	sliderHandle.Parent = volumeSlider
	makeCorner(sliderHandle, 999)
	makeStroke(sliderHandle, Color3.fromRGB(242, 198, 109), 2, 0.2)
	applyShadow(sliderHandle)

	local handleCore = Instance.new("Frame")
	handleCore.Name = "Core"
	handleCore.BackgroundColor3 = Color3.fromRGB(57, 213, 255)
	handleCore.BorderSizePixel = 0
	handleCore.AnchorPoint = Vector2.new(0.5, 0.5)
	handleCore.Position = UDim2.new(0.5, 0, 0.5, 0)
	handleCore.Size = UDim2.fromScale(0.44, 0.44)
	handleCore.ZIndex = 40
	handleCore.Parent = sliderHandle
	makeCorner(handleCore, 999)

	if mobile then
		volumeLabel.Size = UDim2.new(1, -36, 0, 24)
		volumeLabel.Position = UDim2.new(0, 18, 0, 12)
		volumeLabel.TextXAlignment = Enum.TextXAlignment.Left
		volumeLabel.TextYAlignment = Enum.TextYAlignment.Center

		volumeValue.Size = UDim2.new(0, 64, 0, 22)
		volumeValue.Position = UDim2.new(1, -82, 0, 12)
		volumeValue.TextXAlignment = Enum.TextXAlignment.Right
		volumeValue.TextYAlignment = Enum.TextYAlignment.Center

		volumeSlider.Size = UDim2.new(1, -36, 0, 44)
		volumeSlider.Position = UDim2.new(0, 18, 0, 56)
	else
		volumeLabel.Size = UDim2.new(0.3, 0, 1, 0)
		volumeLabel.Position = UDim2.new(0, 18, 0, 0)
		volumeLabel.TextXAlignment = Enum.TextXAlignment.Left
		volumeLabel.TextYAlignment = Enum.TextYAlignment.Center

		volumeValue.Size = UDim2.new(0, 60, 1, 0)
		volumeValue.AnchorPoint = Vector2.new(1, 0)
		volumeValue.Position = UDim2.new(1, -16, 0, 0)
		volumeValue.TextXAlignment = Enum.TextXAlignment.Right
		volumeValue.TextYAlignment = Enum.TextYAlignment.Center

		volumeSlider.Size = UDim2.new(0.52, 0, 0, 36)
		volumeSlider.AnchorPoint = Vector2.new(1, 0.5)
		volumeSlider.Position = UDim2.new(1, -88, 0.5, 0)
	end
end

local function createMenuRegion(parent, mobile)
	local dock = Instance.new("Frame")
	dock.Name = "MainMenuDock"
	dock.BackgroundTransparency = 1
	dock.AnchorPoint = Vector2.new(0.5, 0)
	dock.Position = UDim2.new(0.5, 0, mobile and 0.28 or 0.3, 0)
	dock.Size = mobile and UDim2.new(0.78, 0, 0, 260) or UDim2.new(0.3, 0, 0, 290)
	dock.ZIndex = 5
	dock.Parent = parent

	local layout = Instance.new("UIListLayout")
	layout.FillDirection = Enum.FillDirection.Vertical
	layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, mobile and 12 or 14)
	layout.Parent = dock

	local play = createButton(
		"PlayButton",
		dock,
		"nexusasset://asset_5039204803cc4addb9c4fac6294e7db1",
		{185, 68, 839, 309},
		0.2,
		"nexusasset://asset_3fd6fe344b294866bed02bc3906c8607",
		"Play",
		true
	)
	play.LayoutOrder = 1
	play.Size = UDim2.new(1, 0, 0, mobile and 82 or 88)

	local settings = createButton(
		"SettingsButton",
		dock,
		"nexusasset://asset_46b31109ec834bd0ae3a36717c6aadc4",
		{185, 92, 839, 418},
		0.2,
		"nexusasset://asset_d244e96ede1848aaba86151525848fcb",
		"Settings",
		false
	)
	settings.LayoutOrder = 2
	settings.Size = UDim2.new(1, 0, 0, mobile and 72 or 78)

	local credits = createButton(
		"CreditsButton",
		dock,
		"nexusasset://asset_46b31109ec834bd0ae3a36717c6aadc4",
		{185, 92, 839, 418},
		0.2,
		"nexusasset://asset_a032dcef3a1542088532b24b958cc53a",
		"Credits",
		false
	)
	credits.LayoutOrder = 3
	credits.Size = UDim2.new(1, 0, 0, mobile and 72 or 78)

	return dock
end

local function createComposition(parent, mobile)
	createBackgroundRoot(parent)

	local titleHolder = Instance.new("Frame")
	titleHolder.Name = "TitleHeader"
	titleHolder.BackgroundTransparency = 1
	titleHolder.AnchorPoint = Vector2.new(0.5, 0)
	titleHolder.Position = UDim2.new(0.5, 0, mobile and 0.08 or 0.1, 0)
	titleHolder.Size = mobile and UDim2.new(0.72, 0, 0, 96) or UDim2.new(0.44, 0, 0, 120)
	titleHolder.ZIndex = 5
	titleHolder.Parent = parent
	createTitlePlate(titleHolder)

	createMenuRegion(parent, mobile)

	local settingsModal, settingsPanel = createModal("SettingsModal", parent, "Settings", nil, "SettingsCloseButton")
	if mobile then
		settingsPanel.Size = UDim2.new(0.86, 0, 0, 320)
	else
		settingsPanel.Size = UDim2.new(0.52, 0, 0, 300)
	end
	createSettingsContent(settingsPanel, mobile)

	local creditsModal, creditsPanel = createModal("CreditsModal", parent, "Credits", "Created for AURORA\nUI concept and interaction shell\nReplace this text with your team credits.", "CreditsCloseButton")
	if mobile then
		creditsPanel.Size = UDim2.new(0.8, 0, 0, 228)
	else
		creditsPanel.Size = UDim2.new(0.38, 0, 0, 220)
	end

	local hook = Instance.new("BindableEvent")
	hook.Name = "OnPlayRequestedHook"
	hook.Parent = parent

	local controllerTag = Instance.new("Folder")
	controllerTag.Name = "PanelControllerBehavior"
	controllerTag.Parent = parent
end

function View.build()
	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "AURORA"
	screenGui.ResetOnSpawn = false
	screenGui.IgnoreGuiInset = false
	screenGui.DisplayOrder = 0
	screenGui.Enabled = true
	screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

	local desktop = Instance.new("Frame")
	desktop.Name = "_NexusDesktop"
	desktop.BackgroundTransparency = 1
	desktop.Size = UDim2.fromScale(1, 1)
	desktop.Visible = true
	desktop.Parent = screenGui
	createComposition(desktop, false)

	local mobile = Instance.new("Frame")
	mobile.Name = "_NexusMobile"
	mobile.BackgroundTransparency = 1
	mobile.Size = UDim2.fromScale(1, 1)
	mobile.Visible = false
	mobile.Parent = screenGui
	createComposition(mobile, true)

	local warnings = Instance.new("Folder")
	warnings.Name = "ArtworkWarnings"
	warnings.Parent = screenGui

	local function warningValue(name, text)
		local value = Instance.new("StringValue")
		value.Name = name
		value.Value = text
		value.Parent = warnings
	end

	warningValue("cmp_settings_modal", "UI_ARTWORK_NATIVE_CORNER: Generated corner ornaments with strict bounds are disabled for reliability. Use native decoration or omit the optional corner treatment.")
	warningValue("cmp_credits_modal", "UI_ARTWORK_NATIVE_CORNER: Generated corner ornaments with strict bounds are disabled for reliability. Use native decoration or omit the optional corner treatment.")
	warningValue("cmp_background_ornaments", "UI_ARTWORK_NATIVE_CORNER: Generated corner ornaments with strict bounds are disabled for reliability. Use native decoration or omit the optional corner treatment.")
	warningValue("cmp_title_plate", "UI_ARTWORK_NATIVE_CORNER: Generated corner ornaments with strict bounds are disabled for reliability. Use native decoration or omit the optional corner treatment.")

	return screenGui
end

return View