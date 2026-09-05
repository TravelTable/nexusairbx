import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AttachmentCard from './AttachmentCard';
import { readChatAttachment, deleteChatAttachment, getChatAttachmentImport } from '../../../lib/chatAttachmentApi';
jest.mock('../../../lib/chatAttachmentApi', () => ({ readChatAttachment: jest.fn(), deleteChatAttachment: jest.fn(), getChatAttachmentImport: jest.fn(), downloadChatAttachment: jest.fn() }));
const model = { id: 'owned', versionId: 'v1', contentHash: 'hash', name: 'Inventory.rbxm', kind: 'model', status: 'ready', summary: '2 objects · 1 script' };
beforeEach(() => { jest.clearAllMocks(); getChatAttachmentImport.mockResolvedValue(null); });
test('model hierarchy and script previews are loaded selectively without Studio', async () => {
  readChatAttachment.mockImplementation((_file, query) => query?.instanceId
    ? Promise.resolve(query.instanceId === 'root.0' ? { id: 'root.0', name: 'Inventory', className: 'Folder', properties: {} } : { id: query.instanceId, parentId: 'root.0', className: 'Script', name: 'Code', properties: {}, source: 'print("hello")' })
    : Promise.resolve({ instances: [{ id: 'root.0', name: 'Inventory', className: 'Folder' }, { id: 'root.0.0', parentId: 'root.0', name: 'Code', className: 'Script' }] }));
  render(<AttachmentCard file={model} onRemove={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: model.name }));
  expect(await screen.findByText('Inventory')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Inventory'));
  fireEvent.click(screen.getByText('Code'));
  expect(await screen.findByText('print("hello")')).toBeInTheDocument();
  expect(readChatAttachment).toHaveBeenCalledWith(model, { instanceId: 'root.0.0', sourceOffset: 0 });
  expect(screen.getByRole('button', { name: 'Insert into Studio' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Delete stored file' })).toBeNull();
});
test('removing a composer card does not delete its stored bytes', () => {
  const remove = jest.fn();
  render(<AttachmentCard file={model} onRemove={remove} />);
  fireEvent.click(screen.getByRole('button', { name: `Remove ${model.name}` }));
  expect(remove).toHaveBeenCalledTimes(1); expect(deleteChatAttachment).not.toHaveBeenCalled();
});
test('stored-file deletion is a separate explicit action', async () => {
  readChatAttachment.mockResolvedValue({ lines: [{ line: 1, text: 'Hello' }] });
  deleteChatAttachment.mockResolvedValue({ deleted: true });
  const file = { ...model, kind: 'text', name: 'notes.txt' };
  render(<AttachmentCard file={file} />);
  fireEvent.click(screen.getByRole('button', { name: file.name }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Delete stored file' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Delete stored file' }));
  expect(deleteChatAttachment).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete stored file' }));
  await waitFor(() => expect(deleteChatAttachment).toHaveBeenCalledWith(file));
});
