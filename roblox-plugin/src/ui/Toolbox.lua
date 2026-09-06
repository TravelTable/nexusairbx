-- Native, selection-aware entry points. All actions are explicit button clicks.
function createNexusToolbox(parent, ui)
	local view = { root = parent, buttons = {} }
	ui.text(parent, "ToolsTitle", "Studio tools", 22, 16, true)
	view.context = ui.text(parent, "PlaceContext", tostring(game.Name), nil, 11)
	view.selection = ui.text(parent, "SelectionContext", "Select an object in Studio to inspect, fix, or improve it.", nil, 12)
	for _, tool in ipairs({
		{ "inspect", "Inspect selection" },
		{ "fix", "Fix selection" },
		{ "improve", "Improve selection" },
		{ "create", "Create script" },
	}) do
		local button = ui.button(parent, tool[1], tool[2])
		view.buttons[tool[1]] = button
		button.MouseButton1Click:Connect(function()
			if button:GetAttribute("NexusEnabled") == true and view.onChoose then view.onChoose(tool[1]) end
		end)
	end
	function view:update(selection, busy)
		local items = selection and selection.items or {}
		local lines = {}
		for _, item in ipairs(items) do table.insert(lines, item.className .. " · " .. item.path) end
		self.selection.Text = #lines > 0 and table.concat(lines, "\n") or "Select an object in Studio to inspect, fix, or improve it."
		if selection and selection.truncated then self.selection.Text = self.selection.Text .. "\nShowing the first 5 objects. Select up to 5 for one task." end
		for name, button in pairs(self.buttons) do
			ui.enable(button, not busy and (name == "create" or #items > 0))
		end
	end
	return view
end
