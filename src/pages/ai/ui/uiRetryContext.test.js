import { preserveFailedUiRequest } from './uiRetryContext';

test('a source-less failed build carries its original requirements into a follow-up', () => {
  const history = [
    { role: 'user', content: 'Build a coin HUD and shop backed by RequestPurchaseShopItem.' },
    { role: 'assistant', content: 'Artwork failed.' },
  ];
  expect(preserveFailedUiRequest('Retry with fallback icons.', { sourceFiles: [] }, history))
    .toBe('Original UI request (preserve these requirements):\nBuild a coin HUD and shop backed by RequestPurchaseShopItem.\n\nCurrent follow-up:\nRetry with fallback icons.');
});

test('completed designs and fully restated requests do not duplicate prior prompts', () => {
  const history = [{ role: 'user', content: 'Build a coin HUD.' }];
  expect(preserveFailedUiRequest('Change the colors.', { sourceFiles: [{ path: 'View.luau' }] }, history))
    .toBe('Change the colors.');
  expect(preserveFailedUiRequest('Build a coin HUD.', {}, history)).toBe('Build a coin HUD.');
});
