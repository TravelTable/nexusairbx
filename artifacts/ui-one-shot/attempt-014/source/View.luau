local View = {}

local function font(family, weight)
	return Font.new(family, weight, Enum.FontStyle.Normal)
end

local COLORS = {
	bgTop = Color3.fromRGB(7, 18, 38),
	bgBottom = Color3.fromRGB(3, 10, 20),
	cyan = Color3.fromRGB(51, 207, 255),
	cobalt = Color3.fromRGB(45, 91, 255),
	navy = Color3.fromRGB(10, 34, 66),
	gold = Color3.fromRGB(243, 200, 106),
	text = Color3.fromRGB(244, 251, 255),
	textSecondary = Color3.fromRGB(184, 210, 232),
	row = Color3.fromRGB(18, 49, 84),
	rowDark = Color3.fromRGB(11, 28, 53),
	shadow = Color3.fromRGB(3, 10, 20),
	success = Color3.fromRGB(89, 217, 165),
	danger = Color3.fromRGB(255, 107, 122),
}

local function createUIShadow(parent, transparency, blur, yOffset)
	local ok, shadow = pcall(Instance.new, "UIShadow")
	if ok and shadow then
		shadow.Color = Color3.new(0, 0, 0)
		shadow.Transparency = transparency or 0.72
		shadow.BlurRadius = UDim.new(0, blur or 16)
		shadow.Offset = UDim2.fromOffset(0, yOffset or 5)
		shadow.Parent = parent
		return shadow
	end
	return nil
end

local function addTextStroke(label, transparency)
	local stroke = Instance.new("UIStroke")
	stroke.Name = "TextBacking"
	stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Contextual
	stroke.Color = COLORS.navy
	stroke.Thickness = 1.5
	stroke.Transparency = transparency or 0.55
	stroke.Parent = label
	return stroke
end

local function styleLabel(label, role)
	label.BackgroundTransparency = 1
	label.TextColor3 = role == "secondary" and COLORS.textSecondary or COLORS.text
	label.TextScaled = true
	label.RichText = false
	label.TextWrapped = role == "body"
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.TextYAlignment = Enum.TextYAlignment.Center
	if role == "display" then
		label.FontFace = font("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.ExtraBold)
		label.TextSize = 44
	elseif role == "heading" then
		label.FontFace = font("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.Bold)
		label.TextSize = 24
	elseif role == "button" then
		label.FontFace = font("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.SemiBold)
		label.TextSize = 22
	else
		label.FontFace = font("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.Medium)
		label.TextSize = 18
	end
	local constraint = Instance.new("UITextSizeConstraint")
	constraint.MinTextSize = role == "caption" and 12 or 14
	constraint.MaxTextSize = role == "display" and 44 or (role == "heading" and 24 or (role == "button" and 22 or 18))
	constraint.Parent = label
	addTextStroke(label, role == "display" and 0.7 or 0.8)
	return label
end

local function makeImageSliceButton(name, image, sliceCenter, sliceScale)
	local button = Instance.new("ImageButton")
	button.Name = name
	button.BackgroundTransparency = 1
	button.AutoButtonColor = false
	button.Image = image
	button.ImageColor3 = Color3.new(1, 1, 1)
	button.ScaleType = Enum.ScaleType.Slice
	button.SliceCenter = Rect.new(sliceCenter[1], sliceCenter[2], sliceCenter[3], sliceCenter[4])
	button.SliceScale = sliceScale
	return button
end

local function makeImageSliceLabel(name, image, sliceCenter, sliceScale)
	local label = Instance.new("ImageLabel")
	label.Name = name
	label.BackgroundTransparency = 1
	label.Image = image
	label.ImageColor3 = Color3.new(1, 1, 1)
	label.ScaleType = Enum.ScaleType.Slice
	label.SliceCenter = Rect.new(sliceCenter[1], sliceCenter[2], sliceCenter[3], sliceCenter[4])
	label.SliceScale = sliceScale
	return label
end

local function makeIcon(name, image)
	local icon = Instance.new("ImageLabel")
	icon.Name = name
	icon.BackgroundTransparency = 1
	icon.Image = image
	icon.ImageColor3 = Color3.new(1, 1, 1)
	icon.ScaleType = Enum.ScaleType.Fit
	return icon
end

local function makeButtonContents(button, title, iconImage, iconSize)
	local visual = Instance.new("Frame")
	visual.Name = "Visual"
	visual.BackgroundTransparency = 1
	visual.Size = UDim2.fromScale(1, 1)
	visual.Parent = button

	local gloss = Instance.new("Frame")
	gloss.Name = "Gloss"
	gloss.BackgroundColor3 = Color3.new(1, 1, 1)
	gloss.BackgroundTransparency = 0.78
	gloss.BorderSizePixel = 0
	gloss.AnchorPoint = Vector2.new(0.5, 0)
	gloss.Position = UDim2.fromScale(0.5, 0.08)
	gloss.Size = UDim2.fromScale(0.82, 0.2)
	gloss.Parent = visual
	local glossCorner = Instance.new("UICorner")
	glossCorner.CornerRadius = UDim.new(1, 0)
	glossCorner.Parent = gloss
	local glossGradient = Instance.new("UIGradient")
	glossGradient.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.9),
		NumberSequenceKeypoint.new(0.5, 0.15),
		NumberSequenceKeypoint.new(1, 0.9),
	})
	glossGradient.Rotation = 0
	glossGradient.Parent = gloss

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.AnchorPoint = Vector2.new(0.5, 0.5)
	content.Position = UDim2.fromScale(0.5, 0.5)
	content.Size = UDim2.fromScale(0.88, 0.72)
	content.Parent = visual

	local layout = Instance.new("UIListLayout")
	layout.FillDirection = Enum.FillDirection.Horizontal
	layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	layout.VerticalAlignment = Enum.VerticalAlignment.Center
	layout.Padding = UDim.new(0, 12)
	layout.Parent = content

	local icon = makeIcon(button.Name .. "Icon", iconImage)
	icon.Size = UDim2.fromOffset(iconSize, iconSize)
	icon.LayoutOrder = 1
	icon.Parent = content

	local label = Instance.new("TextLabel")
	label.Name = "Label"
	label.Text = title
	label.LayoutOrder = 2
	label.Size = UDim2.fromScale(0.65, 1)
	label.TextXAlignment = Enum.TextXAlignment.Center
	styleLabel(label, "button")
	label.Parent = content

	return visual
end

local function createCornerOrnament(parent, name, anchorX, anchorY, posX, posY, flipX, flipY, size)
	local holder = Instance.new("Frame")
	holder.Name = name
	holder.BackgroundTransparency = 1
	holder.AnchorPoint = Vector2.new(anchorX, anchorY)
	holder.Position = UDim2.new(posX, 0, posY, 0)
	holder.Size = size
	holder.Parent = parent

	local scale = Instance.new("UIScale")
	scale.Scale = 1
	scale.Parent = holder

	local lineA = Instance.new("Frame")
	lineA.Name = "LineA"
	lineA.BackgroundColor3 = COLORS.gold
	lineA.BorderSizePixel = 0
	lineA.AnchorPoint = Vector2.new(0.5, 0.5)
	lineA.Position = UDim2.fromScale(0.34, 0.16)
	lineA.Size = UDim2.fromScale(0.52, 0.07)
	lineA.Rotation = flipX and -22 or 22
	lineA.Parent = holder
	local c1 = Instance.new("UICorner")
	c1.CornerRadius = UDim.new(1, 0)
	c1.Parent = lineA

	local lineB = Instance.new("Frame")
	lineB.Name = "LineB"
	lineB.BackgroundColor3 = COLORS.cyan
	lineB.BorderSizePixel = 0
	lineB.AnchorPoint = Vector2.new(0.5, 0.5)
	lineB.Position = UDim2.fromScale(0.18, 0.34)
	lineB.Size = UDim2.fromScale(0.42, 0.06)
	lineB.Rotation = flipY and -68 or 68
	lineB.Parent = holder
	local c2 = Instance.new("UICorner")
	c2.CornerRadius = UDim.new(1, 0)
	c2.Parent = lineB

	local jewel = Instance.new("Frame")
	jewel.Name = "Jewel"
	jewel.BackgroundColor3 = COLORS.cobalt
	jewel.BorderSizePixel = 0
	jewel.AnchorPoint = Vector2.new(0.5, 0.5)
	jewel.Position = UDim2.fromScale(0.1, 0.1)
	jewel.Size = UDim2.fromScale(0.16, 0.16)
	jewel.Parent = holder
	local c3 = Instance.new("UICorner")
	c3.CornerRadius = UDim.new(0.3, 0)
	c3.Parent = jewel
	local s3 = Instance.new("UIStroke")
	s3.Color = COLORS.navy
	s3.Thickness = 3
	s3.Parent = jewel
	local g3 = Instance.new("UIGradient")
	g3.Color = ColorSequence.new(COLORS.cyan, COLORS.cobalt)
	g3.Rotation = 45
	g3.Parent = jewel

	holder.Rotation = (flipX and 180 or 0) + (flipY and 180 or 0)
	holder.BackgroundTransparency = 1
	return holder
end

local function createBackground(parent, mobile)
	local backgroundRoot = Instance.new("Frame")
	backgroundRoot.Name = "BackgroundRoot"
	backgroundRoot.BackgroundColor3 = COLORS.bgBottom
	backgroundRoot.BorderSizePixel = 0
	backgroundRoot.Size = UDim2.fromScale(1, 1)
	backgroundRoot.Parent = parent

	local bgGradient = Instance.new("UIGradient")
	bgGradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, COLORS.bgTop),
		ColorSequenceKeypoint.new(0.55, Color3.fromRGB(8, 26, 53)),
		ColorSequenceKeypoint.new(1, COLORS.bgBottom),
	})
	bgGradient.Rotation = 90
	bgGradient.Parent = backgroundRoot

	local backgroundLayer = Instance.new("Frame")
	backgroundLayer.Name = "BackgroundLayer"
	backgroundLayer.BackgroundTransparency = 1
	backgroundLayer.Size = UDim2.fromScale(1, 1)
	backgroundLayer.Parent = backgroundRoot

	local topGlow = Instance.new("Frame")
	topGlow.Name = "TopGlow"
	topGlow.BackgroundColor3 = COLORS.cyan
	topGlow.BackgroundTransparency = mobile and 0.9 or 0.86
	topGlow.BorderSizePixel = 0
	topGlow.AnchorPoint = Vector2.new(0.5, 0)
	topGlow.Position = UDim2.fromScale(0.5, 0.02)
	topGlow.Size = UDim2.fromScale(mobile and 0.88 or 0.72, mobile and 0.2 or 0.24)
	topGlow.Parent = backgroundLayer
	local tgCorner = Instance.new("UICorner")
	tgCorner.CornerRadius = UDim.new(1, 0)
	tgCorner.Parent = topGlow
	local tgGradient = Instance.new("UIGradient")
	tgGradient.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.85),
		NumberSequenceKeypoint.new(0.5, 0.2),
		NumberSequenceKeypoint.new(1, 0.92),
	})
	tgGradient.Parent = topGlow

	local leftBloom = Instance.new("Frame")
	leftBloom.Name = "LeftBloom"
	leftBloom.BackgroundColor3 = COLORS.cobalt
	leftBloom.BackgroundTransparency = mobile and 0.92 or 0.9
	leftBloom.BorderSizePixel = 0
	leftBloom.AnchorPoint = Vector2.new(0, 0.5)
	leftBloom.Position = UDim2.fromScale(-0.08, 0.55)
	leftBloom.Size = UDim2.fromScale(0.35, 0.45)
	leftBloom.Parent = backgroundLayer
	local lbCorner = Instance.new("UICorner")
	lbCorner.CornerRadius = UDim.new(1, 0)
	lbCorner.Parent = leftBloom

	local rightBloom = Instance.new("Frame")
	rightBloom.Name = "RightBloom"
	rightBloom.BackgroundColor3 = COLORS.cyan
	rightBloom.BackgroundTransparency = mobile and 0.94 or 0.92
	rightBloom.BorderSizePixel = 0
	rightBloom.AnchorPoint = Vector2.new(1, 0.5)
	rightBloom.Position = UDim2.fromScale(1.08, 0.4)
	rightBloom.Size = UDim2.fromScale(0.28, 0.36)
	rightBloom.Parent = backgroundLayer
	local rbCorner = Instance.new("UICorner")
	rbCorner.CornerRadius = UDim.new(1, 0)
	rbCorner.Parent = rightBloom

	local vignetteTop = Instance.new("Frame")
	vignetteTop.Name = "VignetteTop"
	vignetteTop.BackgroundColor3 = Color3.new(0, 0, 0)
	vignetteTop.BackgroundTransparency = 0.82
	vignetteTop.BorderSizePixel = 0
	vignetteTop.Size = UDim2.new(1, 0, 0.18, 0)
	vignetteTop.Parent = backgroundLayer
	local vtGradient = Instance.new("UIGradient")
	vtGradient.Rotation = 90
	vtGradient.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.1),
		NumberSequenceKeypoint.new(1, 1),
	})
	vtGradient.Parent = vignetteTop

	local vignetteBottom = Instance.new("Frame")
	vignetteBottom.Name = "VignetteBottom"
	vignetteBottom.BackgroundColor3 = Color3.new(0, 0, 0)
	vignetteBottom.BackgroundTransparency = 0.78
	vignetteBottom.BorderSizePixel = 0
	vignetteBottom.AnchorPoint = Vector2.new(0, 1)
	vignetteBottom.Position = UDim2.fromScale(0, 1)
	vignetteBottom.Size = UDim2.new(1, 0, 0.26, 0)
	vignetteBottom.Parent = backgroundLayer
	local vbGradient = Instance.new("UIGradient")
	vbGradient.Rotation = 270
	vbGradient.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.05),
		NumberSequenceKeypoint.new(1, 1),
	})
	vbGradient.Parent = vignetteBottom

	local ornaments = Instance.new("Frame")
	ornaments.Name = "BackgroundOrnaments"
	ornaments.BackgroundTransparency = 1
	ornaments.Size = UDim2.fromScale(1, 1)
	ornaments.Parent = parent

	createCornerOrnament(ornaments, "TopLeft", 0, 0, 0.045, 0.055, false, false, mobile and UDim2.fromOffset(64, 64) or UDim2.fromOffset(88, 88))
	createCornerOrnament(ornaments, "TopRight", 1, 0, 0.955, 0.055, true, false, mobile and UDim2.fromOffset(64, 64) or UDim2.fromOffset(88, 88))
	createCornerOrnament(ornaments, "BottomLeft", 0, 1, 0.045, 0.945, false, true, mobile and UDim2.fromOffset(64, 64) or UDim2.fromOffset(88, 88))
	createCornerOrnament(ornaments, "BottomRight", 1, 1, 0.955, 0.945, true, true, mobile and UDim2.fromOffset(64, 64) or UDim2.fromOffset(88, 88))
end

local function createTitle(parent, mobile)
	local titlePlate = makeImageSliceLabel(
		"TitlePlate",
		"nexusasset://asset_9873a27860fb4ea6a052092e59566a51",
		{185, 149, 839, 675},
		0.2
	)
	titlePlate.Size = mobile and UDim2.fromScale(1, 0.24) or UDim2.fromScale(1, 0.27)
	titlePlate.LayoutOrder = 1
	titlePlate.Parent = parent
	createUIShadow(titlePlate, 0.78, 18, 6)

	local titleInner = Instance.new("Frame")
	titleInner.Name = "Content"
	titleInner.BackgroundTransparency = 1
	titleInner.AnchorPoint = Vector2.new(0.5, 0.5)
	titleInner.Position = UDim2.fromScale(0.5, 0.5)
	titleInner.Size = UDim2.fromScale(0.82, 0.58)
	titleInner.Parent = titlePlate

	local title = Instance.new("TextLabel")
	title.Name = "AuroraTitle"
	title.Text = "AURORA"
	title.Size = UDim2.fromScale(1, 1)
	title.TextXAlignment = Enum.TextXAlignment.Center
	styleLabel(title, "display")
	title.Parent = titleInner

	return titlePlate
end

local function createMainButton(parent, name, text, skinUri, iconUri, sliceCenter, mobile, heightScale)
	local button = makeImageSliceButton(name, skinUri, sliceCenter, 0.2)
	button.Size = UDim2.new(1, 0, 0, mobile and math.floor(80 * heightScale) or math.floor(92 * heightScale))
	button.LayoutOrder = name == "PlayButton" and 2 or (name == "SettingsButton" and 3 or 4)
	button.Parent = parent
	local shadow = createUIShadow(button, 0.8, name == "PlayButton" and 20 or 14, name == "PlayButton" and 8 or 5)
	makeButtonContents(button, text, iconUri, mobile and 26 or 28)

	local hitPadding = Instance.new("UIPadding")
	hitPadding.PaddingLeft = UDim.new(0, 0)
	hitPadding.PaddingRight = UDim.new(0, 0)
	hitPadding.Parent = button

	local innerStroke = Instance.new("UIStroke")
	innerStroke.Name = "AccentStroke"
	innerStroke.Color = COLORS.gold
	innerStroke.Thickness = 1
	innerStroke.Transparency = 0.55
	innerStroke.Parent = button

	return button, shadow
end

local function createToggle(parent, mobile)
	local toggle = Instance.new("TextButton")
	toggle.Name = "MusicToggle"
	toggle.BackgroundTransparency = 1
	toggle.AutoButtonColor = false
	toggle.Text = ""
	toggle.Size = mobile and UDim2.fromOffset(108, 52) or UDim2.fromOffset(96, 46)
	toggle.Parent = parent

	local housing = Instance.new("Frame")
	housing.Name = "Visual"
	housing.BackgroundColor3 = COLORS.rowDark
	housing.BorderSizePixel = 0
	housing.Size = UDim2.fromScale(1, 1)
	housing.Parent = toggle
	local housingCorner = Instance.new("UICorner")
	housingCorner.CornerRadius = UDim.new(1, 0)
	housingCorner.Parent = housing
	local housingStroke = Instance.new("UIStroke")
	housingStroke.Color = COLORS.navy
	housingStroke.Thickness = 3
	housingStroke.Parent = housing
	local housingGradient = Instance.new("UIGradient")
	housingGradient.Color = ColorSequence.new(COLORS.row, COLORS.rowDark)
	housingGradient.Rotation = 90
	housingGradient.Parent = housing

	local activeFill = Instance.new("Frame")
	activeFill.Name = "ActiveFill"
	activeFill.BackgroundColor3 = COLORS.gold
	activeFill.BorderSizePixel = 0
	activeFill.Size = UDim2.fromScale(1, 1)
	activeFill.Parent = housing
	local activeCorner = Instance.new("UICorner")
	activeCorner.CornerRadius = UDim.new(1, 0)
	activeCorner.Parent = activeFill
	local activeGradient = Instance.new("UIGradient")
	activeGradient.Color = ColorSequence.new(COLORS.cyan, COLORS.gold)
	activeGradient.Rotation = 0
	activeGradient.Parent = activeFill

	local thumb = Instance.new("Frame")
	thumb.Name = "Thumb"
	thumb.AnchorPoint = Vector2.new(0, 0.5)
	thumb.Position = UDim2.new(0, 4, 0.5, 0)
	thumb.Size = mobile and UDim2.fromOffset(44, 44) or UDim2.fromOffset(38, 38)
	thumb.BackgroundColor3 = COLORS.text
	thumb.BorderSizePixel = 0
	thumb.Parent = housing
	local thumbCorner = Instance.new("UICorner")
	thumbCorner.CornerRadius = UDim.new(1, 0)
	thumbCorner.Parent = thumb
	local thumbStroke = Instance.new("UIStroke")
	thumbStroke.Color = COLORS.navy
	thumbStroke.Thickness = 2
	thumbStroke.Parent = thumb
	local thumbGradient = Instance.new("UIGradient")
	thumbGradient.Color = ColorSequence.new(Color3.fromRGB(255, 255, 255), Color3.fromRGB(186, 235, 255))
	thumbGradient.Rotation = 90
	thumbGradient.Parent = thumb
	createUIShadow(thumb, 0.82, 10, 2)

	local stateLabel = Instance.new("TextLabel")
	stateLabel.Name = "StateLabel"
	stateLabel.BackgroundTransparency = 1
	stateLabel.Size = UDim2.new(1, -52, 1, 0)
	stateLabel.Position = UDim2.fromOffset(44, 0)
	stateLabel.TextXAlignment = Enum.TextXAlignment.Center
	stateLabel.Text = "ON"
	styleLabel(stateLabel, "caption")
	stateLabel.FontFace = font("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.Bold)
	stateLabel.TextSize = mobile and 15 or 14
	stateLabel.Parent = toggle

	return toggle
end

local function createSlider(parent, mobile)
	local slider = Instance.new("Frame")
	slider.Name = "VolumeSlider"
	slider.BackgroundTransparency = 1
	slider.Size = UDim2.new(1, 0, 0, mobile and 54 or 44)
	slider.Parent = parent

	local drag = Instance.new("TextButton")
	drag.Name = "DragHitTarget"
	drag.BackgroundTransparency = 1
	drag.AutoButtonColor = false
	drag.Text = ""
	drag.Size = UDim2.fromScale(1, 1)
	drag.Parent = slider

	local track = Instance.new("Frame")
	track.Name = "Track"
	track.AnchorPoint = Vector2.new(0, 0.5)
	track.Position = UDim2.new(0, 0, 0.5, 0)
	track.Size = UDim2.new(1, 0, 0, mobile and 18 or 16)
	track.BackgroundColor3 = COLORS.rowDark
	track.BorderSizePixel = 0
	track.Parent = slider
	local trackCorner = Instance.new("UICorner")
	trackCorner.CornerRadius = UDim.new(1, 0)
	trackCorner.Parent = track
	local trackStroke = Instance.new("UIStroke")
	trackStroke.Color = COLORS.navy
	trackStroke.Thickness = 3
	trackStroke.Parent = track
	local trackGradient = Instance.new("UIGradient")
	trackGradient.Color = ColorSequence.new(COLORS.row, COLORS.rowDark)
	trackGradient.Rotation = 90
	trackGradient.Parent = track

	local fill = Instance.new("Frame")
	fill.Name = "Fill"
	fill.Size = UDim2.fromScale(0.7, 1)
	fill.BackgroundColor3 = COLORS.cyan
	fill.BorderSizePixel = 0
	fill.Parent = track
	local fillCorner = Instance.new("UICorner")
	fillCorner.CornerRadius = UDim.new(1, 0)
	fillCorner.Parent = fill
	local fillGradient = Instance.new("UIGradient")
	fillGradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, COLORS.cyan),
		ColorSequenceKeypoint.new(0.7, COLORS.cobalt),
		ColorSequenceKeypoint.new(1, COLORS.gold),
	})
	fillGradient.Rotation = 0
	fillGradient.Parent = fill

	local sheen = Instance.new("Frame")
	sheen.Name = "Sheen"
	sheen.BackgroundColor3 = Color3.new(1, 1, 1)
	sheen.BackgroundTransparency = 0.75
	sheen.BorderSizePixel = 0
	sheen.Size = UDim2.new(1, 0, 0.32, 0)
	sheen.Parent = fill
	local sheenCorner = Instance.new("UICorner")
	sheenCorner.CornerRadius = UDim.new(1, 0)
	sheenCorner.Parent = sheen

	local handle = Instance.new("Frame")
	handle.Name = "Handle"
	handle.AnchorPoint = Vector2.new(0.5, 0.5)
	handle.Position = UDim2.fromScale(0.7, 0.5)
	handle.Size = mobile and UDim2.fromOffset(34, 34) or UDim2.fromOffset(30, 30)
	handle.BackgroundColor3 = COLORS.text
	handle.BorderSizePixel = 0
	handle.Parent = slider
	local handleCorner = Instance.new("UICorner")
	handleCorner.CornerRadius = UDim.new(1, 0)
	handleCorner.Parent = handle
	local handleStroke = Instance.new("UIStroke")
	handleStroke.Color = COLORS.navy
	handleStroke.Thickness = 3
	handleStroke.Parent = handle
	local handleGradient = Instance.new("UIGradient")
	handleGradient.Color = ColorSequence.new(Color3.fromRGB(255, 255, 255), Color3.fromRGB(190, 239, 255))
	handleGradient.Rotation = 90
	handleGradient.Parent = handle
	createUIShadow(handle, 0.8, 10, 3)

	return slider
end

local function createSettingsModal(parent, mobile)
	local modalHost = Instance.new("Frame")
	modalHost.Name = "SettingsModalHost"
	modalHost.BackgroundTransparency = 1
	modalHost.Size = UDim2.fromScale(1, 1)
	modalHost.Visible = false
	modalHost.ZIndex = 20
	modalHost.Parent = parent

	local dim = Instance.new("TextButton")
	dim.Name = "Dismiss"
	dim.BackgroundColor3 = Color3.new(0, 0, 0)
	dim.BackgroundTransparency = 0.38
	dim.BorderSizePixel = 0
	dim.AutoButtonColor = false
	dim.Text = ""
	dim.Size = UDim2.fromScale(1, 1)
	dim.ZIndex = 20
	dim.Parent = modalHost

	local modal = makeImageSliceLabel(
		"SettingsModal",
		"nexusasset://asset_737e49abf0244ae6828b88b136f85155",
		{185, 141, 839, 642},
		0.2
	)
	modal.AnchorPoint = Vector2.new(0.5, 0.5)
	modal.Position = UDim2.fromScale(0.5, 0.5)
	modal.Size = mobile and UDim2.fromScale(0.88, 0.42) or UDim2.fromScale(0.38, 0.38)
	modal.ZIndex = 21
	modal.Parent = modalHost
	createUIShadow(modal, 0.68, 22, 8)

	local modalScale = Instance.new("UIScale")
	modalScale.Name = "ModalScale"
	modalScale.Scale = 1
	modalScale.Parent = modal

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.AnchorPoint = Vector2.new(0.5, 0.5)
	content.Position = UDim2.fromScale(0.5, 0.5)
	content.Size = UDim2.fromScale(0.86, 0.82)
	content.ZIndex = 21
	content.Parent = modal

	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, mobile and 16 or 18)
	padding.PaddingBottom = UDim.new(0, mobile and 16 or 18)
	padding.PaddingLeft = UDim.new(0, mobile and 18 or 20)
	padding.PaddingRight = UDim.new(0, mobile and 18 or 20)
	padding.Parent = content

	local header = Instance.new("Frame")
	header.Name = "Header"
	header.BackgroundTransparency = 1
	header.Size = UDim2.new(1, 0, 0, mobile and 54 or 48)
	header.ZIndex = 21
	header.Parent = content

	local title = Instance.new("TextLabel")
	title.Name = "SettingsTitle"
	title.Text = "Settings"
	title.Size = UDim2.new(1, -68, 1, 0)
	title.ZIndex = 22
	styleLabel(title, "heading")
	title.Parent = header

	local close = makeImageSliceButton(
		"SettingsCloseButton",
		"nexusasset://asset_f93f363d59f14f00be3e1d94757510b8",
		{184, 185, 837, 839},
		0.2
	)
	close.AnchorPoint = Vector2.new(1, 0.5)
	close.Position = UDim2.new(1, 0, 0.5, 0)
	close.Size = mobile and UDim2.fromOffset(52, 52) or UDim2.fromOffset(46, 46)
	close.ZIndex = 22
	close.Parent = header

	local closeVisual = Instance.new("Frame")
	closeVisual.Name = "Visual"
	closeVisual.BackgroundTransparency = 1
	closeVisual.Size = UDim2.fromScale(1, 1)
	closeVisual.Parent = close

	local closeIcon = makeIcon("SettingsCloseButtonIcon", "nexusasset://asset_e988ccfe8beb43e5986b5b8749257705")
	closeIcon.AnchorPoint = Vector2.new(0.5, 0.5)
	closeIcon.Position = UDim2.fromScale(0.5, 0.5)
	closeIcon.Size = UDim2.fromScale(0.48, 0.48)
	closeIcon.Parent = closeVisual

	local rows = Instance.new("Frame")
	rows.Name = "Rows"
	rows.BackgroundTransparency = 1
	rows.Position = UDim2.new(0, 0, 0, mobile and 66 or 60)
	rows.Size = UDim2.new(1, 0, 1, -(mobile and 66 or 60))
	rows.ZIndex = 21
	rows.Parent = content

	local rowsLayout = Instance.new("UIListLayout")
	rowsLayout.Padding = UDim.new(0, mobile and 12 or 14)
	rowsLayout.SortOrder = Enum.SortOrder.LayoutOrder
	rowsLayout.Parent = rows

	local musicRow = Instance.new("Frame")
	musicRow.Name = "MusicRow"
	musicRow.BackgroundColor3 = COLORS.rowDark
	musicRow.BorderSizePixel = 0
	musicRow.Size = UDim2.new(1, 0, 0, mobile and 64 or 60)
	musicRow.LayoutOrder = 1
	musicRow.ZIndex = 21
	musicRow.Parent = rows
	local musicRowCorner = Instance.new("UICorner")
	musicRowCorner.CornerRadius = UDim.new(0, 16)
	musicRowCorner.Parent = musicRow
	local musicRowStroke = Instance.new("UIStroke")
	musicRowStroke.Color = COLORS.navy
	musicRowStroke.Thickness = 2
	musicRowStroke.Transparency = 0.2
	musicRowStroke.Parent = musicRow
	local musicRowGradient = Instance.new("UIGradient")
	musicRowGradient.Color = ColorSequence.new(COLORS.row, COLORS.rowDark)
	musicRowGradient.Rotation = 90
	musicRowGradient.Parent = musicRow

	local musicPadding = Instance.new("UIPadding")
	musicPadding.PaddingLeft = UDim.new(0, 16)
	musicPadding.PaddingRight = UDim.new(0, 16)
	musicPadding.Parent = musicRow

	local musicLabel = Instance.new("TextLabel")
	musicLabel.Name = "MusicLabel"
	musicLabel.Text = "Music"
	musicLabel.Size = UDim2.new(0.45, 0, 1, 0)
	musicLabel.ZIndex = 22
	styleLabel(musicLabel, "body")
	musicLabel.Parent = musicRow

	local toggleHolder = Instance.new("Frame")
	toggleHolder.Name = "ToggleHolder"
	toggleHolder.BackgroundTransparency = 1
	toggleHolder.AnchorPoint = Vector2.new(1, 0.5)
	toggleHolder.Position = UDim2.new(1, -4, 0.5, 0)
	toggleHolder.Size = mobile and UDim2.fromOffset(108, 52) or UDim2.fromOffset(96, 46)
	toggleHolder.ZIndex = 22
	toggleHolder.Parent = musicRow

	createToggle(toggleHolder, mobile)

	local volumeRow = Instance.new("Frame")
	volumeRow.Name = "VolumeRow"
	volumeRow.BackgroundColor3 = COLORS.rowDark
	volumeRow.BorderSizePixel = 0
	volumeRow.Size = UDim2.new(1, 0, 0, mobile and 84 or 76)
	volumeRow.LayoutOrder = 2
	volumeRow.ZIndex = 21
	volumeRow.Parent = rows
	local volumeCorner = Instance.new("UICorner")
	volumeCorner.CornerRadius = UDim.new(0, 16)
	volumeCorner.Parent = volumeRow
	local volumeStroke = Instance.new("UIStroke")
	volumeStroke.Color = COLORS.navy
	volumeStroke.Thickness = 2
	volumeStroke.Transparency = 0.2
	volumeStroke.Parent = volumeRow
	local volumeGradient = Instance.new("UIGradient")
	volumeGradient.Color = ColorSequence.new(COLORS.row, COLORS.rowDark)
	volumeGradient.Rotation = 90
	volumeGradient.Parent = volumeRow

	local volumePadding = Instance.new("UIPadding")
	volumePadding.PaddingLeft = UDim.new(0, 16)
	volumePadding.PaddingRight = UDim.new(0, 16)
	volumePadding.Parent = volumeRow

	local volumeLabel = Instance.new("TextLabel")
	volumeLabel.Name = "VolumeLabel"
	volumeLabel.Text = "Volume"
	volumeLabel.Size = mobile and UDim2.new(0, 82, 1, 0) or UDim2.new(0, 92, 1, 0)
	volumeLabel.ZIndex = 22
	styleLabel(volumeLabel, "body")
	volumeLabel.Parent = volumeRow

	local value = Instance.new("TextLabel")
	value.Name = "VolumeValue"
	value.Text = "70%"
	value.AnchorPoint = Vector2.new(1, 0.5)
	value.Position = UDim2.new(1, -4, 0.5, 0)
	value.Size = UDim2.new(0, mobile and 56 or 52, 1, 0)
	value.ZIndex = 22
	value.TextXAlignment = Enum.TextXAlignment.Right
	styleLabel(value, "secondary")
	value.FontFace = font("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.Bold)
	value.TextSize = mobile and 15 or 16
	value.Parent = volumeRow

	local sliderHolder = Instance.new("Frame")
	sliderHolder.Name = "SliderHolder"
	sliderHolder.BackgroundTransparency = 1
	sliderHolder.Position = mobile and UDim2.new(0, 92, 0.5, -27) or UDim2.new(0, 104, 0.5, -22)
	sliderHolder.Size = mobile and UDim2.new(1, -156, 0, 54) or UDim2.new(1, -168, 0, 44)
	sliderHolder.ZIndex = 22
	sliderHolder.Parent = volumeRow

	createSlider(sliderHolder, mobile)

	return modalHost
end

local function createCreditsModal(parent, mobile)
	local modalHost = Instance.new("Frame")
	modalHost.Name = "CreditsModalHost"
	modalHost.BackgroundTransparency = 1
	modalHost.Size = UDim2.fromScale(1, 1)
	modalHost.Visible = false
	modalHost.ZIndex = 20
	modalHost.Parent = parent

	local dim = Instance.new("TextButton")
	dim.Name = "Dismiss"
	dim.BackgroundColor3 = Color3.new(0, 0, 0)
	dim.BackgroundTransparency = 0.42
	dim.BorderSizePixel = 0
	dim.AutoButtonColor = false
	dim.Text = ""
	dim.Size = UDim2.fromScale(1, 1)
	dim.ZIndex = 20
	dim.Parent = modalHost

	local modal = makeImageSliceLabel(
		"CreditsModal",
		"nexusasset://asset_737e49abf0244ae6828b88b136f85155",
		{185, 141, 839, 642},
		0.2
	)
	modal.AnchorPoint = Vector2.new(0.5, 0.5)
	modal.Position = UDim2.fromScale(0.5, 0.5)
	modal.Size = mobile and UDim2.fromScale(0.84, 0.24) or UDim2.fromScale(0.3, 0.24)
	modal.ZIndex = 21
	modal.Parent = modalHost
	createUIShadow(modal, 0.68, 22, 8)

	local modalScale = Instance.new("UIScale")
	modalScale.Name = "ModalScale"
	modalScale.Scale = 1
	modalScale.Parent = modal

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.AnchorPoint = Vector2.new(0.5, 0.5)
	content.Position = UDim2.fromScale(0.5, 0.5)
	content.Size = UDim2.fromScale(0.86, 0.78)
	content.Parent = modal

	local header = Instance.new("Frame")
	header.Name = "Header"
	header.BackgroundTransparency = 1
	header.Size = UDim2.new(1, 0, 0, mobile and 52 or 46)
	header.Parent = content

	local title = Instance.new("TextLabel")
	title.Name = "CreditsTitle"
	title.Text = "Credits"
	title.Size = UDim2.new(1, -68, 1, 0)
	styleLabel(title, "heading")
	title.Parent = header

	local close = makeImageSliceButton(
		"CreditsCloseButton",
		"nexusasset://asset_6afc8be428e644a7a326e12d798b6269",
		{184, 185, 833, 839},
		0.2
	)
	close.AnchorPoint = Vector2.new(1, 0.5)
	close.Position = UDim2.new(1, 0, 0.5, 0)
	close.Size = mobile and UDim2.fromOffset(52, 52) or UDim2.fromOffset(46, 46)
	close.Parent = header

	local closeVisual = Instance.new("Frame")
	closeVisual.Name = "Visual"
	closeVisual.BackgroundTransparency = 1
	closeVisual.Size = UDim2.fromScale(1, 1)
	closeVisual.Parent = close

	local closeIcon = makeIcon("CreditsCloseButtonIcon", "nexusasset://asset_e988ccfe8beb43e5986b5b8749257705")
	closeIcon.AnchorPoint = Vector2.new(0.5, 0.5)
	closeIcon.Position = UDim2.fromScale(0.5, 0.5)
	closeIcon.Size = UDim2.fromScale(0.48, 0.48)
	closeIcon.Parent = closeVisual

	local body = Instance.new("TextLabel")
	body.Name = "CreditsBody"
	body.Text = "Created with Aurora UI styling.\nMenu integration ready for your game."
	body.Position = UDim2.new(0, 0, 0, mobile and 64 or 58)
	body.Size = UDim2.new(1, 0, 1, -(mobile and 64 or 58))
	body.TextYAlignment = Enum.TextYAlignment.Top
	styleLabel(body, "body")
	body.TextColor3 = COLORS.textSecondary
	body.Parent = content

	return modalHost
end

local function createMenuDock(parent, mobile)
	local dock = Instance.new("Frame")
	dock.Name = "MainMenuDock"
	dock.BackgroundTransparency = 1
	dock.AnchorPoint = Vector2.new(0.5, 0)
	dock.Position = mobile and UDim2.fromScale(0.5, 0.1) or UDim2.fromScale(0.5, 0.12)
	dock.Size = mobile and UDim2.fromScale(0.82, 0.66) or UDim2.fromScale(0.38, 0.64)
	dock.Parent = parent

	local layout = Instance.new("UIListLayout")
	layout.FillDirection = Enum.FillDirection.Vertical
	layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, mobile and 14 or 18)
	layout.Parent = dock

	createTitle(dock, mobile)

	createMainButton(
		dock,
		"PlayButton",
		"Play",
		"nexusasset://asset_ecc563f66538467a81acdb793344a417",
		"nexusasset://asset_4cfc6b35a4414469942275d539c51603",
		{185, 69, 839, 309},
		mobile,
		1.16
	)

	createMainButton(
		dock,
		"SettingsButton",
		"Settings",
		"nexusasset://asset_e0d1ccd1cda54b51ad21fd5f02a19d5a",
		"nexusasset://asset_a369c2baea304703945bb565c6f16e9c",
		{185, 69, 839, 309},
		mobile,
		1
	)

	createMainButton(
		dock,
		"CreditsButton",
		"Credits",
		"nexusasset://asset_e9fbaac6a3104f5aab82e00a31171d1b",
		"nexusasset://asset_a24cf9b505324f4da7794f0dd35f746d",
		{185, 66, 839, 297},
		mobile,
		1
	)

	return dock
end

local function createVariant(root, name, mobile)
	local group = Instance.new("Frame")
	group.Name = name
	group.BackgroundTransparency = 1
	group.Size = UDim2.fromScale(1, 1)
	group.Visible = not mobile
	group.Parent = root

	createBackground(group, mobile)
	createMenuDock(group, mobile)
	createSettingsModal(group, mobile)
	createCreditsModal(group, mobile)

	local hooks = Instance.new("Folder")
	hooks.Name = "SystemRegion"
	hooks.Parent = group

	local playHook = Instance.new("BindableEvent")
	playHook.Name = "OnPlayRequestedHook"
	playHook.Parent = hooks

	local panelBehavior = Instance.new("Folder")
	panelBehavior.Name = "PanelControllerBehavior"
	panelBehavior.Parent = hooks

	return group
end

function View.build()
	local gui = Instance.new("ScreenGui")
	gui.Name = "AURORA"
	gui.ResetOnSpawn = false
	gui.IgnoreGuiInset = false
	gui.DisplayOrder = 0
	gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

	createVariant(gui, "_NexusDesktop", false)
	createVariant(gui, "_NexusMobile", true)

	local warnings = Instance.new("Folder")
	warnings.Name = "ArtworkWarnings"
	warnings.Parent = gui

	local warningValue = Instance.new("StringValue")
	warningValue.Name = "UI_ARTWORK_NATIVE_CORNER"
	warningValue.Value = "Generated corner ornaments with strict bounds are disabled for reliability. Using native corner decoration instead."
	warningValue.Parent = warnings

	return gui
end

return View