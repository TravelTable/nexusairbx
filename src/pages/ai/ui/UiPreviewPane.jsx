import React, { useState } from 'react';
import useUiPreview from '../../../hooks/useUiPreview';
import './UiPreviewPane.css';

/** Embed beside the EXISTING conversation/composer. codePanel is real Files/Monaco. */
export default function UiPreviewPane({ designId, projectId, sourceRevision, capture,
  states = [], viewports = [], capabilities = null, provenanceExtra = '',
  onRefreshCapture, captureBusy = false, codePanel }) {
  const [tab, setTab] = useState('preview');
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
    enabled: tab === 'preview' && !rendererUnavailable });
  const changeState = value => setSelection(previous => ({ ...previous, snapshotId: capture?.snapshotId, stateId: value }));
  const warningCount = data.preview?.warnings?.length || 0;
  return <section className="nx-ui-preview" aria-label="Roblox UI preview workspace">
    <header className="nx-ui-preview__toolbar">
      <nav aria-label="UI workspace views">
        <button type="button" aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}>Preview</button>
        <button type="button" aria-pressed={tab === 'code'} onClick={() => setTab('code')}>Code</button>
      </nav>
      {tab === 'preview' ? <>
        <label><span className="nx-ui-preview__sr">Viewport</span>
          <select aria-label="Preview viewport" value={viewportId || ''} onChange={event => setSelection(previous => ({ ...previous, viewportId: event.target.value }))}>
            {viewports.map(value => <option key={value.id} value={value.id}>{value.label}</option>)}
          </select>
        </label>
        <label><span className="nx-ui-preview__sr">Preview state</span>
          <select aria-label="Preview state" value={stateId} disabled={!currentCapture || rendererUnavailable} onChange={event => changeState(event.target.value)}>
            <option value="default">Default</option>
            {selectableStates.filter(state => state.id !== 'default').map(state => <option key={state.id} value={state.id}>{state.label}</option>)}
          </select>
        </label>
        <button type="button" disabled={captureBusy || typeof onRefreshCapture !== 'function'} onClick={onRefreshCapture}>{captureBusy ? 'Syncing…' : 'Sync Studio'}</button>
      </> : null}
    </header>
    {tab === 'code' ? <div className="nx-ui-preview__code">{codePanel}</div> : <>
      <div className="nx-ui-preview__status" role="status" aria-live="polite">
        {rendererUnavailable ? 'Preview renderer unavailable'
          : !capture ? 'Capture needed'
          : !currentCapture ? 'Studio capture needed for this revision'
          : data.status === 'loading' ? 'Rendering preview…'
          : data.preview ? `${data.preview.simulated ? 'Simulated state' : data.preview.captureKind === 'studio_runtime' ? 'Runtime snapshot redraw' : 'Studio snapshot redraw'} · browser approximation${provenanceExtra ? ` · ${provenanceExtra}` : ''}`
          : 'Waiting for a preview'}
      </div>
      {data.error && !rendererUnavailable ? <p className="nx-ui-preview__error" role="alert">{data.error} <button type="button" onClick={data.retry}>Retry preview</button></p> : null}
      <div className="nx-ui-preview__body">
        {rendererUnavailable
          ? <p>This deployment cannot draw UI previews right now, so no image is available.{capabilities?.captureUnavailableReason ? ` ${capabilities.captureUnavailableReason}` : ''} Design, Code and Studio apply still work.</p>
          : data.imageUrl ? <img className="nx-ui-preview__image" src={data.imageUrl}
            alt={`${data.preview?.stateLabel || 'Default'} Roblox UI state preview`}
            width={data.preview?.viewport.width} height={data.preview?.viewport.height} />
            : <p>{!currentCapture ? 'Build or sync the UI in Studio to see its preview.' : 'The current preview will appear here.'}</p>}
      </div>
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
    </>}
  </section>;
}
