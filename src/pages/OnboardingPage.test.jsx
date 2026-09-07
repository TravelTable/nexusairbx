import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OnboardingPage from './OnboardingPage';
import { getGuidedLaunch, startGuidedLaunch, updateGuidedLaunch, openGuidedWorkspace } from '../lib/guidedLaunchApi';
import { beginRobloxOAuth } from '../lib/robloxOAuthApi';
import { startStudioPairing } from '../lib/studioBridgeApi';

let mockProgress;
let mockRoblox;
let mockStudio;
jest.mock('../context/RobloxConnectionContext', () => ({ useRobloxConnection: () => mockRoblox }));
jest.mock('../hooks/useStudioConnection', () => ({ useStudioConnection: () => mockStudio }));
jest.mock('../lib/guidedLaunchApi', () => ({
  ...jest.requireActual('../lib/guidedLaunchApi'), getGuidedLaunch: jest.fn(), startGuidedLaunch: jest.fn(), updateGuidedLaunch: jest.fn(), openGuidedWorkspace: jest.fn(), restartGuidedLaunch: jest.fn(),
}));
jest.mock('../lib/billing', () => ({ authedFetch: jest.fn() }));
jest.mock('../lib/robloxOAuthApi', () => ({ beginRobloxOAuth: jest.fn(), ROBLOX_PRODUCT_DEFAULT_CAPABILITIES: ['identity'] }));
jest.mock('../lib/studioBridgeApi', () => ({ startStudioPairing: jest.fn() }));
jest.mock('../components/ai/StudioPairControl', () => ({ resolvePairingExpiry: r => r.expiresAt }));
jest.mock('../lib/productAnalytics', () => ({ trackProductEvent: jest.fn() }));
jest.mock('../lib/pendingAuthAction', () => ({ readPendingAuthAction: () => null }));
jest.mock('../lib/generationIntent', () => ({ restoreGenerationIntent: () => null }));
jest.mock('../lib/signupRobloxOnboarding', () => ({ safeSignupReturnPath: p => p?.startsWith('/') && !p.startsWith('//') ? p : '/ai' }));
jest.mock('../context/SettingsContext', () => ({
  useSettings: () => ({
    settings: {
      robloxAssetUploadsEnabled: true,
      assetPublishingPreference: 'auto_explicit_request',
      studioApplyPolicy: 'after_validation',
    },
    updateSettings: jest.fn(async () => ({ ok: true })),
  }),
}));

function show(path = '/onboarding') { return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/onboarding" element={<OnboardingPage />} /><Route path="/signin" element={<p>Sign in</p>} /><Route path="/verify-email" element={<p>Verify email</p>} /><Route path="/ai" element={<p>Workspace</p>} /></Routes></MemoryRouter>); }
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockProgress = { version: 1, revision: 1, launchId: 'launch-1', stage: 'idea', idea: '', returnPath: '/ai', placeChoice: 'new', studioStep: 'place', chatId: '' };
  mockRoblox = { authReady: true, user: { uid: 'alice', emailVerified: true }, connected: false, phase: 'ready', status: { onboarding: { gateActive: true } }, refresh: jest.fn().mockResolvedValue({}) };
  mockStudio = { loading: false, connected: false, executionReady: false, refresh: jest.fn().mockResolvedValue({ executionReady: false }) };
  getGuidedLaunch.mockImplementation(async () => mockProgress);
  startGuidedLaunch.mockImplementation(async () => mockProgress);
  updateGuidedLaunch.mockImplementation(async patch => { mockProgress = { ...mockProgress, ...patch, revision: mockProgress.revision + 1 }; return mockProgress; });
});
test('requires sign-in and email verification without requiring Roblox first', () => {
  mockRoblox.user = null;
  const view = show(); expect(screen.getByText('Sign in')).toBeTruthy(); view.unmount();
  mockRoblox.user = { uid: 'alice', emailVerified: false };
  show(); expect(screen.getByText('Verify email')).toBeTruthy();
});
test('examples fill the idea without submitting; continuation saves before connection', async () => {
  show();
  await screen.findByLabelText('Your idea');
  fireEvent.click(screen.getByRole('button', { name: /cozy café/i }));
  expect(screen.getByLabelText('Your idea').value).toContain('café');
  expect(updateGuidedLaunch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /continue with this idea/i }));
  await screen.findByRole('heading', { name: 'Let’s connect your tools' });
  expect(mockProgress.stage).toBe('roblox');
  expect(beginRobloxOAuth).not.toHaveBeenCalled();
});
test('a failed save keeps the draft and prevents OAuth redirect', async () => {
  mockProgress = { ...mockProgress, stage: 'roblox', idea: 'My hotel' };
  updateGuidedLaunch.mockRejectedValue(new Error('Network unavailable'));
  show(); fireEvent.click(await screen.findByRole('button', { name: 'Connect Roblox' }));
  await screen.findByRole('alert');
  expect(beginRobloxOAuth).not.toHaveBeenCalled();
  expect(mockProgress.idea).toBe('My hotel');
});
test('OAuth cancellation is recoverable and authorization uses the saved return route', async () => {
  mockProgress = { ...mockProgress, stage: 'roblox', idea: 'My hotel' };
  beginRobloxOAuth.mockResolvedValue({});
  show('/onboarding?roblox=error');
  expect(await screen.findByRole('alert')).toHaveTextContent('cancelled');
  fireEvent.click(screen.getByRole('button', { name: 'Connect Roblox' }));
  await waitFor(() => expect(beginRobloxOAuth).toHaveBeenCalledWith(expect.objectContaining({ returnPath: '/onboarding?return=%2Fai' })));
  expect(updateGuidedLaunch.mock.invocationCallOrder[0]).toBeLessThan(beginRobloxOAuth.mock.invocationCallOrder[0]);
});
test('pairing begins only on request and an expired code can be regenerated', async () => {
  mockProgress = { ...mockProgress, stage: 'studio', studioStep: 'pair', idea: 'My hotel' };
  mockRoblox.connected = true; mockRoblox.status.onboarding.gateActive = false;
  startStudioPairing.mockResolvedValue({ code: 'ABC123', expiresAt: Date.now() - 100 });
  show();
  const button = await screen.findByRole('button', { name: 'Generate pairing code' });
  expect(startStudioPairing).not.toHaveBeenCalled();
  fireEvent.click(button);
  await screen.findByRole('button', { name: 'Generate a new code' });
  expect(screen.getByText(/code expired/i)).toBeTruthy();
});
test('uses live readiness and actual place name; a disconnect blocks handoff', async () => {
  mockProgress = { ...mockProgress, stage: 'studio', idea: 'My hotel' };
  mockRoblox.connected = true; mockRoblox.status.onboarding.gateActive = false;
  mockStudio = { ...mockStudio, executionReady: true, connected: true, activePlaceName: 'Hotel Baseplate' };
  show();
  await screen.findByText('Hotel Baseplate');
  fireEvent.click(screen.getByRole('button', { name: /use this place and plan/i }));
  await screen.findByRole('alert');
  expect(openGuidedWorkspace).not.toHaveBeenCalled();
});
test('refresh resumes an existing conversation without opening another workspace', async () => {
  mockProgress = { ...mockProgress, stage: 'plan', chatId: 'chat-1', idea: 'My hotel' };
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Continue my creation' }));
  await screen.findByText('Workspace');
  expect(openGuidedWorkspace).not.toHaveBeenCalled();
});
