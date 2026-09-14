import { getWorkspacePresentation, getUiWorkspacePresentation, getRunPresentation } from './runPresentation';

test.each([['building', 'generating'], ['blocked_studio', 'waiting_studio'], ['validating', 'verifying']])('normalizes %s using the product lifecycle', (input, state) => {
  expect(getWorkspacePresentation({ state: input }).state).toBe(state);
});
test.each(['queued', 'waiting_user', 'waiting_studio', 'waiting_external', 'paused', 'reconnecting', 'cancelled', 'failed', 'timed_out', 'complete'])('stops all active signals in %s', state => {
  expect(getWorkspacePresentation({ state })).toMatchObject({ active: false, showPulse: false, showComposerFlow: false, showAmbientGlow: false });
});
test('keeps the canonical terminal result through a lost connection', () => {
  expect(getRunPresentation({ taskId: 't', status: 'done', connectionState: 'disconnected', completion: { canComplete: true } })).toMatchObject({ state: 'complete', tone: 'success', terminal: true });
});
test('does not manufacture verification or inherit another chat run', () => {
  expect(getWorkspacePresentation({ run: { taskId: 't', status: 'succeeded' } })).toMatchObject({ state: 'unverified_complete', tone: 'waiting', terminal: true });
  expect(getWorkspacePresentation({ run: { taskId: 't', chatId: 'other', status: 'running' }, scope: { chatId: 'current' } }).state).toBe('idle');
});
test('signals actual streaming without a persisted run and stops during cancellation', () => {
  expect(getWorkspacePresentation({ busy: true, stage: 'Writing Roblox UI files' })).toMatchObject({ state: 'generating', active: true });
  expect(getWorkspacePresentation({ state: 'generating', operationState: { active: { status: 'Stopping' } } })).toMatchObject({ active: false, label: 'Stopping work' });
});
test.each(['awaiting_studio', 'awaiting_capture', 'awaiting_renders'])('UI %s is quiet even with a writing action', stage => {
  expect(getUiWorkspacePresentation({ task: { status: 'running', uiBuild: { stage, action: 'writing_ui' } } }).active).toBe(false);
});
test('UI saved/visual review labels stay distinct from full verification and cancellation', () => {
  expect(getUiWorkspacePresentation({ task: { status: 'succeeded', uiBuild: { stage: 'complete', action: 'writing_ui' } } })).toMatchObject({ state: 'unverified_complete', active: false, label: 'Visually reviewed' });
  expect(getUiWorkspacePresentation({ task: { status: 'cancelled', uiBuild: { stage: 'generating' } } })).toMatchObject({ state: 'cancelled', active: false });
  expect(getUiWorkspacePresentation({ busy: 'Starting build', task: { status: 'succeeded', uiBuild: { stage: 'complete' } } })).toMatchObject({ state: 'sending', active: true });
  expect(getUiWorkspacePresentation({ busy: 'Loading' }).active).toBe(false);
});

test('UI loading chain marks pipeline steps complete, active, or pending from the shared walk', () => {
  const { getUiLoadingChainSteps, UI_LOADING_PIPELINE } = require('./runPresentation');
  const mid = getUiLoadingChainSteps({
    busy: '',
    task: { status: 'running', uiBuild: { stage: 'generating', action: 'writing_ui' } },
  });
  expect(mid).toHaveLength(UI_LOADING_PIPELINE.length);
  const activeIndex = mid.findIndex((step) => step.status === 'active');
  expect(mid[activeIndex].label).toBe('Writing your UI');
  expect(mid.slice(0, activeIndex).every((step) => step.status === 'complete')).toBe(true);
  expect(mid.slice(activeIndex + 1).every((step) => step.status === 'pending')).toBe(true);

  const done = getUiLoadingChainSteps({
    busy: '',
    task: { status: 'succeeded', uiBuild: { stage: 'complete', outcome: 'visual_review_passed' } },
  });
  expect(done.every((step) => step.status === 'complete')).toBe(true);
});
