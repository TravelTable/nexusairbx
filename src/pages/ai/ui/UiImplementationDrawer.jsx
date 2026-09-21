import NexusSelect from "../../../components/ui/NexusSelect";
import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import UiLiveFiles from './UiLiveFiles';
import { downloadUiModel } from '../../../lib/uiDesignApi';

function ReadOnlySourceEditor({ editorKey, value }) {
  const hostRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let frame = null;
    const layout = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = null;
        editorRef.current?.layout();
      });
    };
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(layout) : null;
    if (observer) observer.observe(host);
    else window.addEventListener('resize', layout);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', layout);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="uc-file-editor" ref={hostRef}><Editor
    path={`inmemory://ui/${encodeURIComponent(editorKey)}`}
    language="lua" theme="vs-dark" value={value}
    onMount={(editor) => { editorRef.current = editor; editor.layout(); }}
    options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, automaticLayout: false, wordWrap: 'on', scrollBeyondLastLine: false }}
  /></div>;
}

export default function UiImplementationDrawer({ tab, document, files = [], readFile, working, checkpoints = [],
  onCheckpoint, onRestore, onAssets, build, liveFiles = [], onSuggest, deletedDesigns = [], onRecover, filesError = '', onRetryFiles, onReview, hasRepairBrief = false }) {
  const [selected, setSelected] = useState('');
  const [source, setSource] = useState({ key: '', value: '', error: '' });
  const [modelError, setModelError] = useState('');
  const [copied, setCopied] = useState(false);
  const [retry, setRetry] = useState(0);
  const savedSource = !files.length && Array.isArray(document?.sourceFiles)
    ? document.sourceFiles.filter(f => typeof f?.path === 'string' && typeof f.content === 'string')
      .map(f => ({ kind: 'file', path: f.path, revision: document.revision, savedContent: f.content }))
    : [];
  const candidates = (savedSource.length ? savedSource : files)
    .filter(f => f.kind === 'file' && !/\.json$/i.test(f.path) && (tab !== 'luau' || !/\.(txt|md)$/i.test(f.path)));
  const file = candidates.find(f => f.path === selected) || candidates[0];
  const key = file ? JSON.stringify([document?.designId, file.artifactId || 'saved-source', file.path, file.revision]) : '';
  useEffect(() => {
    if (!key || !['luau', 'files'].includes(tab)) return undefined;
    setCopied(false);
    if (typeof file.savedContent === 'string') {
      setSource({ key, value: file.savedContent, error: '', loading: false });
      return undefined;
    }
    const controller = new AbortController();
    setSource({ key, value: '', error: '', loading: true });
    readFile({ artifactId: file.artifactId, revision: file.revision, path: file.path }, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setSource({ key, value: result.source, error: '', loading: false });
    }).catch(e => { if (!controller.signal.aborted) setSource({ key, value: '', error: e.message, loading: false }); });
    return () => controller.abort();
  }, [key, tab, readFile, file?.artifactId, file?.revision, file?.path, file?.savedContent, retry]);
  const empty = (title, message) => <div className="uc-inspect-empty"><strong>{title}</strong><p>{message}</p></div>;
  const value = source.key === key ? source.value : '';
  const ready = Boolean(key && source.key === key && !source.loading && !source.error);
  const reviewable = Boolean(document?.revision && (document.sourceFiles?.length || document.screens?.some(s => s.nodes?.length)));
  useEffect(() => { setModelError(''); }, [document?.designId, document?.revision]);
  const download = () => {
    const url = URL.createObjectURL(new Blob([value], { type: 'text/plain' }));
    const link = window.document.createElement('a'); link.href = url; link.download = file.path.split('/').at(-1) + (/\.[a-z]+$/i.test(file.path) ? '' : '.luau');
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (tab === 'trash') return <div className="uc-inspect-list"><h3>Recently deleted</h3>{deletedDesigns.length ? deletedDesigns.map(d => <article className="uc-inspect-item" key={d.designId}><strong>{d.title}</strong><button className="uc-button" disabled={working} onClick={() => onRecover(d)}>Restore UI</button></article>) : empty('No deleted UIs', 'Deleted designs stay recoverable here.')}</div>;
  if (['luau','files'].includes(tab) && working && liveFiles.length && !savedSource.length) return <UiLiveFiles files={liveFiles} stage={build?.stage}/>;
  if (['luau','files'].includes(tab)) return <div className="uc-file-view">{filesError && !savedSource.length ? <div role="alert"><p>{filesError}</p><button className="uc-button" onClick={onRetryFiles}>Retry files</button></div> : null}<div className="uc-file-toolbar">
    {candidates.length ? <NexusSelect aria-label="Generated file" value={file?.path || ''} onChange={e => { setSelected(e.target.value); setCopied(false); }}>{candidates.map(f => <option key={f.path} value={f.path}>{f.path}</option>)}</NexusSelect> : <strong>Generated implementation</strong>}
    <button disabled={!ready} onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); } catch { setSource(s => ({ ...s, error: 'Clipboard unavailable. Use Download.' })); } }}>{copied ? 'Copied' : 'Copy'}</button><button disabled={!ready} onClick={download}>Download</button></div>
    {Boolean(document?.sourceFiles?.length) && <><button className="uc-button" onClick={async () => { setModelError(''); try { await downloadUiModel(document.designId); } catch (e) { setModelError(e.message); } }}>Download RBXM</button>{modelError ? <p role="alert">{modelError}</p> : null}</>}
    {ready ? <><p className="uc-file-note">Saved · Read only{working ? ' · Build continues' : ''}</p><ReadOnlySourceEditor editorKey={key} value={value}/></> : source.error ? <div role="alert"><p>{source.error}</p><button className="uc-button" onClick={() => setRetry(v => v + 1)}>Retry file</button></div> : liveFiles.length ? <UiLiveFiles files={liveFiles} working={false}/> : empty(working ? 'Writing your implementation' : 'No generated files yet', working ? 'Saved code and files will appear here as the build progresses.' : 'Send a prompt to generate your real Roblox UI. No Studio connection is needed.')}
  </div>;
  if (tab === 'assets') return <div className="uc-inspect-list">{document?.assets?.length ? document.assets.map(a => <article className="uc-inspect-item" key={a.refId}><strong>{a.name || a.refId}</strong><small>{a.robloxAssetId ? `Published · ${a.robloxAssetId}` : a.status || 'Needs publishing'}</small></article>) : empty('No assets in this UI', 'Ask for images or icons in the conversation to add them to your UI.')}<button className="uc-button" onClick={onAssets}>Open asset library</button></div>;
  if (tab === 'interactions') {
    if (document?.sourceFiles) return <div className="uc-inspect-list"><article className="uc-inspect-item"><strong>Runtime verification required</strong><p>Generated behavior lives in the saved LocalScripts and is not executed by the visual preview.</p><small>Studio edits are protected by full source and UI-tree conflict checks. Test clicks, close behavior, purchases, persistence, and error states in Roblox before shipping.</small></article><div className="uc-suggestions">{['Add hover feedback','Add a close button','Handle an empty inventory'].map(s => <button key={s} onClick={() => onSuggest(s)}>{s}</button>)}</div></div>;
    const interactions = (document?.screens || []).flatMap(s => s.nodes || []).flatMap(n => Object.entries(n.interactions || {}).filter(([,actions]) => actions.length).map(([event, actions]) => ({ node: n, event, actions })));
    return <div className="uc-inspect-list">{interactions.length ? interactions.map(({ node, event, actions }) => <article className="uc-inspect-item" key={node.id + event}><strong>{node.name} · {event}</strong><p>{actions.map(a => a.type.replace(/([A-Z])/g,' $1').toLowerCase()).join(', ')}</p><small>Generated Roblox behavior · test in Studio</small></article>) : empty('No interactions yet', 'Describe what happens when a player clicks, hovers, equips, or closes a panel.')}<div className="uc-suggestions">{['Add hover feedback','Add a close button','Handle an empty inventory'].map(s => <button key={s} onClick={() => onSuggest(s)}>{s}</button>)}</div></div>;
  }
  return <div className="uc-inspect-list">{document ? <><article className="uc-inspect-item"><strong>Current UI</strong><small>{document.title || 'Untitled UI'}</small></article><button className="uc-button" disabled={working} onClick={onCheckpoint}>Save to history</button>{onReview && reviewable ? <button className="uc-button" disabled={working} onClick={onReview}>{hasRepairBrief ? 'Repair saved UI' : 'Review saved UI'}</button> : null}</> : null}{checkpoints.length ? checkpoints.map(c => <article className="uc-inspect-item" key={c.checkpointId}><strong>{c.reason?.replaceAll('_',' ') || 'Saved state'}</strong><button className="uc-button" disabled={working} onClick={() => onRestore(c)}>Restore this state</button></article>) : empty('No history yet', 'Save the current UI here when you want a restore point. Restoring it never applies changes to Studio automatically.')}</div>;
}
