import { useEffect, useRef, useState } from 'react';
import { requestUiPreview, readUiPreview, readUiPreviewImage } from '../lib/uiPreviewApi';

function pause(ms, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}
export default function useUiPreview({ designId, projectId, sourceRevision, snapshotId, stateId = 'default', viewportId, enabled = true }) {
  const identity = JSON.stringify([designId, projectId, sourceRevision, snapshotId, stateId, viewportId]);
  const [record, setRecord] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const urlRef = useRef(null);
  const identityRef = useRef(identity); identityRef.current = identity;
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current.url); }, []);
  useEffect(() => {
    if (urlRef.current?.identity !== identity && urlRef.current) {
      URL.revokeObjectURL(urlRef.current.url); urlRef.current = null;
    }
    if (!enabled || !designId || !projectId || !sourceRevision || !snapshotId || !viewportId) return undefined;
    const controller = new AbortController(); const { signal } = controller;
    const requestIdentity = identity;
    const active = () => !signal.aborted && identityRef.current === requestIdentity;
    setRecord(previous => ({ ...(previous?.identity === identity ? previous : {}), identity, status: 'loading', error: '' }));
    (async () => {
      await pause(180, signal);
      let job = await requestUiPreview(designId, { sourceRevision, snapshotId, stateId, viewportId }, {
        signal, idempotencyKey: `ui-preview-${crypto.randomUUID()}` });
      if (!job.jobId) throw new Error('Preview admission did not return a job identity.');
      const jobId = job.jobId; const deadline = Date.now() + 90000;
      while (job.status !== 'ready') {
        signal.throwIfAborted();
        if (['failed', 'cancelled', 'superseded'].includes(job.status)) throw new Error(job.message || 'This preview is no longer available.');
        if (!['queued', 'running'].includes(job.status)) throw new Error('Unknown preview job state.');
        if (Date.now() >= deadline) throw new Error('Preview is still processing. Retry to reconnect.');
        await pause(750, signal);
        job = await readUiPreview(designId, jobId, signal);
      }
      const result = job.preview;
      if (!result || result.snapshotId !== snapshotId || result.sourceRevision !== sourceRevision
          || result.stateId !== stateId || result.viewportId !== viewportId || result.projectId !== projectId) {
        throw new Error('Preview belongs to a different UI revision or state.');
      }
      const blob = await readUiPreviewImage(designId, jobId, result.imageHash, signal);
      if (!active()) return;
      const url = URL.createObjectURL(blob);
      const old = urlRef.current;
      urlRef.current = { identity, url };
      setRecord({ identity, status: 'ready', preview: result, url, error: '' });
      if (old) URL.revokeObjectURL(old.url);
    })().catch(error => {
      if (!active()) return;
      setRecord(previous => ({ ...(previous?.identity === identity ? previous : {}), identity,
        status: 'error', error: error?.message || 'Preview could not be loaded.' }));
    });
    return () => controller.abort();
  }, [identity, attempt, enabled, designId, projectId, sourceRevision, snapshotId, stateId, viewportId]);
  const visible = record?.identity === identity ? record : null;
  return { status: visible?.status || (snapshotId ? 'loading' : 'waiting_capture'),
    preview: visible?.preview || null, imageUrl: visible?.url || '', error: visible?.error || '', retry: () => setAttempt(x => x + 1) };
}
