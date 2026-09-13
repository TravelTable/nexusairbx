local View = {}

local function createNexusIcon(parent, role, options)
	options = options or {}
	local holder = Instance.new("Frame")
	holder.Name = options.name or (role .. "Icon")
	holder.BackgroundTransparency = 1
	holder.BorderSizePixel = 0
	holder.Size = UDim2.fromOffset(options.size or 32, options.size or 32)
	holder.Parent = parent

	local aspect = Instance.new("UIAspectRatioConstraint")
	aspect.AspectRatio = 1
	aspect.Parent = holder

	local padding = math.clamp(options.padding or 12, 0, 25) / 100

	local canvas = Instance.new("Frame")
	canvas.Name = "Glyph"
	canvas.BackgroundTransparency = 1
	canvas.BorderSizePixel = 0
	canvas.Position = UDim2.fromScale(padding, padding)
	canvas.Size = UDim2.fromScale(1 - padding * 2, 1 - padding * 2)
	canvas.Parent = holder

	local color = options.color or Color3.fromRGB(255, 255, 255)

	local function shape(x, y, w, h, rotation, round)
		local part = Instance.new("Frame")
		part.Name = "GlyphPart"
		part.AnchorPoint = Vector2.new(0.5, 0.5)
		part.Position = UDim2.fromScale(x, y)
		part.Size = UDim2.fromScale(w, h)
		part.Rotation = rotation or 0
		part.BackgroundColor3 = color
		part.BorderSizePixel = 0
		part.Parent = canvas
		if round then
			local corner = Instance.new("UICorner")
			corner.CornerRadius = UDim.new(round, 0)
			corner.Parent = part
		end
		return part
	end

	local function bar(x1, y1, x2, y2, width)
		local dx, dy = x2 - x1, y2 - y1
		return shape(
			(x1 + x2) / 2,
			(y1 + y2) / 2,
			math.sqrt(dx * dx + dy * dy),
			width or 0.14,
			math.deg(math.atan2(dy, dx)),
			0.5
		)
	end

	local function ring(x, y, radius, width)
		for index = 0, 11 do
			local a = index * math.pi / 6
			local b = (index + 1) * math.pi / 6
			bar(
				x + math.cos(a) * radius,
				y + math.sin(a) * radius,
				x + math.cos(b) * radius,
				y + math.sin(b) * radius,
				width or 0.12
			)
		end
	end

	if role == "play" then
		for index = 0, 15 do
			local x = index / 16
			shape(0.22 + x * 0.58, 0.5, 0.58 / 16 + 0.005, 0.76 * (1 - x), 0, nil)
		end
	elseif role == "close" then
		shape(0.5, 0.5, 0.88, 0.15, 45, 0.5)
		shape(0.5, 0.5, 0.88, 0.15, -45, 0.5)
	elseif role == "settings" then
		ring(0.5, 0.5, 0.25, 0.16)
		for index = 0, 7 do
			local angle = index * math.pi / 4
			shape(
				0.5 + math.cos(angle) * 0.33,
				0.5 + math.sin(angle) * 0.33,
				0.26,
				0.16,
				math.deg(angle),
				0.3
			)
		end
	else
		ring(0.5, 0.5, 0.39, 0.11)
		shape(0.5, 0.31, 0.14, 0.14, 0, 0.5)
		shape(0.5, 0.62, 0.14, 0.3, 0, 0.4)
	end

	return holder
end

local palette = {
	bgTop = Color3.fromRGB(6, 18, 34),
	bgBottom = Color3.fromRGB(3, 10, 20),
	bgGlow = Color3.fromRGB(20, 73, 134),

	navy = Color3.fromRGB(11, 29, 53),
	navy2 = Color3.fromRGB(8, 21, 39),
	cobalt = Color3.fromRGB(41, 93, 204),
	cyan = Color3.fromRGB(59, 199, 242),
	cyanSoft = Color3.fromRGB(125, 224, 255),
	gold = Color3.fromRGB(230, 190, 89),
	goldSoft = Color3.fromRGB(255, 226, 150),

	text = Color3.fromRGB(244, 251, 255),
	textSecondary = Color3.fromRGB(185, 212, 232),
	success = Color3.fromRGB(89, 214, 138),
	danger = Color3.fromRGB(217, 92, 92),
	shadow = Color3.fromRGB(4, 10, 20),
}

local fonts = {
	display = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.ExtraBold, Enum.FontStyle.Normal),
	heading = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.Bold, Enum.FontStyle.Normal),
	button = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.Bold, Enum.FontStyle.Normal),
	body = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.Medium, Enum.FontStyle.Normal),
	caption = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.SemiBold, Enum.FontStyle.Normal),
	numeric = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.Bold, Enum.FontStyle.Normal),
}

local function addCorner(parent, radius)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, radius)
	c.Parent = parent
	return c
end

local function addStroke(parent, color, thickness, transparency)
	local s = Instance.new("UIStroke")
	s.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	s.Color = color
	s.Thickness = thickness
	s.Transparency = transparency or 0
	s.Parent = parent
	return s
end

local function addTextConstraint(parent, minSize, maxSize)
	local c = Instance.new("UITextSizeConstraint")
	c.MinTextSize = minSize
	c.MaxTextSize = maxSize
	c.Parent = parent
	return c
end

local function createShadow(parent, name)
	local shadow = Instance.new("Frame")
	shadow.Name = name or "Shadow"
	shadow.AnchorPoint = Vector2.new(0.5, 0.5)
	shadow.Position = UDim2.fromScale(0.5, 0.5) + UDim2.fromOffset(0, 8)
	shadow.Size = UDim2.fromScale(1, 1)
	shadow.BackgroundColor3 = palette.shadow
	shadow.BackgroundTransparency = 0.45
	shadow.BorderSizePixel = 0
	shadow.ZIndex = parent.ZIndex - 1
	shadow.Parent = parent.Parent
	addCorner(shadow, 24)

	local g = Instance.new("UIGradient")
	g.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.new(0, 0, 0)),
		ColorSequenceKeypoint.new(1, Color3.new(0, 0, 0)),
	})
	g.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.2),
		NumberSequenceKeypoint.new(1, 0.65),
	})
	g.Rotation = 90
	g.Parent = shadow

	return shadow
end

local function createBackground(parent)
	local bg = Instance.new("CanvasGroup")
	bg.Name = "BackgroundDecoration"
	bg.Size = UDim2.fromScale(1, 1)
	bg.BackgroundColor3 = palette.bgTop
	bg.BorderSizePixel = 0
	bg.Parent = parent

	local bgGrad = Instance.new("UIGradient")
	bgGrad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, palette.bgTop),
		ColorSequenceKeypoint.new(1, palette.bgBottom),
	})
	bgGrad.Rotation = 90
	bgGrad.Parent = bg

	local vignetteTop = Instance.new("Frame")
	vignetteTop.Name = "VignetteTop"
	vignetteTop.BackgroundTransparency = 1
	vignetteTop.Size = UDim2.fromScale(1, 0.55)
	vignetteTop.Parent = bg

	local vg1 = Instance.new("UIGradient")
	vg1.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, palette.bgGlow),
		ColorSequenceKeypoint.new(1, palette.bgTop),
	})
	vg1.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.7),
		NumberSequenceKeypoint.new(1, 1),
	})
	vg1.Rotation = 90
	vg1.Parent = vignetteTop

	for i = 1, 2 do
		local ray = Instance.new("Frame")
		ray.Name = "GlowRay" .. i
		ray.AnchorPoint = Vector2.new(0.5, 0.5)
		ray.BackgroundColor3 = palette.cyan
		ray.BackgroundTransparency = 0.93
		ray.BorderSizePixel = 0
		ray.Size = i == 1 and UDim2.fromScale(0.7, 0.05) or UDim2.fromScale(0.5, 0.04)
		ray.Position = i == 1 and UDim2.fromScale(0.3, 0.22) or UDim2.fromScale(0.78, 0.78)
		ray.Rotation = i == 1 and -18 or 26
		ray.Parent = bg
		addCorner(ray, 999)
	end

	return bg
end

local function createPlate(parent, name, size)
	local plate = Instance.new("Frame")
	plate.Name = name
	plate.Size = size
	plate.BackgroundColor3 = palette.navy
	plate.BorderSizePixel = 0
	plate.Parent = parent
	addCorner(plate, 26)
	addStroke(plate, palette.navy2, 4, 0)

	local grad = Instance.new("UIGradient")
	grad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, palette.cobalt),
		ColorSequenceKeypoint.new(0.45, palette.cyan),
		ColorSequenceKeypoint.new(1, palette.cobalt),
	})
	grad.Rotation = 90
	grad.Parent = plate

	local gloss = Instance.new("Frame")
	gloss.Name = "Gloss"
	gloss.BackgroundColor3 = Color3.new(1, 1, 1)
	gloss.BackgroundTransparency = 0.82
	gloss.BorderSizePixel = 0
	gloss.Position = UDim2.fromScale(0.03, 0.06)
	gloss.Size = UDim2.fromScale(0.94, 0.34)
	gloss.ZIndex = plate.ZIndex + 1
	gloss.Parent = plate
	addCorner(gloss, 18)

	local inner = Instance.new("Frame")
	inner.Name = "InnerRim"
	inner.BackgroundTransparency = 1
	inner.Size = UDim2.fromScale(1, 1)
	inner.ZIndex = plate.ZIndex + 1
	inner.Parent = plate
	addCorner(inner, 26)
	addStroke(inner, palette.gold, 2, 0.2)

	return plate
end

local function createTitle(parent, mobile)
	local holder = Instance.new("Frame")
	holder.Name = "TitleHeader"
	holder.BackgroundTransparency = 1
	holder.Size = mobile and UDim2.fromScale(1, 0.23) or UDim2.fromScale(1, 0.22)
	holder.Parent = parent

	local plate = createPlate(holder, "TitlePlate", mobile and UDim2.fromScale(0.86, 0.75) or UDim2.fromScale(0.72, 0.78))
	plate.AnchorPoint = Vector2.new(0.5, 0.5)
	plate.Position = UDim2.fromScale(0.5, 0.5)

	local aspect = Instance.new("UIAspectRatioConstraint")
	aspect.AspectRatio = mobile and 3.8 or 4.8
	aspect.Parent = plate

	local text = Instance.new("TextLabel")
	text.Name = "TitleText"
	text.BackgroundTransparency = 1
	text.Size = UDim2.fromScale(0.88, 0.8)
	text.AnchorPoint = Vector2.new(0.5, 0.5)
	text.Position = UDim2.fromScale(0.5, 0.52)
	text.Text = "AURORA"
	text.TextColor3 = palette.text
	text.TextScaled = false
	text.TextSize = mobile and 32 or 42
	text.FontFace = fonts.display
	text.TextXAlignment = Enum.TextXAlignment.Center
	text.TextYAlignment = Enum.TextYAlignment.Center
	text.ZIndex = plate.ZIndex + 2
	text.Parent = plate
	addTextConstraint(text, 20, mobile and 34 or 44)

	local stroke = Instance.new("UIStroke")
	stroke.Color = Color3.fromRGB(5, 15, 28)
	stroke.Thickness = 1.4
	stroke.Transparency = 0.55
	stroke.Parent = text

	return holder
end

local function createButton(parent, name, label, role, layoutOrder, hero, mobile)
	local button = Instance.new("TextButton")
	button.Name = name
	button.Text = ""
	button.AutoButtonColor = false
	button.BackgroundTransparency = 1
	button.BorderSizePixel = 0
	button.Size = UDim2.new(1, 0, 0, hero and (mobile and 64 or 74) or (mobile and 56 or 60))
	button.LayoutOrder = layoutOrder
	button.Parent = parent

	local visual = Instance.new("Frame")
	visual.Name = "Visual"
	visual.Size = UDim2.fromScale(1, 1)
	visual.BackgroundColor3 = palette.navy
	visual.BorderSizePixel = 0
	visual.Parent = button
	addCorner(visual, hero and 24 or 20)
	addStroke(visual, palette.navy2, hero and 4 or 3, 0)

	local shadow = Instance.new("Frame")
	shadow.Name = "Shadow"
	shadow.AnchorPoint = Vector2.new(0.5, 0.5)
	shadow.Position = UDim2.fromScale(0.5, 0.5) + UDim2.fromOffset(0, hero and 6 or 5)
	shadow.Size = UDim2.new(1, 0, 1, 0)
	shadow.BackgroundColor3 = palette.shadow
	shadow.BackgroundTransparency = 0.56
	shadow.BorderSizePixel = 0
	shadow.ZIndex = 0
	shadow.Parent = button
	addCorner(shadow, hero and 24 or 20)

	local fill = Instance.new("Frame")
	fill.Name = "Fill"
	fill.Size = UDim2.fromScale(1, 1)
	fill.BackgroundColor3 = hero and palette.cyan or palette.cobalt
	fill.BorderSizePixel = 0
	fill.ZIndex = 2
	fill.Parent = visual
	addCorner(fill, hero and 24 or 20)

	local grad = Instance.new("UIGradient")
	grad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, hero and palette.cobalt or Color3.fromRGB(35, 84, 180)),
		ColorSequenceKeypoint.new(0.35, palette.cyan),
		ColorSequenceKeypoint.new(1, hero and Color3.fromRGB(36, 104, 196) or palette.cobalt),
	})
	grad.Rotation = 90
	grad.Parent = fill

	local gloss = Instance.new("Frame")
	gloss.Name = "Gloss"
	gloss.BackgroundColor3 = Color3.new(1, 1, 1)
	gloss.BackgroundTransparency = 0.82
	gloss.BorderSizePixel = 0
	gloss.Position = UDim2.fromScale(0.03, 0.08)
	gloss.Size = UDim2.fromScale(0.94, hero and 0.33 or 0.28)
	gloss.ZIndex = 3
	gloss.Parent = visual
	addCorner(gloss, 18)

	local innerStrokeHost = Instance.new("Frame")
	innerStrokeHost.Name = "InnerStrokeHost"
	innerStrokeHost.BackgroundTransparency = 1
	innerStrokeHost.Size = UDim2.fromScale(1, 1)
	innerStrokeHost.ZIndex = 4
	innerStrokeHost.Parent = visual
	addCorner(innerStrokeHost, hero and 24 or 20)
	addStroke(innerStrokeHost, palette.gold, 2, 0.25)

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.Size = UDim2.fromScale(1, 1)
	content.ZIndex = 5
	content.Parent = visual

	local pad = Instance.new("UIPadding")
	pad.PaddingLeft = UDim.new(0, mobile and 16 or 18)
	pad.PaddingRight = UDim.new(0, mobile and 16 or 18)
	pad.Parent = content

	local icon = createNexusIcon(content, role, {
		name = name .. "Icon",
		size = mobile and 26 or 28,
		padding = 10,
		color = palette.goldSoft,
	})
	icon.AnchorPoint = Vector2.new(0, 0.5)
	icon.Position = UDim2.new(0, 0, 0.5, 0)
	icon.ZIndex = 6

	local text = Instance.new("TextLabel")
	text.Name = "Label"
	text.BackgroundTransparency = 1
	text.Position = UDim2.new(0, mobile and 42 or 46, 0, 0)
	text.Size = UDim2.new(1, -(mobile and 52 or 58), 1, 0)
	text.Text = label
	text.TextColor3 = palette.text
	text.TextSize = mobile and (hero and 22 or 20) or (hero and 24 or 22)
	text.FontFace = fonts.button
	text.TextXAlignment = Enum.TextXAlignment.Center
	text.TextYAlignment = Enum.TextYAlignment.Center
	text.ZIndex = 6
	text.Parent = content
	addTextConstraint(text, 16, hero and 26 or 24)

	local textStroke = Instance.new("UIStroke")
	textStroke.Color = Color3.fromRGB(6, 17, 32)
	textStroke.Thickness = 1
	textStroke.Transparency = 0.7
	textStroke.Parent = text

	return button
end

local function createMenuSurface(parent, mobile)
	local root = Instance.new("Frame")
	root.Name = "MainMenuRoot"
	root.AnchorPoint = Vector2.new(0.5, 0.5)
	root.Position = UDim2.fromScale(0.5, 0.5)
	root.Size = mobile and UDim2.fromScale(0.84, 0.48) or UDim2.fromScale(0.38, 0.46)
	root.BackgroundColor3 = palette.navy
	root.BorderSizePixel = 0
	root.Parent = parent
	addCorner(root, 28)
	addStroke(root, palette.navy2, 5, 0)

	local shadow = createShadow(root, "MainMenuShadow")
	shadow.Size = UDim2.new(1, 14, 1, 18)
	shadow.Position = UDim2.fromScale(0.5, 0.5) + UDim2.fromOffset(0, 12)

	local fill = Instance.new("Frame")
	fill.Name = "Fill"
	fill.BackgroundColor3 = palette.cobalt
	fill.BorderSizePixel = 0
	fill.Size = UDim2.fromScale(1, 1)
	fill.Parent = root
	addCorner(fill, 28)

	local grad = Instance.new("UIGradient")
	grad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(18, 43, 84)),
		ColorSequenceKeypoint.new(0.25, palette.cobalt),
		ColorSequenceKeypoint.new(0.75, Color3.fromRGB(33, 128, 205)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(14, 33, 68)),
	})
	grad.Rotation = 90
	grad.Parent = fill

	local glossBand = Instance.new("Frame")
	glossBand.Name = "GlossBand"
	glossBand.BackgroundColor3 = Color3.new(1, 1, 1)
	glossBand.BackgroundTransparency = 0.9
	glossBand.BorderSizePixel = 0
	glossBand.Position = UDim2.fromScale(0.03, 0.03)
	glossBand.Size = UDim2.fromScale(0.94, 0.18)
	glossBand.Parent = root
	addCorner(glossBand, 18)

	local innerRim = Instance.new("Frame")
	innerRim.Name = "InnerRim"
	innerRim.BackgroundTransparency = 1
	innerRim.Size = UDim2.fromScale(1, 1)
	innerRim.Parent = root
	addCorner(innerRim, 28)
	addStroke(innerRim, palette.gold, 2, 0.3)

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.Size = UDim2.fromScale(1, 1)
	content.Parent = root

	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, mobile and 18 or 20)
	padding.PaddingBottom = UDim.new(0, mobile and 18 or 22)
	padding.PaddingLeft = UDim.new(0, mobile and 16 or 18)
	padding.PaddingRight = UDim.new(0, mobile and 16 or 18)
	padding.Parent = content

	local layout = Instance.new("UIListLayout")
	layout.Padding = UDim.new(0, mobile and 12 or 14)
	layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	layout.VerticalAlignment = Enum.VerticalAlignment.Top
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Parent = content

	createTitle(content, mobile).LayoutOrder = 1
	createButton(content, "PlayButton", "Play", "play", 2, true, mobile)
	createButton(content, "SettingsButton", "Settings", "settings", 3, false, mobile)
	createButton(content, "CreditsButton", "Credits", "credits", 4, false, mobile)

	return root
end

local function createRowBase(parent, name, mobile)
	local row = Instance.new("Frame")
	row.Name = name
	row.Size = UDim2.new(1, 0, 0, mobile and 74 or 66)
	row.BackgroundColor3 = Color3.fromRGB(15, 35, 63)
	row.BackgroundTransparency = 0.1
	row.BorderSizePixel = 0
	row.Parent = parent
	addCorner(row, 18)
	addStroke(row, Color3.fromRGB(21, 50, 91), 2, 0.25)

	local gloss = Instance.new("Frame")
	gloss.Name = "Gloss"
	gloss.BackgroundColor3 = Color3.new(1, 1, 1)
	gloss.BackgroundTransparency = 0.9
	gloss.BorderSizePixel = 0
	gloss.Position = UDim2.fromScale(0.02, 0.06)
	gloss.Size = UDim2.fromScale(0.96, 0.28)
	gloss.Parent = row
	addCorner(gloss, 14)

	return row
end

local function createSettingsPanel(parent, mobile)
	local modal = Instance.new("CanvasGroup")
	modal.Name = "SettingsPanel"
	modal.AnchorPoint = Vector2.new(0.5, 0.5)
	modal.Position = UDim2.fromScale(0.5, 0.4)
	modal.Size = mobile and UDim2.fromScale(0.88, 0.42) or UDim2.fromScale(0.42, 0.36)
	modal.BackgroundTransparency = 1
	modal.GroupTransparency = 1
	modal.Visible = false
	modal.Parent = parent

	local panel = Instance.new("Frame")
	panel.Name = "Surface"
	panel.Size = UDim2.fromScale(1, 1)
	panel.BackgroundColor3 = palette.navy
	panel.BorderSizePixel = 0
	panel.Parent = modal
	addCorner(panel, 24)
	addStroke(panel, palette.navy2, 5, 0)

	local fill = Instance.new("Frame")
	fill.Name = "Fill"
	fill.Size = UDim2.fromScale(1, 1)
	fill.BackgroundColor3 = palette.cobalt
	fill.BorderSizePixel = 0
	fill.Parent = panel
	addCorner(fill, 24)

	local grad = Instance.new("UIGradient")
	grad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(14, 35, 66)),
		ColorSequenceKeypoint.new(0.3, Color3.fromRGB(33, 99, 173)),
		ColorSequenceKeypoint.new(0.72, Color3.fromRGB(46, 138, 215)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(13, 30, 60)),
	})
	grad.Rotation = 90
	grad.Parent = fill

	local gloss = Instance.new("Frame")
	gloss.Name = "Gloss"
	gloss.BackgroundColor3 = Color3.new(1, 1, 1)
	gloss.BackgroundTransparency = 0.88
	gloss.BorderSizePixel = 0
	gloss.Position = UDim2.fromScale(0.025, 0.03)
	gloss.Size = UDim2.fromScale(0.95, 0.18)
	gloss.Parent = panel
	addCorner(gloss, 16)

	local rim = Instance.new("Frame")
	rim.Name = "InnerRim"
	rim.BackgroundTransparency = 1
	rim.Size = UDim2.fromScale(1, 1)
	rim.Parent = panel
	addCorner(rim, 24)
	addStroke(rim, palette.gold, 2, 0.3)

	local pad = Instance.new("UIPadding")
	pad.PaddingTop = UDim.new(0, mobile and 16 or 18)
	pad.PaddingBottom = UDim.new(0, mobile and 16 or 18)
	pad.PaddingLeft = UDim.new(0, mobile and 16 or 18)
	pad.PaddingRight = UDim.new(0, mobile and 16 or 18)
	pad.Parent = panel

	local title = Instance.new("TextLabel")
	title.Name = "SettingsTitle"
	title.BackgroundTransparency = 1
	title.Size = UDim2.new(1, -70, 0, 32)
	title.Text = "Settings"
	title.TextColor3 = palette.text
	title.TextSize = mobile and 22 or 26
	title.FontFace = fonts.heading
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Parent = panel
	addTextConstraint(title, 16, 28)

	local close = createButton(panel, "SettingsCloseButton", "Close", "close", 0, false, mobile)
	close.AnchorPoint = Vector2.new(1, 0)
	close.Position = UDim2.new(1, 0, 0, 0)
	close.Size = UDim2.fromOffset(mobile and 116 or 108, mobile and 48 or 44)

	local content = Instance.new("Frame")
	content.Name = "Body"
	content.BackgroundTransparency = 1
	content.Position = UDim2.new(0, 0, 0, mobile and 52 or 54)
	content.Size = UDim2.new(1, 0, 1, -(mobile and 52 or 54))
	content.Parent = panel

	local layout = Instance.new("UIListLayout")
	layout.Padding = UDim.new(0, mobile and 14 or 12)
	layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	layout.VerticalAlignment = Enum.VerticalAlignment.Top
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Parent = content

	local musicRow = createRowBase(content, "MusicRow", mobile)
	musicRow.LayoutOrder = 1

	local musicLabel = Instance.new("TextLabel")
	musicLabel.Name = "MusicLabel"
	musicLabel.BackgroundTransparency = 1
	musicLabel.AnchorPoint = Vector2.new(0, 0.5)
	musicLabel.Position = UDim2.new(0, 16, 0.5, 0)
	musicLabel.Size = UDim2.new(0.4, -16, 0, 28)
	musicLabel.Text = "Music"
	musicLabel.TextColor3 = palette.text
	musicLabel.TextSize = mobile and 18 or 18
	musicLabel.FontFace = fonts.body
	musicLabel.TextXAlignment = Enum.TextXAlignment.Left
	musicLabel.Parent = musicRow
	addTextConstraint(musicLabel, 14, 19)

	local toggle = Instance.new("TextButton")
	toggle.Name = "MusicToggle"
	toggle.Text = ""
	toggle.AutoButtonColor = false
	toggle.BackgroundTransparency = 1
	toggle.BorderSizePixel = 0
	toggle.AnchorPoint = Vector2.new(1, 0.5)
	toggle.Position = UDim2.new(1, -14, 0.5, 0)
	toggle.Size = UDim2.fromOffset(mobile and 90 or 82, mobile and 42 or 38)
	toggle.Parent = musicRow

	local toggleVisual = Instance.new("Frame")
	toggleVisual.Name = "Visual"
	toggleVisual.Size = UDim2.fromScale(1, 1)
	toggleVisual.BackgroundTransparency = 1
	toggleVisual.Parent = toggle

	local toggleOff = Instance.new("Frame")
	toggleOff.Name = "MusicToggleOff"
	toggleOff.Size = UDim2.fromScale(1, 1)
	toggleOff.BackgroundColor3 = Color3.fromRGB(41, 60, 91)
	toggleOff.BorderSizePixel = 0
	toggleOff.Parent = toggleVisual
	addCorner(toggleOff, 999)
	addStroke(toggleOff, palette.navy2, 3, 0)

	local offGloss = Instance.new("Frame")
	offGloss.Name = "Gloss"
	offGloss.BackgroundColor3 = Color3.new(1, 1, 1)
	offGloss.BackgroundTransparency = 0.9
	offGloss.BorderSizePixel = 0
	offGloss.Position = UDim2.fromScale(0.03, 0.08)
	offGloss.Size = UDim2.fromScale(0.94, 0.36)
	offGloss.Parent = toggleOff
	addCorner(offGloss, 999)

	local toggleOn = Instance.new("Frame")
	toggleOn.Name = "MusicToggleOn"
	toggleOn.Size = UDim2.fromScale(1, 1)
	toggleOn.BackgroundColor3 = palette.success
	toggleOn.BackgroundTransparency = 0.08
	toggleOn.BorderSizePixel = 0
	toggleOn.Visible = true
	toggleOn.Parent = toggleVisual
	addCorner(toggleOn, 999)
	addStroke(toggleOn, palette.gold, 2, 0.25)

	local onGrad = Instance.new("UIGradient")
	onGrad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(33, 153, 114)),
		ColorSequenceKeypoint.new(0.5, Color3.fromRGB(88, 222, 171)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(43, 169, 126)),
	})
	onGrad.Rotation = 90
	onGrad.Parent = toggleOn

	local thumb = Instance.new("Frame")
	thumb.Name = "MusicToggleThumb"
	thumb.AnchorPoint = Vector2.new(0, 0.5)
	thumb.Position = UDim2.new(0, 4, 0.5, 0)
	thumb.Size = UDim2.fromOffset(mobile and 34 or 30, mobile and 34 or 30)
	thumb.BackgroundColor3 = palette.goldSoft
	thumb.BorderSizePixel = 0
	thumb.Parent = toggleVisual
	addCorner(thumb, 999)
	addStroke(thumb, palette.navy2, 2, 0.2)

	local volumeRow = createRowBase(content, "VolumeRow", mobile)
	volumeRow.LayoutOrder = 2

	local volumeLabel = Instance.new("TextLabel")
	volumeLabel.Name = "VolumeLabel"
	volumeLabel.BackgroundTransparency = 1
	volumeLabel.AnchorPoint = Vector2.new(0, 0.5)
	volumeLabel.Position = mobile and UDim2.new(0, 16, 0, 18) or UDim2.new(0, 16, 0.5, 0)
	volumeLabel.Size = mobile and UDim2.new(1, -32, 0, 20) or UDim2.new(0.28, -16, 0, 28)
	volumeLabel.Text = "Volume"
	volumeLabel.TextColor3 = palette.text
	volumeLabel.TextSize = 18
	volumeLabel.FontFace = fonts.body
	volumeLabel.TextXAlignment = Enum.TextXAlignment.Left
	volumeLabel.Parent = volumeRow
	addTextConstraint(volumeLabel, 14, 19)

	local slider = Instance.new("TextButton")
	slider.Name = "VolumeSlider"
	slider.Text = ""
	slider.AutoButtonColor = false
	slider.BackgroundTransparency = 1
	slider.BorderSizePixel = 0
	slider.AnchorPoint = mobile and Vector2.new(0.5, 1) or Vector2.new(1, 0.5)
	slider.Position = mobile and UDim2.new(0.5, 0, 1, -10) or UDim2.new(1, -14, 0.5, 0)
	slider.Size = mobile and UDim2.new(1, -28, 0, 34) or UDim2.new(0.6, -18, 0, 28)
	slider.Parent = volumeRow

	local sliderVisual = Instance.new("Frame")
	sliderVisual.Name = "Visual"
	sliderVisual.Size = UDim2.fromScale(1, 1)
	sliderVisual.BackgroundTransparency = 1
	sliderVisual.Parent = slider

	local track = Instance.new("Frame")
	track.Name = "VolumeSliderTrack"
	track.AnchorPoint = Vector2.new(0.5, 0.5)
	track.Position = UDim2.fromScale(0.5, 0.5)
	track.Size = UDim2.new(1, 0, 0, mobile and 16 or 14)
	track.BackgroundColor3 = Color3.fromRGB(19, 47, 83)
	track.BorderSizePixel = 0
	track.Parent = sliderVisual
	addCorner(track, 999)
	addStroke(track, palette.navy2, 3, 0)

	local trackGrad = Instance.new("UIGradient")
	trackGrad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(18, 48, 93)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(34, 90, 164)),
	})
	trackGrad.Parent = track

	local fillClip = Instance.new("Frame")
	fillClip.Name = "VolumeSliderFillClip"
	fillClip.BackgroundTransparency = 1
	fillClip.ClipsDescendants = true
	fillClip.AnchorPoint = Vector2.new(0, 0.5)
	fillClip.Position = UDim2.new(0, 0, 0.5, 0)
	fillClip.Size = UDim2.fromScale(0.72, 1)
	fillClip.Parent = sliderVisual

	local fill = Instance.new("Frame")
	fill.Name = "VolumeSliderFill"
	fill.AnchorPoint = Vector2.new(0, 0.5)
	fill.Position = UDim2.new(0, 0, 0.5, 0)
	fill.Size = UDim2.new(1, 0, 0, mobile and 16 or 14)
	fill.BackgroundColor3 = palette.cyan
	fill.BorderSizePixel = 0
	fill.Parent = fillClip
	addCorner(fill, 999)

	local fillGrad = Instance.new("UIGradient")
	fillGrad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, palette.cobalt),
		ColorSequenceKeypoint.new(0.55, palette.cyan),
		ColorSequenceKeypoint.new(1, palette.cyanSoft),
	})
	fillGrad.Parent = fill

	local handle = Instance.new("Frame")
	handle.Name = "VolumeSliderHandle"
	handle.AnchorPoint = Vector2.new(0.5, 0.5)
	handle.Position = UDim2.fromScale(0.72, 0.5)
	handle.Size = UDim2.fromOffset(mobile and 28 or 24, mobile and 28 or 24)
	handle.BackgroundColor3 = palette.goldSoft
	handle.BorderSizePixel = 0
	handle.Parent = sliderVisual
	addCorner(handle, 999)
	addStroke(handle, palette.navy2, 3, 0.1)

	local value = Instance.new("TextLabel")
	value.Name = "VolumeValue"
	value.BackgroundTransparency = 1
	value.AnchorPoint = Vector2.new(1, 0.5)
	value.Position = mobile and UDim2.new(1, -4, 0, 18) or UDim2.new(1, -2, 0.5, 0)
	value.Size = mobile and UDim2.fromOffset(48, 18) or UDim2.fromOffset(50, 22)
	value.Text = "72%"
	value.TextColor3 = palette.textSecondary
	value.TextSize = mobile and 14 or 16
	value.FontFace = fonts.numeric
	value.TextXAlignment = Enum.TextXAlignment.Right
	value.Parent = volumeRow
	addTextConstraint(value, 12, 16)

	return modal
end

local function createCreditsPanel(parent, mobile)
	local modal = Instance.new("CanvasGroup")
	modal.Name = "CreditsPanel"
	modal.AnchorPoint = Vector2.new(0.5, 0.5)
	modal.Position = mobile and UDim2.fromScale(0.5, 0.36) or UDim2.fromScale(0.5, 0.4)
	modal.Size = mobile and UDim2.fromScale(0.84, 0.24) or UDim2.fromScale(0.32, 0.24)
	modal.BackgroundTransparency = 1
	modal.GroupTransparency = 1
	modal.Visible = false
	modal.Parent = parent

	local panel = Instance.new("Frame")
	panel.Name = "Surface"
	panel.Size = UDim2.fromScale(1, 1)
	panel.BackgroundColor3 = palette.navy
	panel.BorderSizePixel = 0
	panel.Parent = modal
	addCorner(panel, 24)
	addStroke(panel, palette.navy2, 5, 0)

	local fill = Instance.new("Frame")
	fill.Name = "Fill"
	fill.Size = UDim2.fromScale(1, 1)
	fill.BackgroundColor3 = palette.cobalt
	fill.BorderSizePixel = 0
	fill.Parent = panel
	addCorner(fill, 24)

	local grad = Instance.new("UIGradient")
	grad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(13, 32, 63)),
		ColorSequenceKeypoint.new(0.32, Color3.fromRGB(33, 99, 173)),
		ColorSequenceKeypoint.new(0.72, Color3.fromRGB(44, 130, 204)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(12, 28, 57)),
	})
	grad.Rotation = 90
	grad.Parent = fill

	local gloss = Instance.new("Frame")
	gloss.Name = "Gloss"
	gloss.BackgroundColor3 = Color3.new(1, 1, 1)
	gloss.BackgroundTransparency = 0.89
	gloss.BorderSizePixel = 0
	gloss.Position = UDim2.fromScale(0.025, 0.035)
	gloss.Size = UDim2.fromScale(0.95, 0.2)
	gloss.Parent = panel
	addCorner(gloss, 16)

	local rim = Instance.new("Frame")
	rim.Name = "InnerRim"
	rim.BackgroundTransparency = 1
	rim.Size = UDim2.fromScale(1, 1)
	rim.Parent = panel
	addCorner(rim, 24)
	addStroke(rim, palette.gold, 2, 0.3)

	local pad = Instance.new("UIPadding")
	pad.PaddingTop = UDim.new(0, mobile and 16 or 18)
	pad.PaddingBottom = UDim.new(0, mobile and 16 or 18)
	pad.PaddingLeft = UDim.new(0, mobile and 16 or 18)
	pad.PaddingRight = UDim.new(0, mobile and 16 or 18)
	pad.Parent = panel

	local title = Instance.new("TextLabel")
	title.Name = "CreditsTitle"
	title.BackgroundTransparency = 1
	title.Size = UDim2.new(1, -70, 0, 32)
	title.Text = "Credits"
	title.TextColor3 = palette.text
	title.TextSize = mobile and 22 or 26
	title.FontFace = fonts.heading
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Parent = panel
	addTextConstraint(title, 16, 28)

	local close = createButton(panel, "CreditsCloseButton", "Close", "close", 0, false, mobile)
	close.AnchorPoint = Vector2.new(1, 0)
	close.Position = UDim2.new(1, 0, 0, 0)
	close.Size = UDim2.fromOffset(mobile and 116 or 108, mobile and 48 or 44)

	local body = Instance.new("TextLabel")
	body.Name = "CreditsBody"
	body.BackgroundTransparency = 1
	body.Position = UDim2.new(0, 0, 0, mobile and 52 or 54)
	body.Size = UDim2.new(1, 0, 1, -(mobile and 52 or 54))
	body.Text = "AURORA\nUI concept and menu presentation.\nReplace with your live project credits."
	body.TextWrapped = true
	body.TextYAlignment = Enum.TextYAlignment.Top
	body.TextXAlignment = Enum.TextXAlignment.Left
	body.TextColor3 = palette.textSecondary
	body.TextSize = mobile and 15 or 18
	body.FontFace = fonts.body
	body.Parent = panel
	addTextConstraint(body, 13, 18)

	return modal
end

local function createComposition(parent, mobile)
	createBackground(parent)

	local dimmer = Instance.new("Frame")
	dimmer.Name = "ModalDim"
	dimmer.BackgroundColor3 = Color3.new(0, 0, 0)
	dimmer.BackgroundTransparency = 0.56
	dimmer.BorderSizePixel = 0
	dimmer.Size = UDim2.fromScale(1, 1)
	dimmer.Visible = false
	dimmer.ZIndex = 20
	dimmer.Parent = parent

	local menu = createMenuSurface(parent, mobile)
	menu.ZIndex = 10

	local settings = createSettingsPanel(parent, mobile)
	settings.ZIndex = 30

	local credits = createCreditsPanel(parent, mobile)
	credits.ZIndex = 30
end

function View.build()
	local gui = Instance.new("ScreenGui")
	gui.Name = "AURORA"
	gui.ResetOnSpawn = false
	gui.IgnoreGuiInset = false
	gui.DisplayOrder = 0
	gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

	local desktop = Instance.new("Frame")
	desktop.Name = "_NexusDesktop"
	desktop.BackgroundTransparency = 1
	desktop.Size = UDim2.fromScale(1, 1)
	desktop.Visible = true
	desktop.Parent = gui
	createComposition(desktop, false)

	local mobile = Instance.new("Frame")
	mobile.Name = "_NexusMobile"
	mobile.BackgroundTransparency = 1
	mobile.Size = UDim2.fromScale(1, 1)
	mobile.Visible = false
	mobile.Parent = gui
	createComposition(mobile, true)

	local hook = Instance.new("Folder")
	hook.Name = "PlayIntegrationHook"
	hook.Parent = gui

	local event = Instance.new("BindableEvent")
	event.Name = "PlayRequested"
	event.Parent = hook

	local controllerFolder = Instance.new("Folder")
	controllerFolder.Name = "PanelControllerBehavior"
	controllerFolder.Parent = gui

	local meta = Instance.new("StringValue")
	meta.Name = "ArtworkWarnings"
	meta.Value = table.concat({
		"Required artwork unmet: cmp_settings_close, cmp_credits_close component_surface unavailable; using native surface.",
		"Required artwork unmet: cmp_settings_panel panel_surface unavailable; using native surface.",
		"Required artwork unmet: cmp_credits_panel panel_surface unavailable; using native surface.",
		"Required artwork unmet: cmp_settings_button, cmp_credits_button component_surface unavailable; using native surface.",
		"Required artwork unmet: cmp_play_button component_surface unavailable; using native surface.",
		"Required artwork unmet: cmp_credits_button credits icon unavailable; using coherent info fallback.",
		"Required artwork unmet: cmp_music_toggle toggle artwork unavailable; using native functional pieces.",
		"Required artwork unmet: cmp_settings_button settings icon unavailable; using coherent procedural fallback.",
		"Required artwork unmet: cmp_volume_slider slider artwork unavailable; using native functional pieces.",
		"Required artwork unmet: cmp_title_plate title plate ornament unavailable; omitted image ornament and built native plate.",
		"Required artwork unmet: cmp_panel_corners_credits corner ornament unavailable; omitted optional decoration.",
		"Required artwork unmet: cmp_play_button play icon unavailable; using coherent procedural fallback.",
		"Required artwork unmet: cmp_panel_corners_settings corner ornament unavailable; omitted optional decoration.",
		"Required artwork unmet: cmp_root_corners corner ornament unavailable; omitted optional decoration.",
		"Required artwork unmet: cmp_settings_close, cmp_credits_close close icon unavailable; using coherent procedural fallback.",
	}, "\n")
	meta.Parent = controllerFolder

	return gui
end

return View