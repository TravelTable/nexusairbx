import { guidedBuildEvidence, milestoneTestInstructions } from './guidedLaunchEvidence';
const message = (steps, extra = {}) => ({ id: 'result-1', role: 'assistant', stage: 'completed', steps, ...extra });
test('generated text, inspection and failed or unfinished writes never count as applied', () => {
  expect(guidedBuildEvidence([message([])]) .applied).toBe(false);
  for (const step of [{ type: 'read_script', status: 'succeeded' }, { type: 'write_script', status: 'queued' }, { type: 'write_script', status: 'failed' }, { type: 'write_script', status: 'succeeded', result: { ok: false } }]) {
    expect(guidedBuildEvidence([message([step])]).applied).toBe(false);
  }
});
test('only terminal acknowledged Studio mutations qualify', () => {
  const write = { type: 'write_script', status: 'succeeded', result: { ok: true } };
  expect(guidedBuildEvidence([message([write])]).applied).toBe(true);
  expect(guidedBuildEvidence([message([write], { stage: 'running' })]).applied).toBe(false);
  expect(guidedBuildEvidence([message([write, { type: 'patch_script', status: 'failed' }])]).applied).toBe(false);
  expect(guidedBuildEvidence([message([write]), message([{ ...write, status: 'failed' }], { id: 'repair' })]).applied).toBe(false);
  expect(guidedBuildEvidence([message([write]), message([], { id: 'repair', stage: 'failed' })]).applied).toBe(false);
  expect(guidedBuildEvidence([message([write], { metadata: { runState: 'failed' } })]).applied).toBe(false);
});
test('uses the milestone-specific playtest instructions from the plan', () => {
  expect(milestoneTestInstructions({ planMarkdown: '# First coin\n## Playtest\nTouch the coin. Your score should increase by one.\n## Later\nMore levels.' })).toBe('Touch the coin. Your score should increase by one.');
});
