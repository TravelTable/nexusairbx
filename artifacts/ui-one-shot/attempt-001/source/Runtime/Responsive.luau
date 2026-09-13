local Responsive = {}
function Responsive.bind(root)
    local cameraConnection
    local connections = {}
    local function update()
        local camera = workspace.CurrentCamera
        if not camera then return end
        local size = camera.ViewportSize
        local mobile = math.min(size.X, size.Y) < 600
        for _, node in root:GetDescendants() do
            if node:IsA("GuiObject") then
                if node.Name == "_NexusDesktop" then node.Visible = not mobile end
                if node.Name == "_NexusMobile" then node.Visible = mobile end
            end
        end
    end
    local function observeCamera()
        if cameraConnection then cameraConnection:Disconnect() end
        local camera = workspace.CurrentCamera
        if camera then cameraConnection = camera:GetPropertyChangedSignal("ViewportSize"):Connect(update) end
        update()
    end
    table.insert(connections, workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(observeCamera))
    local function cleanup()
        if cameraConnection then cameraConnection:Disconnect() end
        for _, connection in connections do connection:Disconnect() end
        table.clear(connections)
    end
    table.insert(connections, root.Destroying:Connect(cleanup))
    observeCamera()
    return cleanup
end
return Responsive