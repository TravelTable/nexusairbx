local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local GuiService = game:GetService("GuiService")

local root = script.Parent
local source = root:WaitForChild("_NexusSource")
local Responsive = require(source.Runtime.Responsive)
local ButtonEffects = require(source.Runtime.ButtonEffects)

Responsive.bind(root)

local connections = {}
local effectControllers = {}
local sliderBindings = {}

local function connect(signal, fn)
	local connection = signal:Connect(fn)
	table.insert(connections, connection)
	return connection
end

local function getRegions()
	local regions = {}
	for _, child in ipairs(root:GetChildren()) do
		if child:IsA("GuiObject") and (child.Name == "_NexusDesktop" or child.Name == "_NexusMobile") then
			table.insert(regions, child)
		end
	end
	return regions
end

local function forEachNamed(name, callback)
	for _, region in ipairs(getRegions()) do
		for _, descendant in ipairs(region:GetDescendants()) do
			if descendant.Name == name then
				callback(descendant, region)
			end
		end
	end
end

local function tween(object, info, goal)
	local tw = TweenService:Create(object, info, goal)
	tw:Play()
	return tw
end

local function setMenuInteractable(region, enabled)
	for _, name in ipairs({ "PlayButton", "SettingsButton", "CreditsButton" }) do
		local button = region:FindFirstChild(name, true)
		if button and button:IsA("GuiButton") then
			button.Active = enabled
			button.Interactable = enabled
		end
	end
end

local function closeAllPanels(region, instant)
	local overlay = region:FindFirstChild("DimOverlay", true)
	local settingsShell = region:FindFirstChild("SettingsModalShell", true)
	local creditsShell = region:FindFirstChild("CreditsModalShell", true)

	local function hideShell(shell)
		if not shell then
			return
		end
		if instant or GuiService.ReducedMotionEnabled then
			shell.Visible = false
			local scale = shell:FindFirstChild("ModalScale")
			if scale then
				scale.Scale = 1
			end
			return
		end
		local scale = shell:FindFirstChild("ModalScale")
		local fade = tween(shell, TweenInfo.new(0.14, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
			GroupTransparency = nil,
		})
		fade:Cancel()
		if scale then
			tween(scale, TweenInfo.new(0.14, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
				Scale = 0.97,
			})
		end
		task.delay(0.14, function()
			if shell.Parent then
				shell.Visible = false
				if scale then
					scale.Scale = 1
				end
			end
		end)
	end

	if overlay then
		overlay.Visible = false
	end
	hideShell(settingsShell)
	hideShell(creditsShell)
	setMenuInteractable(region, true)
end

local function ensureScale(shell)
	local scale = shell:FindFirstChild("ModalScale")
	if not scale then
		scale = Instance.new("UIScale")
		scale.Name = "ModalScale"
		scale.Scale = 1
		scale.Parent = shell
	end
	return scale
end

local function openPanel(region, shellName)
	local overlay = region:FindFirstChild("DimOverlay", true)
	local shell = region:FindFirstChild(shellName, true)
	if not shell then
		return
	end

	local otherName = shellName == "SettingsModalShell" and "CreditsModalShell" or "SettingsModalShell"
	local otherShell = region:FindFirstChild(otherName, true)
	if otherShell then
		otherShell.Visible = false
	end

	if overlay then
		overlay.Visible = true
	end

	shell.Visible = true
	shell.ZIndex = 40
	local scale = ensureScale(shell)
	setMenuInteractable(region, false)

	if GuiService.ReducedMotionEnabled then
		scale.Scale = 1
		return
	end

	scale.Scale = 0.96
	tween(scale, TweenInfo.new(0.22, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
		Scale = 1,
	})
end

local function closePanel(region, shellName)
	local overlay = region:FindFirstChild("DimOverlay", true)
	local shell = region:FindFirstChild(shellName, true)
	if not shell then
		return
	end

	if overlay then
		overlay.Visible = false
	end
	setMenuInteractable(region, true)

	if GuiService.ReducedMotionEnabled then
		shell.Visible = false
		local scale = shell:FindFirstChild("ModalScale")
		if scale then
			scale.Scale = 1
		end
		return
	end

	local scale = ensureScale(shell)
	tween(scale, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
		Scale = 0.97,
	})
	task.delay(0.12, function()
		if shell.Parent then
			shell.Visible = false
			scale.Scale = 1
		end
	end)
end

local function bindButtonEffects(button)
	if effectControllers[button] then
		return
	end
	local visual = button:FindFirstChild("Visual")
	local ok, controller = pcall(function()
		return ButtonEffects.bind(button, {
			visual = visual or button,
			hoverScale = button.Name == "PlayButton" and 1.03 or 1.02,
			pressScale = button.Name:find("Close") and 0.95 or 0.97,
			duration = 0.12,
			sounds = false,
			hoverEnabled = true,
		})
	end)
	if ok then
		effectControllers[button] = controller
	end
end

local function setToggleState(toggle, on)
	local onState = toggle:FindFirstChild("Visual", true):FindFirstChild("Housing"):FindFirstChild("ToggleOnState")
	local offState = toggle:FindFirstChild("Visual", true):FindFirstChild("Housing"):FindFirstChild("ToggleOffState")
	local thumb = toggle:FindFirstChild("Visual", true):FindFirstChild("Housing"):FindFirstChild("Thumb")
	local stateLabel = toggle:FindFirstChild("Visual", true):FindFirstChild("Housing"):FindFirstChild("StateLabel")

	if onState then
		onState.Visible = on
	end
	if offState then
		offState.Visible = not on
	end
	if stateLabel then
		stateLabel.Visible = on
		stateLabel.Text = on and "ON" or "OFF"
	end

	local targetPos = on and UDim2.fromScale(0.6, 0.5) or UDim2.fromScale(0.08, 0.5)
	if thumb then
		if GuiService.ReducedMotionEnabled then
			thumb.Position = targetPos
		else
			tween(thumb, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Position = targetPos,
			})
		end
	end

	toggle:SetAttribute("IsOn", on)
end

local function setSliderValue(slider, value)
	value = math.clamp(value, 0, 1)
	local fill = slider:FindFirstChild("TrackFill")
	local handle = slider:FindFirstChild("Handle")
	local valueLabel = slider.Parent.Parent:FindFirstChild("VolumeValue")
	if fill then
		fill.Size = UDim2.new(value, 0, 0, 18)
	end
	if handle then
		handle.Position = UDim2.new(value, 0, 0.5, 0)
	end
	if valueLabel and valueLabel:IsA("TextLabel") then
		valueLabel.Text = tostring(math.floor(value * 100 + 0.5)) .. "%"
	end
	slider:SetAttribute("Value", value)
end

local function bindSlider(slider)
	if sliderBindings[slider] then
		return
	end

	setSliderValue(slider, slider:GetAttribute("Value") or 0.7)

	local dragging = false
	local function applyFromX(x)
		local absPos = slider.AbsolutePosition.X
		local absSize = slider.AbsoluteSize.X
		if absSize <= 0 then
			return
		end
		local value = (x - absPos) / absSize
		setSliderValue(slider, value)
	end

	local hitArea = slider:FindFirstChild("HitArea")
	local handle = slider:FindFirstChild("Handle")

	local localConnections = {}

	local function bindSignal(signal, fn)
		table.insert(localConnections, signal:Connect(fn))
	end

	if hitArea and hitArea:IsA("GuiButton") then
		bindSignal(hitArea.InputBegan, function(input)
			if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
				dragging = true
				applyFromX(input.Position.X)
			end
		end)
		bindSignal(hitArea.Activated, function()
			local pos = UserInputService:GetMouseLocation()
			applyFromX(pos.X)
		end)
	end

	if handle and handle:IsA("GuiButton") then
		bindSignal(handle.InputBegan, function(input)
			if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
				dragging = true
			end
		end)
		bindSignal(handle.Activated, function()
			local pos = UserInputService:GetMouseLocation()
			applyFromX(pos.X)
		end)
	end

	bindSignal(UserInputService.InputChanged, function(input)
		if dragging and (input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch) then
			applyFromX(input.Position.X)
		end
	end)

	bindSignal(UserInputService.InputEnded, function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
			dragging = false
		end
	end)

	sliderBindings[slider] = localConnections
end

forEachNamed("PlayButton", function(button, region)
	if button:IsA("GuiButton") then
		bindButtonEffects(button)
		connect(button.Activated, function()
			closeAllPanels(region, true)
			region.Visible = false
			local hook = region:FindFirstChild("OnPlayRequestedHook", true)
			local event = hook and hook:FindFirstChild("Event")
			if event and event:IsA("BindableEvent") then
				event:Fire()
			end
		end)
	end
end)

forEachNamed("SettingsButton", function(button, region)
	if button:IsA("GuiButton") then
		bindButtonEffects(button)
		connect(button.Activated, function()
			openPanel(region, "SettingsModalShell")
		end)
	end
end)

forEachNamed("CreditsButton", function(button, region)
	if button:IsA("GuiButton") then
		bindButtonEffects(button)
		connect(button.Activated, function()
			openPanel(region, "CreditsModalShell")
		end)
	end
end)

forEachNamed("SettingsCloseButton", function(button, region)
	if button:IsA("GuiButton") then
		bindButtonEffects(button)
		connect(button.Activated, function()
			closePanel(region, "SettingsModalShell")
		end)
	end
end)

forEachNamed("CreditsCloseButton", function(button, region)
	if button:IsA("GuiButton") then
		bindButtonEffects(button)
		connect(button.Activated, function()
			closePanel(region, "CreditsModalShell")
		end)
	end
end)

forEachNamed("DimOverlay", function(overlay, region)
	if overlay:IsA("GuiButton") then
		connect(overlay.Activated, function()
			closeAllPanels(region, false)
		end)
	end
end)

forEachNamed("MusicToggle", function(toggle)
	if toggle:IsA("GuiButton") then
		bindButtonEffects(toggle)
		setToggleState(toggle, true)
		connect(toggle.Activated, function()
			setToggleState(toggle, not toggle:GetAttribute("IsOn"))
		end)
	end
end)

forEachNamed("VolumeSlider", function(slider)
	if slider:IsA("Frame") then
		bindSlider(slider)
	end
end)

connect(root.Destroying, function()
	for _, connection in ipairs(connections) do
		connection:Disconnect()
	end
	for _, controller in pairs(effectControllers) do
		if controller and controller.Destroy then
			controller:Destroy()
		end
	end
	for _, sliderConns in pairs(sliderBindings) do
		for _, connection in ipairs(sliderConns) do
			connection:Disconnect()
		end
	end
end)