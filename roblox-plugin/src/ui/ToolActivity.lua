-- Human-facing projection of internal tool activity.

function friendlyStudioActivity(commandType, label, status)
	local kind = string.lower(tostring(commandType or ""))
	local state = string.lower(tostring(status or "working"))
	if state == "succeeded" or state == "completed" then
		return "Done", "completed"
	elseif state == "failed" then
		return "That Studio step could not be completed", "failed"
	elseif string.find(kind, "manifest") or string.find(kind, "inspect") or string.find(kind, "search") or string.find(kind, "read") then
		return "Inspecting the game", "working"
	elseif string.find(kind, "verify") or string.find(kind, "validate") or string.find(kind, "smoke") or string.find(kind, "parse") then
		return "Verifying changes", "working"
	elseif string.find(kind, "restore") or string.find(kind, "undo") then
		return "Restoring the previous version", "working"
	elseif string.find(kind, "delete") then
		return "Updating the game structure", "working"
	elseif string.find(kind, "write") or string.find(kind, "patch") or string.find(kind, "create")
		or string.find(kind, "apply") or string.find(kind, "update") or string.find(kind, "move") then
		return "Applying Studio changes", "working"
	end
	local cleanLabel = tostring(label or "")
	if cleanLabel ~= "" and cleanLabel ~= commandType then
		return cleanLabel, "working"
	end
	return "Working in Studio", "working"
end
