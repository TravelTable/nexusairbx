import NexusSelect from "../../../components/ui/NexusSelect";
import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import UiLiveFiles from './UiLiveFiles';
import { downloadUiModel } from '../../../lib/uiDesignApi';

export default function UiImplementationDrawer({ tab, document, files = [], readFile, working, checkpoints = [],
  onCheckpoint, onRestore, onAssets, build, liveFiles = [], onSuggest, deletedDesigns = [], onRecover, filesError = '', onRetryFiles, onReview }) {
  const [selected, setSelected] = useState('');
  const [source, setSource] = useState({ key: '', value: '', error: '' });
  const [copied, setCopied] = useState(false);
  const [retry, setRetry] = useState(0);
  const candidates = files.filter(f => f.kind === 'file' && !/\.json$/i.test(f.path) && (tab !== 'luau' || !/\.(txt|md)$/i.test(f.path)));
  const file = candidates.find(f => f.path === selected) || candidates[0];
  const key = file ? JSON.stringify([document?.designId, file.artifactId, file.path, file.revision]) : '';
  useEffect(() => {
    if (!key || !['luau', 'files'].includes(tab)) return undefined;
    const controller = new AbortController();
    setCopied(false); setSource({ key, value: '', error: '', loading: true });
    readFile({ artifactId: file.artifactId, revision: file.revision, path: file.path }, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setSource({ key, value: result.source, error: '', loading: false });
    }).catch(e => { if (!controller.signal.aborted) setSource({ key, value: '', error: e.message, loading: false }); });
    return () => controller.abort();
  }, [key, tab, readFile, file?.artifactId, file?.revision, file?.path, retry]);
  const empty = (title, message) => <div className="uc-inspect-empty"><strong>{title}</strong><p>{message}</p></div>;
  const value = source.key === key ? source.value : '';
  const ready = Boolean(key && source.key === key && !source.loading && !source.error);
  const download = () => {
    const url = URL.createObjectURL(new Blob([value], { type: 'text/plain' }));
    const link = window.document.createElement('a'); link.href = url; link.download = file.path.split('/').at(-1) + (/\.[a-z]+$/i.test(file.path) ? '' : '.luau');
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (tab === 'trash') return <div className="uc-inspect-list"><h3>Recently deleted</h3>{deletedDesigns.length ? deletedDesigns.map(d => <article className="uc-inspect-item" key={d.designId}><strong>{d.title}</strong><button className="uc-button" disabled={working} onClick={() => onRecover(d)}>Restore UI</button></article>) : empty('No deleted UIs', 'Deleted designs stay recoverable here.')}</div>;
  if (['luau','files'].includes(tab) && working && liveFiles.length) return <UiLiveFiles files={liveFiles} stage={build?.stage}/>;
  if (['luau','files'].includes(tab)) return <div className="uc-file-view">{filesError ? <div role="alert"><p>{filesError}</p><button className="uc-button" onClick={onRetryFiles}>Retry files</button></div> : null}<div className="uc-file-toolbar">
    {candidates.length ? <NexusSelect aria-label="Generated file" value={file?.path || ''} onChange={e => { setSelected(e.target.value); setCopied(false); }}>{candidates.map(f => <option key={f.path} value={f.path}>{f.path}</option>)}</NexusSelect> : <strong>Generated implementation</strong>}
    <button disabled={!ready} onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); } catch { setSource(s => ({ ...s, error: 'Clipboard unavailable. Use Download.' })); } }}>{copied ? 'Copied' : 'Copy'}</button><button disabled={!ready} onClick={download}>Download</button></div>
    {document?.sourceFiles && <button className="uc-button" disabled={!build?.modelReady} onClick={async () => { try { await downloadUiModel(document.designId); } catch (e) { setSource(s => ({ ...s, error: e.message })); } }}>Download RBXM</button>}
    {ready ? <><p className="uc-file-note">Saved revision {String(file.revision).slice(0, 10)} · Read only{working ? ' · Build continues' : ''}</p><div className="uc-file-editor"><Editor path={`inmemory://ui/${encodeURIComponent(key)}`} language="lua" theme="vs-dark" value={value} options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, automaticLayout: true, wordWrap: 'on', scrollBeyondLastLine: false }} /></div></> : source.error ? <div role="alert"><p>{source.error}</p><button className="uc-button" onClick={() => setRetry(v => v + 1)}>Retry file</button></div> : liveFiles.length ? <UiLiveFiles files={liveFiles} working={false}/> : empty(working ? 'Writing your implementation' : 'No generated files yet', working ? 'Saved Luau and files will appear here as the build progresses.' : 'Send a prompt to generate your real Roblox UI. No Studio connection is needed.')}
  </div>;
  if (tab === 'assets') return <div className="uc-inspect-list">{document?.assets?.length ? document.assets.map(a => <article className="uc-inspect-item" key={a.refId}><strong>{a.name || a.refId}</strong><small>{a.robloxAssetId ? `Published · ${a.robloxAssetId}` : a.status || 'Needs publishing'}</small></article>) : empty('No assets in this revision', 'Ask for images or icons in the conversation to add them to your UI.')}<button className="uc-button" onClick={onAssets}>Open asset library</button></div>;
  if (tab === 'interactions') {
    const interactions = (document?.screens || []).flatMap(s => s.nodes || []).flatMap(n => Object.entries(n.interactions || {}).filter(([,actions]) => actions.length).map(([event, actions]) => ({ node: n, event, actions })));
    return <div className="uc-inspect-list">{interactions.length ? interactions.map(({ node, event, actions }) => <article className="uc-inspect-item" key={node.id + event}><strong>{node.name} · {event}</strong><p>{actions.map(a => a.type.replace(/([A-Z])/g,' $1').toLowerCase()).join(', ')}</p><small>Generated Roblox behavior · test in Studio</small></article>) : empty('No interactions yet', 'Describe what happens when a player clicks, hovers, equips, or closes a panel.')}<div className="uc-suggestions">{['Add hover feedback','Add a close button','Handle an empty inventory'].map(s => <button key={s} onClick={() => onSuggest(s)}>{s}</button>)}</div></div>;
  }
  return <div className="uc-inspect-list">{document ? <><dl className="uc-revision-info"><dt>Current revision</dt><dd>{document.revision}</dd><dt>Studio application</dt><dd>{build?.appliedRevision === document.revision || build?.acknowledgedRevision === document.revision ? 'Applied to Studio' : 'Studio not applied yet'}</dd>{build?.snapshotId ? <><dt>Preview source</dt><dd>{build.snapshotId}</dd></> : null}</dl><button className="uc-button" disabled={working} onClick={onCheckpoint}>Save checkpoint</button>{onReview && document.screens?.some(s => s.nodes?.length) ? <button className="uc-button" disabled={working} onClick={onReview}>Review saved UI</button> : null}</> : null}{checkpoints.length ? checkpoints.map(c => <article className="uc-inspect-item" key={c.checkpointId}><strong>{c.reason?.replaceAll('_',' ') || 'Saved checkpoint'}</strong><small>Revision {String(c.revision).slice(0,10)}</small><button className="uc-button" disabled={working} onClick={() => onRestore(c)}>Restore as current revision</button></article>) : empty('No checkpoints yet', 'Save a checkpoint to return to this implementation later. Restoring never applies it to Studio automatically.')}</div>;
}
