import { useState } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import useChatAttachmentUpload from './useChatAttachmentUpload';
import { uploadChatAttachment } from '../lib/chatAttachmentApi';
jest.mock('../lib/chatAttachmentApi', () => ({ ...jest.requireActual('../lib/chatAttachmentApi'), uploadChatAttachment: jest.fn() }));
jest.mock('../lib/billing', () => ({ authedFetch: jest.fn() }));
const user = { uid: 'alice' };
function useHarness() {
  const [attachments, setAttachments] = useState([]);
  return { attachments, setAttachments, ...useChatAttachmentUpload({ attachments, setAttachments, user, enabled: true }) };
}
beforeEach(() => { jest.clearAllMocks(); Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'local-1' } }); });
test('an image becomes a ready reference without a Roblox connection', async () => {
  uploadChatAttachment.mockResolvedValue({ id: 'owned', versionId: 'immutable', kind: 'image', status: 'ready' });
  const { result } = renderHook(useHarness);
  await act(async () => { await result.current.upload({ target: { files: [new File(['image'], 'ref.png')] } }); });
  expect(result.current.attachments[0]).toMatchObject({ id: 'owned', versionId: 'immutable', status: 'ready' });
  expect(uploadChatAttachment).toHaveBeenCalledTimes(1);
});
test('retry repeats only the failed upload', async () => {
  uploadChatAttachment.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce({ id: 'owned', versionId: 'v1', status: 'ready' });
  const { result } = renderHook(useHarness);
  await act(async () => { await result.current.upload({ target: { files: [new File(['source'], 'main.lua')] } }); });
  expect(result.current.attachments[0].status).toBe('failed');
  await act(async () => { await result.current.retry(result.current.attachments[0]); });
  expect(result.current.attachments[0].status).toBe('ready');
  expect(uploadChatAttachment).toHaveBeenCalledTimes(2);
});
test('removing an in-flight upload cancels it and late results cannot reattach it', async () => {
  let finish, signal;
  uploadChatAttachment.mockImplementation((_file, selectedSignal) => { signal = selectedSignal; return new Promise(resolve => { finish = resolve; }); });
  const { result } = renderHook(useHarness);
  let pending;
  act(() => { pending = result.current.upload({ target: { files: [new File(['source'], 'main.lua')] } }); });
  await waitFor(() => expect(signal).toBeDefined());
  act(() => result.current.setAttachments([]));
  expect(signal.aborted).toBe(true);
  await act(async () => { finish({ id: 'owned', versionId: 'v1', status: 'ready' }); await pending; });
  expect(result.current.attachments).toEqual([]);
});
