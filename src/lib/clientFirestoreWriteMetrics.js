const chatWritesByJob = new Map();
let totalChatWrites = 0;

function emit(payload) {
  if (process.env.NODE_ENV === "test" && process.env.REACT_APP_LOG_FIRESTORE_WRITE_METRICS !== "true") return;
  console.info(JSON.stringify({
    type: "firestore_write_metric",
    source: "frontend",
    ts: Date.now(),
    ...payload,
  }));
}

export function recordChatMessageWrite({ jobId, reason, count = 1 } = {}) {
  const safeCount = Math.max(0, Number(count) || 0);
  totalChatWrites += safeCount;
  const generationTotal = Number(chatWritesByJob.get(jobId) || 0) + safeCount;
  if (jobId) chatWritesByJob.set(jobId, generationTotal);
  emit({
    counter: "chat_message",
    count: safeCount,
    total: totalChatWrites,
    generationTotal: jobId ? generationTotal : undefined,
    jobId,
    reason,
  });
  return generationTotal;
}

export function associateChatMessageWrites({ jobId, reason, count = 1 } = {}) {
  if (!jobId) return 0;
  const safeCount = Math.max(0, Number(count) || 0);
  const generationTotal = Number(chatWritesByJob.get(jobId) || 0) + safeCount;
  chatWritesByJob.set(jobId, generationTotal);
  emit({
    counter: "chat_message_association",
    count: safeCount,
    total: totalChatWrites,
    generationTotal,
    jobId,
    reason,
  });
  return generationTotal;
}

export function finishChatWriteMetrics(jobId, status) {
  const chatMessageWrites = Number(chatWritesByJob.get(jobId) || 0);
  emit({
    counter: "writes_per_generation_job",
    jobId,
    status,
    total: chatMessageWrites,
    counts: { chat_message: chatMessageWrites },
  });
  chatWritesByJob.delete(jobId);
  return chatMessageWrites;
}

export function resetClientFirestoreWriteMetricsForTests() {
  chatWritesByJob.clear();
  totalChatWrites = 0;
}
