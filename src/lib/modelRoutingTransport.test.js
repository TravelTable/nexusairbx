import { withModelRoutingPreferences, publishModelRouting, MODEL_ROUTING_EVENT } from './modelRoutingTransport';

test('preferences travel with durable execution settings and explicit snapshots survive replay', () => {
  const prefs = { mode: 'economy', allowedProviders: ['google'], creditCeiling: 50 };
  const input = { method: 'POST', body: JSON.stringify({ executionInput: { settings: { modelVersion: 'auto' } } }) };
  const result = withModelRoutingPreferences('/api/tasks', input, () => prefs);
  expect(JSON.parse(result.body).executionInput.settings.autoPreferences).toEqual(prefs);
  expect(withModelRoutingPreferences('/api/tasks', result, () => ({ mode: 'max' }))).toEqual(result);
  const v2 = withModelRoutingPreferences('/api/v2/agents/nexus/runs', input, () => prefs);
  expect(JSON.parse(v2.body).executionInput.settings.autoPreferences).toEqual(prefs);
});

test('unrelated requests and non-JSON bodies remain unchanged', () => {
  const input = { method: 'POST', body: JSON.stringify({ model: 'auto' }) };
  expect(withModelRoutingPreferences('/api/checkout', input)).toBe(input);
  expect(withModelRoutingPreferences('/api/tasks', { method: 'POST', body: 'invalid' })).toEqual({ method: 'POST', body: 'invalid' });
});

test('routing events keep the chat/project scope so another conversation cannot claim the selection', () => {
  const onEvent = jest.fn();
  window.addEventListener(MODEL_ROUTING_EVENT, onEvent);
  publishModelRouting({ modelId: 'provider/model', autoMode: 'balanced' }, { chatId: 'chat-a', projectId: 'project-a' });
  expect(onEvent.mock.calls[0][0].detail).toEqual({ chatId: 'chat-a', projectId: 'project-a', modelRouting: { modelId: 'provider/model', autoMode: 'balanced' } });
  window.removeEventListener(MODEL_ROUTING_EVENT, onEvent);
});
