-- Persist only task identity and result data. Never persist credentials or source.
-- Dependencies are injected so lifecycle behavior can be exercised without Studio.
function createNexusTaskController(deps)
	local self = { record = deps.load(), watching = false, context = nil, bootstrapping = false }
	local function publish()
		deps.save(self.record)
		deps.render(self.record, self:busy())
	end
	function self:busy()
		return self.record ~= nil and self.record.terminal ~= true
	end
	function self:matches(record)
		local target = deps.target()
		return self.context ~= nil and record.projectId == self.context.projectId
			and tostring(record.placeId) == tostring(target.placeId)
			and tostring(record.universeId) == tostring(target.universeId)
			and tostring(record.targetGeneration) == tostring(target.targetGeneration)
			and record.sessionId == deps.sessionId()
	end
	function self:finish(record, status)
		record.terminal = true
		record.status = status
		record.interrupted = false
		record.cancelling = false
		record.approval = nil
		record.failed = record.failed or status == "Failed"
		publish()
		deps.activity(record)
	end
	function self:watch()
		local record = self.record
		if self.watching or not self:busy() or not record.runId then return end
		local earlyReceipts = record.earlyReceipts or {}
		record.earlyReceipts = nil
		for _, receipt in ipairs(earlyReceipts) do self:receipt({ runId = receipt.runId }, receipt.result) end
		self.watching = true
		deps.spawn(function()
			local failures = 0
			while self.record == record and not record.terminal and deps.token() do
				local ok, data = deps.events(deps.token(), record.runId, record.chatId, record.afterSeq or 0, record.afterCursor or "", 12000)
				if self.record ~= record then break end
				if not ok or type(data) ~= "table" then
					failures = failures + 1
					record.status = "Connection interrupted. Reconnect to check this task."
					record.interrupted = true
					publish()
					if failures >= 3 then break end
					deps.sleep(failures * 2)
				else
					failures = 0
					record.interrupted = false
					for _, event in ipairs(data.events or {}) do
						local value = type(event.data) == "table" and event.data or {}
						if event.type == "stage" or event.type == "heartbeat" then
							record.status = tostring(value.message or "Working…")
						elseif event.type == "tool_step" then
							record.status = tostring(value.label or value.type or "Working in Studio…")
							if value.requiresApproval == true then
								record.approval = { stepId = value.id, label = "Review: " .. record.status, kind = "run" }
							elseif record.approval and record.approval.stepId == value.id then record.approval = nil end
						elseif event.type == "done" then
							record.summary = tostring(value.content or "Task finished.")
							record.undoAvailable = record.undoAvailable or value.undoAvailable == true
						elseif event.type == "error" then
							record.summary = tostring(value.message or "Task failed.")
							record.failed = true
						end
					end
					-- Commit the cursor with the resulting state, after processing the batch.
					record.afterSeq = data.nextSeq or record.afterSeq
					record.afterCursor = data.nextCursor or record.afterCursor
					if data.terminal == true then
						local status = tostring(data.status or "")
						local stopped = status == "cancelled" or status == "canceled"
						local failed = status == "failed" or status == "blocked" or status == "timed_out" or status == "iteration_limit"
						self:finish(record, stopped and "Stopped" or ((failed or record.failed) and "Failed" or "Completed"))
						break
					end
					publish()
				end
			end
			self.watching = false
			if not record.terminal then record.interrupted = true; publish() end
		end)
	end
	function self:retry()
		local record = self.record
		if not record or record.terminal or record.requesting then return end
		if record.runId then self:watch(); return end
		if not deps.token() or not self:matches(record) then
			record.status = "Reconnect to the original project and place to resolve this task."
			record.interrupted = true
			publish()
			return
		end
		record.requesting = true
		record.status = "Starting task…"
		publish()
		deps.spawn(function()
			if not record.chatId then
				local ok, data = deps.create(deps.token(), "agent")
				if not ok or type(data) ~= "table" or type(data.conversation) ~= "table" then
					record.requesting = false
					record.interrupted = true
					record.status = "Could not prepare task. Retry to reconnect."
					publish()
					return
				end
				record.chatId = data.conversation.id
				publish()
			end
			-- Recheck after a yielding request; never redirect a task to another place.
			if not self:matches(record) or not deps.token() then
				record.requesting = false
				record.interrupted = true
				record.status = "Target changed before submission. Return to the original place."
				publish()
				return
			end
			local ok, data, status = deps.send(deps.token(), record.chatId, record.prompt, "agent", record.selection, record.requestId)
			record.requesting = false
			if not ok or type(data) ~= "table" then
				record.status = tostring(data or "Could not confirm submission.")
				-- Network/server errors may have accepted work. Keep its identity and lock.
				if status and status >= 400 and status < 500 and status ~= 408 and status ~= 429 then
					self:finish(record, record.status)
				else record.interrupted = true; publish() end
				return
			end
			record.runId = data.runId ~= "" and data.runId or nil
			record.status = record.runId and "Working…" or "Queued — checking task…"
			publish()
			if record.runId then self:watch() else self:resolveQueued() end
		end)
	end
	function self:resolveQueued()
		local record = self.record
		if not record or not record.chatId or record.runId then return end
		local ok, data = deps.messages(deps.token(), record.chatId, 40)
		if ok and type(data) == "table" then
			for _, message in ipairs(data.messages or {}) do
				if message.role == "assistant" and message.requestId == record.requestId then
					if message.runId and message.runId ~= "" then
						record.runId = message.runId
						publish()
						self:watch()
						return
					elseif message.terminal == true then
						record.summary = message.content or message.error or "Task finished without confirmed Studio changes."
						self:finish(record, message.state == "failed" and "Failed" or "Completed")
						return
					end
				end
			end
		end
		record.interrupted = true
		publish()
	end
	function self:submit(spec)
		if self:busy() then return false, "Wait for the current task to finish." end
		if not deps.token() or not self.context then return false, "Connect Studio before starting a task." end
		local target = deps.target()
		local captured = nil
		if spec.selection then
			captured = { items = {}, capturedAt = spec.selection.capturedAt, targetGeneration = spec.selection.targetGeneration }
			for _, item in ipairs(spec.selection.items or {}) do
				table.insert(captured.items, { name = item.name, path = item.path, className = item.className })
			end
		end
		self.record = {
			requestId = deps.guid(), title = spec.title, prompt = spec.prompt, tool = spec.tool,
			selection = captured, targetLabel = spec.targetLabel,
			projectId = self.context.projectId, placeId = target.placeId,
			universeId = target.universeId, targetGeneration = target.targetGeneration,
			sessionId = deps.sessionId(), verifiedPaths = {}, afterSeq = 0, afterCursor = "",
			terminal = false, status = "Starting…",
		}
		publish() -- identity must be durable before any network request
		self:retry()
		return true
	end
	function self:bootstrap()
		if self.bootstrapping or not deps.token() then return end
		self.bootstrapping = true
		local ok, data = deps.bootstrap(deps.token(), self.record and self.record.chatId or "")
		self.bootstrapping = false
		if not ok or type(data) ~= "table" then return end
		self.context = data.project
		deps.context(data)
		if self:busy() then
			if not self:matches(self.record) then
				self.record.status = "This task belongs to another project or place. Stop it or return to its original target."
				self.record.interrupted = true
				if self.record.runId and not self.record.cancelling then self:action("stop") end
			end
			if self.record.runId then self:watch()
			elseif self.record.chatId then self:resolveQueued() end
		end
		publish()
	end
	function self:action(action)
		local record = self.record
		if not record then return end
		if action == "retry" then self:retry(); return end
		if action == "another" and not self:busy() then deps.another(record); return end
		if not deps.token() then record.status = "Reconnect Studio to continue."; publish(); return end
		if action == "stop" and record.runId and self:busy() and not record.cancelling then
			record.cancelling = true
			record.status = "Stopping — waiting for confirmation…"
			publish()
			local ok, error = deps.cancel(deps.token(), record.runId, record.chatId)
			if not ok then record.cancelling = false; record.status = tostring(error); record.interrupted = true end
			publish()
			self:watch()
		elseif action == "undo" and record.undoAvailable and not self:busy() and not record.undoPending then
			if not self:matches(record) then record.status = "Return to the original project and place to undo."; publish(); return end
			record.undoId = record.undoId or deps.guid()
			record.undoPending = true
			publish()
			local ok, data = deps.undo(deps.token(), record.runId, record.chatId, record.undoId)
			record.undoPending = false
			if ok then
				record.undoAvailable = false
				record.status = "Undo queued — check Activity for restore confirmation."
			else record.status = tostring(data or "Undo could not be confirmed. Retry uses the same request.") end
			publish()
		elseif (action == "approve" or action == "decline") and record.approval and not record.deciding then
			if record.approval.kind == "local" then deps.localDecision(action == "approve"); return end
			if action == "approve" and not self:matches(record) then record.status = "Return to the original project and place before approving."; publish(); return end
			record.deciding = true
			publish()
			local ok, error = deps.approve(deps.token(), record.runId, record.chatId, record.approval.stepId, action)
			record.deciding = false
			if ok then record.approval = nil else record.status = tostring(error) end
			publish()
		end
	end
	function self:receipt(command, result)
		local record = self.record
		if not record or not command.runId then return end
		if result.ok == false or type(result.verification) ~= "table" or result.verification.verified ~= true
			or result.verification.source ~= "studio_readback" then return end
		-- Polling may execute a command before the submission HTTP response arrives.
		-- Buffer only compact, verified receipts; bind them once the run ID is known.
		if not record.runId and self:busy() then
			record.earlyReceipts = record.earlyReceipts or {}
			if #record.earlyReceipts < 25 then
				table.insert(record.earlyReceipts, { runId = command.runId, result = {
					ok = true, affectedPaths = result.affectedPaths, snapshotIds = result.snapshotIds,
					verification = { verified = true, source = "studio_readback" },
				} })
				publish()
			end
			return
		end
		if tostring(command.runId) ~= tostring(record.runId) then return end
		local known = {}
		for _, path in ipairs(record.verifiedPaths or {}) do known[path] = true end
		for _, path in ipairs(result.affectedPaths or {}) do
			if not known[path] then table.insert(record.verifiedPaths, path); known[path] = true end
		end
		record.undoAvailable = record.undoAvailable or #(result.snapshotIds or {}) > 0
		publish()
	end
	function self:localApproval(label)
		if not self.record then self.record = { title = "Incoming Studio change", terminal = true, verifiedPaths = {} } end
		self.record.approval = label and { kind = "local", label = label } or nil
		publish()
	end
	if self.record then
		self.record.verifiedPaths = self.record.verifiedPaths or {}
		self.record.requesting = false
		self.record.deciding = false
		self.record.undoPending = false
		-- Local approval callbacks belong to the current plugin process only.
		if self.record.approval and self.record.approval.kind == "local" then self.record.approval = nil end
	end
	return self
end
