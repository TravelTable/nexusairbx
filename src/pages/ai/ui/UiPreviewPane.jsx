import React, { useEffect, useRef, useState } from 'react';
import useUiPreview from '../../../hooks/useUiPreview';
import { Shimmer } from '../../../components/ai-elements/shimmer';
import './UiPreviewPane.css';

export default function UiPreviewPane({ userId, designId, projectId, sourceRevision, capture,
  states = [], viewports = [], capabilities = null, lastSuccessfulJobId, renderJobs = [],
  onRefreshCapture, onRefreshManifest, captureBusy = false, run = null, studioConnected = false,
  hasNodes = false, studioReceipt = null, pendingStudioCommand = null, onApplyToStudio,
  onConnectStudio, applyBusy = false, onRenderStatus, previewFailed = false, updatingRevision = false }) {
  const [selection, setSelection] = useState({ snapshotId: '', stateId: 'default', viewportId: '' });
  const rendererUnavailable = capabilities?.previewEnabled === false || capabilities?.rendererAvailable === false || capabilities?.rendererBackend === 'public';
  const selectableStates = states.filter(state => !state.stale);
  const stateId = selection.snapshotId === capture?.snapshotId && selectableStates.some(s => s.id === selection.stateId) ? selection.stateId : 'default';
  const viewportId = viewports.some(v => v.id === selection.viewportId) ? selection.viewportId : viewports[0]?.id;
  const currentCapture = Boolean(capture?.snapshotId && capture?.treeHash) && capture.complete !== false && !capture.requiresRecapture && capture.sourceRevision === sourceRevision;
  const renderJobId = currentCapture ? renderJobs.find(slot => slot.stateId === stateId && slot.viewportId === viewportId)?.jobId : null;
  const data = useUiPreview({ userId, designId, projectId, sourceRevision,
    snapshotId: currentCapture ? capture.snapshotId : null, stateId, viewportId, enabled: !rendererUnavailable,
    lastSuccessfulJobId, renderJobId, waitForBuild: Boolean(run) && stateId === 'default' && viewportId === 'desktop' });
  const changeState = value => setSelection(previous => ({ ...previous, snapshotId: capture?.snapshotId, stateId: value }));
  const reportRef = useRef(onRenderStatus); reportRef.current = onRenderStatus;
  useEffect(() => {
    if (!currentCapture || stateId !== 'default' || data.earlier) return;
    reportRef.current?.({ status: rendererUnavailable ? 'unavailable' : data.status, error: data.error,
      preview: data.preview, sourceRevision, snapshotId: capture?.snapshotId });
  }, [currentCapture, stateId, data.earlier, data.status, data.error, data.preview, rendererUnavailable, sourceRevision, capture?.snapshotId]);
  const failed = rendererUnavailable || data.status === 'error' || (previewFailed && data.status !== 'ready');
  const retry = async () => { await onRefreshManifest?.(); data.retry(); };
  const originalViewport = viewports.find(v => v.id === data.preview?.viewportId);
  const status = failed ? 'Preview unavailable' : run?.stage || (data.earlier ? 'Updating preview' : data.status === 'ready' ? 'Pinevex preview' : currentCapture ? 'Rendering preview' : hasNodes ? 'Studio not applied yet' : 'Your preview will appear here');
  return <section className="nx-ui-preview" aria-label="Roblox UI preview workspace">
    <header className="nx-ui-preview__toolbar">
      <div className="nx-ui-preview__status" role="status" aria-live="polite">{run && !failed ? <Shimmer as="span">{status}</Shimmer> : status}</div>
      <label><span className="nx-ui-preview__sr">Viewport</span><select aria-label="Preview viewport" value={viewportId || ''} disabled={!currentCapture || !viewports.length} onChange={e => setSelection(p => ({ ...p, viewportId: e.target.value }))}>
        {!viewports.length ? <option value="">Desktop</option> : viewports.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
      </select></label>
      <label><span className="nx-ui-preview__sr">Preview state</span><select aria-label="Preview state" value={stateId} disabled={!currentCapture} onChange={e => changeState(e.target.value)}>
        <option value="default">Default</option>{selectableStates.filter(s => s.id !== 'default').map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select></label>
      {hasNodes && studioConnected && onRefreshCapture ? <button type="button" disabled={captureBusy || Boolean(run)} onClick={onRefreshCapture}>{captureBusy ? 'Capturing…' : 'Recapture Studio'}</button> : null}
    </header>
    {failed ? <div className="nx-ui-preview__error" role="status"><strong>Preview unavailable</strong><span> Saved code and successful Studio application are preserved.</span> {currentCapture ? <button type="button" onClick={retry}>Retry Preview</button> : <span>A verified capture is needed before rendering.</span>}</div> : null}
    <div className="nx-ui-preview__body">
      {data.imageUrl ? <figure className="nx-ui-preview__frame" data-running={run ? 'true' : 'false'}>
        {data.earlier || updatingRevision ? <span className="nx-ui-preview__earlier">Earlier version</span> : null}
        <img className="nx-ui-preview__image" src={data.imageUrl} draggable="false" alt={`${data.preview?.stateLabel || 'Default'} state of the captured Roblox UI`}
          width={data.preview?.viewport?.width} height={data.preview?.viewport?.height} />
        <figcaption>{originalViewport?.label || data.preview?.viewportId} · {data.preview?.stateLabel || 'Default'} · rev {String(data.preview?.sourceRevision || '').slice(0, 8)} · Pinevex{data.preview?.simulated ? ' · Simulated state' : ''}</figcaption>
      </figure> : <div className={`nx-ui-preview__empty ${run || (currentCapture && !failed) ? 'nx-ui-preview__empty--working' : ''}`}>
        <span className="nx-build-signal" data-active={run || (currentCapture && !failed) ? 'true' : 'false'} />
        <strong>{run ? run.stage : !hasNodes ? 'From your idea to a real Roblox UI' : pendingStudioCommand ? 'Applying to Studio' : failed ? 'Preview unavailable' : !currentCapture ? 'Saved · Studio not applied yet' : 'Rendering preview'}</strong>
        <p>{!hasNodes ? 'Describe what you want to build. Generation starts immediately, even without Studio.' : !currentCapture ? 'Your implementation is saved. Connect your project’s Studio place, apply it, and its verified capture will be rendered by Pinevex.' : 'Pinevex renders only from the verified Studio capture.'}</p>
        {hasNodes && !currentCapture && !run ? <div className="nx-ui-preview__actions"><button type="button" disabled={applyBusy || captureBusy} onClick={studioConnected ? onApplyToStudio : onConnectStudio}>{studioConnected ? 'Apply to Studio' : 'Connect Studio'}</button></div> : null}
      </div>}
    </div>
    <footer className="nx-ui-preview__states"><small>Pinevex · Verified Studio captures only</small>{currentCapture ? <small>Device and state changes request images only.</small> : null}</footer>
    {data.preview?.warnings?.length ? <details className="nx-ui-preview__warnings"><summary>{data.preview.warnings.length} preview limitations</summary><ul>{data.preview.warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul></details> : null}
  </section>;
}
