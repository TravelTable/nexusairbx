import { desktopRequest } from '../../../../src/lib/workspaceRuntime';
export * from '../../../../src/lib/billingSummary';
export const authedFetch = desktopRequest;
export async function getEntitlements() {
  const response = await desktopRequest('/api/billing/entitlements');
  if (!response.ok) throw new Error('Account usage could not be loaded.');
  return response.json();
}
const requests = new Map();
async function post(path, body = {}) {
  const fingerprint = JSON.stringify([path, body]);
  if (!requests.has(fingerprint)) requests.set(fingerprint, crypto.randomUUID());
  const result = await desktopRequest(path, { method: 'POST', body: JSON.stringify(body), headers: { 'Idempotency-Key': requests.get(fingerprint) } });
  const value = await result.json();
  if (!result.ok) throw new Error(value.error || 'Account operation failed.');
  requests.delete(fingerprint);
  return value;
}
export const openPortal = () => post('/api/portal');
export const cancelSubscription = () => post('/api/billing/cancel');
export const startCheckout = payload => post('/api/checkout', payload);
export const startSubscriptionCheckout = payload => startCheckout({ catalogVersion: 'v2', purchaseType: 'subscription', ...payload });
export const startCreditPackCheckout = payload => startCheckout({ catalogVersion: 'v2', purchaseType: 'credits', ...payload });
export const startPremiumBalanceCheckout = ({ packageKey, teamId }) => startCheckout({ mode: 'payment', package: packageKey, teamId });
