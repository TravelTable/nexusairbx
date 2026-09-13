local View = {}

local FONT_MONTSERRAT = "rbxasset://fonts/families/Montserrat.json"

local COLORS = {
	BackgroundA = Color3.fromRGB(6, 18, 34),
	BackgroundB = Color3.fromRGB(11, 34, 61),
	BackgroundC = Color3.fromRGB(20, 70, 113),
	Bloom = Color3.fromRGB(60, 203, 255),
	Cobalt = Color3.fromRGB(42, 103, 216),
	Navy = Color3.fromRGB(10, 35, 64),
	Gold = Color3.fromRGB(231, 185, 90),
	TextPrimary = Color3.fromRGB(244, 251, 255),
	TextSecondary = Color3.fromRGB(184, 212, 232),
	Success = Color3.fromRGB(83, 214, 179),
	Danger = Color3.fromRGB(217, 106, 106),
	Shadow = Color3.fromRGB(6, 16, 28),
	TrackBack = Color3.fromRGB(11, 35, 66),
	TrackFill = Color3.fromRGB(60, 203, 255),
	Handle = Color3.fromRGB(231, 185, 90),
}

local function createShadow(parent, name, size, pos, transparency)
	local ok, shadow = pcall(Instance.new, "UIShadow")
	if ok and shadow then
		shadow.Name = name or "Shadow"
		shadow.Color = Color3.new(0, 0, 0)
		shadow.Transparency = transparency or 0.72
		shadow.BlurRadius = UDim.new(0, 18)
		shadow.Offset = UDim2.fromOffset(0, 6)
		shadow.Parent = parent
		return shadow
	end

	local fallback = Instance.new("Frame")
	fallback.Name = name or "Shadow"
	fallback.AnchorPoint = parent.AnchorPoint
	fallback.Position = pos + UDim2.fromOffset(0, 8)
	fallback.Size = size
	fallback.BackgroundColor3 = Color3.new(0, 0, 0)
	fallback.BackgroundTransparency = transparency or 0.82
	fallback.BorderSizePixel = 0
	fallback.ZIndex = math.max(1, parent.ZIndex - 1)
	fallback.Parent = parent.Parent

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 22)
	corner.Parent = fallback

	return fallback
end

local function makeText(parent, className, props)
	local label = Instance.new(className or "TextLabel")
	label.BackgroundTransparency = 1
	label.BorderSizePixel = 0
	label.TextColor3 = props.TextColor3 or COLORS.TextPrimary
	label.TextTransparency = props.TextTransparency or 0
	label.TextXAlignment = props.TextXAlignment or Enum.TextXAlignment.Center
	label.TextYAlignment = props.TextYAlignment or Enum.TextYAlignment.Center
	label.TextWrapped = props.TextWrapped or false
	label.TextScaled = props.TextScaled or false
	label.RichText = props.RichText or false
	label.Text = props.Text or ""
	label.Name = props.Name or label.Name
	label.Size = props.Size or UDim2.fromScale(1, 1)
	label.Position = props.Position or UDim2.fromScale(0, 0)
	label.AnchorPoint = props.AnchorPoint or Vector2.new(0, 0)
	label.ZIndex = props.ZIndex or 1
	label.FontFace = Font.new(FONT_MONTSERRAT, props.Weight or Enum.FontWeight.Medium, Enum.FontStyle.Normal)
	label.TextSize = props.TextSize or 18
	label.Parent = parent

	if props.MaxTextSize or props.MinTextSize then
		local constraint = Instance.new("UITextSizeConstraint")
		constraint.MaxTextSize = props.MaxTextSize or props.TextSize or 18
		constraint.MinTextSize = props.MinTextSize or 10
		constraint.Parent = label
	end

	return label
end

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
			local a, b = index * math.pi / 6, (index + 1) * math.pi / 6
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

local function createImageCrop(parent, name, image)
	local holder = Instance.new("Frame")
	holder.Name = name
	holder.BackgroundTransparency = 1
	holder.BorderSizePixel = 0
	holder.Size = UDim2.fromScale(1, 1)
	holder.Parent = parent

	local imageLabel = Instance.new("ImageLabel")
	imageLabel.Name = "BackgroundImage"
	imageLabel.BackgroundTransparency = 1
	imageLabel.BorderSizePixel = 0
	imageLabel.Size = UDim2.fromScale(1, 1)
	imageLabel.Image = image
	imageLabel.ImageColor3 = Color3.new(1, 1, 1)
	imageLabel.ScaleType = Enum.ScaleType.Crop
	imageLabel.Parent = holder

	return holder, imageLabel
end

local function createButton(parent, spec)
	local button = Instance.new("ImageButton")
	button.Name = spec.name
	button.AutoButtonColor = false
	button.BackgroundTransparency = 1
	button.BorderSizePixel = 0
	button.Size = spec.size
	button.Image = spec.image
	button.ImageColor3 = Color3.new(1, 1, 1)
	button.ScaleType = Enum.ScaleType.Slice
	button.SliceCenter = Rect.new(spec.slice[1], spec.slice[2], spec.slice[3], spec.slice[4])
	button.SliceScale = spec.sliceScale
	button.ZIndex = spec.z or 10
	button.Parent = parent

	createShadow(button, "NativeShadow", button.Size, button.Position, 0.78)

	local visual = Instance.new("Frame")
	visual.Name = "Visual"
	visual.BackgroundTransparency = 1
	visual.BorderSizePixel = 0
	visual.Size = UDim2.fromScale(1, 1)
	visual.ZIndex = button.ZIndex + 1
	visual.Parent = button

	local layout = Instance.new("UIListLayout")
	layout.FillDirection = Enum.FillDirection.Horizontal
	layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	layout.VerticalAlignment = Enum.VerticalAlignment.Center
	layout.Padding = UDim.new(0, spec.iconRole and 10 or 0)
	layout.Parent = visual

	local padding = Instance.new("UIPadding")
	padding.PaddingLeft = UDim.new(0, 18)
	padding.PaddingRight = UDim.new(0, 18)
	padding.Parent = visual

	if spec.iconRole then
		local icon = createNexusIcon(visual, spec.iconRole, {
			name = spec.name .. "Icon",
			size = spec.iconSize or 28,
			padding = spec.iconPadding or 10,
			color = COLORS.TextPrimary,
		})
		icon.LayoutOrder = 1
		icon.ZIndex = visual.ZIndex
	end

	local label = makeText(visual, "TextLabel", {
		Name = "Label",
		Text = spec.text,
		TextColor3 = COLORS.TextPrimary,
		TextSize = spec.textSize,
		Weight = spec.weight,
		MaxTextSize = spec.maxTextSize,
		MinTextSize = spec.minTextSize,
		ZIndex = visual.ZIndex,
		Size = UDim2.fromScale(0, 1),
		AutomaticSize = nil,
	})
	label.AutomaticSize = Enum.AutomaticSize.X
	label.LayoutOrder = 2

	local shadow = makeText(visual, "TextLabel", {
		Name = "LabelShadow",
		Text = spec.text,
		TextColor3 = COLORS.Navy,
		TextTransparency = 0.45,
		TextSize = spec.textSize,
		Weight = spec.weight,
		MaxTextSize = spec.maxTextSize,
		MinTextSize = spec.minTextSize,
		ZIndex = visual.ZIndex - 1,
		Size = UDim2.fromScale(0, 1),
	})
	shadow.AutomaticSize = Enum.AutomaticSize.X
	shadow.Position = UDim2.fromOffset(2, 2)
	shadow.Visible = false

	return button
end

local function createTitle(parent, mobile)
	local wrap = Instance.new("Frame")
	wrap.Name = "TitleWrap"
	wrap.BackgroundTransparency = 1
	wrap.BorderSizePixel = 0
	wrap.Size = mobile and UDim2.fromOffset(320, 108) or UDim2.fromOffset(440, 126)
	wrap.Parent = parent

	local TitlePlate = Instance.new("Frame")
	TitlePlate.Name = "TitlePlate"
	TitlePlate.BackgroundColor3 = Color3.fromRGB(18, 56, 95)
	TitlePlate.BorderSizePixel = 0
	TitlePlate.Size = UDim2.fromScale(1, 1)
	TitlePlate.Parent = wrap

	local plateCorner = Instance.new("UICorner")
	plateCorner.CornerRadius = UDim.new(0, 26)
	plateCorner.Parent = TitlePlate

	local plateStroke = Instance.new("UIStroke")
	plateStroke.Color = COLORS.Navy
	plateStroke.Thickness = 6
	plateStroke.Parent = TitlePlate

	local plateInner = Instance.new("UIStroke")
	plateInner.Name = "GoldStroke"
	plateInner.Color = COLORS.Gold
	plateInner.Thickness = 2
	plateInner.Transparency = 0.22
	plateInner.Parent = TitlePlate

	local grad = Instance.new("UIGradient")
	grad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(86, 227, 255)),
		ColorSequenceKeypoint.new(0.45, Color3.fromRGB(40, 123, 227)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(22, 74, 148)),
	})
	grad.Rotation = 90
	grad.Parent = TitlePlate

	createShadow(TitlePlate, "NativeShadow", TitlePlate.Size, TitlePlate.Position, 0.72)

	for _, side in ipairs({ "LeftWing", "RightWing" }) do
		local wing = Instance.new("Frame")
		wing.Name = side
		wing.AnchorPoint = side == "LeftWing" and Vector2.new(1, 0.5) or Vector2.new(0, 0.5)
		wing.Position = side == "LeftWing" and UDim2.fromScale(0.02, 0.5) or UDim2.fromScale(0.98, 0.5)
		wing.Size = mobile and UDim2.fromOffset(36, 72) or UDim2.fromOffset(44, 82)
		wing.BackgroundColor3 = Color3.fromRGB(20, 72, 127)
		wing.BorderSizePixel = 0
		wing.Rotation = side == "LeftWing" and -14 or 14
		wing.ZIndex = TitlePlate.ZIndex - 1
		wing.Parent = wrap

		local wingCorner = Instance.new("UICorner")
		wingCorner.CornerRadius = UDim.new(0, 14)
		wingCorner.Parent = wing

		local wingStroke = Instance.new("UIStroke")
		wingStroke.Color = COLORS.Navy
		wingStroke.Thickness = 4
		wingStroke.Parent = wing
	end

	makeText(TitlePlate, "TextLabel", {
		Name = "AuroraTitle",
		Text = "AURORA",
		TextSize = mobile and 34 or 44,
		Weight = Enum.FontWeight.ExtraBold,
		TextColor3 = COLORS.TextPrimary,
		MaxTextSize = mobile and 38 or 48,
		MinTextSize = 24,
		ZIndex = 20,
	})
	local titleShadow = makeText(TitlePlate, "TextLabel", {
		Name = "AuroraTitleShadow",
		Text = "AURORA",
		TextSize = mobile and 34 or 44,
		Weight = Enum.FontWeight.ExtraBold,
		TextColor3 = COLORS.Navy,
		TextTransparency = 0.42,
		MaxTextSize = mobile and 38 or 48,
		MinTextSize = 24,
		ZIndex = 19,
	})
	titleShadow.Position = UDim2.fromOffset(0, 3)

	return wrap
end

local function createToggle(parent)
	local MusicToggle = Instance.new("TextButton")
	MusicToggle.Name = "MusicToggle"
	MusicToggle.AutoButtonColor = false
	MusicToggle.BackgroundTransparency = 1
	MusicToggle.BorderSizePixel = 0
	MusicToggle.Text = ""
	MusicToggle.Size = UDim2.fromOffset(108, 50)
	MusicToggle.Parent = parent

	local Visual = Instance.new("Frame")
	Visual.Name = "Visual"
	Visual.BackgroundTransparency = 1
	Visual.BorderSizePixel = 0
	Visual.Size = UDim2.fromScale(1, 1)
	Visual.Parent = MusicToggle

	local housing = Instance.new("Frame")
	housing.Name = "Housing"
	housing.Size = UDim2.fromScale(1, 1)
	housing.BackgroundColor3 = Color3.fromRGB(23, 74, 126)
	housing.BorderSizePixel = 0
	housing.Parent = Visual

	local housingCorner = Instance.new("UICorner")
	housingCorner.CornerRadius = UDim.new(1, 0)
	housingCorner.Parent = housing

	local housingStroke = Instance.new("UIStroke")
	housingStroke.Color = COLORS.Navy
	housingStroke.Thickness = 4
	housingStroke.Parent = housing

	local ToggleOffState = Instance.new("Frame")
	ToggleOffState.Name = "ToggleOffState"
	ToggleOffState.BackgroundColor3 = Color3.fromRGB(28, 84, 145)
	ToggleOffState.BorderSizePixel = 0
	ToggleOffState.Size = UDim2.fromScale(1, 1)
	ToggleOffState.Parent = housing

	local offCorner = Instance.new("UICorner")
	offCorner.CornerRadius = UDim.new(1, 0)
	offCorner.Parent = ToggleOffState

	local ToggleOnState = Instance.new("Frame")
	ToggleOnState.Name = "ToggleOnState"
	ToggleOnState.BackgroundColor3 = COLORS.Success
	ToggleOnState.BorderSizePixel = 0
	ToggleOnState.Size = UDim2.fromScale(1, 1)
	ToggleOnState.Visible = false
	ToggleOnState.Parent = housing

	local onCorner = Instance.new("UICorner")
	onCorner.CornerRadius = UDim.new(1, 0)
	onCorner.Parent = ToggleOnState

	local gloss = Instance.new("Frame")
	gloss.Name = "Gloss"
	gloss.BackgroundColor3 = Color3.new(1, 1, 1)
	gloss.BackgroundTransparency = 0.8
	gloss.BorderSizePixel = 0
	gloss.Size = UDim2.fromScale(0.92, 0.38)
	gloss.Position = UDim2.fromScale(0.04, 0.08)
	gloss.Parent = housing

	local glossCorner = Instance.new("UICorner")
	glossCorner.CornerRadius = UDim.new(1, 0)
	glossCorner.Parent = gloss

	local Thumb = Instance.new("Frame")
	Thumb.Name = "Thumb"
	Thumb.AnchorPoint = Vector2.new(0, 0.5)
	Thumb.Position = UDim2.fromScale(0.08, 0.5)
	Thumb.Size = UDim2.fromOffset(34, 34)
	Thumb.BackgroundColor3 = COLORS.Handle
	Thumb.BorderSizePixel = 0
	Thumb.Parent = housing

	local thumbCorner = Instance.new("UICorner")
	thumbCorner.CornerRadius = UDim.new(1, 0)
	thumbCorner.Parent = Thumb

	local thumbStroke = Instance.new("UIStroke")
	thumbStroke.Color = COLORS.Navy
	thumbStroke.Thickness = 3
	thumbStroke.Parent = Thumb

	local HitArea = Instance.new("Frame")
	HitArea.Name = "HitArea"
	HitArea.BackgroundTransparency = 1
	HitArea.BorderSizePixel = 0
	HitArea.Size = UDim2.fromScale(1, 1)
	HitArea.Parent = MusicToggle

	local stateLabel = makeText(housing, "TextLabel", {
		Name = "StateLabel",
		Text = "ON",
		TextSize = 14,
		Weight = Enum.FontWeight.Bold,
		TextColor3 = COLORS.TextPrimary,
		ZIndex = 4,
		Position = UDim2.fromScale(0.54, 0.1),
		Size = UDim2.fromScale(0.34, 0.8),
		MaxTextSize = 16,
		MinTextSize = 10,
	})
	stateLabel.Visible = false

	return MusicToggle
end

local function createSlider(parent)
	local VolumeSlider = Instance.new("Frame")
	VolumeSlider.Name = "VolumeSlider"
	VolumeSlider.BackgroundTransparency = 1
	VolumeSlider.BorderSizePixel = 0
	VolumeSlider.Size = UDim2.new(1, 0, 0, 48)
	VolumeSlider.Parent = parent

	local TrackBack = Instance.new("Frame")
	TrackBack.Name = "TrackBack"
	TrackBack.AnchorPoint = Vector2.new(0, 0.5)
	TrackBack.Position = UDim2.new(0, 0, 0.5, 0)
	TrackBack.Size = UDim2.new(1, 0, 0, 18)
	TrackBack.BackgroundColor3 = COLORS.TrackBack
	TrackBack.BorderSizePixel = 0
	TrackBack.Parent = VolumeSlider

	local backCorner = Instance.new("UICorner")
	backCorner.CornerRadius = UDim.new(1, 0)
	backCorner.Parent = TrackBack

	local backStroke = Instance.new("UIStroke")
	backStroke.Color = COLORS.Navy
	backStroke.Thickness = 3
	backStroke.Parent = TrackBack

	local TrackFill = Instance.new("Frame")
	TrackFill.Name = "TrackFill"
	TrackFill.AnchorPoint = Vector2.new(0, 0.5)
	TrackFill.Position = UDim2.new(0, 0, 0.5, 0)
	TrackFill.Size = UDim2.new(0.7, 0, 0, 18)
	TrackFill.BackgroundColor3 = COLORS.TrackFill
	TrackFill.BorderSizePixel = 0
	TrackFill.Parent = VolumeSlider

	local fillCorner = Instance.new("UICorner")
	fillCorner.CornerRadius = UDim.new(1, 0)
	fillCorner.Parent = TrackFill

	local fillGrad = Instance.new("UIGradient")
	fillGrad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(66, 219, 255)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(42, 103, 216)),
	})
	fillGrad.Rotation = 0
	fillGrad.Parent = TrackFill

	local Handle = Instance.new("TextButton")
	Handle.Name = "Handle"
	Handle.AutoButtonColor = false
	Handle.AnchorPoint = Vector2.new(0.5, 0.5)
	Handle.Position = UDim2.new(0.7, 0, 0.5, 0)
	Handle.Size = UDim2.fromOffset(34, 34)
	Handle.Text = ""
	Handle.BackgroundColor3 = COLORS.Handle
	Handle.BorderSizePixel = 0
	Handle.Parent = VolumeSlider

	local handleCorner = Instance.new("UICorner")
	handleCorner.CornerRadius = UDim.new(1, 0)
	handleCorner.Parent = Handle

	local handleStroke = Instance.new("UIStroke")
	handleStroke.Color = COLORS.Navy
	handleStroke.Thickness = 3
	handleStroke.Parent = Handle

	local handleGloss = Instance.new("Frame")
	handleGloss.Name = "Gloss"
	handleGloss.BackgroundColor3 = Color3.new(1, 1, 1)
	handleGloss.BackgroundTransparency = 0.72
	handleGloss.BorderSizePixel = 0
	handleGloss.AnchorPoint = Vector2.new(0.5, 0)
	handleGloss.Position = UDim2.fromScale(0.5, 0.08)
	handleGloss.Size = UDim2.fromScale(0.62, 0.26)
	handleGloss.Parent = Handle

	local glossCorner = Instance.new("UICorner")
	glossCorner.CornerRadius = UDim.new(1, 0)
	glossCorner.Parent = handleGloss

	local HitArea = Instance.new("TextButton")
	HitArea.Name = "HitArea"
	HitArea.AutoButtonColor = false
	HitArea.Text = ""
	HitArea.BackgroundTransparency = 1
	HitArea.BorderSizePixel = 0
	HitArea.Size = UDim2.new(1, 0, 1, 18)
	HitArea.Position = UDim2.new(0, 0, 0.5, -9)
	HitArea.Parent = VolumeSlider

	return VolumeSlider
end

local function createSettingsModal(parent, mobile)
	local shell = Instance.new("Frame")
	shell.Name = "SettingsModalShell"
	shell.BackgroundTransparency = 1
	shell.BorderSizePixel = 0
	shell.AnchorPoint = Vector2.new(0.5, 0.5)
	shell.Position = UDim2.fromScale(0.5, 0.5)
	shell.Size = mobile and UDim2.fromScale(0.88, 0.42) or UDim2.fromScale(0.34, 0.42)
	shell.Visible = false
	shell.ZIndex = 40
	shell.Parent = parent

	local SettingsModal = Instance.new("ImageLabel")
	SettingsModal.Name = "SettingsModal"
	SettingsModal.BackgroundTransparency = 1
	SettingsModal.BorderSizePixel = 0
	SettingsModal.Size = UDim2.fromScale(1, 1)
	SettingsModal.Image = "nexusasset://asset_e1cf723245834cbcadaeca083a47c684"
	SettingsModal.ImageColor3 = Color3.new(1, 1, 1)
	SettingsModal.ScaleType = Enum.ScaleType.Slice
	SettingsModal.SliceCenter = Rect.new(185, 94, 839, 427)
	SettingsModal.SliceScale = 0.2
	SettingsModal.Parent = shell

	createShadow(SettingsModal, "NativeShadow", SettingsModal.Size, SettingsModal.Position, 0.68)

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.BorderSizePixel = 0
	content.Size = UDim2.fromScale(1, 1)
	content.Parent = SettingsModal

	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, mobile and 20 or 22)
	padding.PaddingBottom = UDim.new(0, mobile and 20 or 22)
	padding.PaddingLeft = UDim.new(0, mobile and 22 or 28)
	padding.PaddingRight = UDim.new(0, mobile and 22 or 28)
	padding.Parent = content

	local header = Instance.new("Frame")
	header.Name = "Header"
	header.BackgroundTransparency = 1
	header.BorderSizePixel = 0
	header.Size = UDim2.new(1, 0, 0, 56)
	header.Parent = content

	makeText(header, "TextLabel", {
		Name = "SettingsTitle",
		Text = "Settings",
		TextColor3 = COLORS.TextPrimary,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextSize = mobile and 22 or 26,
		Weight = Enum.FontWeight.Bold,
		MaxTextSize = mobile and 24 or 28,
		MinTextSize = 16,
		Size = UDim2.new(1, -70, 1, 0),
		ZIndex = 44,
	})

	local SettingsCloseButton = Instance.new("ImageButton")
	SettingsCloseButton.Name = "SettingsCloseButton"
	SettingsCloseButton.AutoButtonColor = false
	SettingsCloseButton.BackgroundTransparency = 1
	SettingsCloseButton.BorderSizePixel = 0
	SettingsCloseButton.AnchorPoint = Vector2.new(1, 0)
	SettingsCloseButton.Position = UDim2.new(1, 0, 0, 0)
	SettingsCloseButton.Size = UDim2.fromOffset(mobile and 52 or 56, mobile and 52 or 56)
	SettingsCloseButton.Image = "nexusasset://asset_32051086979346beabb6bef4d2e707b9"
	SettingsCloseButton.ImageColor3 = Color3.new(1, 1, 1)
	SettingsCloseButton.ScaleType = Enum.ScaleType.Slice
	SettingsCloseButton.SliceCenter = Rect.new(185, 93, 839, 419)
	SettingsCloseButton.SliceScale = 0.2
	SettingsCloseButton.ZIndex = 45
	SettingsCloseButton.Parent = header

	local closeVisual = Instance.new("Frame")
	closeVisual.Name = "Visual"
	closeVisual.BackgroundTransparency = 1
	closeVisual.BorderSizePixel = 0
	closeVisual.Size = UDim2.fromScale(1, 1)
	closeVisual.Parent = SettingsCloseButton

	local SettingsCloseButtonIcon = createNexusIcon(closeVisual, "close", {
		name = "SettingsCloseButtonIcon",
		size = 24,
		padding = 8,
		color = COLORS.TextPrimary,
	})
	SettingsCloseButtonIcon.AnchorPoint = Vector2.new(0.5, 0.5)
	SettingsCloseButtonIcon.Position = UDim2.fromScale(0.5, 0.5)

	local SettingsSeparator = Instance.new("Frame")
	SettingsSeparator.Name = "SettingsSeparator"
	SettingsSeparator.BackgroundColor3 = COLORS.Gold
	SettingsSeparator.BackgroundTransparency = 0.28
	SettingsSeparator.BorderSizePixel = 0
	SettingsSeparator.Size = UDim2.new(1, 0, 0, 2)
	SettingsSeparator.Position = UDim2.new(0, 0, 0, 62)
	SettingsSeparator.Parent = content

	local body = Instance.new("Frame")
	body.Name = "Body"
	body.BackgroundTransparency = 1
	body.BorderSizePixel = 0
	body.Position = UDim2.new(0, 0, 0, 78)
	body.Size = UDim2.new(1, 0, 1, -78)
	body.Parent = content

	local list = Instance.new("UIListLayout")
	list.Padding = UDim.new(0, mobile and 14 or 16)
	list.HorizontalAlignment = Enum.HorizontalAlignment.Left
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Parent = body

	local MusicRow = Instance.new("Frame")
	MusicRow.Name = "MusicRow"
	MusicRow.BackgroundTransparency = 1
	MusicRow.BorderSizePixel = 0
	MusicRow.Size = UDim2.new(1, 0, 0, 58)
	MusicRow.LayoutOrder = 1
	MusicRow.Parent = body

	makeText(MusicRow, "TextLabel", {
		Name = "MusicLabel",
		Text = "Music",
		TextColor3 = COLORS.TextPrimary,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextSize = mobile and 16 or 18,
		Weight = Enum.FontWeight.Medium,
		Position = UDim2.new(0, 0, 0.5, -14),
		Size = UDim2.new(1, -124, 0, 28),
		ZIndex = 44,
		MaxTextSize = 20,
		MinTextSize = 14,
	})

	local toggleWrap = Instance.new("Frame")
	toggleWrap.Name = "ToggleWrap"
	toggleWrap.AnchorPoint = Vector2.new(1, 0.5)
	toggleWrap.Position = UDim2.new(1, 0, 0.5, 0)
	toggleWrap.Size = UDim2.fromOffset(108, 50)
	toggleWrap.BackgroundTransparency = 1
	toggleWrap.BorderSizePixel = 0
	toggleWrap.Parent = MusicRow

	createToggle(toggleWrap)

	local VolumeRow = Instance.new("Frame")
	VolumeRow.Name = "VolumeRow"
	VolumeRow.BackgroundTransparency = 1
	VolumeRow.BorderSizePixel = 0
	VolumeRow.Size = UDim2.new(1, 0, 0, mobile and 90 or 84)
	VolumeRow.LayoutOrder = 2
	VolumeRow.Parent = body

	makeText(VolumeRow, "TextLabel", {
		Name = "VolumeLabel",
		Text = "Volume",
		TextColor3 = COLORS.TextPrimary,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextSize = mobile and 16 or 18,
		Weight = Enum.FontWeight.Medium,
		Position = UDim2.new(0, 0, 0, 0),
		Size = UDim2.new(0.7, 0, 0, 26),
		ZIndex = 44,
		MaxTextSize = 20,
		MinTextSize = 14,
	})

	makeText(VolumeRow, "TextLabel", {
		Name = "VolumeValue",
		Text = "70%",
		TextColor3 = COLORS.TextSecondary,
		TextXAlignment = Enum.TextXAlignment.Right,
		TextSize = mobile and 16 or 18,
		Weight = Enum.FontWeight.SemiBold,
		Position = UDim2.new(0.72, 0, 0, 0),
		Size = UDim2.new(0.28, 0, 0, 26),
		ZIndex = 44,
		MaxTextSize = 18,
		MinTextSize = 14,
	})

	local sliderWrap = Instance.new("Frame")
	sliderWrap.Name = "SliderWrap"
	sliderWrap.BackgroundTransparency = 1
	sliderWrap.BorderSizePixel = 0
	sliderWrap.Position = UDim2.new(0, 0, 0, 34)
	sliderWrap.Size = UDim2.new(1, 0, 0, 48)
	sliderWrap.Parent = VolumeRow

	createSlider(sliderWrap)

	local PanelControllerBehavior = Instance.new("Folder")
	PanelControllerBehavior.Name = "PanelControllerBehavior"
	PanelControllerBehavior.Parent = SettingsModal

	return shell
end

local function createCreditsModal(parent, mobile)
	local shell = Instance.new("Frame")
	shell.Name = "CreditsModalShell"
	shell.BackgroundTransparency = 1
	shell.BorderSizePixel = 0
	shell.AnchorPoint = Vector2.new(0.5, 0.5)
	shell.Position = UDim2.fromScale(0.5, 0.5)
	shell.Size = mobile and UDim2.fromScale(0.84, 0.28) or UDim2.fromScale(0.28, 0.26)
	shell.Visible = false
	shell.ZIndex = 40
	shell.Parent = parent

	local CreditsModal = Instance.new("ImageLabel")
	CreditsModal.Name = "CreditsModal"
	CreditsModal.BackgroundTransparency = 1
	CreditsModal.BorderSizePixel = 0
	CreditsModal.Size = UDim2.fromScale(1, 1)
	CreditsModal.Image = "nexusasset://asset_c46f5bff5a3d4158adcb803c5cc3661a"
	CreditsModal.ImageColor3 = Color3.new(1, 1, 1)
	CreditsModal.ScaleType = Enum.ScaleType.Slice
	CreditsModal.SliceCenter = Rect.new(185, 124, 839, 564)
	CreditsModal.SliceScale = 0.2
	CreditsModal.Parent = shell

	createShadow(CreditsModal, "NativeShadow", CreditsModal.Size, CreditsModal.Position, 0.68)

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.BorderSizePixel = 0
	content.Size = UDim2.fromScale(1, 1)
	content.Parent = CreditsModal

	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, mobile and 18 or 20)
	padding.PaddingBottom = UDim.new(0, mobile and 18 or 20)
	padding.PaddingLeft = UDim.new(0, mobile and 20 or 24)
	padding.PaddingRight = UDim.new(0, mobile and 20 or 24)
	padding.Parent = content

	local header = Instance.new("Frame")
	header.Name = "Header"
	header.BackgroundTransparency = 1
	header.BorderSizePixel = 0
	header.Size = UDim2.new(1, 0, 0, 54)
	header.Parent = content

	makeText(header, "TextLabel", {
		Name = "CreditsTitle",
		Text = "Credits",
		TextColor3 = COLORS.TextPrimary,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextSize = mobile and 22 or 26,
		Weight = Enum.FontWeight.Bold,
		MaxTextSize = mobile and 24 or 28,
		MinTextSize = 16,
		Size = UDim2.new(1, -70, 1, 0),
		ZIndex = 44,
	})

	local CreditsCloseButton = Instance.new("ImageButton")
	CreditsCloseButton.Name = "CreditsCloseButton"
	CreditsCloseButton.AutoButtonColor = false
	CreditsCloseButton.BackgroundTransparency = 1
	CreditsCloseButton.BorderSizePixel = 0
	CreditsCloseButton.AnchorPoint = Vector2.new(1, 0)
	CreditsCloseButton.Position = UDim2.new(1, 0, 0, 0)
	CreditsCloseButton.Size = UDim2.fromOffset(mobile and 52 or 56, mobile and 52 or 56)
	CreditsCloseButton.Image = "nexusasset://asset_32051086979346beabb6bef4d2e707b9"
	CreditsCloseButton.ImageColor3 = Color3.new(1, 1, 1)
	CreditsCloseButton.ScaleType = Enum.ScaleType.Slice
	CreditsCloseButton.SliceCenter = Rect.new(185, 93, 839, 419)
	CreditsCloseButton.SliceScale = 0.2
	CreditsCloseButton.ZIndex = 45
	CreditsCloseButton.Parent = header

	local closeVisual = Instance.new("Frame")
	closeVisual.Name = "Visual"
	closeVisual.BackgroundTransparency = 1
	closeVisual.BorderSizePixel = 0
	closeVisual.Size = UDim2.fromScale(1, 1)
	closeVisual.Parent = CreditsCloseButton

	local CreditsCloseButtonIcon = createNexusIcon(closeVisual, "close", {
		name = "CreditsCloseButtonIcon",
		size = 24,
		padding = 8,
		color = COLORS.TextPrimary,
	})
	CreditsCloseButtonIcon.AnchorPoint = Vector2.new(0.5, 0.5)
	CreditsCloseButtonIcon.Position = UDim2.fromScale(0.5, 0.5)

	makeText(content, "TextLabel", {
		Name = "CreditsBody",
		Text = "AURORA\nUI artwork and menu setup ready for game integration.",
		TextColor3 = COLORS.TextSecondary,
		TextWrapped = true,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextYAlignment = Enum.TextYAlignment.Top,
		TextSize = mobile and 16 or 18,
		Weight = Enum.FontWeight.Medium,
		MaxTextSize = 19,
		MinTextSize = 14,
		Position = UDim2.new(0, 0, 0, 60),
		Size = UDim2.new(1, 0, 1, -60),
		ZIndex = 44,
	})

	return shell
end

local function buildRegion(root, mobile)
	local region = Instance.new("Frame")
	region.Name = mobile and "_NexusMobile" or "_NexusDesktop"
	region.BackgroundTransparency = 1
	region.BorderSizePixel = 0
	region.Size = UDim2.fromScale(1, 1)
	region.Visible = not mobile
	region.Parent = root

	local bgWrap = Instance.new("Frame")
	bgWrap.Name = "BackgroundLayer"
	bgWrap.BackgroundTransparency = 1
	bgWrap.BorderSizePixel = 0
	bgWrap.Size = UDim2.fromScale(1, 1)
	bgWrap.Parent = region

	local BackgroundRoot = Instance.new("Frame")
	BackgroundRoot.Name = "BackgroundRoot"
	BackgroundRoot.BackgroundColor3 = COLORS.BackgroundA
	BackgroundRoot.BorderSizePixel = 0
	BackgroundRoot.Size = UDim2.fromScale(1, 1)
	BackgroundRoot.Parent = bgWrap

	local rootGradient = Instance.new("UIGradient")
	rootGradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, COLORS.BackgroundA),
		ColorSequenceKeypoint.new(0.5, COLORS.BackgroundB),
		ColorSequenceKeypoint.new(1, COLORS.BackgroundC),
	})
	rootGradient.Rotation = 90
	rootGradient.Parent = BackgroundRoot

	local BackgroundSkyClouds = Instance.new("ImageLabel")
	BackgroundSkyClouds.Name = "BackgroundSkyClouds"
	BackgroundSkyClouds.BackgroundTransparency = 1
	BackgroundSkyClouds.BorderSizePixel = 0
	BackgroundSkyClouds.Size = UDim2.fromScale(1, 1)
	BackgroundSkyClouds.Image = "nexusasset://asset_2feeb66acf9d4115bae8a63e3d5bfe9f"
	BackgroundSkyClouds.ImageColor3 = Color3.new(1, 1, 1)
	BackgroundSkyClouds.ImageTransparency = mobile and 0.74 or 0.66
	BackgroundSkyClouds.ScaleType = Enum.ScaleType.Crop
	BackgroundSkyClouds.Parent = BackgroundRoot

	for i, pos in ipairs({
		UDim2.fromScale(0.18, 0.2),
		UDim2.fromScale(0.82, 0.28),
		UDim2.fromScale(0.24, 0.72),
	}) do
		local bloom = Instance.new("Frame")
		bloom.Name = "Bloom" .. i
		bloom.AnchorPoint = Vector2.new(0.5, 0.5)
		bloom.Position = pos
		bloom.Size = mobile and UDim2.fromOffset(180, 180) or UDim2.fromOffset(240, 240)
		bloom.BackgroundColor3 = COLORS.Bloom
		bloom.BackgroundTransparency = 0.88
		bloom.BorderSizePixel = 0
		bloom.Parent = BackgroundRoot

		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(1, 0)
		corner.Parent = bloom
	end

	local BackgroundOrnaments = Instance.new("Folder")
	BackgroundOrnaments.Name = "BackgroundOrnaments"
	BackgroundOrnaments.Parent = region

	local overlay = Instance.new("TextButton")
	overlay.Name = "DimOverlay"
	overlay.AutoButtonColor = false
	overlay.Text = ""
	overlay.BackgroundColor3 = Color3.new(0, 0, 0)
	overlay.BackgroundTransparency = 0.45
	overlay.BorderSizePixel = 0
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.Visible = false
	overlay.ZIndex = 30
	overlay.Parent = region

	local MainMenuDock = Instance.new("Frame")
	MainMenuDock.Name = "MainMenuDock"
	MainMenuDock.AnchorPoint = Vector2.new(0.5, 0.5)
	MainMenuDock.Position = mobile and UDim2.fromScale(0.5, 0.54) or UDim2.fromScale(0.5, 0.47)
	MainMenuDock.Size = mobile and UDim2.fromScale(0.78, 0.66) or UDim2.fromScale(0.32, 0.62)
	MainMenuDock.BackgroundTransparency = 1
	MainMenuDock.BorderSizePixel = 0
	MainMenuDock.ZIndex = 10
	MainMenuDock.Parent = region

	local dockLayout = Instance.new("UIListLayout")
	dockLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	dockLayout.VerticalAlignment = Enum.VerticalAlignment.Center
	dockLayout.Padding = UDim.new(0, mobile and 12 or 16)
	dockLayout.SortOrder = Enum.SortOrder.LayoutOrder
	dockLayout.Parent = MainMenuDock

	local dockPad = Instance.new("UIPadding")
	dockPad.PaddingTop = UDim.new(0, 12)
	dockPad.PaddingBottom = UDim.new(0, 12)
	dockPad.Parent = MainMenuDock

	local title = createTitle(MainMenuDock, mobile)
	title.LayoutOrder = 1

	local PlayButton = createButton(MainMenuDock, {
		name = "PlayButton",
		text = "Play",
		image = "nexusasset://asset_ba81bd104c04413fa1c4e5729414428e",
		slice = { 185, 89, 839, 403 },
		sliceScale = 0.2,
		size = UDim2.new(1, 0, 0, mobile and 72 or 84),
		textSize = mobile and 22 or 24,
		weight = Enum.FontWeight.SemiBold,
		maxTextSize = mobile and 24 or 26,
		minTextSize = 18,
		iconRole = "play",
		iconSize = 28,
		iconPadding = 10,
	})
	PlayButton.LayoutOrder = 2

	local SettingsButton = createButton(MainMenuDock, {
		name = "SettingsButton",
		text = "Settings",
		image = "nexusasset://asset_8db5d1f006c74515ab972c252cacf0e2",
		slice = { 185, 64, 839, 287 },
		sliceScale = 0.2,
		size = UDim2.new(1, 0, 0, mobile and 64 or 68),
		textSize = mobile and 22 or 24,
		weight = Enum.FontWeight.SemiBold,
		maxTextSize = mobile and 24 or 26,
		minTextSize = 18,
		iconRole = "settings",
		iconSize = 28,
		iconPadding = 10,
	})
	SettingsButton.LayoutOrder = 3

	local CreditsButton = createButton(MainMenuDock, {
		name = "CreditsButton",
		text = "Credits",
		image = "nexusasset://asset_8db5d1f006c74515ab972c252cacf0e2",
		slice = { 185, 64, 839, 287 },
		sliceScale = 0.2,
		size = UDim2.new(1, 0, 0, mobile and 64 or 68),
		textSize = mobile and 22 or 24,
		weight = Enum.FontWeight.SemiBold,
		maxTextSize = mobile and 24 or 26,
		minTextSize = 18,
		iconRole = "info",
		iconSize = 28,
		iconPadding = 10,
	})
	CreditsButton.LayoutOrder = 4

	local hookFolder = Instance.new("Folder")
	hookFolder.Name = "OnPlayRequestedHook"
	hookFolder.Parent = region

	local playEvent = Instance.new("BindableEvent")
	playEvent.Name = "Event"
	playEvent.Parent = hookFolder

	createSettingsModal(region, mobile)
	createCreditsModal(region, mobile)

	return region
end

function View.build()
	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "AURORA"
	screenGui.ResetOnSpawn = false
	screenGui.IgnoreGuiInset = false
	screenGui.DisplayOrder = 0
	screenGui.Enabled = true
	screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

	buildRegion(screenGui, false)
	buildRegion(screenGui, true)

	return screenGui
end

return View