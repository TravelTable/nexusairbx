-- Original reference implementation from 06-ui-motion-and-interaction.md
-- Reviewed 2026-09-11. Not Roblox Studio runtime-verified.

local TweenService = game:GetService("TweenService")
local GuiService = game:GetService("GuiService")
local UserInputService = game:GetService("UserInputService")
local ButtonFeedback = {}
local bound = setmetatable({}, { __mode = "k" })
local lastSoundAt = { hover = -math.huge, click = -math.huge }

-- Backward compatible: bind(button, childVisual) or bind(button, options).
-- Prefer options.visual = the stable button's child Visual frame.
function ButtonFeedback.bind(button, visualOrOptions, options)
    local visual
    if typeof(visualOrOptions) == "Instance" then
        visual = visualOrOptions
        options = options or {}
    else
        options = visualOrOptions or {}
        visual = options.visual or button:FindFirstChild("Visual") or button
    end
    assert(button:IsA("GuiButton"), "expected a GuiButton")
    assert(visual:IsA("GuiObject") and (visual == button or visual:IsDescendantOf(button)),
        "visual must be a child visual inside the button")
    assert(not bound[button], "button already has a feedback binding")
    assert(not visual:FindFirstChildOfClass("UIScale"),
        "visual UIScale already has an owner")
    local scale = Instance.new("UIScale")
    scale.Name = "FeedbackScale"
    scale.Parent = visual
    local alive, focused = true, GuiService.SelectedObject == button
    local currentTween = nil
    local shadowTween = nil
    local connections = {}
    local sounds = {}
    local originalAutoColor = button.AutoButtonColor
    button.AutoButtonColor = false
    local controller = {}
    bound[button] = controller
    local previousState = nil
    local hoverScale = math.clamp(tonumber(options.hoverScale) or 1.05, 1, 1.1)
    local pressScale = math.clamp(tonumber(options.pressScale) or 0.95, 0.85, 1)
    local duration = math.clamp(tonumber(options.duration) or 0.12, 0.06, 0.3)
    local shadow = options.shadow
    local shadowPosition = shadow and shadow.Position

    local function soundFor(kind, soundId)
        if type(soundId) ~= "string" or not soundId:match("^rbxassetid://%d+$") then return end
        local sound = Instance.new("Sound")
        sound.Name = "Feedback_" .. kind
        sound.SoundId = soundId
        sound.Volume = math.clamp(tonumber(options.volume) or 0.18, 0, 0.35)
        sound.Parent = button
        sounds[kind] = sound
    end
    soundFor("hover", options.hoverSound)
    soundFor("click", options.clickSound)

    local function playSound(kind)
        if not alive or not button.Interactable or options.sounds == false then return end
        local sound = sounds[kind]
        local now = os.clock()
        local delay = kind == "hover" and 0.12 or 0.08
        if not sound or now - lastSoundAt[kind] < delay then return end
        lastSoundAt[kind] = now
        sound.TimePosition = 0
        sound:Play()
    end

    local function pointerAvailable()
        return UserInputService.MouseEnabled
            and UserInputService:GetLastInputType() ~= Enum.UserInputType.Touch
    end

    local function refresh()
        if not alive then return end
        local state = button.GuiState
        local target = 1
        if button.Interactable then
            if state == Enum.GuiState.Press then
                target = pressScale
            elseif (state == Enum.GuiState.Hover and pointerAvailable() and options.hoverEnabled ~= false) or focused then
                target = hoverScale
            end
        end
        if state == Enum.GuiState.Hover and previousState ~= state and pointerAvailable() and options.hoverEnabled ~= false then
            playSound("hover")
        end
        previousState = state
        if currentTween then
            currentTween:Cancel()
            currentTween = nil
        end
        if shadowTween then shadowTween:Cancel() end
        if GuiService.ReducedMotionEnabled or options.animations == false then
            scale.Scale = 1
            if shadow then shadow.Position = shadowPosition end
            return
        end
        currentTween = TweenService:Create(scale,
            TweenInfo.new(duration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
            { Scale = target })
        currentTween:Play()
        if shadow then
            local offset = state == Enum.GuiState.Press and -2 or 0
            shadowTween = TweenService:Create(shadow, TweenInfo.new(duration),
                { Position = shadowPosition + UDim2.fromOffset(0, offset) })
            shadowTween:Play()
        end
    end

    connections[#connections + 1] = button
        :GetPropertyChangedSignal("GuiState"):Connect(refresh)
    connections[#connections + 1] = button
        :GetPropertyChangedSignal("Interactable"):Connect(refresh)
    connections[#connections + 1] = button.SelectionGained:Connect(function()
        focused = true
        refresh()
    end)
    connections[#connections + 1] = button.SelectionLost:Connect(function()
        focused = false
        refresh()
    end)
    connections[#connections + 1] = GuiService
        :GetPropertyChangedSignal("ReducedMotionEnabled"):Connect(refresh)
    connections[#connections + 1] = button.Activated:Connect(function()
        playSound("click")
    end)

    function controller:Destroy()
        if not alive then return end
        alive = false
        if currentTween then currentTween:Cancel() end
        if shadowTween then shadowTween:Cancel() end
        for _, connection in ipairs(connections) do connection:Disconnect() end
        for _, sound in pairs(sounds) do sound:Destroy() end
        bound[button] = nil
        scale:Destroy()
        pcall(function() button.AutoButtonColor = originalAutoColor end)
        if shadow then pcall(function() shadow.Position = shadowPosition end) end
    end
    connections[#connections + 1] = button.Destroying:Connect(function()
        controller:Destroy()
    end)
    refresh()
    return controller
end

return ButtonFeedback
