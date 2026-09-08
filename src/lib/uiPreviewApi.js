import { authedFetch } from './billing';
const base = designId => `/api/ui-designs/${encodeURIComponent(designId)}`;
async function json(path, init = {}) {
  const timeout = AbortSignal.timeout(15000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  const response = await authedFetch(path, { noCache: true, ...init, signal,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
  let result;
  try { result = await response.json(); } catch { throw new Error('Preview service returned an invalid response.'); }
  if (!response.ok) throw Object.assign(new Error(result.message || result.error?.message || 'The preview request failed.'), {
    status: response.status, code: result.code || result.error?.code });
  return result;
}
export function getUiPreviewManifest(designId, signal) {
  return json(`${base(designId)}/preview-manifest`, { signal });
}
export function requestUiPreview(designId, references, { signal, idempotencyKey }) {
  return json(`${base(designId)}/previews`, { method: 'POST', signal,
    headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(references) });
}
export function readUiPreview(designId, jobId, signal) {
  return json(`${base(designId)}/previews/${encodeURIComponent(jobId)}`, { signal });
}
export async function readUiPreviewImage(designId, jobId, imageHash, signal) {
  const response = await authedFetch(`${base(designId)}/previews/${encodeURIComponent(jobId)}/image`, { method: 'GET', noCache: true, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
  if (!response.ok || !response.headers.get('content-type')?.includes('image/png')) throw new Error('The preview image could not be loaded.');
  const blob = await response.blob();
  if (blob.size > 12 * 1024 * 1024) throw new Error('Preview image exceeds its size limit.');
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  const actual = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  if (actual !== imageHash) throw new Error('Preview image revision mismatch.');
  return blob;
}
export function requestUiCapture(designId, body, { signal, idempotencyKey }) {
  return json(`${base(designId)}/captures`, { method: 'POST', signal,
    headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(body) });
}
export function readUiCapture(designId, captureRequestId, signal) {
  return json(`${base(designId)}/captures/${encodeURIComponent(captureRequestId)}`, { signal });
}
