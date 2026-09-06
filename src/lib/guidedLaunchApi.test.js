import { guidedLaunchSource, consumeGuidedLaunchSource } from './guidedLaunchApi';
import { readPendingAuthAction, completePendingAuthAction } from './pendingAuthAction';
import { restoreGenerationIntent, consumeGenerationIntent } from './generationIntent';
jest.mock('./billing', () => ({ authedFetch: jest.fn() }));
jest.mock('./pendingAuthAction', () => ({ readPendingAuthAction: jest.fn(), completePendingAuthAction: jest.fn() }));
jest.mock('./generationIntent', () => ({ restoreGenerationIntent: jest.fn(), consumeGenerationIntent: jest.fn() }));
beforeEach(() => jest.resetAllMocks());
test('captures a pre-signup prompt and consumes it only after durable chat creation', () => {
  readPendingAuthAction.mockReturnValue({ id: 'pending-1', action: 'chat_submit', payload: { prompt: 'My café' } });
  restoreGenerationIntent.mockReturnValue({ id: 'intent-1', prompt: 'My café' });
  const source = guidedLaunchSource();
  expect(source).toEqual({ idea: 'My café', pendingActionId: 'pending-1', generationIntentId: 'intent-1' });
  consumeGuidedLaunchSource(source);
  expect(completePendingAuthAction).not.toHaveBeenCalled();
  consumeGuidedLaunchSource({ ...source, chatId: 'chat-1' });
  expect(completePendingAuthAction).toHaveBeenCalledWith('pending-1', { resumedOutcome: 'guided_launch' });
  expect(consumeGenerationIntent).toHaveBeenCalledWith('intent-1');
});
test('keeps unrelated gated actions and different generation intents intact', () => {
  readPendingAuthAction.mockReturnValue({ id: 'pending-2', action: 'export_project', payload: { prompt: 'Existing project' } });
  expect(guidedLaunchSource().pendingActionId).toBe('');
  readPendingAuthAction.mockReturnValue({ id: 'pending-3', action: 'chat_submit', payload: { prompt: 'Another idea' } });
  restoreGenerationIntent.mockReturnValue({ id: 'intent-2', prompt: 'Different work' });
  expect(guidedLaunchSource().generationIntentId).toBe('');
});
