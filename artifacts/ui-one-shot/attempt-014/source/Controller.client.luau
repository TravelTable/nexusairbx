local TweenService = game:GetService("TweenService")
local GuiService = game:GetService("GuiService")
local UserInputService = game:GetService("UserInputService")

local root = script.Parent
local source = root:WaitForChild("_NexusSource")
local Responsive = require(source.Runtime.Responsive)
local ButtonEffects = require(source.Runtime.ButtonEffects)

local cleanupResponsive = Responsive.bind(root)
local bindings = {}

local function track(binding)
	if binding then
		table.insert(bindings, binding)
	end
	return binding
end

local function destroyBindings()
	for _, binding in ipairs(bindings) do
		if binding and binding.Destroy then
			binding:Destroy()
		end
	end
	table.clear(bindings)
end

local function getVariants()
	local variants = {}
	for _, child in ipairs(root:GetChildren()) do
		if child:IsA("GuiObject") and (child.Name == "_NexusDesktop" or child.Name == "_NexusMobile") then
			table.insert(variants, child)
		end
	end
	return variants
end

local function iterNamed(name)
	local results = {}
	for _, variant in ipairs(getVariants()) do
		for _, node in ipairs(variant:GetDescendants()) do
			if node.Name == name then
				table.insert(results, node)
			end
		end
	end
	return results
end

local function tween(object, info, goal)
	local t = TweenService:Create(object, info, goal)
	t:Play()
	return t
end

local activeModalName = nil
local activeModalHost = nil
local isMenuClosed = false
local defaultMusicOn = true
local defaultVolume = 0.7

local function findVisibleVariant()
	for _, variant in ipairs(getVariants()) do
		if variant.Visible then
			return variant
		end
	end
	return getVariants()[1]
end

local function getVisibleMenuDock()
	local variant = findVisibleVariant()
	return variant and variant:FindFirstChild("MainMenuDock", true)
end

local function getVisibleModalHost(hostName)
	local variant = findVisibleVariant()
	return variant and variant:FindFirstChild(hostName, true)
end

local function setMenuDimmed(dimmed)
	for _, dock in ipairs(iterNamed("MainMenuDock")) do
		local target = dimmed and 0.35 or 0
		tween(dock, TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
			GroupTransparency = target,
		})
	end
end

local function ensureCanvasGroup(node)
	if node:IsA("CanvasGroup") then
		return node
	end
	local parent = node.Parent
	local replacement = Instance.new("CanvasGroup")
	replacement.Name = node.Name
	replacement.AnchorPoint = node.AnchorPoint
	replacement.AutomaticSize = node.AutomaticSize
	replacement.BackgroundColor3 = node.BackgroundColor3
	replacement.BackgroundTransparency = 1
	replacement.BorderColor3 = node.BorderColor3
	replacement.BorderMode = node.BorderMode
	replacement.BorderSizePixel = node.BorderSizePixel
	replacement.ClipsDescendants = node.ClipsDescendants
	replacement.GroupColor3 = Color3.new(1, 1, 1)
	replacement.GroupTransparency = 0
	replacement.LayoutOrder = node.LayoutOrder
	replacement.Position = node.Position
	replacement.Rotation = node.Rotation
	replacement.Selectable = node.Selectable
	replacement.SelectionOrder = node.SelectionOrder
	replacement.Size = node.Size
	replacement.SizeConstraint = node.SizeConstraint
	replacement.Visible = node.Visible
	replacement.ZIndex = node.ZIndex
	for _, child in ipairs(node:GetChildren()) do
		child.Parent = replacement
	end
	replacement.Parent = parent
	node:Destroy()
	return replacement
end

for _, dock in ipairs(iterNamed("MainMenuDock")) do
	ensureCanvasGroup(dock)
end

local function animateModal(host, opening)
	if not host then
		return
	end
	local modal = host:FindFirstChildWhichIsA("ImageLabel", true)
	local dismiss = host:FindFirstChild("Dismiss")
	local modalScale = modal and modal:FindFirstChild("ModalScale")
	if opening then
		host.Visible = true
		if dismiss then
			dismiss.BackgroundTransparency = 1
			tween(dismiss, TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				BackgroundTransparency = 0.38,
			})
		end
		if modal then
			modal.ImageTransparency = 1
			tween(modal, TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				ImageTransparency = 0,
			})
		end
		if modalScale then
			modalScale.Scale = 0.96
			tween(modalScale, TweenInfo.new(0.22, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
				Scale = 1,
			})
		end
	else
		if dismiss then
			tween(dismiss, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
				BackgroundTransparency = 1,
			})
		end
		if modal then
			tween(modal, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
				ImageTransparency = 1,
			})
		end
		if modalScale then
			tween(modalScale, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
				Scale = 0.98,
			})
		end
		task.delay(0.13, function()
			if host.Parent then
				host.Visible = false
				if modal then
					modal.ImageTransparency = 0
				end
				if dismiss then
					dismiss.BackgroundTransparency = 0.38
				end
				if modalScale then
					modalScale.Scale = 1
				end
			end
		end)
	end
end

local function closeActiveModal()
	if activeModalHost then
		animateModal(activeModalHost, false)
	end
	activeModalName = nil
	activeModalHost = nil
	setMenuDimmed(false)
end

local function openModal(hostName)
	if isMenuClosed then
		return
	end
	local host = getVisibleModalHost(hostName)
	if not host then
		return
	end
	if activeModalHost == host then
		return
	end
	if activeModalHost then
		animateModal(activeModalHost, false)
	end
	activeModalName = hostName
	activeModalHost = host
	setMenuDimmed(true)
	animateModal(host, true)
end

local function closeMenuAndFireHook()
	if isMenuClosed then
		return
	end
	isMenuClosed = true
	closeActiveModal()

	for _, variant in ipairs(getVariants()) do
		variant.Active = false
		local dock = variant:FindFirstChild("MainMenuDock", true)
		if dock then
			tween(dock, TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
				GroupTransparency = 1,
				Position = dock.Position + UDim2.fromOffset(0, 16),
			})
		end
	end

	task.delay(0.2, function()
		for _, variant in ipairs(getVariants()) do
			variant.Visible = false
		end
		root.Enabled = false
		local variant = findVisibleVariant()
		local hook
		if variant then
			hook = variant:FindFirstChild("OnPlayRequestedHook", true)
		end
		if not hook then
			for _, candidate in ipairs(iterNamed("OnPlayRequestedHook")) do
				hook = candidate
				break
			end
		end
		if hook and hook:IsA("BindableEvent") then
			hook:Fire()
		end
	end)
end

local function setToggleState(toggle, isOn, instant)
	local housing = toggle:FindFirstChild("Visual")
	local activeFill = housing and housing:FindFirstChild("ActiveFill")
	local thumb = housing and housing:FindFirstChild("Thumb")
	local stateLabel = toggle:FindFirstChild("StateLabel")
	if not (housing and activeFill and thumb and stateLabel) then
		return
	end

	local targetXScale = isOn and 1 or 0
	local xOffset = isOn and (toggle.AbsoluteSize.X - thumb.AbsoluteSize.X - 4) or 4
	local targetPos = UDim2.new(0, xOffset, 0.5, 0)

	stateLabel.Text = isOn and "ON" or "OFF"
	stateLabel.TextColor3 = isOn and Color3.fromRGB(244, 251, 255) or Color3.fromRGB(184, 210, 232)

	if instant or GuiService.ReducedMotionEnabled then
		activeFill.Size = UDim2.fromScale(targetXScale, 1)
		thumb.Position = targetPos
	else
		tween(activeFill, TweenInfo.new(0.14, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
			Size = UDim2.fromScale(targetXScale, 1),
		})
		tween(thumb, TweenInfo.new(0.14, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
			Position = targetPos,
		})
	end
end

local function setSliderValue(slider, value, instant)
	value = math.clamp(value, 0, 1)
	local track = slider:FindFirstChild("Track")
	local fill = track and track:FindFirstChild("Fill")
	local handle = slider:FindFirstChild("Handle")
	local row = slider.Parent and slider.Parent.Parent
	local valueLabel = row and row.Parent and row.Parent:FindFirstChild("VolumeValue")
	if not (track and fill and handle) then
		return
	end

	local targetFill = UDim2.fromScale(value, 1)
	local x = math.floor(track.AbsoluteSize.X * value + 0.5)
	local targetHandle = UDim2.new(0, x, 0.5, 0)

	if valueLabel and valueLabel:IsA("TextLabel") then
		valueLabel.Text = tostring(math.floor(value * 100 + 0.5)) .. "%"
	end

	if instant or GuiService.ReducedMotionEnabled then
		fill.Size = targetFill
		handle.Position = targetHandle
	else
		tween(fill, TweenInfo.new(0.08, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
			Size = targetFill,
		})
		tween(handle, TweenInfo.new(0.08, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
			Position = targetHandle,
		})
	end
end

local function bindButtons()
	destroyBindings()

	for _, playButton in ipairs(iterNamed("PlayButton")) do
		track(ButtonEffects.bind(playButton, {
			visual = playButton:FindFirstChild("Visual") or playButton,
			hoverScale = 1.04,
			pressScale = 0.96,
			duration = 0.12,
			sounds = false,
		}))
		playButton.Activated:Connect(closeMenuAndFireHook)
	end

	for _, settingsButton in ipairs(iterNamed("SettingsButton")) do
		track(ButtonEffects.bind(settingsButton, {
			visual = settingsButton:FindFirstChild("Visual") or settingsButton,
			hoverScale = 1.03,
			pressScale = 0.97,
			duration = 0.12,
			sounds = false,
		}))
		settingsButton.Activated:Connect(function()
			openModal("SettingsModalHost")
		end)
	end

	for _, creditsButton in ipairs(iterNamed("CreditsButton")) do
		track(ButtonEffects.bind(creditsButton, {
			visual = creditsButton:FindFirstChild("Visual") or creditsButton,
			hoverScale = 1.03,
			pressScale = 0.97,
			duration = 0.12,
			sounds = false,
		}))
		creditsButton.Activated:Connect(function()
			openModal("CreditsModalHost")
		end)
	end

	for _, closeButton in ipairs(iterNamed("SettingsCloseButton")) do
		track(ButtonEffects.bind(closeButton, {
			visual = closeButton:FindFirstChild("Visual") or closeButton,
			hoverScale = 1.03,
			pressScale = 0.95,
			duration = 0.1,
			sounds = false,
		}))
		closeButton.Activated:Connect(closeActiveModal)
	end

	for _, closeButton in ipairs(iterNamed("CreditsCloseButton")) do
		track(ButtonEffects.bind(closeButton, {
			visual = closeButton:FindFirstChild("Visual") or closeButton,
			hoverScale = 1.03,
			pressScale = 0.95,
			duration = 0.1,
			sounds = false,
		}))
		closeButton.Activated:Connect(closeActiveModal)
	end

	for _, dismiss in ipairs(iterNamed("Dismiss")) do
		if dismiss:IsA("GuiButton") then
			dismiss.Activated:Connect(closeActiveModal)
		end
	end

	for _, toggle in ipairs(iterNamed("MusicToggle")) do
		track(ButtonEffects.bind(toggle, {
			visual = toggle:FindFirstChild("Visual") or toggle,
			hoverScale = 1.02,
			pressScale = 0.98,
			duration = 0.1,
			sounds = false,
		}))
		setToggleState(toggle, defaultMusicOn, true)
		toggle.Activated:Connect(function()
			defaultMusicOn = not defaultMusicOn
			for _, syncToggle in ipairs(iterNamed("MusicToggle")) do
				setToggleState(syncToggle, defaultMusicOn, false)
			end
		end)
	end

	local dragging = false
	local dragSlider = nil

	local function updateDrag(input)
		if not dragging or not dragSlider then
			return
		end
		local track = dragSlider:FindFirstChild("Track")
		if not track then
			return
		end
		local alpha = 0
		if track.AbsoluteSize.X > 0 then
			alpha = (input.Position.X - track.AbsolutePosition.X) / track.AbsoluteSize.X
		end
		defaultVolume = math.clamp(alpha, 0, 1)
		for _, syncSlider in ipairs(iterNamed("VolumeSlider")) do
			setSliderValue(syncSlider, defaultVolume, false)
		end
	end

	for _, slider in ipairs(iterNamed("VolumeSlider")) do
		setSliderValue(slider, defaultVolume, true)
		local dragHit = slider:FindFirstChild("DragHitTarget")
		if dragHit and dragHit:IsA("GuiButton") then
			track(ButtonEffects.bind(dragHit, {
				visual = slider,
				hoverScale = 1.0,
				pressScale = 1.0,
				duration = 0.08,
				sounds = false,
			}))
			dragHit.InputBegan:Connect(function(input)
				if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
					dragging = true
					dragSlider = slider
					updateDrag(input)
				end
			end)
			dragHit.Activated:Connect(function()
				local mousePos = UserInputService:GetMouseLocation()
				updateDrag({
					Position = Vector3.new(mousePos.X, mousePos.Y, 0),
				})
			end)
		end
	end

	UserInputService.InputChanged:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then
			updateDrag(input)
		end
	end)

	UserInputService.InputEnded:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
			dragging = false
			dragSlider = nil
		end
	end)
end

bindButtons()

root.Destroying:Connect(function()
	destroyBindings()
	if cleanupResponsive then
		cleanupResponsive()
	end
end)