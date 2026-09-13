local View = {}
local skins = {["PlayButton"]={uri="nexusasset://asset_ba81bd104c04413fa1c4e5729414428e",slice={185,89,839,403},scale=0.2},["SettingsButton"]={uri="nexusasset://asset_8db5d1f006c74515ab972c252cacf0e2",slice={185,64,839,287},scale=0.2},["CreditsButton"]={uri="nexusasset://asset_8db5d1f006c74515ab972c252cacf0e2",slice={185,64,839,287},scale=0.2},["CreditsModal"]={uri="nexusasset://asset_c46f5bff5a3d4158adcb803c5cc3661a",slice={185,124,839,564},scale=0.2},["SettingsModal"]={uri="nexusasset://asset_e1cf723245834cbcadaeca083a47c684",slice={185,94,839,427},scale=0.2},["SettingsCloseButton"]={uri="nexusasset://asset_32051086979346beabb6bef4d2e707b9",slice={185,93,839,419},scale=0.2},["CreditsCloseButton"]={uri="nexusasset://asset_32051086979346beabb6bef4d2e707b9",slice={185,93,839,419},scale=0.2}}
local function applySkin(button)
 local skin=skins[button.Name]
 if not skin then return end
 button.Image=skin.uri
 button.SliceCenter=Rect.new(table.unpack(skin.slice))
 button.SliceScale=skin.scale
end

local function fontFace(weight)
	return Font.new("rbxasset://fonts/families/Montserrat.json", Enum.FontWeight[weight], Enum.FontStyle.Normal)
end

local PALETTE = {
	bgTop = Color3.fromRGB(9, 20, 35),
	bgBottom = Color3.fromRGB(6, 16, 28),
	bloomA = Color3.fromRGB(36, 120, 190),
	bloomB = Color3.fromRGB(20, 71, 140),
	bloomC = Color3.fromRGB(11, 41, 88),
	textPrimary = Color3.fromRGB(244, 251, 255),
	textSecondary = Color3.fromRGB(184, 212, 232),
	textMuted = Color3.fromRGB(184, 212, 232),
	shadow = Color3.fromRGB(6, 16, 28),
	dim = Color3.fromRGB(9, 20, 35),
	line = Color3.fromRGB(18, 48, 77),
	gold = Color3.fromRGB(231, 185, 90),
}

local function addTextShadow(parent, sourceLabel, offset, transparency)
	local shadow = Instance.new("TextLabel")
	shadow.Name = "Shadow"
	shadow.BackgroundTransparency = 1
	shadow.BorderSizePixel = 0
	shadow.AnchorPoint = sourceLabel.AnchorPoint
	shadow.Position = sourceLabel.Position + (offset or UDim2.fromOffset(0, 2))
	shadow.Size = sourceLabel.Size
	shadow.ZIndex = math.max(1, sourceLabel.ZIndex - 1)
	shadow.Text = sourceLabel.Text
	shadow.TextColor3 = PALETTE.shadow
	shadow.TextTransparency = transparency or 0.45
	shadow.TextScaled = sourceLabel.TextScaled
	shadow.TextSize = sourceLabel.TextSize
	shadow.FontFace = sourceLabel.FontFace
	shadow.TextWrapped = sourceLabel.TextWrapped
	shadow.TextXAlignment = sourceLabel.TextXAlignment
	shadow.TextYAlignment = sourceLabel.TextYAlignment
	shadow.RichText = sourceLabel.RichText
	shadow.Parent = parent
	return shadow
end

local function attachNativeShadow(parent, name, size, position, z)
	local host = Instance.new("Frame")
	host.Name = name
	host.BackgroundTransparency = 1
	host.BorderSizePixel = 0
	host.AnchorPoint = Vector2.new(0.5, 0.5)
	host.Size = size
	host.Position = position
	host.ZIndex = z
	local ok, uiShadow = pcall(Instance.new, "UIShadow")
	if ok and uiShadow then
		uiShadow.Color = Color3.new(0, 0, 0)
		uiShadow.Transparency = 0.72
		uiShadow.BlurRadius = UDim.new(0, 18)
		uiShadow.Offset = UDim2.fromOffset(0, 7)
		uiShadow.Parent = host
	else
		local fallback = Instance.new("ImageLabel")
		fallback.Name = "FallbackShadow"
		fallback.BackgroundTransparency = 1
		fallback.BorderSizePixel = 0
		fallback.Size = UDim2.fromScale(1, 1)
		fallback.ImageTransparency = 1
		fallback.Parent = host
	end
	host.Parent = parent
	return host
end

local function createTextLabel(name, text, size, textSize, weight, z)
	local label = Instance.new("TextLabel")
	label.Name = name
	label.BackgroundTransparency = 1
	label.BorderSizePixel = 0
	label.Size = size
	label.Text = text
	label.TextColor3 = PALETTE.textPrimary
	label.TextSize = textSize
	label.FontFace = fontFace(weight)
	label.TextWrapped = true
	label.TextScaled = false
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.TextYAlignment = Enum.TextYAlignment.Center
	label.ZIndex = z
	return label
end

local function createMenuButton(nodeName, skinUri, sliceCenter, sliceScale, iconUri, text, height, textSize, iconSize)
	local button = Instance.new("ImageButton")
	button.Name = nodeName
	button.AutoButtonColor = false
	button.BackgroundTransparency = 1
	button.BorderSizePixel = 0
	button.Image = skinUri
	button.ImageColor3 = Color3.new(1, 1, 1)
	button.ScaleType = Enum.ScaleType.Slice
	button.SliceCenter = Rect.new(sliceCenter[1], sliceCenter[2], sliceCenter[3], sliceCenter[4])
	button.SliceScale = sliceScale
	button.Size = UDim2.new(1, 0, 0, height)
	button.ZIndex = 20
	button:SetAttribute("NexusAuditTapTarget", true)
	applySkin(button)

	local visual = Instance.new("Frame")
	visual.Name = "Visual"
	visual.BackgroundTransparency = 1
	visual.BorderSizePixel = 0
	visual.Size = UDim2.fromScale(1, 1)
	visual.ZIndex = 20
	visual.Parent = button

	local gloss = Instance.new("Frame")
	gloss.Name = "Gloss"
	gloss.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
	gloss.BackgroundTransparency = 0.88
	gloss.BorderSizePixel = 0
	gloss.Position = UDim2.new(0.05, 0, 0.1, 0)
	gloss.Size = UDim2.new(0.9, 0, 0.24, 0)
	gloss.ZIndex = 21
	gloss.Parent = visual

	local glossCorner = Instance.new("UICorner")
	glossCorner.CornerRadius = UDim.new(1, 0)
	glossCorner.Parent = gloss

	local icon = Instance.new("ImageLabel")
	icon.Name = nodeName .. "Icon"
	icon.BackgroundTransparency = 1
	icon.BorderSizePixel = 0
	icon.AnchorPoint = Vector2.new(0, 0.5)
	icon.Position = UDim2.new(0, 18, 0.5, 0)
	icon.Size = UDim2.fromOffset(iconSize, iconSize)
	icon.Image = iconUri
	icon.ImageColor3 = Color3.new(1, 1, 1)
	icon.ScaleType = Enum.ScaleType.Fit
	icon.ZIndex = 22
	icon.Parent = visual

	local label = Instance.new("TextLabel")
	label.Name = "Label"
	label.BackgroundTransparency = 1
	label.BorderSizePixel = 0
	label.Position = UDim2.new(0, 58 + iconSize, 0, 0)
	label.Size = UDim2.new(1, -(78 + iconSize), 1, 0)
	label.Text = text
	label.TextColor3 = PALETTE.textPrimary
	label.TextSize = textSize
	label.FontFace = fontFace("SemiBold")
	label.TextWrapped = false
	label.TextScaled = false
	label.TextXAlignment = Enum.TextXAlignment.Center
	label.TextYAlignment = Enum.TextYAlignment.Center
	label.ZIndex = 23
	label:SetAttribute("NexusAuditText", true)
	label.Parent = visual

	local labelConstraint = Instance.new("UITextSizeConstraint")
	labelConstraint.MaxTextSize = textSize
	labelConstraint.MinTextSize = math.max(16, textSize - 6)
	labelConstraint.Parent = label

	addTextShadow(visual, label, UDim2.fromOffset(0, 2), 0.5)

	return button
end

local function createCloseButton(nodeName, size)
	local button = Instance.new("ImageButton")
	button.Name = nodeName
	button.AutoButtonColor = false
	button.BackgroundTransparency = 1
	button.BorderSizePixel = 0
	button.AnchorPoint = Vector2.new(1, 0)
	button.Size = UDim2.fromOffset(size, size)
	button.Image = "nexusasset://asset_32051086979346beabb6bef4d2e707b9"
	button.ImageColor3 = Color3.new(1, 1, 1)
	button.ScaleType = Enum.ScaleType.Slice
	button.SliceCenter = Rect.new(185, 93, 839, 419)
	button.SliceScale = 0.2
	button.ZIndex = 42
	button:SetAttribute("NexusAuditTapTarget", true)
	applySkin(button)

	local visual = Instance.new("Frame")
	visual.Name = "Visual"
	visual.BackgroundTransparency = 1
	visual.BorderSizePixel = 0
	visual.Size = UDim2.fromScale(1, 1)
	visual.ZIndex = 42
	visual.Parent = button

	local icon = Instance.new("ImageLabel")
	icon.Name = nodeName .. "Icon"
	icon.BackgroundTransparency = 1
	icon.BorderSizePixel = 0
	icon.AnchorPoint = Vector2.new(0.5, 0.5)
	icon.Position = UDim2.fromScale(0.5, 0.5)
	icon.Size = UDim2.fromOffset(math.floor(size * 0.42), math.floor(size * 0.42))
	icon.Image = "nexusasset://asset_59c2540e8e1e45caa7a8741177d3629b"
	icon.ImageColor3 = Color3.new(1, 1, 1)
	icon.ScaleType = Enum.ScaleType.Fit
	icon.ZIndex = 43
	icon.Parent = visual

	return button
end

local function createTitleGroup(isMobile)
	local group = Instance.new("Frame")
	group.Name = "TitleGroup"
	group.BackgroundTransparency = 1
	group.BorderSizePixel = 0
	group.Size = UDim2.new(1, 0, 0, isMobile and 104 or 128)

	attachNativeShadow(group, "TitlePlateShadow", UDim2.new(0.9, 0, 0, isMobile and 96 or 118), UDim2.new(0.5, 0, 0.5, 8), 8)

	local titlePlate = Instance.new("ImageLabel")
	titlePlate.Name = "TitlePlate"
	titlePlate.BackgroundTransparency = 1
	titlePlate.BorderSizePixel = 0
	titlePlate.AnchorPoint = Vector2.new(0.5, 0.5)
	titlePlate.Position = UDim2.new(0.5, 0, 0.5, 0)
	titlePlate.Size = UDim2.new(0.9, 0, 0, isMobile and 96 or 118)
	titlePlate.Image = "nexusasset://asset_837b86a748ec457b82e5f20eb67ab61c"
	titlePlate.ImageColor3 = Color3.new(1, 1, 1)
	titlePlate.ScaleType = Enum.ScaleType.Fit
	titlePlate.ZIndex = 10
	titlePlate.Parent = group


	local title = Instance.new("TextLabel")
	title.Name = "AuroraTitle"
	title.BackgroundTransparency = 1
	title.BorderSizePixel = 0
	title.AnchorPoint = Vector2.new(0.5, 0.5)
	title.Position = UDim2.new(0.5, 0, 0.5, -2)
	title.Size = UDim2.new(0.72, 0, 0.7, 0)
	title.Text = "AURORA"
	title.TextColor3 = PALETTE.textPrimary
	title.TextSize = isMobile and 34 or 44
	title.FontFace = fontFace("ExtraBold")
	title.TextScaled = false
	title.TextWrapped = false
	title.TextXAlignment = Enum.TextXAlignment.Center
	title.TextYAlignment = Enum.TextYAlignment.Center
	title.ZIndex = 12
	title:SetAttribute("NexusAuditText", true)
	title.Parent = group

	local tsc = Instance.new("UITextSizeConstraint")
	tsc.MinTextSize = isMobile and 24 or 26
	tsc.MaxTextSize = isMobile and 34 or 44
	tsc.Parent = title

	addTextShadow(group, title, UDim2.fromOffset(0, 2), 0.45)

	return group
end

local function createToggle()
	local toggle = Instance.new("ImageButton")
	toggle.Name = "MusicToggle"
	toggle.AutoButtonColor = false
	toggle.BackgroundTransparency = 1
	toggle.BorderSizePixel = 0
	toggle.Size = UDim2.fromOffset(112, 52)
	toggle.ZIndex = 42
	toggle:SetAttribute("NexusAuditTapTarget", true)

	local visual = Instance.new("Frame")
	visual.Name = "Visual"
	visual.BackgroundTransparency = 1
	visual.BorderSizePixel = 0
	visual.Size = UDim2.fromScale(1, 1)
	visual.ZIndex = 42
	visual.Parent = toggle

	local onState = Instance.new("ImageLabel")
	onState.Name = "MusicToggleOn"
	onState.BackgroundTransparency = 1
	onState.BorderSizePixel = 0
	onState.AnchorPoint = Vector2.new(0.5, 0.5)
	onState.Position = UDim2.fromScale(0.5, 0.5)
	onState.Size = UDim2.new(1, 0, 1, 0)
	onState.Image = "nexusasset://asset_8caafb851c964d6fbc78ad6158bcfdfb"
	onState.ImageColor3 = Color3.new(1, 1, 1)
	onState.ScaleType = Enum.ScaleType.Fit
	onState.ZIndex = 42
	onState.Parent = visual

	local offState = Instance.new("ImageLabel")
	offState.Name = "MusicToggleOff"
	offState.BackgroundTransparency = 1
	offState.BorderSizePixel = 0
	offState.AnchorPoint = Vector2.new(0.5, 0.5)
	offState.Position = UDim2.fromScale(0.5, 0.5)
	offState.Size = UDim2.new(1, 0, 1, 0)
	offState.Image = "nexusasset://asset_8244b798b2d44615b075162e34dd78ba"
	offState.ImageColor3 = Color3.new(1, 1, 1)
	offState.ScaleType = Enum.ScaleType.Fit
	offState.ZIndex = 43
	offState.Parent = visual

	local thumb = Instance.new("ImageLabel")
	thumb.Name = "MusicToggleThumb"
	thumb.BackgroundTransparency = 1
	thumb.BorderSizePixel = 0
	thumb.AnchorPoint = Vector2.new(0.5, 0.5)
	thumb.Position = UDim2.new(0.76, 0, 0.5, 0)
	thumb.Size = UDim2.fromOffset(42, 42)
	thumb.Image = "nexusasset://asset_26157c26ae7e4665b6824934f184b239"
	thumb.ImageColor3 = Color3.new(1, 1, 1)
	thumb.ScaleType = Enum.ScaleType.Fit
	thumb.ZIndex = 44
	thumb.Parent = visual

	local thumbAspect = Instance.new("UIAspectRatioConstraint")
	thumbAspect.AspectRatio = 985 / 1024
	thumbAspect.Parent = thumb

	local hitArea = Instance.new("Frame")
	hitArea.Name = "HitArea"
	hitArea.BackgroundTransparency = 1
	hitArea.BorderSizePixel = 0
	hitArea.Size = UDim2.fromScale(1, 1)
	hitArea.ZIndex = 45
	hitArea.Parent = toggle

	return toggle
end

local function createSlider()
	local slider = Instance.new("Frame")
	slider.Name = "VolumeSlider"
	slider.BackgroundTransparency = 1
	slider.BorderSizePixel = 0
	slider.Size = UDim2.new(1, 0, 0, 52)
	slider.ZIndex = 40

	local trackBack = Instance.new("ImageLabel")
	trackBack.Name = "VolumeSliderTrack"
	trackBack.BackgroundTransparency = 1
	trackBack.BorderSizePixel = 0
	trackBack.AnchorPoint = Vector2.new(0, 0.5)
	trackBack.Position = UDim2.new(0, 0, 0.5, 0)
	trackBack.Size = UDim2.new(1, 0, 0, 20)
	trackBack.Image = "nexusasset://asset_79bb3b0df17842cea10bd7587e19e992"
	trackBack.ImageColor3 = Color3.new(1, 1, 1)
	trackBack.ScaleType = Enum.ScaleType.Fit
	trackBack.ZIndex = 40
	trackBack.Parent = slider

	local fillClip = Instance.new("Frame")
	fillClip.Name = "TrackFillClip"
	fillClip.BackgroundTransparency = 1
	fillClip.BorderSizePixel = 0
	fillClip.ClipsDescendants = true
	fillClip.AnchorPoint = Vector2.new(0, 0.5)
	fillClip.Position = UDim2.new(0, 0, 0.5, 0)
	fillClip.Size = UDim2.new(0.7, 0, 0, 20)
	fillClip.ZIndex = 41
	fillClip.Parent = slider

	local fill = Instance.new("ImageLabel")
	fill.Name = "VolumeSliderFill"
	fill.BackgroundTransparency = 1
	fill.BorderSizePixel = 0
	fill.AnchorPoint = Vector2.new(0, 0.5)
	fill.Position = UDim2.new(0, 0, 0.5, 0)
	fill.Size = UDim2.new(1, 0, 0, 20)
	fill.Image = "nexusasset://asset_9e994f8530f6453ab5638745ab063131"
	fill.ImageColor3 = Color3.new(1, 1, 1)
	fill.ScaleType = Enum.ScaleType.Fit
	fill.ZIndex = 41
	fill.Parent = fillClip

	attachNativeShadow(slider, "VolumeSliderHandleShadow", UDim2.fromOffset(34, 34), UDim2.new(0.7, 0, 0.5, 0), 41)

	local handle = Instance.new("ImageLabel")
	handle.Name = "VolumeSliderHandle"
	handle.BackgroundTransparency = 1
	handle.BorderSizePixel = 0
	handle.AnchorPoint = Vector2.new(0.5, 0.5)
	handle.Position = UDim2.new(0.7, 0, 0.5, 0)
	handle.Size = UDim2.fromOffset(34, 34)
	handle.Image = "nexusasset://asset_370c8b9fba7749a1975a5403c614f7eb"
	handle.ImageColor3 = Color3.new(1, 1, 1)
	handle.ScaleType = Enum.ScaleType.Fit
	handle.ZIndex = 42
	handle.Parent = slider

	local handleAspect = Instance.new("UIAspectRatioConstraint")
	handleAspect.AspectRatio = 942 / 1024
	handleAspect.Parent = handle

	local hitArea = Instance.new("TextButton")
	hitArea.Name = "HitArea"
	hitArea.BackgroundTransparency = 1
	hitArea.BorderSizePixel = 0
	hitArea.AutoButtonColor = false
	hitArea.Size = UDim2.new(1, 0, 1, 0)
	hitArea.Text = ""
	hitArea.ZIndex = 43
	hitArea.Parent = slider
	hitArea:SetAttribute("NexusAuditTapTarget", true)

	return slider
end

local function createSettingsModal(sizeX, sizeY, closeSize)
	local host = Instance.new("Frame")
	host.Name = "SettingsModalHost"
	host.BackgroundTransparency = 1
	host.BorderSizePixel = 0
	host.Size = UDim2.fromScale(1, 1)
	host.Visible = false
	host.ZIndex = 30

	local overlay = Instance.new("TextButton")
	overlay.Name = "Dismiss"
	overlay.AutoButtonColor = false
	overlay.BackgroundColor3 = PALETTE.dim
	overlay.BackgroundTransparency = 0.38
	overlay.BorderSizePixel = 0
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.Text = ""
	overlay.ZIndex = 30
	overlay.Parent = host

	attachNativeShadow(host, "SettingsModalShadow", UDim2.fromOffset(sizeX, sizeY), UDim2.new(0.5, 0, 0.5, 4), 31)

	local modal = Instance.new("ImageLabel")
	modal.Name = "SettingsModal"
	modal.BackgroundTransparency = 1
	modal.BorderSizePixel = 0
	modal.AnchorPoint = Vector2.new(0.5, 0.5)
	modal.Position = UDim2.new(0.5, 0, 0.5, 0)
	modal.Size = UDim2.fromOffset(sizeX, sizeY)
	modal.Image = "nexusasset://asset_e1cf723245834cbcadaeca083a47c684"
	modal.ImageColor3 = Color3.new(1, 1, 1)
	modal.ScaleType = Enum.ScaleType.Slice
	modal.SliceCenter = Rect.new(185, 94, 839, 427)
	modal.SliceScale = 0.2
	modal.ZIndex = 32
	modal.Parent = host
	modal:SetAttribute("NexusAuditRequired", true)

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.BorderSizePixel = 0
	content.Position = UDim2.new(0, 28, 0, 24)
	content.Size = UDim2.new(1, -56, 1, -48)
	content.ZIndex = 40
	content.Parent = modal

	local settingsTitle = Instance.new("TextLabel")
	settingsTitle.Name = "SettingsTitle"
	settingsTitle.BackgroundTransparency = 1
	settingsTitle.BorderSizePixel = 0
	settingsTitle.Size = UDim2.new(1, -(closeSize + 20), 0, 42)
	settingsTitle.Text = "Settings"
	settingsTitle.TextColor3 = PALETTE.textPrimary
	settingsTitle.TextSize = 26
	settingsTitle.FontFace = fontFace("Bold")
	settingsTitle.TextWrapped = false
	settingsTitle.TextXAlignment = Enum.TextXAlignment.Left
	settingsTitle.TextYAlignment = Enum.TextYAlignment.Center
	settingsTitle.ZIndex = 41
	settingsTitle:SetAttribute("NexusAuditText", true)
	settingsTitle.Parent = content
	addTextShadow(content, settingsTitle, UDim2.fromOffset(0, 2), 0.55)

	local close = createCloseButton("SettingsCloseButton", closeSize)
	close.Position = UDim2.new(1, 0, 0, 0)
	close.Parent = content

	local musicRow = Instance.new("Frame")
	musicRow.Name = "MusicRow"
	musicRow.BackgroundTransparency = 1
	musicRow.BorderSizePixel = 0
	musicRow.Position = UDim2.new(0, 0, 0, 78)
	musicRow.Size = UDim2.new(1, 0, 0, 68)
	musicRow.ZIndex = 40
	musicRow.Parent = content

	local musicLabel = createTextLabel("MusicLabel", "Music", UDim2.new(0.5, 0, 1, 0), 18, "Medium", 41)
	musicLabel:SetAttribute("NexusAuditText", true)
	musicLabel.Parent = musicRow
	addTextShadow(musicRow, musicLabel, UDim2.fromOffset(0, 2), 0.62)

	local toggle = createToggle()
	toggle.AnchorPoint = Vector2.new(1, 0.5)
	toggle.Position = UDim2.new(1, 0, 0.5, 0)
	toggle.Parent = musicRow

	local volumeRow = Instance.new("Frame")
	volumeRow.Name = "VolumeRow"
	volumeRow.BackgroundTransparency = 1
	volumeRow.BorderSizePixel = 0
	volumeRow.Position = UDim2.new(0, 0, 0, 162)
	volumeRow.Size = UDim2.new(1, 0, 0, 112)
	volumeRow.ZIndex = 40
	volumeRow.Parent = content

	local volumeLabel = createTextLabel("VolumeLabel", "Volume", UDim2.new(0.7, 0, 0, 28), 18, "Medium", 41)
	volumeLabel:SetAttribute("NexusAuditText", true)
	volumeLabel.Parent = volumeRow
	addTextShadow(volumeRow, volumeLabel, UDim2.fromOffset(0, 2), 0.62)

	local volumeValue = createTextLabel("VolumeValue", "70%", UDim2.new(0.3, 0, 0, 28), 18, "SemiBold", 41)
	volumeValue.TextColor3 = PALETTE.textSecondary
	volumeValue.TextXAlignment = Enum.TextXAlignment.Right
	volumeValue.Position = UDim2.new(0.7, 0, 0, 0)
	volumeValue:SetAttribute("NexusAuditText", true)
	volumeValue.Parent = volumeRow
	addTextShadow(volumeRow, volumeValue, UDim2.fromOffset(0, 2), 0.68)

	local slider = createSlider()
	slider.Position = UDim2.new(0, 0, 0, 44)
	slider.Parent = volumeRow

	local behaviorMarker = Instance.new("Folder")
	behaviorMarker.Name = "PanelControllerBehavior"
	behaviorMarker.Parent = host

	return host
end

local function createCreditsModal(sizeX, sizeY, closeSize)
	local host = Instance.new("Frame")
	host.Name = "CreditsModalHost"
	host.BackgroundTransparency = 1
	host.BorderSizePixel = 0
	host.Size = UDim2.fromScale(1, 1)
	host.Visible = false
	host.ZIndex = 30

	local overlay = Instance.new("TextButton")
	overlay.Name = "Dismiss"
	overlay.AutoButtonColor = false
	overlay.BackgroundColor3 = PALETTE.dim
	overlay.BackgroundTransparency = 0.44
	overlay.BorderSizePixel = 0
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.Text = ""
	overlay.ZIndex = 30
	overlay.Parent = host

	attachNativeShadow(host, "CreditsModalShadow", UDim2.fromOffset(sizeX, sizeY), UDim2.new(0.5, 0, 0.5, 4), 31)

	local modal = Instance.new("ImageLabel")
	modal.Name = "CreditsModal"
	modal.BackgroundTransparency = 1
	modal.BorderSizePixel = 0
	modal.AnchorPoint = Vector2.new(0.5, 0.5)
	modal.Position = UDim2.new(0.5, 0, 0.5, 0)
	modal.Size = UDim2.fromOffset(sizeX, sizeY)
	modal.Image = "nexusasset://asset_c46f5bff5a3d4158adcb803c5cc3661a"
	modal.ImageColor3 = Color3.new(1, 1, 1)
	modal.ScaleType = Enum.ScaleType.Slice
	modal.SliceCenter = Rect.new(185, 124, 839, 564)
	modal.SliceScale = 0.2
	modal.ZIndex = 32
	modal.Parent = host
	modal:SetAttribute("NexusAuditRequired", true)

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.BackgroundTransparency = 1
	content.BorderSizePixel = 0
	content.Position = UDim2.new(0, 52, 0, 28)
	content.Size = UDim2.new(1, -104, 1, -56)
	content.ZIndex = 40
	content.Parent = modal

	local creditsTitle = Instance.new("TextLabel")
	creditsTitle.Name = "CreditsTitle"
	creditsTitle.BackgroundTransparency = 1
	creditsTitle.BorderSizePixel = 0
	creditsTitle.Size = UDim2.new(1, -(closeSize + 20), 0, 42)
	creditsTitle.Text = "Credits"
	creditsTitle.TextColor3 = PALETTE.textPrimary
	creditsTitle.TextSize = 26
	creditsTitle.FontFace = fontFace("Bold")
	creditsTitle.TextWrapped = false
	creditsTitle.TextXAlignment = Enum.TextXAlignment.Left
	creditsTitle.TextYAlignment = Enum.TextYAlignment.Center
	creditsTitle.ZIndex = 41
	creditsTitle:SetAttribute("NexusAuditText", true)
	creditsTitle.Parent = content
	addTextShadow(content, creditsTitle, UDim2.fromOffset(0, 2), 0.55)

	local close = createCloseButton("CreditsCloseButton", closeSize)
	close.Position = UDim2.new(1, 0, 0, 0)
	close.Parent = content

	local body = Instance.new("TextLabel")
	body.Name = "CreditsBody"
	body.BackgroundTransparency = 1
	body.BorderSizePixel = 0
	body.Position = UDim2.new(0, 0, 0, 64)
	body.Size = UDim2.new(1, 0, 1, -64)
	body.Text = "Created by your team."
	body.TextColor3 = PALETTE.textSecondary
	body.TextSize = 18
	body.FontFace = fontFace("Medium")
	body.TextWrapped = true
	body.TextXAlignment = Enum.TextXAlignment.Left
	body.TextYAlignment = Enum.TextYAlignment.Top
	body.ZIndex = 41
	body:SetAttribute("NexusAuditText", true)
	body.Parent = content
	addTextShadow(content, body, UDim2.fromOffset(0, 2), 0.72)

	return host
end

local function createBackground()
	local root = Instance.new("Frame")
	root.Name = "BackgroundRoot"
	root.BackgroundColor3 = Color3.new(1, 1, 1)
	root.BorderSizePixel = 0
	root.Size = UDim2.fromScale(1, 1)
	root.ZIndex = 1

	local gradient = Instance.new("UIGradient")
	gradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, PALETTE.bgTop),
		ColorSequenceKeypoint.new(1, PALETTE.bgBottom),
	})
	gradient.Rotation = 90
	gradient.Parent = root

	local bloomLeft = Instance.new("Frame")
	bloomLeft.Name = "BloomLeft"
	bloomLeft.BackgroundColor3 = PALETTE.bloomA
	bloomLeft.BackgroundTransparency = 0.84
	bloomLeft.BorderSizePixel = 0
	bloomLeft.AnchorPoint = Vector2.new(0.5, 0.5)
	bloomLeft.Position = UDim2.new(0.18, 0, 0.28, 0)
	bloomLeft.Size = UDim2.fromOffset(340, 340)
	bloomLeft.ZIndex = 2
	bloomLeft.Visible = false
	bloomLeft.Parent = root
	local leftCorner = Instance.new("UICorner")
	leftCorner.CornerRadius = UDim.new(1, 0)
	leftCorner.Parent = bloomLeft

	local bloomRight = Instance.new("Frame")
	bloomRight.Name = "BloomRight"
	bloomRight.BackgroundColor3 = PALETTE.bloomB
	bloomRight.BackgroundTransparency = 0.82
	bloomRight.BorderSizePixel = 0
	bloomRight.AnchorPoint = Vector2.new(0.5, 0.5)
	bloomRight.Position = UDim2.new(0.83, 0, 0.74, 0)
	bloomRight.Size = UDim2.fromOffset(430, 430)
	bloomRight.ZIndex = 2
	bloomRight.Visible = false
	bloomRight.Parent = root
	local rightCorner = Instance.new("UICorner")
	rightCorner.CornerRadius = UDim.new(1, 0)
	rightCorner.Parent = bloomRight

	local bloomMid = Instance.new("Frame")
	bloomMid.Name = "BloomMid"
	bloomMid.BackgroundColor3 = PALETTE.bloomC
	bloomMid.BackgroundTransparency = 0.86
	bloomMid.BorderSizePixel = 0
	bloomMid.AnchorPoint = Vector2.new(0.5, 0.5)
	bloomMid.Position = UDim2.new(0.5, 0, 0.52, 0)
	bloomMid.Size = UDim2.fromOffset(540, 220)
	bloomMid.ZIndex = 2
	bloomMid.Visible = false
	bloomMid.Parent = root
	local midCorner = Instance.new("UICorner")
	midCorner.CornerRadius = UDim.new(1, 0)
	midCorner.Parent = bloomMid

	local topLine = Instance.new("Frame")
	topLine.Name = "TopLine"
	topLine.BackgroundColor3 = PALETTE.line
	topLine.BackgroundTransparency = 0.55
	topLine.BorderSizePixel = 0
	topLine.Position = UDim2.new(0.04, 0, 0.07, 0)
	topLine.Size = UDim2.new(0.92, 0, 0, 2)
	topLine.ZIndex = 3
	topLine.Parent = root

	local bottomLine = Instance.new("Frame")
	bottomLine.Name = "BottomLine"
	bottomLine.BackgroundColor3 = PALETTE.line
	bottomLine.BackgroundTransparency = 0.68
	bottomLine.BorderSizePixel = 0
	bottomLine.Position = UDim2.new(0.04, 0, 0.93, 0)
	bottomLine.Size = UDim2.new(0.92, 0, 0, 2)
	bottomLine.ZIndex = 3
	bottomLine.Parent = root

	local backgroundOrnaments = Instance.new("Folder")
	backgroundOrnaments.Name = "BackgroundOrnaments"
	backgroundOrnaments.Parent = root

	return root
end

local function buildComposition(isMobile)
	local root = Instance.new("Frame")
	root.Name = isMobile and "_NexusMobile" or "_NexusDesktop"
	root.BackgroundTransparency = 1
	root.BorderSizePixel = 0
	root.Size = UDim2.fromScale(1, 1)
	root.Visible = not isMobile

	local dock = Instance.new("CanvasGroup")
	dock.Name = "MainMenuDock"
	dock.BackgroundTransparency = 1
	dock.BorderSizePixel = 0
	dock.AnchorPoint = isMobile and Vector2.new(0.5, 1) or Vector2.new(0.5, 0.5)
	dock.Position = isMobile and UDim2.new(0.5, 0, 1, -16) or UDim2.new(0.5, 0, 0.47, 0)
	dock.Size = isMobile and UDim2.new(1, -40, 0, 360) or UDim2.fromOffset(540, 460)
	dock.GroupTransparency = 0
	dock.ZIndex = 10
	dock.Parent = root

	local titleGroup = createTitleGroup(isMobile)
	titleGroup.Parent = dock

	local stack = Instance.new("Frame")
	stack.Name = "ButtonStack"
	stack.BackgroundTransparency = 1
	stack.BorderSizePixel = 0
	stack.Position = UDim2.new(0, isMobile and 10 or 18, 0, isMobile and 118 or 150)
	stack.Size = UDim2.new(1, -(isMobile and 20 or 36), 1, -(isMobile and 118 or 150))
	stack.ZIndex = 18
	stack.Parent = dock

	local list = Instance.new("UIListLayout")
	list.Padding = UDim.new(0, isMobile and 12 or 16)
	list.HorizontalAlignment = Enum.HorizontalAlignment.Center
	list.VerticalAlignment = Enum.VerticalAlignment.Top
	list.FillDirection = Enum.FillDirection.Vertical
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Parent = stack




	local play = createMenuButton(
		"PlayButton",
		"nexusasset://asset_ba81bd104c04413fa1c4e5729414428e",
		{185, 89, 839, 403},
		0.2,
		"nexusasset://asset_a69de95d0ba34ef0b26094f27fc35fca",
		"Play",
		isMobile and 88 or 104,
		isMobile and 22 or 24,
		isMobile and 30 or 34
	)
	play.LayoutOrder = 1
	play.Parent = stack

	local settings = createMenuButton(
		"SettingsButton",
		"nexusasset://asset_8db5d1f006c74515ab972c252cacf0e2",
		{185, 64, 839, 287},
		0.2,
		"nexusasset://asset_f9f9f82e620d4e7e9a542ffee8a9db7f",
		"Settings",
		isMobile and 64 or 68,
		22,
		28
	)
	settings.Size = UDim2.new(0.88, 0, 0, isMobile and 64 or 68)
	settings.LayoutOrder = 2
	settings.Parent = stack

	local credits = createMenuButton(
		"CreditsButton",
		"nexusasset://asset_8db5d1f006c74515ab972c252cacf0e2",
		{185, 64, 839, 287},
		0.2,
		"nexusasset://asset_aeefed7d427d4463857288baa1ef6c26",
		"Credits",
		isMobile and 64 or 68,
		22,
		28
	)
	credits.Size = UDim2.new(0.88, 0, 0, isMobile and 64 or 68)
	credits.LayoutOrder = 3
	credits.Parent = stack

	local hook = Instance.new("BindableEvent")
	hook.Name = "OnPlayRequestedHook"
	hook.Parent = root

	local settingsHost = createSettingsModal(isMobile and 344 or 520, isMobile and 370 or 390, isMobile and 52 or 56)
	settingsHost.Parent = root

	local creditsHost = createCreditsModal(isMobile and 330 or 430, isMobile and 230 or 250, isMobile and 52 or 56)
	creditsHost.Parent = root

	return root
end

function View.build()
	local gui = Instance.new("ScreenGui")
	gui.Name = "AURORA"
	gui.ResetOnSpawn = false
	gui.IgnoreGuiInset = false
	gui.DisplayOrder = 0
	gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	gui.Enabled = true

	local background = createBackground()
	background.Parent = gui

	local desktop = buildComposition(false)
	desktop.Parent = gui

	local mobile = buildComposition(true)
	mobile.Parent = gui

	return gui
end

return View