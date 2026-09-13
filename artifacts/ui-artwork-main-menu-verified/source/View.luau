local View = {}

local PALETTE = {
	backgroundTop = Color3.fromRGB(7, 21, 38),
	backgroundBottom = Color3.fromRGB(3, 10, 20),
	backgroundAccent = Color3.fromRGB(18, 58, 96),
	panelText = Color3.fromRGB(244, 251, 255),
	panelSubtext = Color3.fromRGB(184, 212, 232),
	nativeSurface = Color3.fromRGB(12, 30, 53),
	nativeSurface2 = Color3.fromRGB(15, 46, 77),
	nativeOutline = Color3.fromRGB(10, 35, 64),
	nativeGold = Color3.fromRGB(231, 185, 90),
	nativeCyan = Color3.fromRGB(60, 203, 255),
	nativeCyanSoft = Color3.fromRGB(119, 226, 255),
	success = Color3.fromRGB(83, 214, 179),
	danger = Color3.fromRGB(217, 106, 106),
	shadow = Color3.fromRGB(6, 16, 28),
	white = Color3.fromRGB(255, 255, 255),
}

local TITLE_PLATE_URI = "nexusasset://asset_6e85243962a64a119298e36898fbfeca"
local PLAY_BUTTON_URI = "nexusasset://asset_ba81bd104c04413fa1c4e5729414428e"
local MENU_BUTTON_URI = "nexusasset://asset_8db5d1f006c74515ab972c252cacf0e2"
local SETTINGS_PANEL_URI = "nexusasset://asset_e1cf723245834cbcadaeca083a47c684"
local CREDITS_PANEL_URI = "nexusasset://asset_c46f5bff5a3d4158adcb803c5cc3661a"
local CLOSE_BUTTON_URI = "nexusasset://asset_32051086979346beabb6bef4d2e707b9"
local TOGGLE_ON_URI = "nexusasset://asset_8caafb851c964d6fbc78ad6158bcfdfb"
local TOGGLE_OFF_URI = "nexusasset://asset_8244b798b2d44615b075162e34dd78ba"

local FONT_DISPLAY = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.ExtraBold, Enum.FontStyle.Normal)
local FONT_HEADING = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.Bold, Enum.FontStyle.Normal)
local FONT_BUTTON = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.SemiBold, Enum.FontStyle.Normal)
local FONT_BODY = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.Medium, Enum.FontStyle.Normal)
local FONT_NUMERIC = Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight.SemiBold, Enum.FontStyle.Normal)

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

local function applyNativeShadow(parent, name, zIndex, transparency)
	local ok, shadow = pcall(Instance.new, "UIShadow")
	if ok and shadow then
		shadow.Name = name or "Shadow"
		shadow.Color = Color3.new(0, 0, 0)
		shadow.Transparency = transparency or 0.72
		shadow.BlurRadius = UDim.new(0, 18)
		shadow.Offset = UDim2.fromOffset(0, 6)
		shadow.Parent = parent
		parent.ZIndex = zIndex or parent.ZIndex
		return shadow
	end
	return nil
end

local function newTextLabel(name, text, fontFace, size, color)
	local label = Instance.new("TextLabel")
	label.Name = name
	label.BackgroundTransparency = 1
	label.BorderSizePixel = 0
	label.Text = text
	label.TextColor3 = color
	label.TextTransparency = 0
	label.TextScaled = false
	label.TextSize = size
	label.FontFace = fontFace
	label.TextWrapped = true
	label.RichText = false
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.TextYAlignment = Enum.TextYAlignment.Center
	return label
end

local function addTextShadow(label)
	local shadow = Instance.new("TextLabel")
	shadow.Name = "Shadow"
	shadow.BackgroundTransparency = 1
	shadow.BorderSizePixel = 0
	shadow.Size = UDim2.fromScale(1, 1)
	shadow.Position = UDim2.fromOffset(0, 2)
	shadow.ZIndex = math.max(1, label.ZIndex - 1)
	shadow.Text = label.Text
	shadow.TextColor3 = PALETTE.nativeOutline
	shadow.TextTransparency = 0.35
	shadow.TextScaled = label.TextScaled
	shadow.TextSize = label.TextSize
	shadow.FontFace = label.FontFace
	shadow.TextWrapped = label.TextWrapped
	shadow.TextXAlignment = label.TextXAlignment
	shadow.TextYAlignment = label.TextYAlignment
	shadow.Parent = label.Parent
	return shadow
end

local function createSliceButton(nodeName, imageUri, sliceCenterArray, sliceScale, buttonHeight)
	local button = Instance.new("ImageButton")
	button.Name = nodeName
	button.BackgroundTransparency = 1
	button.AutoButtonColor = false
	button.Image = imageUri
	button.ImageColor3 = PALETTE.white
	button.ScaleType = Enum.ScaleType.Slice
	button.SliceCenter = Rect.new(sliceCenterArray[1], sliceCenterArray[2], sliceCenterArray[3], sliceCenterArray[4])
	button.SliceScale = sliceScale
	button.Size = UDim2.new(1, 0, 0, buttonHeight)
	button.SelectionImageObject = nil

	local shadowHost = Instance.new("Frame")
	shadowHost.Name = "Shadow"
	shadowHost.BackgroundTransparency = 1
	shadowHost.BorderSizePixel = 0
	shadowHost.Size = UDim2.fromScale(1, 1)
	shadowHost.ZIndex = 1
	shadowHost.Parent = button
	applyNativeShadow(shadowHost, "NativeShadow", 1, 0.76)

	local visual = Instance.new("Frame")
	visual.Name = "Visual"
	visual.BackgroundTransparency = 1
	visual.BorderSizePixel = 0
	visual.Size = UDim2.fromScale(1, 1)
	visual.ZIndex = 2
	visual.Parent = button

	local skin = Instance.new("ImageLabel")
	skin.Name = "Skin"
	skin.BackgroundTransparency = 1
	skin.BorderSizePixel = 0
	skin.Size = UDim2.fromScale(1, 1)
	skin.Image = imageUri
	skin.ImageColor3 = PALETTE.white
	skin.ScaleType = Enum.ScaleType.Slice
	skin.SliceCenter = Rect.new(sliceCenterArray[1], sliceCenterArray[2], sliceCenterArray[3], sliceCenterArray[4])
	skin.SliceScale = sliceScale
	skin.ZIndex = 2
	skin.Parent = visual

	local gloss = Instance.new("Frame")
	gloss.Name = "Gloss"
	gloss.BackgroundColor3 = PALETTE.white
	gloss.BackgroundTransparency = 0.88
	gloss.BorderSizePixel = 0
	gloss.Position = UDim2.fromScale(0.05, 0.08)
	gloss.Size = UDim2.fromScale(0.9, 0.34)
	gloss.ZIndex = 3
	gloss.Parent = visual

	local glossCorner = Instance.new("UICorner")
	glossCorner.CornerRadius = UDim.new(0.9, 0)
	glossCorner.Parent = gloss

	local glossGradient = Instance.new("UIGradient")
	glossGradient.Rotation = 90
	glossGradient.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.05),
		NumberSequenceKeypoint.new(1, 1),
	})
	glossGradient.Parent = gloss

	return button
end

local function populateButtonContent(button, text, iconRole, iconSize, textSize)
	local visual = button:FindFirstChild("Visual")
	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.BorderSizePixel = 0
	content.Size = UDim2.fromScale(1, 1)
	content.ZIndex = 4
	content.Parent = visual

	local padding = Instance.new("UIPadding")
	padding.PaddingLeft = UDim.new(0, 20)
	padding.PaddingRight = UDim.new(0, 20)
	padding.Parent = content

	local buttonIcon = createNexusIcon(content, iconRole, {
		name = button.Name .. "Icon",
		size = iconSize,
		padding = 10,
		color = PALETTE.panelText,
	})
	buttonIcon.AnchorPoint = Vector2.new(0, 0.5)
	buttonIcon.Position = UDim2.new(0, 0, 0.5, 0)
	buttonIcon.ZIndex = 5
	for _, desc in ipairs(buttonIcon:GetDescendants()) do
		if desc:IsA("Frame") then
			desc.ZIndex = 5
		end
	end

	local label = newTextLabel("Label", text, FONT_BUTTON, textSize, PALETTE.panelText)
	label.Size = UDim2.new(1, -(iconSize + 18), 1, 0)
	label.Position = UDim2.new(0, iconSize + 14, 0, 0)
	label.ZIndex = 5
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.Parent = content

	local sizeConstraint = Instance.new("UITextSizeConstraint")
	sizeConstraint.MinTextSize = math.max(18, textSize - 4)
	sizeConstraint.MaxTextSize = textSize
	sizeConstraint.Parent = label

	local textShadow = addTextShadow(label)
	textShadow.Size = label.Size
	textShadow.Position = label.Position + UDim2.fromOffset(0, 2)
	textShadow.ZIndex = 4
end

local function createTitleBlock(parent, mobile)
	local titleHolder = Instance.new("Frame")
	titleHolder.Name = "TitleBlock"
	titleHolder.BackgroundTransparency = 1
	titleHolder.BorderSizePixel = 0
	titleHolder.Size = UDim2.new(1, 0, 0, mobile and 116 or 150)
	titleHolder.Parent = parent

	local plateShadow = Instance.new("Frame")
	plateShadow.Name = "Shadow"
	plateShadow.BackgroundTransparency = 1
	plateShadow.BorderSizePixel = 0
	plateShadow.AnchorPoint = Vector2.new(0.5, 0.5)
	plateShadow.Position = UDim2.fromScale(0.5, 0.5)
	plateShadow.Size = UDim2.new(0, mobile and 312 or 430, 0, mobile and 98 or 122)
	plateShadow.Parent = titleHolder
	applyNativeShadow(plateShadow, "NativeShadow", 1, 0.68)

	local titlePlate = Instance.new("ImageLabel")
	titlePlate.Name = "TitlePlate"
	titlePlate.BackgroundTransparency = 1
	titlePlate.BorderSizePixel = 0
	titlePlate.AnchorPoint = Vector2.new(0.5, 0.5)
	titlePlate.Position = UDim2.fromScale(0.5, 0.5)
	titlePlate.Size = UDim2.new(0, mobile and 312 or 430, 0, mobile and 98 or 122)
	titlePlate.Image = TITLE_PLATE_URI
	titlePlate.ImageColor3 = PALETTE.white
	titlePlate.ScaleType = Enum.ScaleType.Fit
	titlePlate.ZIndex = 2
	titlePlate.Parent = titleHolder

	local titleAspect = Instance.new("UIAspectRatioConstraint")
	titleAspect.AspectRatio = 1024 / 346
	titleAspect.Parent = titlePlate

	local auroraTitle = newTextLabel("AuroraTitle", "AURORA", FONT_DISPLAY, mobile and 34 or 44, PALETTE.panelText)
	auroraTitle.AnchorPoint = Vector2.new(0.5, 0.5)
	auroraTitle.Position = UDim2.fromScale(0.5, 0.5)
	auroraTitle.Size = UDim2.new(1, -70, 0, mobile and 52 or 64)
	auroraTitle.TextXAlignment = Enum.TextXAlignment.Center
	auroraTitle.ZIndex = 3
	auroraTitle.Parent = titleHolder

	local sizeConstraint = Instance.new("UITextSizeConstraint")
	sizeConstraint.MinTextSize = mobile and 24 or 28
	sizeConstraint.MaxTextSize = mobile and 34 or 44
	sizeConstraint.Parent = auroraTitle

	local textShadow = addTextShadow(auroraTitle)
	textShadow.AnchorPoint = auroraTitle.AnchorPoint
	textShadow.Position = auroraTitle.Position + UDim2.fromOffset(0, 2)
	textShadow.Size = auroraTitle.Size
	textShadow.TextXAlignment = Enum.TextXAlignment.Center
	textShadow.ZIndex = 2
end

local function createBackgroundRegion(parent, mobile)
	local backgroundRoot = Instance.new("Frame")
	backgroundRoot.Name = "BackgroundRoot"
	backgroundRoot.BackgroundColor3 = PALETTE.backgroundTop
	backgroundRoot.BorderSizePixel = 0
	backgroundRoot.Size = UDim2.fromScale(1, 1)
	backgroundRoot.Parent = parent

	local gradient = Instance.new("UIGradient")
	gradient.Rotation = 90
	gradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, PALETTE.backgroundTop),
		ColorSequenceKeypoint.new(0.55, PALETTE.backgroundAccent),
		ColorSequenceKeypoint.new(1, PALETTE.backgroundBottom),
	})
	gradient.Parent = backgroundRoot

	local bloomTop = Instance.new("Frame")
	bloomTop.Name = "BloomTop"
	bloomTop.BackgroundColor3 = PALETTE.nativeCyan
	bloomTop.BackgroundTransparency = 0.9
	bloomTop.BorderSizePixel = 0
	bloomTop.AnchorPoint = Vector2.new(0.5, 0)
	bloomTop.Position = UDim2.fromScale(0.5, 0.02)
	bloomTop.Size = UDim2.fromScale(mobile and 0.92 or 0.62, mobile and 0.28 or 0.36)
	bloomTop.Parent = backgroundRoot

	local bloomTopCorner = Instance.new("UICorner")
	bloomTopCorner.CornerRadius = UDim.new(1, 0)
	bloomTopCorner.Parent = bloomTop

	local bloomBottom = Instance.new("Frame")
	bloomBottom.Name = "BloomBottom"
	bloomBottom.BackgroundColor3 = PALETTE.nativeCyanSoft
	bloomBottom.BackgroundTransparency = 0.94
	bloomBottom.BorderSizePixel = 0
	bloomBottom.AnchorPoint = Vector2.new(0.5, 1)
	bloomBottom.Position = UDim2.fromScale(0.5, 1)
	bloomBottom.Size = UDim2.fromScale(mobile and 1 or 0.84, mobile and 0.22 or 0.3)
	bloomBottom.Parent = backgroundRoot

	local bloomBottomCorner = Instance.new("UICorner")
	bloomBottomCorner.CornerRadius = UDim.new(1, 0)
	bloomBottomCorner.Parent = bloomBottom

	local backgroundOrnaments = Instance.new("Frame")
	backgroundOrnaments.Name = "BackgroundOrnaments"
	backgroundOrnaments.BackgroundTransparency = 1
	backgroundOrnaments.BorderSizePixel = 0
	backgroundOrnaments.Size = UDim2.fromScale(1, 1)
	backgroundOrnaments.Parent = backgroundRoot

	local function corner(name, anchorX, anchorY, posX, posY, rotation)
		local holder = Instance.new("Frame")
		holder.Name = name
		holder.BackgroundTransparency = 1
		holder.BorderSizePixel = 0
		holder.AnchorPoint = Vector2.new(anchorX, anchorY)
		holder.Position = UDim2.new(posX, 0, posY, 0)
		holder.Size = UDim2.fromOffset(mobile and 96 or 140, mobile and 96 or 140)
		holder.Rotation = rotation
		holder.Parent = backgroundOrnaments

		local ring1 = Instance.new("Frame")
		ring1.Name = "RingOuter"
		ring1.BackgroundTransparency = 1
		ring1.BorderSizePixel = 0
		ring1.Size = UDim2.fromScale(1, 1)
		ring1.Parent = holder

		local stroke1 = Instance.new("UIStroke")
		stroke1.Color = PALETTE.nativeGold
		stroke1.Thickness = mobile and 2 or 3
		stroke1.Transparency = 0.45
		stroke1.Parent = ring1

		local corner1 = Instance.new("UICorner")
		corner1.CornerRadius = UDim.new(0, mobile and 18 or 26)
		corner1.Parent = ring1

		local ring2 = Instance.new("Frame")
		ring2.Name = "RingInner"
		ring2.BackgroundTransparency = 1
		ring2.BorderSizePixel = 0
		ring2.Position = UDim2.fromOffset(mobile and 12 or 18, mobile and 12 or 18)
		ring2.Size = UDim2.new(1, -(mobile and 24 or 36), 1, -(mobile and 24 or 36))
		ring2.Parent = holder

		local stroke2 = Instance.new("UIStroke")
		stroke2.Color = PALETTE.nativeCyan
		stroke2.Thickness = 2
		stroke2.Transparency = 0.52
		stroke2.Parent = ring2

		local corner2 = Instance.new("UICorner")
		corner2.CornerRadius = UDim.new(0, mobile and 12 or 18)
		corner2.Parent = ring2
	end

	corner("TopLeft", 0, 0, 0, 0, 0)
	corner("TopRight", 1, 0, 1, 0, 0)
	corner("BottomLeft", 0, 1, 0, 1, 0)
	corner("BottomRight", 1, 1, 1, 1, 0)
end

local function createMenuDock(parent, mobile)
	local mainMenuDock = Instance.new("Frame")
	mainMenuDock.Name = "MainMenuDock"
	mainMenuDock.BackgroundTransparency = 1
	mainMenuDock.BorderSizePixel = 0
	mainMenuDock.AnchorPoint = Vector2.new(0.5, 0.5)
	mainMenuDock.Position = mobile and UDim2.fromScale(0.5, 0.57) or UDim2.fromScale(0.5, 0.48)
	mainMenuDock.Size = mobile and UDim2.fromScale(0.78, 0.66) or UDim2.fromScale(0.32, 0.62)
	mainMenuDock.Parent = parent

	local menuScale = Instance.new("UIScale")
	menuScale.Name = "MenuScale"
	menuScale.Parent = mainMenuDock

	local list = Instance.new("UIListLayout")
	list.Padding = UDim.new(0, mobile and 12 or 16)
	list.HorizontalAlignment = Enum.HorizontalAlignment.Center
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Parent = mainMenuDock

	createTitleBlock(mainMenuDock, mobile)

	local playButton = createSliceButton("PlayButton", PLAY_BUTTON_URI, {185, 89, 839, 403}, 0.2, mobile and 74 or 86)
	playButton.LayoutOrder = 2
	playButton.Parent = mainMenuDock
	populateButtonContent(playButton, "Play", "play", 28, mobile and 22 or 24)

	local settingsButton = createSliceButton("SettingsButton", MENU_BUTTON_URI, {185, 64, 839, 287}, 0.2, mobile and 64 or 68)
	settingsButton.LayoutOrder = 3
	settingsButton.Parent = mainMenuDock
	populateButtonContent(settingsButton, "Settings", "settings", 28, mobile and 22 or 24)

	local creditsButton = createSliceButton("CreditsButton", MENU_BUTTON_URI, {185, 64, 839, 287}, 0.2, mobile and 64 or 68)
	creditsButton.LayoutOrder = 4
	creditsButton.Parent = mainMenuDock
	populateButtonContent(creditsButton, "Credits", "info", 28, mobile and 22 or 24)
end

local function createBackdrop(parent, name)
	local backdrop = Instance.new("TextButton")
	backdrop.Name = name
	backdrop.BackgroundColor3 = Color3.new(0, 0, 0)
	backdrop.BackgroundTransparency = 0.42
	backdrop.Text = ""
	backdrop.AutoButtonColor = false
	backdrop.Visible = false
	backdrop.Size = UDim2.fromScale(1, 1)
	backdrop.ZIndex = 20
	backdrop.Parent = parent
	return backdrop
end

local function createCloseButton(name)
	local button = createSliceButton(name, CLOSE_BUTTON_URI, {185, 93, 839, 419}, 0.2, 52)
	button.Size = UDim2.fromOffset(52, 52)
	button.ZIndex = 30

	local visual = button:FindFirstChild("Visual")
	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.BorderSizePixel = 0
	content.Size = UDim2.fromScale(1, 1)
	content.ZIndex = 32
	content.Parent = visual

	local closeIcon = createNexusIcon(content, "close", {
		name = name .. "Icon",
		size = 24,
		padding = 8,
		color = PALETTE.panelText,
	})
	closeIcon.AnchorPoint = Vector2.new(0.5, 0.5)
	closeIcon.Position = UDim2.fromScale(0.5, 0.5)
	closeIcon.ZIndex = 33
	for _, desc in ipairs(closeIcon:GetDescendants()) do
		if desc:IsA("Frame") then
			desc.ZIndex = 33
		end
	end

	return button
end

local function createPanelHost(parent, nodeName, imageUri, sliceCenterArray, mobile, sizeScale, sizeOffset, zIndex)
	local host = Instance.new("Frame")
	host.Name = nodeName .. "Host"
	host.BackgroundTransparency = 1
	host.BorderSizePixel = 0
	host.AnchorPoint = Vector2.new(0.5, 0.5)
	host.Position = UDim2.fromScale(0.5, 0.5)
	host.Size = UDim2.new(sizeScale.X.Scale, sizeScale.X.Offset + sizeOffset.X, sizeScale.Y.Scale, sizeScale.Y.Offset + sizeOffset.Y)
	host.Visible = false
	host.ZIndex = zIndex
	host.Parent = parent

	local scale = Instance.new("UIScale")
	scale.Name = "OpenScale"
	scale.Scale = 1
	scale.Parent = host

	local shadow = Instance.new("Frame")
	shadow.Name = "Shadow"
	shadow.BackgroundTransparency = 1
	shadow.BorderSizePixel = 0
	shadow.Size = UDim2.fromScale(1, 1)
	shadow.ZIndex = zIndex
	shadow.Parent = host
	applyNativeShadow(shadow, "NativeShadow", zIndex, 0.68)

	local panel = Instance.new("ImageLabel")
	panel.Name = nodeName
	panel.BackgroundTransparency = 1
	panel.BorderSizePixel = 0
	panel.Size = UDim2.fromScale(1, 1)
	panel.Image = imageUri
	panel.ImageColor3 = PALETTE.white
	panel.ScaleType = Enum.ScaleType.Slice
	panel.SliceCenter = Rect.new(sliceCenterArray[1], sliceCenterArray[2], sliceCenterArray[3], sliceCenterArray[4])
	panel.SliceScale = 0.2
	panel.ZIndex = zIndex + 1
	panel.Parent = host

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.BorderSizePixel = 0
	content.Size = UDim2.fromScale(1, 1)
	content.ZIndex = zIndex + 2
	content.Parent = panel

	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, mobile and 22 or 24)
	padding.PaddingBottom = UDim.new(0, mobile and 18 or 20)
	padding.PaddingLeft = UDim.new(0, mobile and 20 or 24)
	padding.PaddingRight = UDim.new(0, mobile and 20 or 24)
	padding.Parent = content

	return host, panel, content
end

local function createSettingsModal(parent, mobile)
	local host, panel, content = createPanelHost(
		parent,
		"SettingsModal",
		SETTINGS_PANEL_URI,
		{185, 94, 839, 427},
		mobile,
		UDim2.new(mobile and 0.88 or 0.34, 0, mobile and 0.42 or 0.42, 0),
		Vector2.new(0, 0),
		24
	)

	local panelControllerBehavior = Instance.new("Folder")
	panelControllerBehavior.Name = "PanelControllerBehavior"
	panelControllerBehavior.Parent = host

	local header = Instance.new("Frame")
	header.Name = "Header"
	header.BackgroundTransparency = 1
	header.BorderSizePixel = 0
	header.Size = UDim2.new(1, 0, 0, 58)
	header.ZIndex = 27
	header.Parent = content

	local settingsTitle = newTextLabel("SettingsTitle", "Settings", FONT_HEADING, mobile and 22 or 26, PALETTE.panelText)
	settingsTitle.Size = UDim2.new(1, -70, 1, 0)
	settingsTitle.ZIndex = 28
	settingsTitle.Parent = header
	local settingsTitleConstraint = Instance.new("UITextSizeConstraint")
	settingsTitleConstraint.MinTextSize = mobile and 18 or 20
	settingsTitleConstraint.MaxTextSize = mobile and 22 or 26
	settingsTitleConstraint.Parent = settingsTitle

	local settingsCloseButton = createCloseButton("SettingsCloseButton")
	settingsCloseButton.AnchorPoint = Vector2.new(1, 0)
	settingsCloseButton.Position = UDim2.new(1, 0, 0, 0)
	settingsCloseButton.Parent = header

	local settingsSeparator = Instance.new("Frame")
	settingsSeparator.Name = "SettingsSeparator"
	settingsSeparator.BackgroundColor3 = PALETTE.nativeGold
	settingsSeparator.BackgroundTransparency = 0.45
	settingsSeparator.BorderSizePixel = 0
	settingsSeparator.Position = UDim2.new(0, 0, 0, 60)
	settingsSeparator.Size = UDim2.new(1, 0, 0, 2)
	settingsSeparator.ZIndex = 27
	settingsSeparator.Parent = content

	local separatorGradient = Instance.new("UIGradient")
	separatorGradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, PALETTE.nativeCyan),
		ColorSequenceKeypoint.new(0.5, PALETTE.nativeGold),
		ColorSequenceKeypoint.new(1, PALETTE.nativeCyan),
	})
	separatorGradient.Parent = settingsSeparator

	local body = Instance.new("Frame")
	body.Name = "Body"
	body.BackgroundTransparency = 1
	body.BorderSizePixel = 0
	body.Position = UDim2.new(0, 0, 0, 78)
	body.Size = UDim2.new(1, 0, 1, -78)
	body.ZIndex = 27
	body.Parent = content

	local bodyList = Instance.new("UIListLayout")
	bodyList.Padding = UDim.new(0, mobile and 12 or 14)
	bodyList.HorizontalAlignment = Enum.HorizontalAlignment.Center
	bodyList.SortOrder = Enum.SortOrder.LayoutOrder
	bodyList.Parent = body

	local musicRow = Instance.new("Frame")
	musicRow.Name = "MusicRow"
	musicRow.BackgroundTransparency = 1
	musicRow.BorderSizePixel = 0
	musicRow.Size = UDim2.new(1, 0, 0, 56)
	musicRow.LayoutOrder = 1
	musicRow.ZIndex = 27
	musicRow.Parent = body

	local musicLabel = newTextLabel("MusicLabel", "Music", FONT_BODY, mobile and 16 or 18, PALETTE.panelText)
	musicLabel.Size = UDim2.new(1, -120, 1, 0)
	musicLabel.ZIndex = 28
	musicLabel.Parent = musicRow
	local musicLabelConstraint = Instance.new("UITextSizeConstraint")
	musicLabelConstraint.MinTextSize = 14
	musicLabelConstraint.MaxTextSize = mobile and 16 or 18
	musicLabelConstraint.Parent = musicLabel

	local musicToggle = Instance.new("ImageButton")
	musicToggle.Name = "MusicToggle"
	musicToggle.BackgroundTransparency = 1
	musicToggle.AutoButtonColor = false
	musicToggle.AnchorPoint = Vector2.new(1, 0.5)
	musicToggle.Position = UDim2.new(1, 0, 0.5, 0)
	musicToggle.Size = UDim2.fromOffset(mobile and 96 or 104, 48)
	musicToggle.ZIndex = 28
	musicToggle.Parent = musicRow

	local toggleShadow = Instance.new("Frame")
	toggleShadow.Name = "Shadow"
	toggleShadow.BackgroundTransparency = 1
	toggleShadow.BorderSizePixel = 0
	toggleShadow.Size = UDim2.fromScale(1, 1)
	toggleShadow.Parent = musicToggle
	applyNativeShadow(toggleShadow, "NativeShadow", 28, 0.8)

	local toggleVisual = Instance.new("Frame")
	toggleVisual.Name = "Visual"
	toggleVisual.BackgroundTransparency = 1
	toggleVisual.BorderSizePixel = 0
	toggleVisual.Size = UDim2.fromScale(1, 1)
	toggleVisual.ZIndex = 29
	toggleVisual.Parent = musicToggle

	local musicToggleOff = Instance.new("ImageLabel")
	musicToggleOff.Name = "MusicToggleOff"
	musicToggleOff.BackgroundTransparency = 1
	musicToggleOff.BorderSizePixel = 0
	musicToggleOff.Size = UDim2.fromScale(1, 1)
	musicToggleOff.Image = TOGGLE_OFF_URI
	musicToggleOff.ImageColor3 = PALETTE.white
	musicToggleOff.ScaleType = Enum.ScaleType.Fit
	musicToggleOff.ZIndex = 29
	musicToggleOff.Visible = false
	musicToggleOff.Parent = toggleVisual

	local offAspect = Instance.new("UIAspectRatioConstraint")
	offAspect.AspectRatio = 1024 / 455
	offAspect.Parent = musicToggleOff

	local musicToggleOn = Instance.new("ImageLabel")
	musicToggleOn.Name = "MusicToggleOn"
	musicToggleOn.BackgroundTransparency = 1
	musicToggleOn.BorderSizePixel = 0
	musicToggleOn.Size = UDim2.fromScale(1, 1)
	musicToggleOn.Image = TOGGLE_ON_URI
	musicToggleOn.ImageColor3 = PALETTE.white
	musicToggleOn.ScaleType = Enum.ScaleType.Fit
	musicToggleOn.ZIndex = 30
	musicToggleOn.Visible = true
	musicToggleOn.Parent = toggleVisual

	local onAspect = Instance.new("UIAspectRatioConstraint")
	onAspect.AspectRatio = 1024 / 469
	onAspect.Parent = musicToggleOn

	local toggleState = Instance.new("BoolValue")
	toggleState.Name = "State"
	toggleState.Value = true
	toggleState.Parent = musicToggle

	local volumeRow = Instance.new("Frame")
	volumeRow.Name = "VolumeRow"
	volumeRow.BackgroundTransparency = 1
	volumeRow.BorderSizePixel = 0
	volumeRow.Size = UDim2.new(1, 0, 0, mobile and 88 or 82)
	volumeRow.LayoutOrder = 2
	volumeRow.ZIndex = 27
	volumeRow.Parent = body

	local volumeLabel = newTextLabel("VolumeLabel", "Volume", FONT_BODY, mobile and 16 or 18, PALETTE.panelText)
	volumeLabel.Size = UDim2.new(1, -80, 0, 26)
	volumeLabel.ZIndex = 28
	volumeLabel.Parent = volumeRow
	local volumeLabelConstraint = Instance.new("UITextSizeConstraint")
	volumeLabelConstraint.MinTextSize = 14
	volumeLabelConstraint.MaxTextSize = mobile and 16 or 18
	volumeLabelConstraint.Parent = volumeLabel

	local volumeValue = newTextLabel("VolumeValue", "80%", FONT_NUMERIC, mobile and 16 or 18, PALETTE.panelSubtext)
	volumeValue.AnchorPoint = Vector2.new(1, 0)
	volumeValue.Position = UDim2.new(1, 0, 0, 0)
	volumeValue.Size = UDim2.fromOffset(60, 24)
	volumeValue.TextXAlignment = Enum.TextXAlignment.Right
	volumeValue.ZIndex = 28
	volumeValue.Parent = volumeRow
	local volumeValueConstraint = Instance.new("UITextSizeConstraint")
	volumeValueConstraint.MinTextSize = 14
	volumeValueConstraint.MaxTextSize = mobile and 16 or 18
	volumeValueConstraint.Parent = volumeValue

	local volumeSlider = Instance.new("Frame")
	volumeSlider.Name = "VolumeSlider"
	volumeSlider.BackgroundTransparency = 1
	volumeSlider.BorderSizePixel = 0
	volumeSlider.Position = UDim2.new(0, 0, 0, 34)
	volumeSlider.Size = UDim2.new(1, 0, 0, 48)
	volumeSlider.ZIndex = 28
	volumeSlider.Parent = volumeRow

	local sliderState = Instance.new("NumberValue")
	sliderState.Name = "Value"
	sliderState.Value = 0.8
	sliderState.Parent = volumeSlider

	local trackBack = Instance.new("Frame")
	trackBack.Name = "TrackBack"
	trackBack.BackgroundColor3 = PALETTE.nativeSurface2
	trackBack.BorderSizePixel = 0
	trackBack.AnchorPoint = Vector2.new(0, 0.5)
	trackBack.Position = UDim2.new(0, 0, 0.5, 0)
	trackBack.Size = UDim2.new(1, 0, 0, 18)
	trackBack.ZIndex = 28
	trackBack.Parent = volumeSlider

	local trackCorner = Instance.new("UICorner")
	trackCorner.CornerRadius = UDim.new(0, 9)
	trackCorner.Parent = trackBack

	local trackStroke = Instance.new("UIStroke")
	trackStroke.Color = PALETTE.nativeOutline
	trackStroke.Thickness = 2
	trackStroke.Transparency = 0.15
	trackStroke.Parent = trackBack

	local trackGradient = Instance.new("UIGradient")
	trackGradient.Rotation = 0
	trackGradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(17, 54, 86)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(11, 34, 56)),
	})
	trackGradient.Parent = trackBack

	local trackFillClip = Instance.new("Frame")
	trackFillClip.Name = "TrackFillClip"
	trackFillClip.BackgroundTransparency = 1
	trackFillClip.BorderSizePixel = 0
	trackFillClip.ClipsDescendants = true
	trackFillClip.AnchorPoint = Vector2.new(0, 0.5)
	trackFillClip.Position = UDim2.new(0, 0, 0.5, 0)
	trackFillClip.Size = UDim2.new(0.8, 0, 0, 18)
	trackFillClip.ZIndex = 29
	trackFillClip.Parent = volumeSlider

	local trackFill = Instance.new("Frame")
	trackFill.Name = "TrackFill"
	trackFill.BackgroundColor3 = PALETTE.nativeCyan
	trackFill.BorderSizePixel = 0
	trackFill.Size = UDim2.new(1, 0, 1, 0)
	trackFill.ZIndex = 29
	trackFill.Parent = trackFillClip

	local fillCorner = Instance.new("UICorner")
	fillCorner.CornerRadius = UDim.new(0, 9)
	fillCorner.Parent = trackFill

	local fillGradient = Instance.new("UIGradient")
	fillGradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, PALETTE.nativeGold),
		ColorSequenceKeypoint.new(0.35, PALETTE.nativeCyanSoft),
		ColorSequenceKeypoint.new(1, PALETTE.nativeCyan),
	})
	fillGradient.Parent = trackFill

	local handle = Instance.new("TextButton")
	handle.Name = "Handle"
	handle.BackgroundColor3 = PALETTE.nativeGold
	handle.BorderSizePixel = 0
	handle.Text = ""
	handle.AutoButtonColor = false
	handle.AnchorPoint = Vector2.new(0.5, 0.5)
	handle.Position = UDim2.new(0.8, 0, 0.5, 0)
	handle.Size = UDim2.fromOffset(mobile and 34 or 30, mobile and 34 or 30)
	handle.ZIndex = 30
	handle.Parent = volumeSlider

	local handleCorner = Instance.new("UICorner")
	handleCorner.CornerRadius = UDim.new(1, 0)
	handleCorner.Parent = handle

	local handleStroke = Instance.new("UIStroke")
	handleStroke.Color = PALETTE.nativeOutline
	handleStroke.Thickness = 3
	handleStroke.Transparency = 0.05
	handleStroke.Parent = handle

	local handleHighlight = Instance.new("Frame")
	handleHighlight.Name = "Highlight"
	handleHighlight.BackgroundColor3 = PALETTE.white
	handleHighlight.BackgroundTransparency = 0.5
	handleHighlight.BorderSizePixel = 0
	handleHighlight.AnchorPoint = Vector2.new(0.5, 0)
	handleHighlight.Position = UDim2.new(0.5, 0, 0, 4)
	handleHighlight.Size = UDim2.new(0.62, 0, 0.22, 0)
	handleHighlight.ZIndex = 31
	handleHighlight.Parent = handle

	local handleHighlightCorner = Instance.new("UICorner")
	handleHighlightCorner.CornerRadius = UDim.new(1, 0)
	handleHighlightCorner.Parent = handleHighlight

	local hitArea = Instance.new("TextButton")
	hitArea.Name = "HitArea"
	hitArea.BackgroundTransparency = 1
	hitArea.BorderSizePixel = 0
	hitArea.Text = ""
	hitArea.AutoButtonColor = false
	hitArea.Size = UDim2.fromScale(1, 1)
	hitArea.ZIndex = 32
	hitArea.Parent = volumeSlider

	return host
end

local function createCreditsModal(parent, mobile)
	local host = nil
	local panel = nil
	local content = nil
	host, panel, content = createPanelHost(
		parent,
		"CreditsModal",
		CREDITS_PANEL_URI,
		{185, 124, 839, 564},
		mobile,
		UDim2.new(mobile and 0.84 or 0.28, 0, mobile and 0.28 or 0.26, 0),
		Vector2.new(0, 0),
		24
	)

	local header = Instance.new("Frame")
	header.Name = "Header"
	header.BackgroundTransparency = 1
	header.BorderSizePixel = 0
	header.Size = UDim2.new(1, 0, 0, 58)
	header.ZIndex = 27
	header.Parent = content

	local creditsTitle = newTextLabel("CreditsTitle", "Credits", FONT_HEADING, mobile and 22 or 26, PALETTE.panelText)
	creditsTitle.Size = UDim2.new(1, -70, 1, 0)
	creditsTitle.ZIndex = 28
	creditsTitle.Parent = header
	local creditsTitleConstraint = Instance.new("UITextSizeConstraint")
	creditsTitleConstraint.MinTextSize = mobile and 18 or 20
	creditsTitleConstraint.MaxTextSize = mobile and 22 or 26
	creditsTitleConstraint.Parent = creditsTitle

	local creditsCloseButton = createCloseButton("CreditsCloseButton")
	creditsCloseButton.AnchorPoint = Vector2.new(1, 0)
	creditsCloseButton.Position = UDim2.new(1, 0, 0, 0)
	creditsCloseButton.Parent = header

	local creditsBody = newTextLabel(
		"CreditsBody",
		"AURORA UI demo\nDesign & interface placeholder credits.\nReplace this text with your project team.",
		FONT_BODY,
		mobile and 16 or 18,
		PALETTE.panelSubtext
	)
	creditsBody.Position = UDim2.new(0, 0, 0, 70)
	creditsBody.Size = UDim2.new(1, 0, 1, -78)
	creditsBody.TextYAlignment = Enum.TextYAlignment.Top
	creditsBody.TextWrapped = true
	creditsBody.ZIndex = 28
	creditsBody.Parent = content

	local creditsConstraint = Instance.new("UITextSizeConstraint")
	creditsConstraint.MinTextSize = 14
	creditsConstraint.MaxTextSize = mobile and 16 or 18
	creditsConstraint.Parent = creditsBody

	return host
end

local function createCompositionGroup(parent, name, mobile)
	local group = Instance.new("Frame")
	group.Name = name
	group.BackgroundTransparency = 1
	group.BorderSizePixel = 0
	group.Size = UDim2.fromScale(1, 1)
	group.Visible = name == "_NexusDesktop"
	group.Parent = parent

	createBackgroundRegion(group, mobile)
	createMenuDock(group, mobile)
	createBackdrop(group, "ModalBackdrop")
	createSettingsModal(group, mobile)
	createCreditsModal(group, mobile)
end

function View.build()
	local gui = Instance.new("ScreenGui")
	gui.Name = "AURORA"
	gui.ResetOnSpawn = false
	gui.IgnoreGuiInset = false
	gui.DisplayOrder = 0
	gui.Enabled = true
	gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

	local safeRoot = Instance.new("Frame")
	safeRoot.Name = "SafeRoot"
	safeRoot.BackgroundTransparency = 1
	safeRoot.BorderSizePixel = 0
	safeRoot.Size = UDim2.fromScale(1, 1)
	safeRoot.Parent = gui

	local source = Instance.new("Folder")
	source.Name = "_NexusSource"
	source.Parent = gui

	local onPlayRequestedHook = Instance.new("BindableEvent")
	onPlayRequestedHook.Name = "OnPlayRequestedHook"
	onPlayRequestedHook.Parent = gui

	createCompositionGroup(safeRoot, "_NexusDesktop", false)
	createCompositionGroup(safeRoot, "_NexusMobile", true)

	return gui
end

return View