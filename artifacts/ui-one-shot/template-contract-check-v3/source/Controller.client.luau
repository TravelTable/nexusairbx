local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local GuiService = game:GetService("GuiService")

local root = script.Parent
local source = root:WaitForChild("_NexusSource")
local Responsive = require(source.Runtime.Responsive)
local ButtonEffects = require(source.Runtime.ButtonEffects)

Responsive.bind(root)

local cleaners = {}
local activeTweens = {}
local panelRevisions = setmetatable({}, { __mode = "k" })
local instanceIds = setmetatable({}, { __mode = "k" })
local nextInstanceId = 0
local function instanceKey(instance)
	if not instanceIds[instance] then
		nextInstanceId += 1
		instanceIds[instance] = tostring(nextInstanceId)
	end
	return instanceIds[instance]
end
local menuState = {
	musicOn = true,
	volume = 0.7,
	menuClosed = false,
}
local currentPanel = nil
local draggingSlider = nil

local function trackConnection(connection)
	table.insert(cleaners, function()
		if connection.Connected then
			connection:Disconnect()
		end
	end)
	return connection
end

local function stopTween(key)
	local tween = activeTweens[key]
	if tween then
		tween:Cancel()
		activeTweens[key] = nil
	end
end

local function playTween(key, object, info, goal)
	stopTween(key)
	local tween = TweenService:Create(object, info, goal)
	activeTweens[key] = tween
	tween:Play()
	trackConnection(tween.Completed:Connect(function()
		if activeTweens[key] == tween then
			activeTweens[key] = nil
		end
	end))
	return tween
end

local function iterNamed(name)
	local results = {}
	for _, descendant in ipairs(root:GetDescendants()) do
		if descendant.Name == name then
			table.insert(results, descendant)
		end
	end
	return results
end

local function getSiblingShadow(control)
	if not control or not control.Parent then
		return nil
	end
	local exact = control.Parent:FindFirstChild(control.Name .. "Shadow")
	if exact and exact:IsA("GuiObject") then
		return exact
	end
	return nil
end

local function bindButtonEffects(button)
	local visual = button
	local shadow = getSiblingShadow(button)
	local ok, controller = pcall(function()
		return ButtonEffects.bind(button, {
			visual = visual,
			shadow = shadow,
			sounds = false,
			hoverEnabled = true,
			hoverScale = button.Name == "PlayButton" and 1.03 or 1.025,
			pressScale = button.Name == "PlayButton" and 0.97 or 0.975,
			duration = 0.14,
			animations = true,
		})
	end)
	if ok and controller then
		table.insert(cleaners, function()
			controller:Destroy()
		end)
	end
end

for _, name in ipairs({
	"PlayButton",
	"SettingsButton",
	"CreditsButton",
	"SettingsCloseButton",
	"CreditsCloseButton",
	"MusicToggle",
}) do
	for _, button in ipairs(iterNamed(name)) do
		if button:IsA("GuiButton") then
			bindButtonEffects(button)
		end
	end
end

local function applyToggleVisual(toggle)
	local visual = toggle:FindFirstChild("Visual")
	if not visual then
		return
	end
	local onState = visual:FindFirstChild("MusicToggleOn")
	local offState = visual:FindFirstChild("MusicToggleOff")
	local thumb = visual:FindFirstChild("MusicToggleThumb")
	if not (onState and offState and thumb) then
		return
	end

	local targetPos = menuState.musicOn and UDim2.new(0.76, 0, 0.5, 0) or UDim2.new(0.24, 0, 0.5, 0)
	local targetOff = menuState.musicOn and 1 or 0
	local targetOn = menuState.musicOn and 0 or 1

	if GuiService.ReducedMotionEnabled then
		thumb.Position = targetPos
		offState.ImageTransparency = targetOff
		onState.ImageTransparency = targetOn
		return
	end

	playTween(instanceKey(toggle) .. "_thumb", thumb, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Position = targetPos,
	})
	playTween(instanceKey(toggle) .. "_off", offState, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		ImageTransparency = targetOff,
	})
	playTween(instanceKey(toggle) .. "_on", onState, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		ImageTransparency = targetOn,
	})
end

local function updateAllToggleVisuals()
	for _, toggle in ipairs(iterNamed("MusicToggle")) do
		if toggle:IsA("GuiButton") then
			applyToggleVisual(toggle)
		end
	end
end

local function setSliderVisual(slider)
	local fillClip = slider:FindFirstChild("TrackFillClip")
	local handle = slider:FindFirstChild("VolumeSliderHandle")
	local handleShadow = slider:FindFirstChild("VolumeSliderHandleShadow")
	local clamped = math.clamp(menuState.volume, 0, 1)

	if fillClip then
		fillClip.Size = UDim2.new(clamped, 0, 0, 20)
	end
	if handle then
		handle.Position = UDim2.new(clamped, 0, 0.5, 0)
	end
	if handleShadow and handleShadow:IsA("GuiObject") then
		handleShadow.Position = UDim2.new(clamped, 0, 0.5, 0)
	end

	local row = slider.Parent
	if row then
		local value = row:FindFirstChild("VolumeValue")
		if value and value:IsA("TextLabel") then
			value.Text = tostring(math.floor(clamped * 100 + 0.5)) .. "%"
			local shadow = row:FindFirstChild("Shadow")
			if shadow and shadow:IsA("TextLabel") and shadow.Position == value.Position + UDim2.fromOffset(0, 2) then
				shadow.Text = value.Text
			end
		end
	end
end

local function updateAllSliderVisuals()
	for _, slider in ipairs(iterNamed("VolumeSlider")) do
		if slider:IsA("Frame") then
			setSliderVisual(slider)
		end
	end
end

local function getPanels()
	local desktop = root:FindFirstChild("_NexusDesktop")
	local mobile = root:FindFirstChild("_NexusMobile")
	return {
		settings = {
			host = desktop and desktop:FindFirstChild("SettingsModalHost"),
			peer = mobile and mobile:FindFirstChild("SettingsModalHost"),
		},
		credits = {
			host = desktop and desktop:FindFirstChild("CreditsModalHost"),
			peer = mobile and mobile:FindFirstChild("CreditsModalHost"),
		},
	}
end

local function setMenuVisible(visible)
	for _, dock in ipairs(iterNamed("MainMenuDock")) do
		if dock:IsA("CanvasGroup") then
			if visible then
				dock.Visible = true
				dock.Interactable = true
				playTween(instanceKey(dock) .. "_menuIn", dock, TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
					GroupTransparency = 0,
				})
			else
				playTween(instanceKey(dock) .. "_menuOut", dock, TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
					GroupTransparency = 1,
				})
				dock.Interactable = false
			end
		end
	end
end

local function setPanelContentTransparency(content, opening)
	for _, child in ipairs(content:GetDescendants()) do
		if child:IsA("TextLabel") then
			if opening then
				local target = child.Name == "CreditsBody" and 0 or 0
				playTween(instanceKey(child) .. "_text", child, TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
					TextTransparency = target,
				})
			else
				playTween(instanceKey(child) .. "_text", child, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
					TextTransparency = 1,
				})
			end
		elseif child:IsA("ImageLabel") or child:IsA("ImageButton") then
			if opening then
				local target = 0
				if child.Name == "MusicToggleOff" then
					target = menuState.musicOn and 1 or 0
				elseif child.Name == "MusicToggleOn" then
					target = menuState.musicOn and 0 or 1
				end
				playTween(instanceKey(child) .. "_img", child, TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
					ImageTransparency = target,
				})
			else
				playTween(instanceKey(child) .. "_img", child, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
					ImageTransparency = 1,
				})
			end
		end
	end
end

local function animatePanel(host, opening)
	if not host then
		return
	end
	panelRevisions[host] = (panelRevisions[host] or 0) + 1
	local revision = panelRevisions[host]

	local overlay = host:FindFirstChild("Dismiss")
	local panel = host:FindFirstChild("SettingsModal") or host:FindFirstChild("CreditsModal")
	if not overlay or not panel then
		host.Visible = opening
		return
	end

	local content = panel:FindFirstChild("Content")
	local shadow = host:FindFirstChild(host.Name == "SettingsModalHost" and "SettingsModalShadow" or "CreditsModalShadow")
	local overlayShownTransparency = host.Name == "CreditsModalHost" and 0.44 or 0.38

	if opening then
		host.Visible = true
		overlay.BackgroundTransparency = 1
		panel.ImageTransparency = 1
		panel.Position = UDim2.new(0.5, 0, 0.5, 12)
		if shadow and shadow:IsA("GuiObject") then
			shadow.Visible = true
			shadow.Position = UDim2.new(0.5, 0, 0.5, 16)
		end
		if content then
			for _, child in ipairs(content:GetDescendants()) do
				if child:IsA("TextLabel") then
					child.TextTransparency = 1
				elseif child:IsA("ImageLabel") or child:IsA("ImageButton") then
					child.ImageTransparency = 1
				end
			end
		end

		playTween(instanceKey(host) .. "_overlay", overlay, TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
			BackgroundTransparency = overlayShownTransparency,
		})
		playTween(instanceKey(host) .. "_panel", panel, TweenInfo.new(0.22, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
			ImageTransparency = 0,
			Position = UDim2.new(0.5, 0, 0.5, 0),
		})
		if shadow and shadow:IsA("GuiObject") and not GuiService.ReducedMotionEnabled then
			playTween(instanceKey(host) .. "_shadow", shadow, TweenInfo.new(0.22, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
				Position = UDim2.new(0.5, 0, 0.5, 4),
			})
		end
		if content then
			setPanelContentTransparency(content, true)
		end
	else
		playTween(instanceKey(host) .. "_overlay", overlay, TweenInfo.new(0.14, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
			BackgroundTransparency = 1,
		})
		local closeTween = playTween(instanceKey(host) .. "_panel", panel, TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
			ImageTransparency = 1,
			Position = UDim2.new(0.5, 0, 0.5, 10),
		})
		if shadow and shadow:IsA("GuiObject") and not GuiService.ReducedMotionEnabled then
			playTween(instanceKey(host) .. "_shadow", shadow, TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
				Position = UDim2.new(0.5, 0, 0.5, 14),
			})
		end
		if content then
			setPanelContentTransparency(content, false)
		end
		trackConnection(closeTween.Completed:Connect(function(playbackState)
			if host.Parent and panelRevisions[host] == revision and playbackState == Enum.PlaybackState.Completed then
				host.Visible = false
			end
		end))
	end
end

local function closeCurrentPanel()
	if not currentPanel then
		return
	end
	local panels = getPanels()
	local panelSet = panels[currentPanel]
	if panelSet then
		animatePanel(panelSet.host, false)
		animatePanel(panelSet.peer, false)
	end
	currentPanel = nil
	setMenuVisible(true)
end

local function openPanel(name)
	local panels = getPanels()
	if currentPanel and currentPanel ~= name then
		closeCurrentPanel()
	end
	currentPanel = name
	setMenuVisible(false)
	local panelSet = panels[name]
	if panelSet then
		animatePanel(panelSet.host, true)
		animatePanel(panelSet.peer, true)
	end
end

for _, panelController in ipairs(iterNamed("PanelControllerBehavior")) do
	if panelController:IsA("BindableFunction") then
		panelController.OnInvoke = function(action)
			if action == "settings" or action == "credits" then
				openPanel(action)
			elseif action == "close" then
				closeCurrentPanel()
			end
			return currentPanel
		end
	end
end

for _, overlay in ipairs(iterNamed("Dismiss")) do
	if overlay:IsA("GuiButton") then
		trackConnection(overlay.Activated:Connect(function()
			closeCurrentPanel()
		end))
	end
end

for _, button in ipairs(iterNamed("SettingsButton")) do
	if button:IsA("GuiButton") then
		trackConnection(button.Activated:Connect(function()
			openPanel("settings")
		end))
	end
end

for _, button in ipairs(iterNamed("CreditsButton")) do
	if button:IsA("GuiButton") then
		trackConnection(button.Activated:Connect(function()
			openPanel("credits")
		end))
	end
end

for _, button in ipairs(iterNamed("SettingsCloseButton")) do
	if button:IsA("GuiButton") then
		trackConnection(button.Activated:Connect(function()
			if currentPanel == "settings" then
				closeCurrentPanel()
			end
		end))
	end
end

for _, button in ipairs(iterNamed("CreditsCloseButton")) do
	if button:IsA("GuiButton") then
		trackConnection(button.Activated:Connect(function()
			if currentPanel == "credits" then
				closeCurrentPanel()
			end
		end))
	end
end

for _, toggle in ipairs(iterNamed("MusicToggle")) do
	if toggle:IsA("GuiButton") then
		trackConnection(toggle.Activated:Connect(function()
			menuState.musicOn = not menuState.musicOn
			updateAllToggleVisuals()
		end))
	end
end

local function sliderValueFromInput(slider, inputPositionX)
	local absoluteX = slider.AbsolutePosition.X
	local absoluteWidth = slider.AbsoluteSize.X
	if absoluteWidth <= 0 then
		return menuState.volume
	end
	return math.clamp((inputPositionX - absoluteX) / absoluteWidth, 0, 1)
end

local function beginSliderDrag(slider, inputPositionX)
	draggingSlider = slider
	menuState.volume = sliderValueFromInput(slider, inputPositionX)
	updateAllSliderVisuals()
end

for _, slider in ipairs(iterNamed("VolumeSlider")) do
	if slider:IsA("Frame") then
		local hitArea = slider:FindFirstChild("HitArea")
		if hitArea and hitArea:IsA("GuiButton") then
			trackConnection(hitArea.InputBegan:Connect(function(input)
				if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
					beginSliderDrag(slider, input.Position.X)
				end
			end))
			trackConnection(hitArea.Activated:Connect(function()
				local position = UserInputService:GetMouseLocation()
				menuState.volume = sliderValueFromInput(slider, position.X)
				updateAllSliderVisuals()
			end))
		end
	end
end

trackConnection(UserInputService.InputChanged:Connect(function(input)
	if not draggingSlider then
		return
	end
	if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then
		menuState.volume = sliderValueFromInput(draggingSlider, input.Position.X)
		updateAllSliderVisuals()
	end
end))

trackConnection(UserInputService.InputEnded:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
		draggingSlider = nil
	end
end))

for _, button in ipairs(iterNamed("PlayButton")) do
	if button:IsA("GuiButton") then
		trackConnection(button.Activated:Connect(function()
			if menuState.menuClosed then
				return
			end
			menuState.menuClosed = true
			closeCurrentPanel()

			for _, host in ipairs(iterNamed("SettingsModalHost")) do
				if host:IsA("GuiObject") then
					host.Visible = false
				end
			end
			for _, host in ipairs(iterNamed("CreditsModalHost")) do
				if host:IsA("GuiObject") then
					host.Visible = false
				end
			end

			local screenFade = playTween("screen_close", root, TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
				Enabled = false,
			})
			if not screenFade then
				root.Enabled = false
			end
			root.Enabled = false

			for _, hook in ipairs(iterNamed("OnPlayRequestedHook")) do
				if hook:IsA("BindableEvent") then
					hook:Fire()
				end
			end
		end))
	end
end

updateAllToggleVisuals()
updateAllSliderVisuals()

trackConnection(root.Destroying:Connect(function()
	for _, cleanup in ipairs(cleaners) do
		cleanup()
	end
	table.clear(cleaners)
	for key in pairs(activeTweens) do
		stopTween(key)
	end
end))
