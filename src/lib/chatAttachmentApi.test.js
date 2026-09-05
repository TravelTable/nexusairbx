import { validateAttachmentSelection } from './chatAttachmentApi';
jest.mock('./billing', () => ({ authedFetch: jest.fn() }));
test('enforces type, count, individual size and message limits before upload', () => {
  expect(() => validateAttachmentSelection([{ name: 'a.pdf', size: 1 }])).toThrow('unsupported');
  expect(() => validateAttachmentSelection([{ name: 'a.lua', size: 21 * 1024 * 1024 }])).toThrow('20 MiB');
  expect(() => validateAttachmentSelection(Array.from({ length: 17 }, () => ({ name: 'a.lua', size: 1 })))).toThrow('16');
  expect(() => validateAttachmentSelection(Array.from({ length: 6 }, () => ({ name: 'a.lua', size: 20 * 1024 * 1024 })))).toThrow('100 MiB');
});
