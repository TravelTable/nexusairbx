local function copy(value)
	if type(value) ~= "table" then return value end
	local out = {}
	for key, item in pairs(value) do out[key] = copy(item) end
	return out
end

local function harness(saved)
	local h = { queue = {}, creates = 0, sends = {}, events = {}, undos = {}, cancellations = {}, saved = copy(saved), project = "project", place = "place", generation = 1 }
	local guid = 0
	local deps = {
		load = function() return copy(saved) end,
		save = function(record) h.saved = copy(record) end,
		render = function(record, busy) h.rendered = copy(record); h.busy = busy end,
		token = function() return "token" end,
		sessionId = function() return "session" end,
		target = function() return { placeId = h.place, universeId = "universe", targetGeneration = h.generation } end,
		guid = function() guid = guid + 1; return "request-" .. tostring(guid) end,
		spawn = function(fn) table.insert(h.queue, fn) end,
		sleep = function() end,
		bootstrap = function() return true, { project = { projectId = h.project } } end,
		context = function() end,
		create = function()
			h.creates = h.creates + 1
			if h.onCreate then h.onCreate() end
			return true, { conversation = { id = "conversation-" .. tostring(h.creates) } }
		end,
		send = function(token, chatId, prompt, mode, selection, requestId)
			assert(h.saved.requestId == requestId and h.saved.chatId == chatId, "persist identity before submission")
			table.insert(h.sends, { chatId = chatId, requestId = requestId, selection = copy(selection) })
			if h.onSend then h.onSend() end
			if h.sendFailure then return false, "Network unavailable", 0 end
			return true, { runId = h.queued and "" or ("run-" .. tostring(h.creates)) }
		end,
		events = function(token, runId, chatId, seq, cursor)
			table.insert(h.events, { runId = runId, chatId = chatId, seq = seq, cursor = cursor })
			if h.eventReply then return h.eventReply() end
			return false, "offline"
		end,
		messages = function()
			return true, { messages = h.messages or {} }
		end,
		cancel = function(token, runId, chatId)
			table.insert(h.cancellations, { runId = runId, chatId = chatId })
			return true, {}
		end,
		undo = function(token, runId, chatId, requestId)
			table.insert(h.undos, { runId = runId, chatId = chatId, requestId = requestId })
			return not h.undoFailure, "undo response"
		end,
		approve = function() return true, {} end,
		activity = function(record) h.finished = copy(record) end,
		another = function() end,
		localDecision = function() end,
	}
	h.controller = createNexusTaskController(deps)
	h.controller:bootstrap()
	function h:drain()
		local count = 0
		while #self.queue > 0 do
			count = count + 1
			assert(count < 30, "unbounded background tasks")
			table.remove(self.queue, 1)()
		end
	end
	function h:done(status)
		self.eventReply = function() return true, { terminal = true, status = status or "completed", events = { { type = "done", data = { content = "Generated result" } } }, nextSeq = 8, nextCursor = "8-0" } end
	end
	return h
end

local spec = { title = "Improve selection", tool = "improve", prompt = "Improve this", targetLabel = "Workspace/Part", selection = { items = { { name = "Part", className = "Part", path = "Workspace/Part" } }, targetGeneration = 1 } }

-- Independent actions receive independent conversations; submission is locked immediately.
do
	local h = harness()
	h:done()
	assert(h.controller:submit(spec))
	assert(not h.controller:submit(spec), "double click must not start another task")
	h:drain()
	assert(not h.controller:busy())
	assert(#h.controller.record.verifiedPaths == 0, "generated content is not a Studio receipt")
	assert(h.controller:submit(spec)); h:drain()
	assert(h.creates == 2 and h.sends[1].chatId ~= h.sends[2].chatId)
end

-- Unknown submission outcome retains request identity and a copy of the captured selection.
do
	local h = harness(); h.sendFailure = true
	local selectionSpec = copy(spec)
	h.controller:submit(selectionSpec)
	selectionSpec.selection.items[1].path = "Workspace/Different"
	h:drain()
	assert(h.controller:busy() and h.controller.record.interrupted)
	h.sendFailure = false; h:done(); h.controller:retry(); h:drain()
	assert(h.creates == 1 and #h.sends == 2)
	assert(h.sends[1].requestId == h.sends[2].requestId)
	assert(h.sends[2].selection.items[1].path == "Workspace/Part")
end

-- Reload resumes the original run/cursor without creating or submitting anything.
do
	local h = harness(); h.controller:submit(spec); h:drain()
	h.saved.afterSeq = 7; h.saved.afterCursor = "7-0"
	local restored = harness(h.saved); restored:done(); restored:drain()
	assert(restored.creates == 0 and #restored.sends == 0)
	assert(restored.events[1].seq == 7 and restored.events[1].cursor == "7-0")
	assert(restored.events[1].runId == h.saved.runId)
end

-- Stop keeps the run locked until the server confirms its terminal state.
do
	local h = harness(); h.controller:submit(spec); h:drain()
	h.controller:action("stop")
	assert(h.controller:busy(), "cancellation request is not completion")
	h:done("cancelled"); h:drain()
	assert(not h.controller:busy() and h.controller.record.status == "Stopped")
	assert(h.cancellations[1].runId == "run-1")
end

-- Terminal server failures override a misleading/nonterminal event in the final batch.
do
	local h = harness(); h:done("failed"); h.controller:submit(spec); h:drain()
	assert(h.controller.record.status == "Failed")
end

-- Verified path receipts must belong to the task and pass actual Studio readback.
do
	local h = harness(); h.controller:submit(spec); h:drain()
	local receipt = { ok = true, affectedPaths = { "Workspace/Part" }, snapshotIds = { "snap" }, verification = { verified = true, source = "studio_readback" } }
	h.controller:receipt({ runId = "other" }, receipt)
	assert(#h.controller.record.verifiedPaths == 0)
	local bad = copy(receipt); bad.verification.verified = false
	h.controller:receipt({ runId = "run-1" }, bad)
	assert(#h.controller.record.verifiedPaths == 0)
	h.controller:receipt({ runId = "run-1" }, receipt)
	h.controller:receipt({ runId = "run-1" }, receipt)
	assert(#h.controller.record.verifiedPaths == 1 and h.controller.record.undoAvailable)
	h:done(); h.controller:retry(); h:drain()
	h.undoFailure = true; h.controller:action("undo")
	h.undoFailure = false; h.controller:action("undo")
	assert(h.undos[1].requestId == h.undos[2].requestId and h.undos[2].chatId == "conversation-1")
end

-- A target change during conversation creation cannot submit to the new place.
do
	local h = harness(); h.onCreate = function() h.place = "another-place" end
	h.controller:submit(spec); h:drain()
	assert(#h.sends == 0 and h.controller:busy())
end

-- Changing project cancels the old run using its original identifiers.
do
	local h = harness(); h.controller:submit(spec); h:drain()
	h.project = "another-project"; h.controller:bootstrap()
	assert(h.cancellations[1].runId == "run-1" and h.cancellations[1].chatId == "conversation-1")
	h:done("cancelled"); h:drain()
end

-- Queued responses can finish through their request-bound message projection.
do
	local h = harness(); h.queued = true
	h.controller:submit(spec)
	h.messages = { { role = "assistant", requestId = h.controller.record.requestId, terminal = true, state = "completed", content = "Generated only" } }
	h:drain()
	assert(not h.controller:busy() and h.controller.record.summary == "Generated only")
end

-- A fast Studio command may acknowledge before its start response reaches the UI.
do
	local h = harness()
	h.onSend = function()
		h.controller:receipt({ runId = "run-1" }, { ok = true, affectedPaths = { "Workspace/Fast" }, verification = { verified = true, source = "studio_readback" } })
	end
	h:done(); h.controller:submit(spec); h:drain()
	assert(h.controller.record.verifiedPaths[1] == "Workspace/Fast")
end

print("toolbox lifecycle: all scenarios passed")
