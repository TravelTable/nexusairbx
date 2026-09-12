import React, { useCallback, useEffect, useRef, useState } from 'react';
import CreationPromptComposer from '../../../components/ai/chat/CreationPromptComposer';
import MessageList from '../../../components/ai/chat/MessageList';
import { Conversation, ConversationContent, ConversationScrollButton } from '../../../components/ai-elements/conversation';
import UiPreviewPane from './UiPreviewPane';
import UiLiveFiles from './UiLiveFiles';
import UiCreatorChrome from './UiCreatorChrome';
import UiImplementationDrawer from './UiImplementationDrawer';
import { createUiDesign, listUiDesigns, getUiDesign, renameUiDesign, deleteUiDesign, recoverUiDesign,
  createUiCheckpoint, listUiCheckpoints, restoreUiCheckpoint } from '../../../lib/uiDesignApi';
import { getUiPreviewManifest, requestUiCapture, readUiCapture } from '../../../lib/uiPreviewApi';
import { createTask, getTask, getTaskEvents, streamTaskEvents, cancelTask, approveTask } from '../../../lib/taskRuntimeApi';
import { getBuildWorkspaceSnapshot, readBuildWorkspaceFile } from '../../../lib/buildWorkspaceApi';
import useChatAttachmentUpload from '../../../hooks/useChatAttachmentUpload';
import { normalizeChatAttachments } from '../../../lib/chatAttachments';
import { askUiQuestion, watchUiConversation } from '../../../lib/uiConversation';
import './UiCreatorWorkspace.css';

export const UI_BUILD_LABELS = { generating: 'Writing UI files', preparing: 'Saving files', building_model: 'Building RBXM', applying: 'Checking Studio',
  awaiting_studio: 'Applying to Studio', capturing: 'Capturing UI', awaiting_capture: 'Capturing UI', design_preview: 'Preparing preview', rendering: 'Rendering preview',
  awaiting_renders: 'Rendering preview', reviewing: 'Reviewing the render', repairing: 'Refining your UI', complete: 'Visually reviewed', saved: 'Saved',
  preview_unavailable: 'Preview unavailable', needs_review: 'Review needs attention', renderer_limited: 'Preview limitations',
  budget_exhausted: 'Review budget reached', failed: 'Build needs attention' };
const actions = { understanding_request: 'Understanding your request', planning_design: 'Planning the design', resolving_assets: 'Resolving icons and assets', generating_artwork: 'Generating artwork', writing_ui: 'Writing your UI', rendering_desktop: 'Rendering desktop', rendering_mobile: 'Rendering mobile', reviewing_design: 'Reviewing design quality', improving_design: 'Improving the design', finding_assets: 'Finding icons and images', uploading_assets: 'Uploading images to Roblox', building_layout: 'Building UI layout', writing_implementation: 'Writing UI implementation', validating_implementation: 'Checking UI implementation' };
const ended = new Set(['complete','saved','preview_unavailable','needs_review','renderer_limited','budget_exhausted','failed']);
const terminalTask = task => ended.has(task?.uiBuild?.stage) || ['cancelled','failed','succeeded'].includes(task?.status);
const metadata = { workspace: 'ui_creator', displayPolicy: 'ui_build' };

export default function UiCreatorWorkspace({ user, projectId, projectTitle, modelVersion, studio, studioSessionId,
  isStarterOrAbove, onRequireStarter, onRequireAuth, onBillingRefresh, notify, navigateTo,
  modelControl, studioControl, onModeChange, onChangeProject, onOpenEvidence, onOpenStudio,
  sharedHeader = false, headerActionTarget = null, onHeaderModalChange }) {
  const [designs, setDesigns] = useState([]), [design, setDesign] = useState(null), [task, setTask] = useState(null);
  const [events, setEvents] = useState([]), [history, setHistory] = useState([]), [answer, setAnswer] = useState('');
  const [files, setFiles] = useState([]), [manifest, setManifest] = useState(null), [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState([]), [drawer, setDrawer] = useState('');
  const [checkpoints, setCheckpoints] = useState([]), [busy, setBusy] = useState(''), [error, setError] = useState('');
  const [pendingPrompt, setPendingPrompt] = useState(''), [connection, setConnection] = useState(''), [undo, setUndo] = useState(null);
  const [connectApply, setConnectApply] = useState(null);
  const [deletedDesigns, setDeletedDesigns] = useState([]);
  const [filesError, setFilesError] = useState('');
  const [previewIdentity, setPreviewIdentity] = useState('');
  const onRenderStatus = useCallback(result => { if (result.status === 'ready') setPreviewIdentity(result.sourceRevision); }, []);
  const scope = `${user?.uid || ''}:${projectId || ''}`;
  const lastOpenKey = `nexusrbx:ui:last-open:${scope}`;
  const mode = 'agent';
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const designRef = useRef(design); designRef.current = design;
  const drawerRef = useRef(drawer); drawerRef.current = drawer;
  const askController = useRef(null), requestKey = useRef(null), applyRequestKey = useRef(null), loadSequence = useRef(0), lock = useRef(false);
  const document = design?.document, build = task?.uiBuild, taskId = task?.taskId;
  const active = Boolean(task && !terminalTask(task) && (task.mode === 'agent' || build));
  const working = Boolean(busy) || active;
  const studioReady = Boolean(studio?.connected && studioSessionId);
  const nodes = document?.screens?.flatMap(s => s.nodes || []) || [];
  const saved = nodes.length > 0 || Boolean(document?.sourceFiles?.length);
  // Only the authoritative design receipt can mark a revision applied. A
  // pending/acknowledged command still needs its matching Studio readback.
  const applied = saved && Boolean(studioSessionId) && design?.appliedRevision === document?.revision && design?.appliedSessionId === studioSessionId;
  const currentBuild = build?.sourceRevision === document?.revision;
  const applyIntent = task?.intent?.uiIntent === 'apply';
  const applyState = applied ? 'Applied' : currentBuild && ['capturing','awaiting_capture'].includes(build?.stage)
    ? 'Acknowledged · verifying' : currentBuild && build?.stage === 'awaiting_studio'
      ? 'Awaiting Studio acknowledgement' : currentBuild && build?.stage === 'applying'
        ? 'Applying' : applyIntent && (task?.outcomeUnknown || build?.outcome === 'studio_state_uncertain')
          ? 'Application outcome uncertain' : applyIntent && ['failed','cancelled'].includes(task?.status)
            ? 'Apply failed' : 'Not applied to this Studio';
  const visuallyReviewed = currentBuild && build?.stage === 'complete' && build?.outcome === 'visual_review_passed';
  const report = useCallback(e => setError(e?.message || String(e)), []);
  const closeDrawer = useCallback(() => setDrawer(''), []);
  const fileScope = JSON.stringify(task ? { taskId, projectId, chatId: task.chatId } : null);
  const readFile = useCallback((reference, options) => readBuildWorkspaceFile(JSON.parse(fileScope), reference, options), [fileScope]);
  const attachmentUpload = useChatAttachmentUpload({ attachments, setAttachments, user, notify, enabled: true, modelsEnabled: false });
  const conversationId = design?.chatId || document?.chatId || document?.designId;
  const allowed = () => { if (!user) { onRequireAuth?.(); return false; } if (!isStarterOrAbove) { onRequireStarter?.(); return false; } if (!projectId) { onChangeProject?.(); return false; } return true; };
  const assign = useCallback(record => { designRef.current = record; setDesign(record); setDesigns(all => all.map(d => d.designId === record.designId ? { ...d, title: record.title || record.document?.title, revision: record.revision } : d)); }, []);
  const refreshManifest = useCallback(async () => {
    const id = designRef.current?.designId, requestScope = scopeRef.current;
    if (!id) return;
    try { const result = await getUiPreviewManifest(id); if (scopeRef.current === requestScope && designRef.current?.designId === id) setManifest(result); }
    catch (e) { if (scopeRef.current === requestScope && designRef.current?.designId === id) report(e); }
  }, [report]);
  const resetSession = useCallback(() => { askController.current?.abort(); designRef.current = null; setDesign(null); setTask(null); setEvents([]); setFiles([]); setFilesError(''); setManifest(null); setHistory([]); setAnswer(''); setPendingPrompt(''); setCheckpoints([]); setConnectApply(null); }, []);
  const load = useCallback(async id => {
    const requestScope = scopeRef.current, sequence = ++loadSequence.current;
    const current = () => requestScope === scopeRef.current && sequence === loadSequence.current;
    resetSession(); setBusy('Opening UI'); setError('');
    try {
      const result = await getUiDesign(id);
      if (!current()) return;
      assign(result.design);
      const results = await Promise.allSettled([getUiPreviewManifest(id), result.design.activeUiTaskId ? getTask(result.design.activeUiTaskId) : Promise.resolve(null)]);
      if (!current()) return;
      if (results[0].status === 'fulfilled') setManifest(results[0].value);
      if (results[1].status === 'fulfilled') setTask(results[1].value?.task || null);
      else report(results[1].reason);
    } catch (e) { if (current()) report(e); } finally { if (current()) setBusy(''); }
  }, [assign, report, resetSession]);
  useEffect(() => {
    let stopped = false; ++loadSequence.current; resetSession(); setDesigns([]); setPrompt(''); setAttachments([]); setDrawer(''); setUndo(null); setError(''); setBusy(''); lock.current = false;
    if (!user?.uid || !isStarterOrAbove || !projectId) return undefined;
    setBusy('Loading project');
    listUiDesigns(projectId).then(async result => {
      if (stopped) return;
      const available = result.designs || [];
      setDesigns(available);
      let lastOpen = '';
      try { lastOpen = window.localStorage.getItem(lastOpenKey) || ''; } catch {}
      if (lastOpen && available.some(item => item.designId === lastOpen)) await load(lastOpen);
      else setBusy('');
    }).catch(e => { if (!stopped) { report(e); setBusy(''); } });
    return () => { stopped = true; };
  }, [scope, user?.uid, projectId, isStarterOrAbove, lastOpenKey, load, report, resetSession]);
  useEffect(() => {
    if (!document?.designId) return;
    try { window.localStorage.setItem(lastOpenKey, document.designId); } catch {}
  }, [document?.designId, lastOpenKey]);
  useEffect(() => {
    setHistory([]); setAnswer('');
    if (!user?.uid || !conversationId) return undefined;
    const unsubscribe = watchUiConversation(user.uid, conversationId, setHistory, report);
    return () => { unsubscribe?.(); askController.current?.abort(); };
  }, [user?.uid, conversationId, report]);

  // One SSE stream per task, with cursor-based polling fallback and guarded refreshes.
  useEffect(() => {
    if (!taskId || !document?.designId) return undefined;
    const controller = new AbortController(), id = document.designId;
    let stopped = false, timer, afterSequence = 0, refreshing = false, refreshAgain = false;
    const current = () => !stopped && designRef.current?.designId === id;
    const append = entries => setEvents(previous => [...previous, ...entries].filter((e, i, all) => all.findIndex(other => other.eventId === e.eventId) === i));
    const refresh = async () => {
      if (refreshing) { refreshAgain = true; return; } refreshing = true;
      try {
        const result = await getTaskEvents(taskId, { afterSequence });
        if (!current()) return;
        if (result.task?.intent?.designId !== id || result.task.projectId !== projectId) throw new Error('This build belongs to another project.');
        if ((result.lastSequence || 0) < afterSequence) return;
        afterSequence = Math.max(afterSequence, result.lastSequence || 0); append(result.events || []); setTask(result.task);
        const results = await Promise.allSettled([getUiDesign(id), getUiPreviewManifest(id), result.task.uiBuild?.artifactId && ['luau', 'files'].includes(drawerRef.current) ? getBuildWorkspaceSnapshot({ taskId, projectId, chatId: result.task.chatId }) : Promise.resolve(null)]);
        if (!current()) return;
        if (results[0].status === 'fulfilled') assign(results[0].value.design);
        if (results[1].status === 'fulfilled') setManifest(results[1].value);
        if (results[2].status === 'fulfilled' && results[2].value) { setFiles(results[2].value.items || []); setFilesError(''); }
        else if (results[2].status === 'rejected') setFilesError('Saved files could not be loaded. Your build continues.');
        if (terminalTask(result.task)) { stopped = true; controller.abort(); clearTimeout(timer); setConnection(''); onBillingRefresh?.(); }
      } catch (e) { if (current()) setConnection('Reconnecting to your saved build…'); }
      finally { refreshing = false; if (refreshAgain && current()) { refreshAgain = false; void refresh(); } }
    };
    const fallback = async () => { await refresh(); if (current()) timer = setTimeout(fallback, 5000); };
    void fallback();
    if (typeof streamTaskEvents === 'function') streamTaskEvents(taskId, { afterSequence, signal: controller.signal, onEvent: async event => {
      if (!current() || Number(event.sequence || 0) <= afterSequence) return;
      afterSequence = Math.max(afterSequence, event.sequence || 0); append([event]);
      if (event.eventType === 'ui_build_progress' && event.payload?.designId === id) {
        setTask(t => ({ ...t, uiBuild: event.payload })); setConnection('');
        if (['generating', 'repairing'].includes(event.payload.stage) && event.payload.sourceFiles?.length) return;
      }
      void refresh();
    } }).catch(() => { if (current()) setConnection('Live updates reconnecting. Your build continues.'); });
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [taskId, document?.designId, projectId, assign, onBillingRefresh]);

  const createBlank = async (title = 'Untitled UI') => {
    const requestScope = scopeRef.current;
    const result = await createUiDesign({ projectId, title });
    if (requestScope !== scopeRef.current) return null;
    ++loadSequence.current; resetSession(); assign(result.design); setDesigns(all => [result.design, ...all]); return result.design;
  };
  const submit = async (event, override, freshTitle) => {
    event?.preventDefault?.();
    // ChatComposer supplies request options in argument three; only templates
    // provide a title and intentionally start a fresh design.
    freshTitle = typeof freshTitle === 'string' ? freshTitle : '';
    if (!allowed() || working || lock.current) return;
    const draft = (typeof override === 'string' ? override : prompt).trim(); if (!draft) return;
    lock.current = true; const requestScope = scopeRef.current; setBusy('Starting build'); setError('');
    try {
      const target = freshTitle || !designRef.current ? await createBlank(freshTitle || 'Untitled UI') : designRef.current;
      if (!target || requestScope !== scopeRef.current) return;
      const targetDoc = target.document; const selectedMode = freshTitle ? 'agent' : mode;
      const input = { message: draft, mode: selectedMode, workspace: 'ui_creator', designId: target.designId,
        baseRevision: targetDoc.revision, uiIntent: targetDoc.sourceFiles?.length || targetDoc.screens?.some(s => s.nodes?.length) ? 'edit' : 'create', projectId,
        chatId: target.chatId || target.designId, attachments: normalizeChatAttachments(attachments, { includeData: false }),
        executionInput: { settings: { modelVersion }, applyMode: 'manual_review', studioEnabled: false } };
      const inputKey = JSON.stringify(input);
      if (requestKey.current?.input !== inputKey) requestKey.current = { input: inputKey, key: `ui-task:${crypto.randomUUID()}` };
      setPendingPrompt(draft); setPrompt('');
      const result = await createTask(input, { idempotencyKey: requestKey.current.key });
      if (scopeRef.current !== requestScope || designRef.current?.designId !== input.designId) return;
      if (selectedMode === 'ask') {
        setBusy('Answering'); const controller = new AbortController(); askController.current = controller;
        await askUiQuestion({ uid: user.uid, chatId: input.chatId, projectId, prompt: draft, modelVersion, attachments: input.attachments,
          operationId: requestKey.current.key + ':answer', conversation: history, signal: controller.signal,
          onText: text => { if (scopeRef.current === requestScope && designRef.current?.designId === input.designId) setAnswer(text); } });
        setAnswer(''); onBillingRefresh?.();
      } else if (result.task?.taskId) { setTask(result.task); setEvents([]); setFiles([]); setFilesError(''); }
      else {
        setAnswer(result.classification?.reply || result.decision?.message || result.decision?.reasons?.[0] || result.message || 'Describe the UI you want to build.');
        if (result.kind === 'blocked' || result.kind === 'clarification') setPrompt(draft);
      }
      setAttachments([]); requestKey.current = null;
    } catch (e) { if (scopeRef.current === requestScope && e.name !== 'AbortError') { report(e); setPrompt(draft); } }
    finally { if (scopeRef.current === requestScope) { setBusy(''); lock.current = false; } }
  };
  const applySaved = useCallback(async () => {
    const target = designRef.current;
    if (!target || !studioReady || working || lock.current) return;
    lock.current = true; const requestScope = scopeRef.current; setBusy('Applying to Studio'); setError('');
    const applyIdentity = JSON.stringify([requestScope, target.designId, target.document.revision]);
    if (applyRequestKey.current?.identity !== applyIdentity) applyRequestKey.current = { identity: applyIdentity, key: `ui-apply:${crypto.randomUUID()}` };
    try {
      const result = await createTask({ message: 'Apply this saved UI in Studio and review its appearance.', mode: 'agent', workspace: 'ui_creator',
        designId: target.designId, baseRevision: target.document.revision, uiIntent: 'apply', projectId, chatId: target.chatId || target.designId,
        executionInput: { settings: { modelVersion }, applyMode: 'auto_after_approval', studioEnabled: true } }, { idempotencyKey: applyRequestKey.current.key });
      if (requestScope === scopeRef.current && designRef.current?.designId === target.designId) { setTask(result.task); setEvents([]); setConnectApply(null); applyRequestKey.current = null; }
    } catch (e) { if (requestScope === scopeRef.current) report(e); } finally { if (requestScope === scopeRef.current) { setBusy(''); lock.current = false; } }
  }, [studioReady, working, projectId, modelVersion, report]);
  useEffect(() => { if (connectApply && connectApply === document?.designId && studioReady && !working) { setConnectApply(null); void applySaved(); } }, [connectApply, document?.designId, studioReady, working, applySaved]);
  const connect = () => { if (saved) setConnectApply(document.designId); onOpenStudio?.(); };
  const retryReview = async () => {
    if (!allowed() || !saved || working || lock.current) return;
    const requestScope = scopeRef.current, target = designRef.current;
    lock.current = true; setBusy('Reviewing the render'); setError('');
    const input = { message: 'Review the saved UI on desktop and phone, including its declared states. Preserve the implementation unless an observed visual defect requires a repair.',
      mode: 'agent', workspace: 'ui_creator', designId: target.designId, baseRevision: target.document.revision,
      uiIntent: 'review', projectId, chatId: target.chatId || target.designId,
      executionInput: { settings: { modelVersion }, studioEnabled: false } };
    const identity = JSON.stringify(input);
    if (requestKey.current?.input !== identity) requestKey.current = { input: identity, key: `ui-review:${crypto.randomUUID()}` };
    try {
      const result = await createTask(input, { idempotencyKey: requestKey.current.key });
      if (scopeRef.current !== requestScope || designRef.current?.designId !== target.designId) return;
      if (!result.task?.taskId) throw new Error(result.decision?.message || result.message || 'The review could not start.');
      setTask(result.task); setEvents([]); requestKey.current = null;
    } catch (e) { if (scopeRef.current === requestScope) report(e); }
    finally { if (scopeRef.current === requestScope) { lock.current = false; setBusy(''); } }
  };
  const sync = async () => {
    if (!document || working || !studioReady) return;
    const id = document.designId, revision = document.revision, requestScope = scopeRef.current;
    const current = () => scopeRef.current === requestScope && designRef.current?.designId === id && designRef.current?.document?.revision === revision;
    setBusy('Capturing UI'); setError('');
    try {
      let record = await requestUiCapture(id, { sourceRevision: revision, mode: 'studio_edit' }, { idempotencyKey: `ui-capture:${crypto.randomUUID()}` });
      const captureId = record.captureRequestId, deadline = Date.now() + 90000;
      while (current() && !['ready','failed','unavailable'].includes(record.status) && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 1000)); if (!current()) return; record = await readUiCapture(id, captureId);
      }
      if (!current()) return; if (record.status !== 'ready') throw new Error(record.message || 'Capture is still pending. Retry Recapture Studio.');
      await refreshManifest(); const updated = await getUiDesign(id); if (current()) assign(updated.design);
    } catch (e) { if (current()) report(e); } finally { if (scopeRef.current === requestScope) setBusy(''); }
  };
  const openDrawer = async name => {
    setDrawer(name);
    if (name === 'trash' && allowed()) { const requestScope = scopeRef.current; try { const result = await listUiDesigns(projectId, true); if (requestScope === scopeRef.current) setDeletedDesigns(result.designs || []); } catch (e) { report(e); } }
    if (['luau','files'].includes(name) && taskId && (filesError || !files.length)) { const id = document?.designId; try { const output = await getBuildWorkspaceSnapshot(JSON.parse(fileScope)); if (designRef.current?.designId === id) { setFiles(output.items || []); setFilesError(''); } } catch (e) { setFilesError(e.message); } }
    if (name === 'history' && document) { const id = document.designId; try { const result = await listUiCheckpoints(id); if (designRef.current?.designId === id) setCheckpoints(result.checkpoints || []); } catch (e) { report(e); } }
  };
  const stop = async () => { if (busy === 'Answering') { askController.current?.abort(); return; } if (taskId) try { await cancelTask(taskId); setTask(t => ({ ...t, status: 'cancelled' })); } catch (e) { report(e); } };
  const newUI = async () => { if (working || !allowed()) return; ++loadSequence.current; resetSession(); try { window.localStorage.removeItem(lastOpenKey); } catch {} setPrompt(''); setAttachments([]); setError(''); setDrawer(''); };
  const checkpoint = async () => { try { await createUiCheckpoint(document.designId, { expectedRevision: document.revision }); await openDrawer('history'); } catch (e) { report(e); } };
  const restore = async c => { try { await restoreUiCheckpoint(document.designId, c.checkpointId, document.revision); await load(document.designId); } catch (e) { report(e); } };
  const rename = async title => { try { await renameUiDesign(document.designId, document.revision, title); await load(document.designId); } catch (e) { report(e); } };
  const remove = async () => { const target = design; if (!target || working) return; try { await deleteUiDesign(target.designId); setUndo(target); setDesigns(all => all.filter(d => d.designId !== target.designId)); resetSession(); setDrawer(''); } catch (e) { report(e); } };
  const recover = async (target = undo) => { if (!target?.designId) return; try { await recoverUiDesign(target.designId); setDesigns(all => [target, ...all.filter(d => d.designId !== target.designId)]); await load(target.designId); setDeletedDesigns(all => all.filter(d => d.designId !== target.designId)); setUndo(null); } catch (e) { report(e); } };
  const messages = history.map(m => ({ ...m, metadata: { ...m.metadata, ...metadata } }));
  const livePrompt = pendingPrompt || task?.intent?.original;
  const showPrompt = livePrompt && !messages.some(m => m.role === 'user' && m.content === livePrompt);
  const progress = events.filter(e => e.eventType === 'ui_build_progress').map(e => actions[e.payload?.action] || UI_BUILD_LABELS[e.payload?.stage]).filter(Boolean).filter((label, i, all) => i === 0 || label !== all[i - 1]);
  const status = busy || connection || (task?.status === 'cancelled' ? 'Stopped · saved work retained' : actions[build?.action] || UI_BUILD_LABELS[build?.stage]) || '';
  const conversation = <><Conversation className="ui-creator__conversation"><ConversationContent className="ui-creator__messages">
    {messages.length ? <MessageList messages={messages} activeMode="ui" isBusy={working} studioConnected={studioReady} studioSessionId={studioSessionId} notify={notify}/> : null}
    {showPrompt ? <div className="uc-session-message">{livePrompt}</div> : null}
    {progress.length ? <ol className="uc-live-actions" aria-label="Build actions">{progress.map((label, i) => <li key={i} data-active={active && i === progress.length - 1} data-attention={i === progress.length - 1 && ['failed', 'budget_exhausted', 'preview_unavailable', 'needs_review', 'renderer_limited'].includes(build?.stage)}>{label}</li>)}</ol> : active ? <p className="uc-file-note">Starting your build…</p> : null}
    {answer ? <MessageList messages={[{ id: 'live-answer', role: 'assistant', content: answer, metadata }]} activeMode="ui" isBusy={working}/> : null}
    {!working && saved && build?.stage === 'failed' && (build.errorCode === 'UI_VISUAL_REVIEW_INCOMPLETE' || build.message === 'Invalid UI visual review.') ? <button type="button" className="uc-button" onClick={retryReview}>Retry review</button> : null}
    {task?.mode === 'plan' && !build ? <div className="uc-session-message"><p>{task.intent?.normalizedGoal}</p><button className="uc-button uc-primary" onClick={async () => { try { const result = await approveTask(taskId, { executionInput: { settings: { modelVersion }, applyMode: 'manual_review', studioEnabled: false } }); setTask(result.task); } catch (e) { report(e); } }}>Build this plan</button></div> : null}
  </ConversationContent><ConversationScrollButton/></Conversation>{active || busy === 'Answering' ? <div className="uc-conversation-footer"><button onClick={stop}>Stop {busy === 'Answering' ? 'response' : 'build'}</button></div> : null}</>;
  const composer = <CreationPromptComposer prompt={prompt} setPrompt={setPrompt} attachments={attachments} setAttachments={setAttachments}
    onFileUpload={attachmentUpload.upload} onRetryAttachment={attachmentUpload.retry} onSubmit={submit} onStop={stop} onCancel={stop}
    isGenerating={working} disabled={busy === 'Starting build'} placeholder="Describe your UI…" promptAriaLabel="UI prompt" submitLabel="Send prompt"
    mode={mode} showDock={false} showWorkspaceOptions={false} modeControl={null}
    studioConnectionRequired={false} studioConnected={studioReady} studioConnectionType={studio?.connectionType}/>;
  const showLiveFiles = active && (['generating', 'repairing', 'preparing', 'building_model', 'design_preview'].includes(build?.stage)
    || Boolean(build?.sourceFiles?.length && previewIdentity !== build?.sourceRevision));
  const livePreview = <><div hidden={showLiveFiles} style={{ height: '100%' }}><UiPreviewPane userId={user?.uid} designId={document?.designId} projectId={projectId} sourceRevision={document?.revision}
    capture={manifest?.capture} states={manifest?.states || []} viewports={manifest?.viewports || []} capabilities={manifest?.capabilities}
    lastSuccessfulJobId={manifest?.lastSuccessfulPreviewJobId} renderJobs={build?.sourceRevision === document?.revision && build?.snapshotId === manifest?.capture?.snapshotId ? build?.matrix : []}
    studioConnected={studioReady} hasNodes={saved} studioReceipt={applied} onApplyToStudio={applySaved} onConnectStudio={connect}
    onRefreshCapture={studioReady && !document?.sourceFiles ? sync : undefined} sourceOwned={Boolean(document?.sourceFiles)} onRefreshManifest={refreshManifest} captureBusy={busy === 'Capturing UI'} applyBusy={working}
    updatingRevision={busy === 'Starting build' || (['generating','repairing'].includes(build?.stage) && active)} previewFailed={build?.stage === 'preview_unavailable'} buildFailure={build?.stage === 'failed' ? build.message || 'The UI build could not finish.' : null} pendingStudioCommand={build?.stage === 'awaiting_studio' ? build.commandId : null}
    onRenderStatus={onRenderStatus} run={active ? { stage: actions[build?.action] || UI_BUILD_LABELS[build?.stage] || 'Starting build' } : null}/></div>
    {showLiveFiles ? <UiLiveFiles key={taskId} files={build?.sourceFiles || []} stage={build?.stage} action={build?.action}/> : null}</>;
  return <UiCreatorChrome document={document} designs={designs} projectTitle={projectTitle} studioReady={studioReady} working={working} loading={Boolean(busy)} status={status}
    sharedHeader={sharedHeader} headerActionTarget={headerActionTarget} onHeaderModalChange={onHeaderModalChange}
    saved={saved} applied={applied} applyState={applyState} visuallyReviewed={visuallyReviewed}
    error={error} onDismissError={() => setError('')} modelControl={modelControl} studioControl={studioControl} onModeChange={onModeChange}
    onChangeProject={onChangeProject} onOpenEvidence={onOpenEvidence} onOpenStudio={connect} onAccount={() => navigateTo?.('/settings')}
    onNew={newUI} onLoad={load} onApply={applySaved} onDrawer={openDrawer} onPrompt={setPrompt} onTemplate={t => submit(null, t.prompt, t.title)}
    onRename={rename} onDelete={remove} undo={undo} onUndo={() => recover()} drawer={drawer} onCloseDrawer={closeDrawer}
    drawerContent={<UiImplementationDrawer tab={drawer} document={document} files={files} readFile={readFile} working={working} build={build} liveFiles={build?.sourceFiles || []} onReview={retryReview}
      filesError={filesError} onRetryFiles={() => openDrawer(drawer)} deletedDesigns={deletedDesigns} onRecover={recover} checkpoints={checkpoints} onCheckpoint={checkpoint} onRestore={restore} onAssets={() => navigateTo?.('/assets')} onSuggest={setPrompt}/>}
    composer={composer} conversation={conversation} livePreview={livePreview}/>;
}
