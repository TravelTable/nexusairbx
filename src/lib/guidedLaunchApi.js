import { authedFetch } from './billing';
import { readJsonResponse } from './apiErrors';
import { readPendingAuthAction, completePendingAuthAction } from './pendingAuthAction';
import { restoreGenerationIntent, consumeGenerationIntent } from './generationIntent';

async function request(path = '', method = 'GET', body) {
  const res = await authedFetch(`/api/onboarding${path}`, {
    method, noCache: true,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  return (await readJsonResponse(res, 'Your progress could not be saved. Please try again.')).progress;
}
export const getGuidedLaunch = () => request();
export const startGuidedLaunch = (input = {}) => request('', 'POST', input);
export const updateGuidedLaunch = (input) => request('', 'PATCH', input);
export const restartGuidedLaunch = () => request('/restart', 'POST', {});
export const openGuidedWorkspace = () => request('/workspace', 'POST', {});
export const guidedLaunchPath = (returnPath = '/ai') => `/onboarding?return=${encodeURIComponent(returnPath)}`;
export const guidedWorkspacePath = (progress) => `/ai?mode=agent&launch=${encodeURIComponent(progress.launchId)}&chat=${encodeURIComponent(progress.chatId)}`;

export function guidedLaunchSource() {
  const pending = readPendingAuthAction();
  const intent = restoreGenerationIntent();
  const isPromptAction = ['chat_submit', 'restricted_generation', 'upgrade_to_agent_build'].includes(pending?.action) && Boolean(pending?.payload?.prompt);
  return {
    idea: (isPromptAction ? pending.payload.prompt : intent?.prompt || '').slice(0, 12000),
    pendingActionId: isPromptAction ? pending.id : '',
    generationIntentId: intent && (!isPromptAction || intent.prompt === pending.payload.prompt) ? intent.id : '',
  };
}

export function consumeGuidedLaunchSource(progress) {
  if (!progress?.chatId) return;
  if (progress.pendingActionId) completePendingAuthAction(progress.pendingActionId, { resumedOutcome: 'guided_launch' });
  if (progress.generationIntentId) consumeGenerationIntent(progress.generationIntentId);
}

export function firstMilestonePrompt(idea) {
  return `My game idea:\n${idea}\n\nHelp me start with one small, playable milestone for this idea. Keep the larger idea as context for later. Propose only one achievable first part, explain what will appear in Studio, and give me specific manual playtest steps and the expected result. I am new to Roblox Studio. Stay in Plan mode: do not build or change the place until I accept the plan. Let me edit or discuss the milestone first.`;
}
