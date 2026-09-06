-- One result per task; generated text never serves as proof of Studio writes.
function createNexusTaskResult(parent, ui)
	local view = { root = parent }
	view.title = ui.text(parent, "ResultTitle", "Task result", 22, 15, true)
	view.target = ui.text(parent, "CapturedTarget", "", nil, 11)
	view.status = ui.text(parent, "TaskStatus", "Starting…", nil, 12, true)
	view.summary = ui.text(parent, "TaskSummary", "", nil, 13)
	view.paths = ui.text(parent, "VerifiedChanges", "No Studio changes confirmed yet.", nil, 12)
	view.approval = ui.text(parent, "TaskApproval", "", nil, 12)
	view.approve = ui.button(parent, "ApproveTask", "Apply", ui.colors.primary)
	view.decline = ui.button(parent, "DeclineTask", "Decline")
	view.stop = ui.button(parent, "StopTask", "Stop")
	view.retry = ui.button(parent, "ResumeTask", "Reconnect / retry request")
	view.undo = ui.button(parent, "UndoTask", "Undo changes")
	view.another = ui.button(parent, "RunAnother", "Run another")
	for _, key in ipairs({ "approve", "decline", "stop", "retry", "undo", "another" }) do
		view[key].MouseButton1Click:Connect(function()
			if view[key]:GetAttribute("NexusEnabled") == true and view.onAction then view.onAction(key) end
		end)
	end
	function view:render(record, busy)
		self.title.Text = record.title or "Task result"
		self.target.Text = record.targetLabel or ""
		self.status.Text = record.status or "Starting…"
		self.summary.Text = record.summary or ""
		self.paths.Visible = record.localRead ~= true
		local paths = record.verifiedPaths or {}
		self.paths.Text = #paths > 0 and ("Verified Studio changes:\n" .. table.concat(paths, "\n")) or "No Studio changes confirmed. Generated output alone does not mean it was applied."
		self.stop.Visible = busy and record.runId ~= nil
		self.retry.Visible = record.interrupted == true or (busy and record.runId == nil)
		self.undo.Visible = record.undoAvailable == true and not busy and record.approval == nil
		self.another.Visible = not busy and record.approval == nil
		ui.enable(self.stop, not record.cancelling)
		ui.enable(self.retry, not record.requesting)
		ui.enable(self.undo, not record.undoPending)
		self.approval.Visible = record.approval ~= nil
		self.approval.Text = record.approval and record.approval.label or ""
		self.approve.Visible = record.approval ~= nil
		self.decline.Visible = record.approval ~= nil
		ui.enable(self.approve, not record.deciding)
		ui.enable(self.decline, not record.deciding)
	end
	return view
end
