import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GuidedLaunchChecklist from './GuidedLaunchChecklist';
jest.mock('../../lib/productAnalytics', () => ({ trackProductEvent: jest.fn() }));
jest.mock('../../lib/billing', () => ({ authedFetch: jest.fn() }));

const base = { launchId: 'launch-1', chatId: 'chat-1', stage: 'plan', idea: 'A café game', dismissed: false };
const applied = { id: 'receipt-1', role: 'assistant', stage: 'completed', steps: [{ type: 'create_instance', status: 'succeeded', executionSessionId: 'studio-1' }] };
function Harness({ messages = [], initial = base, onSubmit = jest.fn(), setPrompt = jest.fn(), sessionId = 'studio-1', busy = false }) {
  const [progress, setProgress] = useState(initial);
  return <GuidedLaunchChecklist launch={{ progress, save: async patch => setProgress(p => ({ ...p, ...patch })), refresh: jest.fn() }} chat={{ currentChatId: 'chat-1', activeMode: 'plan', messages, updateChatMode: jest.fn() }} studio={{ executionReady: true, activePlaceName: 'Café', sessionId }} onSubmit={onSubmit} setPrompt={setPrompt} isBusy={busy} />;
}
test('the first milestone requires an explicit action and requests planning only', async () => {
  const submit = jest.fn(); render(<Harness onSubmit={submit} />);
  expect(submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Plan my first milestone' }));
  await waitFor(() => expect(submit).toHaveBeenCalledWith(null, expect.stringContaining('do not build or change the place until I accept'), expect.objectContaining({ operationId: 'launch-plan-launch-1' })));
});
test('generated files never unlock playtest confirmation', () => {
  render(<Harness initial={{ ...base, stage: 'build' }} messages={[{ role: 'assistant', stage: 'completed', files: [{ name: 'Coin.lua' }] }]} />);
  expect(screen.queryByRole('button', { name: 'It works' })).toBeNull();
});
test('acknowledged writes unlock manual confirmation and keep the conversation', async () => {
  render(<Harness initial={{ ...base, stage: 'build' }} messages={[applied]} />);
  fireEvent.click(await screen.findByRole('button', { name: 'It works' }));
  await screen.findByText(/What would you like to change next/);
});
test('old evidence cannot complete a repair or a playtest in a different place', async () => {
  const prompt = jest.fn();
  const view = render(<Harness initial={{ ...base, stage: 'try' }} messages={[applied]} setPrompt={prompt} />);
  fireEvent.click(screen.getByRole('button', { name: 'Something needs fixing' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'It works' })).toBeNull());
  expect(prompt).toHaveBeenCalledWith(expect.stringContaining('what happened'));
  view.unmount();
  render(<Harness initial={{ ...base, stage: 'try' }} messages={[applied]} sessionId="other-place" />);
  expect(screen.getByRole('button', { name: 'It works' })).toBeDisabled();
});
test('never shows the guide against an unrelated chat or a dismissed journey', () => {
  const view = render(<Harness initial={{ ...base, chatId: 'another-chat' }} />);
  expect(screen.queryByText('Your first creation')).toBeNull(); view.unmount();
  render(<Harness initial={{ ...base, dismissed: true }} />);
  expect(screen.queryByText('Your first creation')).toBeNull();
});
