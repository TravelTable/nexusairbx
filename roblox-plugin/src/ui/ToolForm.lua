function createNexusToolForm(parent, ui)
	local view = { root = parent, tool = "fix", className = "Script", destination = nil }
	view.title = ui.text(parent, "ToolTitle", "Fix selection", 22, 15, true)
	view.target = ui.text(parent, "ToolTarget", "", nil, 11)
	local function input(name, placeholder, height)
		local box = Instance.new("TextBox")
		box.Name = name
		box.Size = UDim2.new(1, 0, 0, height)
		box.BackgroundColor3 = ui.colors.canvas
		box.TextColor3 = ui.colors.text
		box.PlaceholderColor3 = ui.colors.textMuted
		box.Font = Enum.Font.Gotham
		box.TextSize = 13
		box.Text = ""
		box.PlaceholderText = placeholder
		box.ClearTextOnFocus = false
		box.MultiLine = height > 40
		box.TextWrapped = true
		box.TextXAlignment = Enum.TextXAlignment.Left
		box.TextYAlignment = Enum.TextYAlignment.Top
		box.BorderSizePixel = 0
		box.Parent = parent
		ui.corner(box, 6)
		local padding = Instance.new("UIPadding")
		padding.PaddingLeft = UDim.new(0, 8)
		padding.PaddingRight = UDim.new(0, 8)
		padding.PaddingTop = UDim.new(0, 8)
		padding.Parent = box
		return box
	end
	view.name = input("ScriptName", "Script name", 36)
	view.classButton = ui.button(parent, "ScriptClass", "Type: Script · click to change")
	view.destinationButton = ui.button(parent, "ScriptDestination", "Use selected destination")
	view.description = input("TaskDescription", "Describe the problem to fix…", 108)
	view.error = ui.text(parent, "FormError", "", nil, 12, false, ui.colors.error)
	view.submit = ui.button(parent, "RunTool", "Fix selection", ui.colors.primary)
	view.back = ui.button(parent, "BackToTools", "Back to tools")
	view.classButton.MouseButton1Click:Connect(function()
		local nextClass = { Script = "LocalScript", LocalScript = "ModuleScript", ModuleScript = "Script" }
		view.className = nextClass[view.className]
		view.classButton.Text = "Type: " .. view.className .. " · click to change"
	end)
	view.destinationButton.MouseButton1Click:Connect(function()
		if view.onDestination then view.onDestination() end
	end)
	view.submit.MouseButton1Click:Connect(function()
		if view.submit:GetAttribute("NexusEnabled") == true and view.onSubmit then view.onSubmit() end
	end)
	view.back.MouseButton1Click:Connect(function() if view.onBack then view.onBack() end end)
	function view:open(tool, target)
		self.tool = tool
		self.error.Text = ""
		self.title.Text = ({ fix = "Fix selection", improve = "Improve selection", create = "Create script" })[tool]
		self.submit.Text = self.title.Text
		self.target.Text = target or ""
		self.name.Visible = tool == "create"
		self.classButton.Visible = tool == "create"
		self.destinationButton.Visible = tool == "create"
		self.description.PlaceholderText = tool == "fix" and "Describe the problem to fix…" or (tool == "improve" and "Describe the improvement…" or "Describe what the script should do…")
	end
	return view
end
