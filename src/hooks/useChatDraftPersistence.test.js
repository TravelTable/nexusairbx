import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import useChatDraftPersistence from './useChatDraftPersistence';
function useHarness({ chatId = 'chat-1' } = {}) {
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState([]);
  useChatDraftPersistence({ uid: 'alice', chatId, prompt, attachments, setPrompt, setAttachments });
  return { prompt, setPrompt, attachments, setAttachments };
}
beforeEach(() => localStorage.clear());
test('refresh restores draft and exact ready versions, excluding upload bytes', () => {
  const first = renderHook(useHarness);
  act(() => { first.result.current.setPrompt('Inspect this'); first.result.current.setAttachments([{ id: 'file', versionId: 'v1', contentHash: 'hash', status: 'ready', retryFile: new File(['private'], 'ref.txt') }, { localId: 'pending', status: 'uploading' }]); });
  first.unmount();
  const next = renderHook(useHarness);
  expect(next.result.current.prompt).toBe('Inspect this');
  expect(next.result.current.attachments).toEqual([{ id: 'file', versionId: 'v1', contentHash: 'hash', status: 'ready' }]);
});
test('switching chats isolates drafts without overwriting the destination', () => {
  localStorage.setItem('nexus:chat-draft:v2:alice:chat-2', JSON.stringify({ prompt: 'Second draft', attachments: [] }));
  const { result, rerender } = renderHook(useHarness, { initialProps: { chatId: 'chat-1' } });
  act(() => result.current.setPrompt('First draft'));
  rerender({ chatId: 'chat-2' });
  expect(result.current.prompt).toBe('Second draft');
  rerender({ chatId: 'chat-1' });
  expect(result.current.prompt).toBe('First draft');
});
