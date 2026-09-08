import React, { useEffect, useRef, useState } from 'react';
import useUiPreview from '../../../hooks/useUiPreview';
import { Shimmer } from '../../../components/ai-elements/shimmer';
import './UiPreviewPane.css';

/**
 * Read-only stage for the UI Creator. Shows the Pinevex redraw of the Studio
 * capture for the current revision. Nothing here edits the document: the only
 * controls pick which image to request, resync the capture, or retry an apply.
 */
export default function UiPreviewPane({ designId, projectId, sourceRevision, capture,
  states = [], viewports = [], capabilities = null, provenanceExtra = '',
  onRefreshCapture, captureBusy = false,
  run = null, studioConnected = false, hasNodes = false, studioReceipt = null,
  pendingStudioCommand = null, onApplyToStudio, applyBusy = false, onRenderStatus }) {
  const [selection, setSelection] = useState({ snapshotId: '', stateId: 'default', viewportId: '' });
  const rendererUnavailable = capabilities
    ? capabilities.previewEnabled === false || capabilities.rendererAvailable === false
    : false;
  const selectableStates = states.filter(state => !state.stale);
  const staleStateCount = states.length - selectableStates.length;
  const stateId = selection.snapshotId === capture?.snapshotId && selectableStates.some(s => s.id === selection.stateId)
    ? selection.stateId : 'default';
  const viewportId = viewports.some(v => v.id === selection.viewportId) ? selection.viewportId : viewports[0]?.id;
  const currentCapture = Boolean(capture) && capture.sourceRevision === sourceRevision;
  const data = useUiPreview({ designId, projectId, sourceRevision,
    snapshotId: currentCapture ? capture?.snapshotId : null, stateId, viewportId,
    enabled: !rendererUnavailable });
  const changeState = value => setSelection(previous => ({ ...previous, snapshotId: capture?.snapshotId, stateId: value }));
  const warningCount = data.preview?.warnings?.length || 0;
  const viewport = viewports.find(value => value.id === viewportId) || null;
  const running = Boolean(run);

  // Report the render phase back so the chat's "Render preview" step can finish
  // with the real outcome. Only the default state of the current capture counts.
  const reportRef = useRef(onRenderStatus);
  reportRef.current = onRenderStatus;
  useEffect(() => {
    if (typeof reportRef.current !== 'function' || !currentCapture || stateId !== 'default') return;
    reportRef.current({
      status: rendererUnavailable ? 'unavailable' : data.status,
      error: rendererUnavailable ? (capabilities?.captureUnavailableReason || 'Preview renderer unavailable') : data.error,
      preview: data.preview,
      sourceRevision,
      snapshotId: capture?.snapshotId || '',
    });
  }, [capabilities?.captureUnavailableReason, capture?.snapshotId, currentCapture, data.error, data.preview, data.status, rendererUnavailable, sourceRevision, stateId]);

  const provenance = data.preview
    ? [
      data.preview.simulated ? 'Simulated state' : data.preview.captureKind === 'studio_runtime' ? 'Runtime snapshot' : 'Studio edit snapshot',
      `rev ${String(sourceRevision || '').slice(0, 8)}`,
      data.preview.rendererBackend === 'public' ? 'hosted render' : 'private render',
      provenanceExtra,
    ].filter(Boolean).join(' · ')
    : '';

  let status;
  if (running) status = <Shimmer as="span" duration={1.8} spread={1.5}>{run.stage || 'Working...'}</Shimmer>;
  else if (rendererUnavailable) status = 'Preview renderer unavailable';
  else if (!studioConnected && !currentCapture) status = 'Studio not connected';
  else if (!hasNodes) status = 'No UI yet';
  else if (!currentCapture) status = pendingStudioCommand ? 'Waiting for Studio approval' : 'Studio capture needed for this revision';
  else if (data.status === 'loading') status = <Shimmer as="span" duration={1.8} spread={1.5}>Rendering preview...</Shimmer>;
  else if (data.status === 'error') status = 'Preview could not be rendered';
  else if (data.preview) status = provenance;
  else status = 'Waiting for a preview';

  let body;
  if (rendererUnavailable) {
    body = <div className="nx-ui-preview__empty" role="note">
      <strong>No preview image right now</strong>
      <p>This deployment cannot draw UI previews.{capabilities?.captureUnavailableReason ? ` ${capabilities.captureUnavailableReason}` : ''} Studio apply and Code still work.</p>
    </div>;
  } else if (data.imageUrl) {
    body = <figure className="nx-ui-preview__frame" data-running={running ? 'true' : 'false'}>
      <img className="nx-ui-preview__image" src={data.imageUrl} draggable="false"
        alt={`${data.preview?.stateLabel || 'Default'} state of the captured Roblox UI`}
        width={data.preview?.viewport.width} height={data.preview?.viewport.height} />
      {viewport ? <figcaption>{viewport.label} · {viewport.width}×{viewport.height}</figcaption> : null}
    </figure>;
  } else if (running) {
    body = <div className="nx-ui-preview__empty nx-ui-preview__empty--working" role="status">
      <span className="nx-build-signal" data-active="true" />
      <p>{run.stage || 'Working...'}</p>
    </div>;
  } else if (!studioConnected) {
    body = <div className="nx-ui-preview__empty">
      <strong>Open your bound place in Roblox Studio to start</strong>
      <p>Nexus builds the UI in Studio, captures it, and draws the result here. Connect the NexusRBX plugin to your place, then describe the UI you want.</p>
    </div>;
  } else if (!hasNodes) {
    body = <div className="nx-ui-preview__empty">
      <strong>Describe the UI you want</strong>
      <p>Name the screen, what the player does on it, and the visual style. Nexus builds it in Studio and the capture appears here.</p>
    </div>;
  } else if (!currentCapture && pendingStudioCommand) {
    body = <div className="nx-ui-preview__empty">
      <strong>Studio has not approved the last apply</strong>
      <p>Approve the change in Roblox Studio. The capture and preview continue automatically once Studio confirms it.</p>
    </div>;
  } else if (!currentCapture) {
    body = <div className="nx-ui-preview__empty">
      <strong>This revision is not in Studio yet</strong>
      <p>{studioReceipt ? 'Studio has an older copy of this UI.' : 'Apply the UI to your bound place, then capture it to see the preview.'}</p>
      <div className="nx-ui-preview__actions">
        {typeof onApplyToStudio === 'function' ? <button type="button" disabled={applyBusy || captureBusy} onClick={onApplyToStudio}>{applyBusy ? 'Applying…' : 'Apply to Studio'}</button> : null}
        {typeof onRefreshCapture === 'function' ? <button type="button" disabled={captureBusy || applyBusy} onClick={onRefreshCapture}>{captureBusy ? 'Syncing…' : 'Sync Studio'}</button> : null}
      </div>
    </div>;
  } else if (data.status === 'error') {
    body = <div className="nx-ui-preview__empty">
      <strong>Preview could not be rendered</strong>
      <p>{data.error}</p>
      <div className="nx-ui-preview__actions"><button type="button" onClick={data.retry}>Retry preview</button></div>
    </div>;
  } else {
    body = <div className="nx-ui-preview__empty nx-ui-preview__empty--working" role="status">
      <span className="nx-build-signal" data-active="true" />
      <p>Rendering preview…</p>
    </div>;
  }

  return <section className="nx-ui-preview" aria-label="Roblox UI preview workspace">
    <header className="nx-ui-preview__toolbar">
      <div className="nx-ui-preview__status" role="status" aria-live="polite">{status}</div>
      <label><span className="nx-ui-preview__sr">Viewport</span>
        <select aria-label="Preview viewport" value={viewportId || ''} disabled={!viewports.length} onChange={event => setSelection(previous => ({ ...previous, viewportId: event.target.value }))}>
          {viewports.map(value => <option key={value.id} value={value.id}>{value.label}</option>)}
        </select>
      </label>
      <label><span className="nx-ui-preview__sr">Preview state</span>
        <select aria-label="Preview state" value={stateId} disabled={!currentCapture || rendererUnavailable} onChange={event => changeState(event.target.value)}>
          <option value="default">Default</option>
          {selectableStates.filter(state => state.id !== 'default').map(state => <option key={state.id} value={state.id}>{state.label}</option>)}
        </select>
      </label>
      <button type="button" disabled={captureBusy || running || typeof onRefreshCapture !== 'function'} onClick={onRefreshCapture}>{captureBusy ? 'Syncing…' : 'Sync Studio'}</button>
    </header>
    {data.error && data.imageUrl && !rendererUnavailable ? <p className="nx-ui-preview__error" role="alert">{data.error} <button type="button" onClick={data.retry}>Retry preview</button></p> : null}
    <div className="nx-ui-preview__body">{body}</div>
    {!rendererUnavailable && currentCapture && (selectableStates.length || staleStateCount) ? <div className="nx-ui-preview__states" aria-label="Preview scenarios">
      <button type="button" onClick={() => changeState('default')}>Reset preview</button>
      {selectableStates.filter(state => state.id !== 'default').map(state => <button type="button" key={state.id}
        aria-pressed={stateId === state.id} onClick={() => changeState(state.id)}>{state.label}</button>)}
      <small>State previews do not click Roblox buttons or change Studio.</small>
      {staleStateCount ? <small>{`${staleStateCount} saved state${staleStateCount === 1 ? ' needs' : 's need'} rebuilding for the current revision.`}</small> : null}
    </div> : null}
    {warningCount ? <details className="nx-ui-preview__warnings"><summary>{warningCount} preview limitation{warningCount === 1 ? '' : 's'}</summary>
      <ul>{data.preview.warnings.map((warning, index) => <li key={`${warning.nodeId}-${warning.code}-${index}`}>{warning.message}</li>)}</ul>
    </details> : null}
  </section>;
}
