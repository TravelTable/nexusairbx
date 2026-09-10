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
const identityOf = p => JSON.stringify([p.designId, p.projectId, p.sourceRevision, p.snapshotId, p.stateId, p.viewportId]);

/** Images survive revision/device changes only inside the authenticated design scope.
 * Persisted references are re-authorized and their PNG hash verified on every load. */
export default function useUiPreview({ userId = '', designId, projectId, sourceRevision, snapshotId,
  stateId = 'default', viewportId, enabled = true, lastSuccessfulJobId, renderJobId, waitForBuild = false }) {
  const scope = JSON.stringify([userId, projectId, designId]);
  const identity = identityOf({ designId, projectId, sourceRevision, snapshotId, stateId, viewportId });
  const [record, setRecord] = useState(null);
  const [image, setImage] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const urlRef = useRef(null);
  const urls = useRef(new Set());
  const mounted = useRef(false);
  const latest = useRef({ scope, identity }); latest.current = { scope, identity };
  const admitted = useRef(null);
  useEffect(() => {
    mounted.current = true;
    const owned = urls.current;
    return () => {
      mounted.current = false;
      // Strict Mode and Fast Refresh may immediately reattach this same state.
      Promise.resolve().then(() => {
        if (mounted.current) return;
        owned.forEach(url => URL.revokeObjectURL(url));
        owned.clear();
      });
    };
  }, []);
  useEffect(() => {
    // Release replaced URLs only after React has committed the new image src.
    const visibleUrl = image?.scope === scope ? image.url : null;
    urls.current.forEach(url => {
      if (url !== visibleUrl) { URL.revokeObjectURL(url); urls.current.delete(url); }
    });
  }, [image, scope]);
  useEffect(() => {
    if (urlRef.current && urlRef.current.scope !== scope) {
      urlRef.current = null;
    }
  }, [scope]);

  const install = (blob, preview, imageScope) => {
    const next = { scope: imageScope, identity: identityOf(preview), url: URL.createObjectURL(blob), preview };
    urls.current.add(next.url);
    urlRef.current = next; setImage(next);
  };
  useEffect(() => {
    if (!lastSuccessfulJobId || !designId || !projectId || urlRef.current?.scope === scope) return undefined;
    const controller = new AbortController();
    (async () => {
      const job = await readUiPreview(designId, lastSuccessfulJobId, controller.signal);
      const p = job?.preview;
      if (job.status !== 'ready' || p?.designId !== designId || p.projectId !== projectId || !p.snapshotId || p.rendererBackend === 'public') return;
      const blob = await readUiPreviewImage(designId, lastSuccessfulJobId, p.imageHash, controller.signal);
      if (controller.signal.aborted || latest.current.scope !== scope || urlRef.current?.scope === scope) return;
      install(blob, p, scope);
    })().catch(() => { /* An expired earlier image must not block the current build. */ });
    return () => controller.abort();
  }, [scope, designId, projectId, lastSuccessfulJobId]);

  useEffect(() => {
    if (!enabled || !designId || !projectId || !sourceRevision || !snapshotId || !viewportId || (waitForBuild && !renderJobId && !attempt)) return undefined;
    const controller = new AbortController(); const { signal } = controller;
    const active = () => !signal.aborted && latest.current.identity === identity && latest.current.scope === scope;
    setRecord({ scope, identity, status: 'loading', error: '' });
    (async () => {
      await pause(180, signal);
      const previous = admitted.current;
      let jobId = attempt ? (previous?.identity === identity && previous?.reconnect ? previous.jobId : null) : renderJobId;
      let job = jobId ? await readUiPreview(designId, jobId, signal) : await requestUiPreview(designId,
        { sourceRevision, snapshotId, stateId, viewportId }, { signal, idempotencyKey: `ui-preview-${crypto.randomUUID()}` });
      if (!job.jobId && !jobId) throw new Error('Preview admission did not return a job identity.');
      jobId = job.jobId || jobId;
      admitted.current = { identity, jobId, reconnect: true };
      const deadline = Date.now() + 90000;
      if (job.status === 'ready' && !job.preview) job = await readUiPreview(designId, jobId, signal);
      while (job.status !== 'ready') {
        signal.throwIfAborted();
        if (['failed', 'cancelled', 'superseded'].includes(job.status)) {
          if (active()) admitted.current = { identity, jobId, reconnect: false };
          throw new Error(job.message || 'This preview is no longer available.');
        }
        if (!['queued', 'running'].includes(job.status)) throw new Error('Unknown preview job state.');
        if (Date.now() >= deadline) throw new Error('Preview is still processing. Retry to reconnect.');
        await pause(750, signal);
        job = await readUiPreview(designId, jobId, signal);
      }
      const result = job.preview;
      if (!result || identityOf(result) !== identity || result.rendererBackend === 'public') throw new Error('Preview belongs to a different UI revision or state.');
      const blob = await readUiPreviewImage(designId, jobId, result.imageHash, signal);
      if (!active()) return;
      install(blob, result, scope);
      setRecord({ scope, identity, status: 'ready', error: '' });
    })().catch(error => {
      if (active()) setRecord({ scope, identity, status: 'error', error: error?.message || 'Preview could not be loaded.' });
    });
    return () => controller.abort();
  }, [scope, identity, attempt, enabled, designId, projectId, sourceRevision, snapshotId, stateId, viewportId, renderJobId, waitForBuild]);
  const visible = record?.scope === scope && record.identity === identity ? record : null;
  const retained = image?.scope === scope ? image : null;
  return { status: visible?.status || (snapshotId ? 'loading' : 'waiting_capture'),
    preview: retained?.preview || null, imageUrl: retained?.url || '', earlier: Boolean(retained && retained.identity !== identity),
    error: visible?.error || '', retry: () => setAttempt(x => x + 1) };
}
