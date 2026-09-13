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
		return shape((x1 + x2) / 2, (y1 + y2) / 2, math.sqrt(dx * dx + dy * dy), width or 0.14, math.deg(math.atan2(dy, dx)), 0.5)
	end

	local function ring(x, y, radius, width)
		for index = 0, 11 do
			local a = index * math.pi / 6
			local b = (index + 1) * math.pi / 6
			bar(x + math.cos(a) * radius, y + math.sin(a) * radius, x + math.cos(b) * radius, y + math.sin(b) * radius, width or 0.12)
		end
	end

	if role == "play" then
		for index = 0, 15 do
			local x = index / 16
			shape(0.22 + x * 0.58, 0.5, 0.58 / 16 + 0.005, 0.76 * (1 - x), 0, nil)
		end
	elseif role == "close" or role == "plus" then
		shape(0.5, 0.5, 0.88, 0.15, role == "close" and 45 or 0, 0.5)
		shape(0.5, 0.5, 0.88, 0.15, role == "close" and -45 or 90, 0.5)
	elseif role == "settings" then
		ring(0.5, 0.5, 0.25, 0.16)
		for index = 0, 7 do
			local angle = index * math.pi / 4
			shape(0.5 + math.cos(angle) * 0.33, 0.5 + math.sin(angle) * 0.33, 0.26, 0.16, math.deg(angle), 0.3)
		end
	else
		ring(0.5, 0.5, 0.39, 0.11)
		shape(0.5, 0.31, 0.14, 0.14, 0, 0.5)
		shape(0.5, 0.62, 0.14, 0.3, 0, 0.4)
	end

	return holder
end

local palette = {
	bg0 = Color3.fromRGB(7, 17, 36),
	bg1 = Color3.fromRGB(11, 23, 48),
	bg2 = Color3.fromRGB(16, 46, 86),
	navy = Color3.fromRGB(10, 34, 71),
	cyan = Color3.fromRGB(51, 207, 255),
	cobalt = Color3.fromRGB(45, 91, 255),
	gold = Color3.fromRGB(231, 185, 74),
	text = Color3.fromRGB(244, 251, 255),
	textSoft = Color3.fromRGB(187, 213, 242),
	success = Color3.fromRGB(73, 217, 139),
	off = Color3.fromRGB(73, 98, 133),
	shadow = Color3.fromRGB(7, 17, 31),
}

local fontDisplay = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.ExtraBold, Enum.FontStyle.Normal)
local fontHeading = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.Bold, Enum.FontStyle.Normal)
local fontButton = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.SemiBold, Enum.FontStyle.Normal)
local fontBody = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.Medium, Enum.FontStyle.Normal)
local fontCaption = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.Medium, Enum.FontStyle.Normal)
local fontNumeric = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.SemiBold, Enum.FontStyle.Normal)

local function addNativeShadow(parent)
	local ok, shadow = pcall(Instance.new, "UIShadow")
	if ok and shadow then
		shadow.Color = Color3.new(0, 0, 0)
		shadow.Transparency = 0.72
		shadow.BlurRadius = UDim.new(0, 16)
		shadow.Offset = UDim2.fromOffset(0, 6)
		shadow.Parent = parent
		return shadow
	end
	return nil
end

local function makeTextLabel(parent, name, text, size, face, color, alignX)
	local label = Instance.new("TextLabel")
	label.Name = name
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextColor3 = color
	label.TextScaled = false
	label.TextSize = size
	label.TextWrapped = true
	label.FontFace = face
	label.TextXAlignment = alignX or Enum.TextXAlignment.Center
	label.TextYAlignment = Enum.TextYAlignment.Center
	label.BorderSizePixel = 0
	label.Parent = parent

	local constraint = Instance.new("UITextSizeConstraint")
	constraint.MinTextSize = math.max(12, size - 8)
	constraint.MaxTextSize = size
	constraint.Parent = label

	return label
end

local function makeBackground(root)
	local backgroundRoot = Instance.new("Frame")
	backgroundRoot.Name = "BackgroundRoot"
	backgroundRoot.BackgroundColor3 = palette.bg0
	backgroundRoot.BorderSizePixel = 0
	backgroundRoot.Size = UDim2.fromScale(1, 1)
	backgroundRoot.Parent = root

	local grad = Instance.new("UIGradient")
	grad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, palette.bg1),
		ColorSequenceKeypoint.new(0.5, palette.bg0),
		ColorSequenceKeypoint.new(1, palette.bg2),
	})
	grad.Rotation = 90
	grad.Parent = backgroundRoot

	local bloomTop = Instance.new("Frame")
	bloomTop.Name = "BloomTop"
	bloomTop.AnchorPoint = Vector2.new(0.5, 0)
	bloomTop.Position = UDim2.fromScale(0.5, -0.08)
	bloomTop.Size = UDim2.fromScale(0.9, 0.42)
	bloomTop.BackgroundColor3 = palette.cobalt
	bloomTop.BackgroundTransparency = 0.82
	bloomTop.BorderSizePixel = 0
	bloomTop.Parent = backgroundRoot

	local topCorner = Instance.new("UICorner")
	topCorner.CornerRadius = UDim.new(1, 0)
	topCorner.Parent = bloomTop

	local bloomTopGrad = Instance.new("UIGradient")
	bloomTopGrad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, palette.cyan),
		ColorSequenceKeypoint.new(1, palette.cobalt),
	})
	bloomTopGrad.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.08),
		NumberSequenceKeypoint.new(1, 0.5),
	})
	bloomTopGrad.Rotation = 0
	bloomTopGrad.Parent = bloomTop

	local bloomCenter = Instance.new("Frame")
	bloomCenter.Name = "BloomCenter"
	bloomCenter.AnchorPoint = Vector2.new(0.5, 0.5)
	bloomCenter.Position = UDim2.fromScale(0.5, 0.5)
	bloomCenter.Size = UDim2.fromScale(0.56, 0.38)
	bloomCenter.BackgroundColor3 = palette.cyan
	bloomCenter.BackgroundTransparency = 0.9
	bloomCenter.BorderSizePixel = 0
	bloomCenter.Parent = backgroundRoot

	local centerCorner = Instance.new("UICorner")
	centerCorner.CornerRadius = UDim.new(1, 0)
	centerCorner.Parent = bloomCenter

	local centerGrad = Instance.new("UIGradient")
	centerGrad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, palette.cyan),
		ColorSequenceKeypoint.new(1, palette.cobalt),
	})
	centerGrad.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.12),
		NumberSequenceKeypoint.new(1, 0.7),
	})
	centerGrad.Parent = bloomCenter

	local vignette = Instance.new("Frame")
	vignette.Name = "Vignette"
	vignette.BackgroundTransparency = 1
	vignette.BorderSizePixel = 0
	vignette.Size = UDim2.fromScale(1, 1)
	vignette.Parent = backgroundRoot

	for _, spec in ipairs({
		{ "TopEdge", UDim2.new(1, 0, 0, 120), UDim2.new(0, 0, 0, 0) },
		{ "BottomEdge", UDim2.new(1, 0, 0, 140), UDim2.new(0, 0, 1, -140) },
		{ "LeftEdge", UDim2.new(0, 120, 1, 0), UDim2.new(0, 0, 0, 0) },
		{ "RightEdge", UDim2.new(0, 120, 1, 0), UDim2.new(1, -120, 0, 0) },
	}) do
		local edge = Instance.new("Frame")
		edge.Name = spec[1]
		edge.Size = spec[2]
		edge.Position = spec[3]
		edge.BorderSizePixel = 0
		edge.BackgroundColor3 = palette.shadow
		edge.BackgroundTransparency = 0.72
		edge.Parent = vignette
	end

	local cornerOrnaments = Instance.new("Frame")
	cornerOrnaments.Name = "CornerOrnaments"
	cornerOrnaments.BackgroundTransparency = 1
	cornerOrnaments.BorderSizePixel = 0
	cornerOrnaments.Size = UDim2.fromScale(1, 1)
	cornerOrnaments.Parent = backgroundRoot

	for _, spec in ipairs({
		{ "TopLeft", 0, 0, 0 },
		{ "TopRight", 1, 0, 90 },
		{ "BottomRight", 1, 1, 180 },
		{ "BottomLeft", 0, 1, 270 },
	}) do
		local holder = Instance.new("Frame")
		holder.Name = spec[1]
		holder.BackgroundTransparency = 1
		holder.BorderSizePixel = 0
		holder.AnchorPoint = Vector2.new(spec[2], spec[3])
		holder.Position = UDim2.fromScale(spec[2], spec[3])
		holder.Size = UDim2.fromOffset(132, 132)
		holder.Parent = cornerOrnaments

		local a = Instance.new("Frame")
		a.Name = "ArmA"
		a.BackgroundColor3 = palette.navy
		a.BorderSizePixel = 0
		a.AnchorPoint = Vector2.new(0.5, 0.5)
		a.Position = UDim2.fromScale(0.32, 0.24)
		a.Size = UDim2.fromOffset(70, 12)
		a.Rotation = spec[4]
		a.Parent = holder
		local ac = Instance.new("UICorner")
		ac.CornerRadius = UDim.new(1, 0)
		ac.Parent = a

		local b = Instance.new("Frame")
		b.Name = "ArmB"
		b.BackgroundColor3 = palette.navy
		b.BorderSizePixel = 0
		b.AnchorPoint = Vector2.new(0.5, 0.5)
		b.Position = UDim2.fromScale(0.24, 0.32)
		b.Size = UDim2.fromOffset(12, 70)
		b.Rotation = spec[4]
		b.Parent = holder
		local bc = Instance.new("UICorner")
		bc.CornerRadius = UDim.new(1, 0)
		bc.Parent = b

		local gold = Instance.new("Frame")
		gold.Name = "GoldTip"
		gold.BackgroundColor3 = palette.gold
		gold.BorderSizePixel = 0
		gold.AnchorPoint = Vector2.new(0.5, 0.5)
		gold.Position = UDim2.fromScale(0.41, 0.41)
		gold.Size = UDim2.fromOffset(18, 18)
		gold.Rotation = 45 + spec[4]
		gold.Parent = holder
	end

	return backgroundRoot
end

local function makeTitlePlate(parent, mobile)
	local holder = Instance.new("Frame")
	holder.Name = "TitlePlate"
	holder.BackgroundTransparency = 1
	holder.BorderSizePixel = 0
	holder.AnchorPoint = Vector2.new(0.5, 0)
	holder.Position = mobile and UDim2.fromScale(0.5, 0.07) or UDim2.fromScale(0.5, 0.09)
	holder.Size = mobile and UDim2.fromScale(0.8, 0.14) or UDim2.fromScale(0.54, 0.16)
	holder.Parent = parent

	local shadowHost = Instance.new("Frame")
	shadowHost.Name = "ShadowHost"
	shadowHost.BackgroundTransparency = 1
	shadowHost.BorderSizePixel = 0
	shadowHost.Size = UDim2.fromScale(1, 1)
	shadowHost.Parent = holder
	addNativeShadow(shadowHost)

	local plate = Instance.new("Frame")
	plate.Name = "Visual"
	plate.BackgroundColor3 = Color3.new(1, 1, 1)
	plate.BorderSizePixel = 0
	plate.AnchorPoint = Vector2.new(0.5, 0.5)
	plate.Position = UDim2.fromScale(0.5, 0.5)
	plate.Size = UDim2.fromScale(1, 1)
	plate.Parent = holder

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, mobile and 18 or 22)
	corner.Parent = plate

	local stroke = Instance.new("UIStroke")
	stroke.Color = palette.navy
	stroke.Thickness = mobile and 4 or 5
	stroke.Transparency = 0
	stroke.Parent = plate

	local grad = Instance.new("UIGradient")
	grad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, palette.cyan),
		ColorSequenceKeypoint.new(0.52, Color3.fromRGB(120, 235, 255)),
		ColorSequenceKeypoint.new(1, palette.cobalt),
	})
	grad.Rotation = 90
	grad.Parent = plate

	local topGloss = Instance.new("Frame")
	topGloss.Name = "Gloss"
	topGloss.BackgroundColor3 = Color3.new(1, 1, 1)
	topGloss.BackgroundTransparency = 0.76
	topGloss.BorderSizePixel = 0
	topGloss.Size = UDim2.new(1, -16, 0.38, 0)
	topGloss.Position = UDim2.new(0, 8, 0, 8)
	topGloss.Parent = plate
	local topGlossCorner = Instance.new("UICorner")
	topGlossCorner.CornerRadius = UDim.new(0, mobile and 14 or 16)
	topGlossCorner.Parent = topGloss

	local trim = Instance.new("Frame")
	trim.Name = "GoldTrim"
	trim.AnchorPoint = Vector2.new(0.5, 1)
	trim.Position = UDim2.fromScale(0.5, 1)
	trim.Size = UDim2.new(1, -18, 0, 5)
	trim.BackgroundColor3 = palette.gold
	trim.BorderSizePixel = 0
	trim.Parent = plate
	local trimCorner = Instance.new("UICorner")
	trimCorner.CornerRadius = UDim.new(1, 0)
	trimCorner.Parent = trim

	local leftCap = Instance.new("Frame")
	leftCap.Name = "LeftCap"
	leftCap.AnchorPoint = Vector2.new(0, 0.5)
	leftCap.Position = UDim2.fromScale(0, 0.5)
	leftCap.Size = UDim2.new(0, mobile and 42 or 56, 0.72, 0)
	leftCap.BackgroundColor3 = palette.navy
	leftCap.BorderSizePixel = 0
	leftCap.Parent = plate

	local rightCap = leftCap:Clone()
	rightCap.Name = "RightCap"
	rightCap.AnchorPoint = Vector2.new(1, 0.5)
	rightCap.Position = UDim2.fromScale(1, 0.5)
	rightCap.Parent = plate

	local title = makeTextLabel(holder, "AuroraTitle", "AURORA", mobile and 34 or 44, fontDisplay, palette.text)
	title.Size = UDim2.new(1, -20, 1, -8)
	title.Position = UDim2.new(0, 10, 0, 2)
	title.ZIndex = 2

	local titleStroke = Instance.new("UIStroke")
	titleStroke.Color = palette.navy
	titleStroke.Transparency = 0.56
	titleStroke.Thickness = 1.2
	titleStroke.Parent = title

	return holder
end

local function makeImageButton(parent, name, imageUri, slice, sliceScale, size)
	local button = Instance.new("ImageButton")
	button.Name = name
	button.BackgroundTransparency = 1
	button.AutoButtonColor = false
	button.Image = imageUri
	button.ImageColor3 = Color3.new(1, 1, 1)
	button.ScaleType = Enum.ScaleType.Slice
	button.SliceCenter = Rect.new(slice[1], slice[2], slice[3], slice[4])
	button.SliceScale = sliceScale
	button.Size = size
	button.Parent = parent
	return button
end

local function makeButtonContents(button, labelText, iconRole, iconImageUri, mobile, isLarge)
	local visual = Instance.new("Frame")
	visual.Name = "Visual"
	visual.BackgroundTransparency = 1
	visual.BorderSizePixel = 0
	visual.Size = UDim2.fromScale(1, 1)
	visual.Parent = button

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.BorderSizePixel = 0
	content.Size = UDim2.new(1, -22, 1, -14)
	content.Position = UDim2.new(0, 11, 0, 7)
	content.Parent = visual

	local list = Instance.new("UIListLayout")
	list.FillDirection = Enum.FillDirection.Horizontal
	list.HorizontalAlignment = Enum.HorizontalAlignment.Center
	list.VerticalAlignment = Enum.VerticalAlignment.Center
	list.Padding = UDim.new(0, 12)
	list.Parent = content

	local pad = Instance.new("UIPadding")
	pad.PaddingLeft = UDim.new(0, 8)
	pad.PaddingRight = UDim.new(0, 8)
	pad.Parent = content

	local iconHolder
	if iconImageUri then
		iconHolder = Instance.new("ImageLabel")
		iconHolder.Name = button.Name .. "Icon"
		iconHolder.BackgroundTransparency = 1
		iconHolder.Size = UDim2.fromOffset(mobile and 28 or 30, mobile and 28 or 30)
		iconHolder.Image = iconImageUri
		iconHolder.ImageColor3 = Color3.new(1, 1, 1)
		iconHolder.ScaleType = Enum.ScaleType.Fit
		iconHolder.Parent = content
	else
		iconHolder = createNexusIcon(content, iconRole, {
			name = button.Name .. "Icon",
			size = mobile and 28 or 30,
			padding = 12,
			color = Color3.new(1, 1, 1),
		})
	end

	local text = makeTextLabel(content, "Label", labelText, isLarge and (mobile and 20 or 24) or (mobile and 20 or 22), fontButton, palette.text)
	text.AutomaticSize = Enum.AutomaticSize.X
	text.Size = UDim2.fromOffset(10, 32)
	text.TextWrapped = false

	local textStroke = Instance.new("UIStroke")
	textStroke.Color = palette.navy
	textStroke.Transparency = 0.62
	textStroke.Thickness = 1
	textStroke.Parent = text

	return visual
end

local function makeNativeCloseButton(parent, mobile)
	local button = Instance.new("TextButton")
	button.Name = "SettingsCloseButton"
	button.BackgroundColor3 = Color3.fromRGB(26, 83, 138)
	button.AutoButtonColor = false
	button.Text = ""
	button.BorderSizePixel = 0
	button.Size = mobile and UDim2.fromOffset(52, 52) or UDim2.fromOffset(46, 46)
	button.Parent = parent

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 14)
	corner.Parent = button

	local stroke = Instance.new("UIStroke")
	stroke.Color = palette.navy
	stroke.Thickness = 4
	stroke.Parent = button

	local grad = Instance.new("UIGradient")
	grad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, palette.cyan),
		ColorSequenceKeypoint.new(1, palette.cobalt),
	})
	grad.Rotation = 90
	grad.Parent = button

	local trim = Instance.new("Frame")
	trim.Name = "GoldTrim"
	trim.AnchorPoint = Vector2.new(0.5, 1)
	trim.Position = UDim2.fromScale(0.5, 1)
	trim.Size = UDim2.new(1, -10, 0, 4)
	trim.BackgroundColor3 = palette.gold
	trim.BorderSizePixel = 0
	trim.Parent = button
	local trimCorner = Instance.new("UICorner")
	trimCorner.CornerRadius = UDim.new(1, 0)
	trimCorner.Parent = trim

	local visual = Instance.new("Frame")
	visual.Name = "Visual"
	visual.BackgroundTransparency = 1
	visual.BorderSizePixel = 0
	visual.Size = UDim2.fromScale(1, 1)
	visual.Parent = button

	createNexusIcon(visual, "close", {
		name = "SettingsCloseButtonIcon",
		size = mobile and 24 or 22,
		padding = 10,
		color = Color3.new(1, 1, 1),
	}).AnchorPoint = Vector2.new(0.5, 0.5)
	visual.SettingsCloseButtonIcon.Position = UDim2.fromScale(0.5, 0.5)

	return button
end

local function makeMenuButton(parent, nodeName, labelText, imageUri, slice, mobile, iconRole, iconImageUri, heightScale, large)
	local sizeY = large and (mobile and 0.16 or 0.19) or (mobile and 0.13 or 0.125)
	local button = makeImageButton(parent, nodeName, imageUri, slice, 0.2, UDim2.new(1, 0, sizeY * heightScale, 0))
	button.LayoutOrder = large and 1 or (nodeName == "SettingsButton" and 2 or 3)
	addNativeShadow(button)
	makeButtonContents(button, labelText, iconRole, iconImageUri, mobile, large)
	return button
end

local function makeRow(parent, name)
	local row = Instance.new("Frame")
	row.Name = name
	row.BackgroundColor3 = Color3.fromRGB(11, 40, 79)
	row.BackgroundTransparency = 0.18
	row.BorderSizePixel = 0
	row.Size = UDim2.new(1, 0, 0, 78)
	row.Parent = parent

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 16)
	corner.Parent = row

	local stroke = Instance.new("UIStroke")
	stroke.Color = palette.navy
	stroke.Thickness = 2
	stroke.Transparency = 0.22
	stroke.Parent = row

	local inner = Instance.new("Frame")
	inner.Name = "InnerGlow"
	inner.BackgroundTransparency = 0.7
	inner.BackgroundColor3 = palette.cyan
	inner.BorderSizePixel = 0
	inner.Size = UDim2.new(1, -10, 0.45, 0)
	inner.Position = UDim2.new(0, 5, 0, 5)
	inner.Parent = row
	local innerCorner = Instance.new("UICorner")
	innerCorner.CornerRadius = UDim.new(0, 14)
	innerCorner.Parent = inner

	local pad = Instance.new("UIPadding")
	pad.PaddingLeft = UDim.new(0, 18)
	pad.PaddingRight = UDim.new(0, 18)
	pad.PaddingTop = UDim.new(0, 12)
	pad.PaddingBottom = UDim.new(0, 12)
	pad.Parent = row

	return row
end

local function makeToggle(parent, mobile)
	local toggle = Instance.new("TextButton")
	toggle.Name = "MusicToggle"
	toggle.BackgroundTransparency = 1
	toggle.Text = ""
	toggle.AutoButtonColor = false
	toggle.Size = mobile and UDim2.fromOffset(116, 52) or UDim2.fromOffset(106, 48)
	toggle.Parent = parent

	local visual = Instance.new("Frame")
	visual.Name = "Visual"
	visual.BackgroundTransparency = 1
	visual.BorderSizePixel = 0
	visual.Size = UDim2.fromScale(1, 1)
	visual.Parent = toggle

	local ToggleOff = Instance.new("Frame")
	ToggleOff.Name = "ToggleOff"
	ToggleOff.BackgroundColor3 = palette.off
	ToggleOff.BorderSizePixel = 0
	ToggleOff.Size = UDim2.fromScale(1, 1)
	ToggleOff.Parent = visual
	local offCorner = Instance.new("UICorner")
	offCorner.CornerRadius = UDim.new(1, 0)
	offCorner.Parent = ToggleOff
	local offStroke = Instance.new("UIStroke")
	offStroke.Color = palette.navy
	offStroke.Thickness = 4
	offStroke.Parent = ToggleOff

	local offGrad = Instance.new("UIGradient")
	offGrad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(80, 107, 143)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(49, 73, 106)),
	})
	offGrad.Rotation = 90
	offGrad.Parent = ToggleOff

	local ToggleOn = Instance.new("Frame")
	ToggleOn.Name = "ToggleOn"
	ToggleOn.BackgroundColor3 = palette.success
	ToggleOn.BorderSizePixel = 0
	ToggleOn.Size = UDim2.fromScale(1, 1)
	ToggleOn.Visible = false
	ToggleOn.Parent = visual
	local onCorner = Instance.new("UICorner")
	onCorner.CornerRadius = UDim.new(1, 0)
	onCorner.Parent = ToggleOn
	local onStroke = Instance.new("UIStroke")
	onStroke.Color = palette.navy
	onStroke.Thickness = 4
	onStroke.Parent = ToggleOn
	local onGrad = Instance.new("UIGradient")
	onGrad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, palette.cyan),
		ColorSequenceKeypoint.new(0.5, Color3.fromRGB(104, 236, 255)),
		ColorSequenceKeypoint.new(1, palette.success),
	})
	onGrad.Rotation = 90
	onGrad.Parent = ToggleOn

	local toggleTrim = Instance.new("Frame")
	toggleTrim.Name = "ToggleTrim"
	toggleTrim.AnchorPoint = Vector2.new(0.5, 1)
	toggleTrim.Position = UDim2.fromScale(0.5, 1)
	toggleTrim.Size = UDim2.new(1, -18, 0, 4)
	toggleTrim.BackgroundColor3 = palette.gold
	toggleTrim.BorderSizePixel = 0
	toggleTrim.Parent = visual
	local toggleTrimCorner = Instance.new("UICorner")
	toggleTrimCorner.CornerRadius = UDim.new(1, 0)
	toggleTrimCorner.Parent = toggleTrim

	local thumb = Instance.new("Frame")
	thumb.Name = "ToggleThumb"
	thumb.AnchorPoint = Vector2.new(0, 0.5)
	thumb.Position = UDim2.new(0, 4, 0.5, 0)
	thumb.Size = mobile and UDim2.fromOffset(44, 44) or UDim2.fromOffset(40, 40)
	thumb.BackgroundColor3 = palette.text
	thumb.BorderSizePixel = 0
	thumb.Parent = visual

	local thumbCorner = Instance.new("UICorner")
	thumbCorner.CornerRadius = UDim.new(1, 0)
	thumbCorner.Parent = thumb

	local thumbStroke = Instance.new("UIStroke")
	thumbStroke.Color = palette.navy
	thumbStroke.Thickness = 3
	thumbStroke.Parent = thumb

	local thumbGloss = Instance.new("Frame")
	thumbGloss.Name = "ThumbGloss"
	thumbGloss.BackgroundColor3 = Color3.new(1, 1, 1)
	thumbGloss.BackgroundTransparency = 0.28
	thumbGloss.BorderSizePixel = 0
	thumbGloss.Size = UDim2.new(1, -10, 0.32, 0)
	thumbGloss.Position = UDim2.new(0, 5, 0, 4)
	thumbGloss.Parent = thumb
	local thumbGlossCorner = Instance.new("UICorner")
	thumbGlossCorner.CornerRadius = UDim.new(1, 0)
	thumbGlossCorner.Parent = thumbGloss

	local state = makeTextLabel(visual, "StateLabel", "ON", mobile and 16 or 15, fontBody, palette.text, Enum.TextXAlignment.Left)
	state.AnchorPoint = Vector2.new(1, 0.5)
	state.Position = UDim2.new(1, -16, 0.5, 0)
	state.Size = UDim2.fromOffset(40, 22)

	return toggle
end

local function makeSlider(parent, mobile)
	local slider = Instance.new("Frame")
	slider.Name = "VolumeSlider"
	slider.BackgroundTransparency = 1
	slider.BorderSizePixel = 0
	slider.Size = UDim2.new(1, 0, 0, mobile and 54 or 48)
	slider.Parent = parent

	local value = Instance.new("NumberValue")
	value.Name = "Value"
	value.Value = 0.75
	value.Parent = slider

	local labelValue = makeTextLabel(slider, "ValueLabel", "75%", mobile and 16 or 18, fontNumeric, palette.text, Enum.TextXAlignment.Right)
	labelValue.AnchorPoint = Vector2.new(1, 0)
	labelValue.Position = UDim2.new(1, 0, 0, 0)
	labelValue.Size = UDim2.fromOffset(66, 24)

	local trackButton = Instance.new("TextButton")
	trackButton.Name = "TrackButton"
	trackButton.BackgroundTransparency = 1
	trackButton.Text = ""
	trackButton.AutoButtonColor = false
	trackButton.Position = UDim2.new(0, 0, 0, mobile and 18 or 20)
	trackButton.Size = UDim2.new(1, -76, 0, mobile and 30 or 26)
	trackButton.Parent = slider

	local visual = Instance.new("Frame")
	visual.Name = "Visual"
	visual.BackgroundTransparency = 1
	visual.BorderSizePixel = 0
	visual.Size = UDim2.fromScale(1, 1)
	visual.Parent = trackButton

	local SliderTrack = Instance.new("Frame")
	SliderTrack.Name = "SliderTrack"
	SliderTrack.AnchorPoint = Vector2.new(0.5, 0.5)
	SliderTrack.Position = UDim2.fromScale(0.5, 0.5)
	SliderTrack.Size = UDim2.new(1, 0, 0, mobile and 20 or 18)
	SliderTrack.BackgroundColor3 = Color3.fromRGB(28, 68, 124)
	SliderTrack.BorderSizePixel = 0
	SliderTrack.Parent = visual
	local trackCorner = Instance.new("UICorner")
	trackCorner.CornerRadius = UDim.new(1, 0)
	trackCorner.Parent = SliderTrack
	local trackStroke = Instance.new("UIStroke")
	trackStroke.Color = palette.navy
	trackStroke.Thickness = 3
	trackStroke.Parent = SliderTrack
	local trackGrad = Instance.new("UIGradient")
	trackGrad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(39, 96, 170)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(17, 52, 104)),
	})
	trackGrad.Rotation = 90
	trackGrad.Parent = SliderTrack

	local clip = Instance.new("Frame")
	clip.Name = "FillClip"
	clip.BackgroundTransparency = 1
	clip.BorderSizePixel = 0
	clip.ClipsDescendants = true
	clip.Size = UDim2.new(value.Value, 0, 1, 0)
	clip.Parent = SliderTrack

	local SliderFill = Instance.new("Frame")
	SliderFill.Name = "SliderFill"
	SliderFill.Size = UDim2.fromScale(1, 1)
	SliderFill.BackgroundColor3 = palette.cyan
	SliderFill.BorderSizePixel = 0
	SliderFill.Parent = clip
	local fillCorner = Instance.new("UICorner")
	fillCorner.CornerRadius = UDim.new(1, 0)
	fillCorner.Parent = SliderFill
	local fillGrad = Instance.new("UIGradient")
	fillGrad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, palette.cyan),
		ColorSequenceKeypoint.new(0.6, Color3.fromRGB(133, 242, 255)),
		ColorSequenceKeypoint.new(1, palette.cobalt),
	})
	fillGrad.Rotation = 0
	fillGrad.Parent = SliderFill

	local notch = Instance.new("Frame")
	notch.Name = "GoldNotch"
	notch.AnchorPoint = Vector2.new(0.5, 0.5)
	notch.Position = UDim2.fromScale(0.5, 0.5)
	notch.Size = UDim2.new(0, 6, 1, 8)
	notch.BackgroundColor3 = palette.gold
	notch.BorderSizePixel = 0
	notch.Parent = SliderFill
	local notchCorner = Instance.new("UICorner")
	notchCorner.CornerRadius = UDim.new(1, 0)
	notchCorner.Parent = notch

	local SliderHandle = Instance.new("Frame")
	SliderHandle.Name = "SliderHandle"
	SliderHandle.AnchorPoint = Vector2.new(0.5, 0.5)
	SliderHandle.Position = UDim2.new(value.Value, 0, 0.5, 0)
	SliderHandle.Size = mobile and UDim2.fromOffset(34, 34) or UDim2.fromOffset(30, 30)
	SliderHandle.BackgroundColor3 = palette.text
	SliderHandle.BorderSizePixel = 0
	SliderHandle.Parent = visual
	local handleCorner = Instance.new("UICorner")
	handleCorner.CornerRadius = UDim.new(1, 0)
	handleCorner.Parent = SliderHandle
	local handleStroke = Instance.new("UIStroke")
	handleStroke.Color = palette.navy
	handleStroke.Thickness = 3
	handleStroke.Parent = SliderHandle
	local handleGloss = Instance.new("Frame")
	handleGloss.Name = "HandleGloss"
	handleGloss.BackgroundColor3 = Color3.new(1, 1, 1)
	handleGloss.BackgroundTransparency = 0.24
	handleGloss.BorderSizePixel = 0
	handleGloss.Position = UDim2.new(0, 4, 0, 4)
	handleGloss.Size = UDim2.new(1, -8, 0.3, 0)
	handleGloss.Parent = SliderHandle
	local handleGlossCorner = Instance.new("UICorner")
	handleGlossCorner.CornerRadius = UDim.new(1, 0)
	handleGlossCorner.Parent = handleGloss

	return slider
end

local function makeSettingsPanel(parent, mobile)
	local shell = Instance.new("Frame")
	shell.Name = "SettingsPanelShell"
	shell.BackgroundTransparency = 1
	shell.BorderSizePixel = 0
	shell.AnchorPoint = Vector2.new(0.5, 0.5)
	shell.Position = UDim2.fromScale(0.5, 0.5)
	shell.Size = mobile and UDim2.fromScale(0.88, 0.48) or UDim2.fromScale(0.46, 0.42)
	shell.Parent = parent
	addNativeShadow(shell)

	local panel = Instance.new("ImageLabel")
	panel.Name = "SettingsPanel"
	panel.BackgroundTransparency = 1
	panel.Image = "nexusasset://asset_7ec411edf866498498abdb7a852c9bb8"
	panel.ImageColor3 = Color3.new(1, 1, 1)
	panel.ScaleType = Enum.ScaleType.Slice
	panel.SliceCenter = Rect.new(185, 97, 839, 438)
	panel.SliceScale = 0.2
	panel.Size = UDim2.fromScale(1, 1)
	panel.Parent = shell

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.BorderSizePixel = 0
	content.Size = UDim2.new(1, -36, 1, -30)
	content.Position = UDim2.new(0, 18, 0, 14)
	content.Parent = panel

	local title = makeTextLabel(content, "SettingsTitle", "Settings", mobile and 22 or 26, fontHeading, palette.text, Enum.TextXAlignment.Left)
	title.Size = UDim2.new(1, -64, 0, 30)

	local closeHost = Instance.new("Frame")
	closeHost.Name = "CloseHost"
	closeHost.BackgroundTransparency = 1
	closeHost.BorderSizePixel = 0
	closeHost.AnchorPoint = Vector2.new(1, 0)
	closeHost.Position = UDim2.new(1, 0, 0, 0)
	closeHost.Size = UDim2.fromOffset(mobile and 52 or 46, mobile and 52 or 46)
	closeHost.Parent = content

	makeNativeCloseButton(closeHost, mobile).Position = UDim2.fromScale(0, 0)

	local stack = Instance.new("Frame")
	stack.Name = "Stack"
	stack.BackgroundTransparency = 1
	stack.BorderSizePixel = 0
	stack.Position = UDim2.new(0, 0, 0, 52)
	stack.Size = UDim2.new(1, 0, 1, -52)
	stack.Parent = content

	local list = Instance.new("UIListLayout")
	list.FillDirection = Enum.FillDirection.Vertical
	list.HorizontalAlignment = Enum.HorizontalAlignment.Left
	list.VerticalAlignment = Enum.VerticalAlignment.Top
	list.Padding = UDim.new(0, 14)
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Parent = stack

	local musicRow = makeRow(stack, "MusicRow")
	musicRow.LayoutOrder = 1

	local musicLabel = makeTextLabel(musicRow, "MusicLabel", "Music", mobile and 16 or 18, fontBody, palette.text, Enum.TextXAlignment.Left)
	musicLabel.AnchorPoint = Vector2.new(0, 0.5)
	musicLabel.Position = UDim2.new(0, 0, 0.5, 0)
	musicLabel.Size = UDim2.new(0.5, 0, 0, 24)

	local toggle = makeToggle(musicRow, mobile)
	toggle.AnchorPoint = Vector2.new(1, 0.5)
	toggle.Position = UDim2.new(1, 0, 0.5, 0)

	local volumeRow = makeRow(stack, "VolumeRow")
	volumeRow.LayoutOrder = 2
	volumeRow.Size = UDim2.new(1, 0, 0, mobile and 104 or 98)

	local volumeLabel = makeTextLabel(volumeRow, "VolumeLabel", "Volume", mobile and 16 or 18, fontBody, palette.text, Enum.TextXAlignment.Left)
	volumeLabel.Position = UDim2.new(0, 0, 0, 0)
	volumeLabel.Size = UDim2.new(1, 0, 0, 22)

	makeSlider(volumeRow, mobile).Position = UDim2.new(0, 0, 0, 32)

	return shell
end

local function makeCreditsPanel(parent, mobile)
	local shell = Instance.new("Frame")
	shell.Name = "CreditsPanelShell"
	shell.BackgroundTransparency = 1
	shell.BorderSizePixel = 0
	shell.AnchorPoint = Vector2.new(0.5, 0.5)
	shell.Position = UDim2.fromScale(0.5, 0.5)
	shell.Size = mobile and UDim2.fromScale(0.8, 0.24) or UDim2.fromScale(0.34, 0.26)
	shell.Parent = parent
	addNativeShadow(shell)

	local panel = Instance.new("ImageLabel")
	panel.Name = "CreditsPanel"
	panel.BackgroundTransparency = 1
	panel.Image = "nexusasset://asset_62d311b663f04075b3150f54f4e3e916"
	panel.ImageColor3 = Color3.new(1, 1, 1)
	panel.ScaleType = Enum.ScaleType.Slice
	panel.SliceCenter = Rect.new(185, 97, 839, 441)
	panel.SliceScale = 0.2
	panel.Size = UDim2.fromScale(1, 1)
	panel.Parent = shell

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.BorderSizePixel = 0
	content.Size = UDim2.new(1, -34, 1, -28)
	content.Position = UDim2.new(0, 17, 0, 14)
	content.Parent = panel

	local title = makeTextLabel(content, "CreditsTitle", "Credits", mobile and 22 or 26, fontHeading, palette.text, Enum.TextXAlignment.Left)
	title.Size = UDim2.new(1, -64, 0, 30)

	local close = makeImageButton(content, "CreditsCloseButton", "nexusasset://asset_d9bce4291fdc45aeab0abc7cc6111405", { 182, 185, 824, 839 }, 0.2, mobile and UDim2.fromOffset(52, 52) or UDim2.fromOffset(46, 46))
	close.AnchorPoint = Vector2.new(1, 0)
	close.Position = UDim2.new(1, 0, 0, 0)
	addNativeShadow(close)
	local closeVisual = Instance.new("Frame")
	closeVisual.Name = "Visual"
	closeVisual.BackgroundTransparency = 1
	closeVisual.BorderSizePixel = 0
	closeVisual.Size = UDim2.fromScale(1, 1)
	closeVisual.Parent = close
	local closeIcon = Instance.new("ImageLabel")
	closeIcon.Name = "CreditsCloseButtonIcon"
	closeIcon.BackgroundTransparency = 1
	closeIcon.AnchorPoint = Vector2.new(0.5, 0.5)
	closeIcon.Position = UDim2.fromScale(0.5, 0.5)
	closeIcon.Size = UDim2.fromOffset(mobile and 24 or 22, mobile and 24 or 22)
	closeIcon.Image = "nexusasset://asset_50cf24cbad2a4449b744c71651ba9e90"
	closeIcon.ImageColor3 = Color3.new(1, 1, 1)
	closeIcon.ScaleType = Enum.ScaleType.Fit
	closeIcon.Parent = closeVisual

	local body = makeTextLabel(content, "CreditsBody", "Aurora menu concept and interface skin.\nReady for your game-specific play flow.", mobile and 13 or 14, fontCaption, palette.textSoft, Enum.TextXAlignment.Left)
	body.Position = UDim2.new(0, 0, 0, 48)
	body.Size = UDim2.new(1, -6, 1, -54)
	body.TextYAlignment = Enum.TextYAlignment.Top

	return shell
end

local function makeScene(parent, mobile)
	makeBackground(parent)
	makeTitlePlate(parent, mobile)

	local dock = Instance.new("Frame")
	dock.Name = "MainActionDock"
	dock.BackgroundTransparency = 1
	dock.BorderSizePixel = 0
	dock.AnchorPoint = Vector2.new(0.5, 0)
	dock.Position = mobile and UDim2.fromScale(0.5, 0.28) or UDim2.fromScale(0.5, 0.29)
	dock.Size = mobile and UDim2.fromScale(0.82, 0.42) or UDim2.fromScale(0.34, 0.42)
	dock.Parent = parent

	local list = Instance.new("UIListLayout")
	list.FillDirection = Enum.FillDirection.Vertical
	list.HorizontalAlignment = Enum.HorizontalAlignment.Center
	list.VerticalAlignment = Enum.VerticalAlignment.Top
	list.Padding = UDim.new(0, mobile and 14 or 16)
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Parent = dock

	local heightScale = mobile and 1 or 1

	makeMenuButton(dock, "PlayButton", "Play", "nexusasset://asset_c3b87b6213aa4dc184b45354d70ff2e6", { 185, 94, 839, 426 }, mobile, "play", nil, heightScale, true)
	makeMenuButton(dock, "SettingsButton", "Settings", "nexusasset://asset_98e6b048f1e7467f83b577a19bfa20bc", { 185, 63, 839, 285 }, mobile, "settings", "nexusasset://asset_f15614eaa65449129595637a19d70fab", heightScale, false)
	makeMenuButton(dock, "CreditsButton", "Credits", "nexusasset://asset_39605a6510d94d6f890155646f1bed24", { 185, 67, 839, 303 }, mobile, "info", nil, heightScale, false)

	local overlay = Instance.new("Frame")
	overlay.Name = "ModalOverlay"
	overlay.BackgroundColor3 = palette.shadow
	overlay.BackgroundTransparency = 0.38
	overlay.BorderSizePixel = 0
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.Visible = false
	overlay.ZIndex = 10
	overlay.Parent = parent

	local dismiss = Instance.new("TextButton")
	dismiss.Name = "Dismiss"
	dismiss.Size = UDim2.fromScale(1, 1)
	dismiss.BackgroundTransparency = 1
	dismiss.Text = ""
	dismiss.AutoButtonColor = false
	dismiss.Visible = false
	dismiss.ZIndex = 10
	dismiss.Parent = overlay

	local settingsHost = Instance.new("Frame")
	settingsHost.Name = "SettingsModalHost"
	settingsHost.BackgroundTransparency = 1
	settingsHost.BorderSizePixel = 0
	settingsHost.Size = UDim2.fromScale(1, 1)
	settingsHost.Visible = false
	settingsHost.ZIndex = 11
	settingsHost.Parent = parent

	makeSettingsPanel(settingsHost, mobile)

	local creditsHost = Instance.new("Frame")
	creditsHost.Name = "CreditsModalHost"
	creditsHost.BackgroundTransparency = 1
	creditsHost.BorderSizePixel = 0
	creditsHost.Size = UDim2.fromScale(1, 1)
	creditsHost.Visible = false
	creditsHost.ZIndex = 11
	creditsHost.Parent = parent

	makeCreditsPanel(creditsHost, mobile)

	local hook = Instance.new("BindableEvent")
	hook.Name = "OnPlayRequestedHook"
	hook.Parent = parent

	local controllerMarker = Instance.new("Folder")
	controllerMarker.Name = "PanelStateController"
	controllerMarker.Parent = parent
end

function View.build()
	local gui = Instance.new("ScreenGui")
	gui.Name = "Main"
	gui.ResetOnSpawn = false
	gui.IgnoreGuiInset = false
	gui.DisplayOrder = 0
	gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

	local desktop = Instance.new("Frame")
	desktop.Name = "_NexusDesktop"
	desktop.BackgroundTransparency = 1
	desktop.BorderSizePixel = 0
	desktop.Size = UDim2.fromScale(1, 1)
	desktop.Visible = true
	desktop.Parent = gui

	local mobile = Instance.new("Frame")
	mobile.Name = "_NexusMobile"
	mobile.BackgroundTransparency = 1
	mobile.BorderSizePixel = 0
	mobile.Size = UDim2.fromScale(1, 1)
	mobile.Visible = false
	mobile.Parent = gui

	makeScene(desktop, false)
	makeScene(mobile, true)

	return gui
end

return View