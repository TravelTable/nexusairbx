const MUTATIONS = new Set(['write_script', 'patch_script', 'create_script', 'create_instance', 'update_properties', 'update_attributes', 'update_tags', 'batch_operations', 'apply_artifact', 'insert_model', 'duplicate_instance']);
const TERMINAL = new Set(['completed', 'succeeded', 'applied']);

// Only acknowledged Studio writes qualify. Generated files, text and inspection do not.
export function guidedBuildEvidence(messages = [], run = null) {
  const candidates = [...messages].reverse().filter(m => m.role === 'assistant' && m.stage !== 'plan');
  const latest = candidates[0];
  const source = run?.status === 'applied' && latest?.runId && latest.runId === run.runId ? run : latest;
  if (!source) return { applied: false, taskId: '' };
  const terminal = TERMINAL.has(source.runState || source.metadata?.runState || source.status || source.stage);
  const steps = source.steps || [];
  const failed = steps.some(s => ['failed', 'blocked', 'cancelled', 'running', 'queued', 'delivered', 'awaiting_approval'].includes(s.status) || s.result?.ok === false);
  const mutation = steps.some(s => MUTATIONS.has(s.type) && s.status === 'succeeded' && s.result?.ok !== false);
  return {
    applied: terminal && !failed && (mutation || source.status === 'applied'),
    taskId: source.taskId || '',
    evidenceId: source.id || source.runId || '',
    sessionId: steps.find(s => MUTATIONS.has(s.type) && s.status === 'succeeded')?.executionSessionId || source.studioSessionId || '',
  };
}

export function milestoneTestInstructions(plan) {
  const text = String(plan?.planMarkdown || plan?.content || '');
  const match = text.match(/(?:^|\n)#{1,6}\s*[^\n]*(?:playtest|test plan|how to test|verification)[^\n]*\n([\s\S]*?)(?=\n#{1,6}\s|$)/i);
  return match ? match[1].replace(/[*`]/g, '').trim().slice(0, 1600) : '';
}
