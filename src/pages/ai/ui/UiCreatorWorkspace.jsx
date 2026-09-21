import UiReferenceDetails from './UiReferenceDetails';
import ModelRequestEstimate from '../../../components/ai/ModelRequestEstimate';
import ModelRoutingNotice from '../../../components/ai/ModelRoutingNotice';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CreationPromptComposer from '../../../components/ai/chat/CreationPromptComposer';
import MessageList from '../../../components/ai/chat/MessageList';
import { Conversation, ConversationContent, ConversationScrollButton } from '../../../components/ai-elements/conversation';
import UiPreviewPane from './UiPreviewPane';
import UiLiveFiles from './UiLiveFiles';
import UiCreatorChrome from './UiCreatorChrome';
import UiImplementationDrawer from './UiImplementationDrawer';
import { createUiDesign, listUiDesigns, getUiDesign, renameUiDesign, deleteUiDesign, recoverUiDesign,
  createUiCheckpoint, listUiCheckpoints, restoreUiCheckpoint } from '../../../lib/uiDesignApi';
import { preserveFailedUiRequest } from './uiRetryContext';
import { getUiPreviewManifest, requestUiCapture, readUiCapture } from '../../../lib/uiPreviewApi';
import { createTask, getTask, getTaskEvents, streamTaskEvents, cancelTask, approveTask } from '../../../lib/taskRuntimeApi';
import { getBuildWorkspaceSnapshot, readBuildWorkspaceFile } from '../../../lib/buildWorkspaceApi';
import useChatAttachmentUpload from '../../../hooks/useChatAttachmentUpload';
import { normalizeChatAttachments } from '../../../lib/chatAttachments';
import { askUiQuestion, watchUiConversation } from '../../../lib/uiConversation';
import './UiCreatorWorkspace.css';
import UiReferencePin from './UiReferencePin';
import useUiReferencePreview from './useUiReferencePreview';
import {
  composeUiReferencePrompt,
  inferReferenceRole,
  inferReferenceTarget,
  isUiReferenceImage,
  listUiReferenceImages,
  MATCH_CLOSER_PROMPT,
  referenceAttachmentKey,
  referenceRoleLabel,
} from '../../../lib/uiReferenceSession';

import { getUiWorkspacePresentation, UI_BUILD_LABELS, UI_ACTION_LABELS as actions, UI_BUILD_TERMINAL_STAGES } from '../../../lib/runPresentation';
import { getUiChatImages, getUiGenerationCards, mergeUiChatImages, publishStateFromUpload } from '../../../lib/uiAgentFlowMessage';
import { WorkspacePresentationContext } from '../../../components/ai/workspace/WorkspacePresentationContext';
import UiLoadingChain from './UiLoadingChain';
import UiGeneratedImageFeed from './UiGeneratedImageFeed';
import { useRobloxImageUpload } from '../../../hooks/useRobloxImageUpload';
export { UI_BUILD_LABELS } from '../../../lib/runPresentation';
const terminalTask = task => UI_BUILD_TERMINAL_STAGES.has(task?.uiBuild?.stage) || ['cancelled','failed','succeeded'].includes(task?.status);
const metadata = { workspace: 'ui_creator', displayPolicy: 'ui_build' };
async function fileFromImageSrc(src, name) {
  const response = await fetch(src);
  const blob = await response.blob();
  const fileName = /\.(png|jpe?g|bmp|tga)$/i.test(name) ? name : `${String(name || 'artwork').replace(/[^\w.-]+/g, '-')}.png`;
  return new File([blob], fileName, { type: blob.type || 'image/png' });
}

export default function UiCreatorWorkspace({ user, projectId, projectTitle, modelVersion, studio, studioSessionId,
  isStarterOrAbove, onRequireStarter, onRequireAuth, onBillingRefresh, notify, navigateTo,
  modelControl, studioControl, onModeChange, onChangeProject, onOpenEvidence, onOpenStudio,
  sharedHeader = false, headerActionTarget = null, onHeaderModalChange, onPresentationChange,
  mockRuns = null, robloxStatus = null, robloxProjectAssets = [], onOpenAssetLibrary, assetLibraryOpen = false,
  onCloseAssetLibrary, onConfirmProjectAssets, onRemoveProjectAsset, projectAssetSaving = false,
  robloxSelectedCreator = null }) {
  const [designs, setDesigns] = useState([]), [design, setDesign] = useState(null), [task, setTask] = useState(null);
  const [events, setEvents] = useState([]), [history, setHistory] = useState([]), [answer, setAnswer] = useState('');
  const [files, setFiles] = useState([]), [manifest, setManifest] = useState(null), [prompt, setPrompt] = useState('');
  const [referenceMode, setReferenceMode] = useState('replicate');
  const [referenceTarget, setReferenceTarget] = useState('responsive');
  const [referenceBehaviour, setReferenceBehaviour] = useState('infer');
  const [referenceRoles, setReferenceRoles] = useState({});
  const [pinnedReferences, setPinnedReferences] = useState([]);
  const [attachments, setAttachments] = useState([]), [drawer, setDrawer] = useState('');
  const [checkpoints, setCheckpoints] = useState([]), [busy, setBusy] = useState(''), [error, setError] = useState('');
  const [pendingPrompt, setPendingPrompt] = useState(''), [connection, setConnection] = useState(''), [undo, setUndo] = useState(null);
  const [connectApply, setConnectApply] = useState(null);
  const [deletedDesigns, setDeletedDesigns] = useState([]);
  const [filesError, setFilesError] = useState('');
  const [previewIdentity, setPreviewIdentity] = useState('');
  const [chatImages, setChatImages] = useState([]);
  const [publishingId, setPublishingId] = useState('');
  const [sourceRetryCandidate, setSourceRetryCandidate] = useState(null);
  const onRenderStatus = useCallback(result => { if (result.status === 'ready') setPreviewIdentity(result.sourceRevision); }, []);
  const scope = `${user?.uid || ''}:${projectId || ''}`;
  const lastOpenKey = `nexusrbx:ui:last-open:${scope}`;
  const mode = 'agent';
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const designRef = useRef(design); designRef.current = design;
  const drawerRef = useRef(drawer); drawerRef.current = drawer;
  const askController = useRef(null), requestKey = useRef(null), applyRequestKey = useRef(null), loadSequence = useRef(0), lock = useRef(false);
  const mockActive = Boolean(mockRuns?.enabled && (mockRuns.playing || mockRuns.frame?.task || mockRuns.frame?.placeholder || mockRuns.frame?.busy));
  const document = design?.document;
  const liveTask = mockActive && mockRuns.frame?.task ? mockRuns.frame.task : task;
  const liveBusy = mockActive ? (mockRuns.frame?.busy || '') : busy;
  const liveEvents = mockActive && mockRuns.frame?.events?.length ? mockRuns.frame.events : events;
  const livePending = mockActive && mockRuns.frame?.pendingPrompt ? mockRuns.frame.pendingPrompt : pendingPrompt;
  const liveFiles = mockActive && mockRuns.frame?.sourceFiles ? mockRuns.frame.sourceFiles : null;
  const build = liveTask?.uiBuild, taskId = liveTask?.taskId;
  // A saved design can advance while its prior task remains the activeUiTaskId.
  // Keep that task for history, but never present it as work on this revision.
  const currentTask = !build?.sourceRevision || !document?.revision || build.sourceRevision === document.revision ? liveTask : null;
  const active = Boolean(currentTask && !terminalTask(currentTask) && (currentTask.mode === 'agent' || build));
  const loadingSession = ['Opening UI', 'Loading project'].includes(liveBusy);
  const working = Boolean(liveBusy && !loadingSession) || active || Boolean(mockActive && mockRuns.playing);
  const [stopping, setStopping] = useState(false);
  const presentation = useMemo(() => getUiWorkspacePresentation({ task: currentTask, busy: liveBusy, connection: mockActive ? '' : connection, stopping: mockActive ? false : stopping }), [currentTask, liveBusy, connection, stopping, mockActive]);
  useEffect(() => { onPresentationChange?.({ ...presentation, projectId }); }, [presentation, projectId, onPresentationChange]);
  useEffect(() => () => onPresentationChange?.(null), [onPresentationChange]);
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
  const robloxUpload = useRobloxImageUpload({ user, robloxStatus, currentChatId: conversationId, notify, onSignInRequired: onRequireAuth });
  useEffect(() => {
    const next = getUiChatImages({ busy: liveBusy, task: liveTask });
    if (!next.length) return;
    setChatImages((previous) => mergeUiChatImages(previous, next));
  }, [liveBusy, liveTask]);
  const publishGeneratedImage = useCallback(async (image) => {
    if (!image?.src || publishingId) return;
    if (!robloxUpload.readiness?.ready) {
      notify?.({ message: robloxUpload.readiness?.message || "Connect Roblox before publishing images.", type: "info" });
      return;
    }
    setPublishingId(image.id);
    setChatImages((previous) => previous.map((item) => item.id === image.id ? { ...item, publish: { status: "publishing" } } : item));
    try {
      const file = await fileFromImageSrc(image.src, `${image.action || image.label || "artwork"}.png`);
      const result = await robloxUpload.uploadImages([file]);
      const publish = publishStateFromUpload(result);
      setChatImages((previous) => previous.map((item) => item.id === image.id ? { ...item, publish } : item));
    } catch (error) {
      setChatImages((previous) => previous.map((item) => item.id === image.id ? { ...item, publish: { status: "failed", error: error.message } } : item));
    } finally {
      setPublishingId("");
    }
  }, [notify, publishingId, robloxUpload]);
  const allowed = () => { if (!user) { onRequireAuth?.(); return false; } if (!isStarterOrAbove) { onRequireStarter?.(); return false; } if (!projectId) { onChangeProject?.(); return false; } return true; };
  const assign = useCallback(record => { designRef.current = record; setDesign(record); setDesigns(all => all.map(d => d.designId === record.designId ? { ...d, title: record.title || record.document?.title, revision: record.revision } : d)); }, []);
  const refreshManifest = useCallback(async () => {
    const id = designRef.current?.designId, requestScope = scopeRef.current;
    if (!id) return;
    try { const result = await getUiPreviewManifest(id); if (scopeRef.current === requestScope && designRef.current?.designId === id) setManifest(result); }
    catch (e) { if (scopeRef.current === requestScope && designRef.current?.designId === id) report(e); }
  }, [report]);
  const resetSession = useCallback(() => { askController.current?.abort(); designRef.current = null; setDesign(null); setTask(null); setEvents([]); setFiles([]); setFilesError(''); setManifest(null); setPreviewIdentity(''); setChatImages([]); setHistory([]); setAnswer(''); setPendingPrompt(''); setCheckpoints([]); setConnectApply(null); setSourceRetryCandidate(null); }, []);
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
    let stopped = false; ++loadSequence.current; resetSession(); setDesigns([]); setPrompt(''); setAttachments([]); setPinnedReferences([]); setReferenceRoles({}); setReferenceMode('replicate'); setReferenceTarget('responsive'); setReferenceBehaviour('infer'); setDrawer(''); setUndo(null); setError(''); setBusy(''); lock.current = false;
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
  const retryHistoryIds = useMemo(() => [...new Set(history.filter(entry => entry.role === 'user' && entry.taskId)
    .map(entry => entry.taskId))].reverse().slice(0, 8), [history]);
  useEffect(() => {
    let stale = false;
    setSourceRetryCandidate(null);
    if (!document?.designId || saved || !retryHistoryIds.length) return undefined;
    (async () => {
      for (const id of retryHistoryIds) {
        const previous = (await getTask(id).catch(() => null))?.task;
        if (stale) return;
        if (previous?.intent?.designId === document.designId && previous.projectId === projectId
          && ['cancelled', 'failed'].includes(previous.status) && previous.uiBuild?.stage === 'generating'
          && previous.uiBuild?.action === 'writing_ui' && previous.uiBuild?.sourceRevision === document.revision
          && previous.uiBuild?.jobId && typeof previous.intent?.original === 'string') {
          setSourceRetryCandidate(previous);
          return;
        }
      }
    })();
    return () => { stale = true; };
  }, [document?.designId, document?.revision, projectId, saved, retryHistoryIds]);

  // One SSE stream per task, with cursor-based polling fallback and guarded refreshes.
  useEffect(() => {
    if (mockActive || !taskId || !document?.designId) return undefined;
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
    const resume = () => { if (current()) void refresh(); };
    void fallback();
    window.addEventListener('pageshow', resume);
    window.document?.addEventListener?.('visibilitychange', resume);
    if (typeof streamTaskEvents === 'function') streamTaskEvents(taskId, { afterSequence, signal: controller.signal, onEvent: async event => {
      if (!current() || Number(event.sequence || 0) <= afterSequence) return;
      afterSequence = Math.max(afterSequence, event.sequence || 0); append([event]);
      if (event.eventType === 'ui_build_progress' && event.payload?.designId === id) {
        setTask(t => ({
          ...t,
          uiBuild: {
            ...event.payload,
            images: Array.isArray(event.payload.images) && event.payload.images.length
              ? event.payload.images
              : (t?.uiBuild?.images || []),
          },
        })); setConnection('');
        if (['generating', 'repairing'].includes(event.payload.stage) && event.payload.sourceFiles?.length) return;
      }
      void refresh();
    } }).catch(() => { if (current()) setConnection('Live updates reconnecting. Your build continues.'); });
    return () => {
      stopped = true; clearTimeout(timer); controller.abort();
      window.removeEventListener('pageshow', resume);
      window.document?.removeEventListener?.('visibilitychange', resume);
    };
  }, [taskId, document?.designId, projectId, assign, onBillingRefresh, mockActive]);
  const createBlank = async (title = 'Untitled UI') => {
    const requestScope = scopeRef.current;
    const result = await createUiDesign({ projectId, title });
    if (requestScope !== scopeRef.current) return null;
    ++loadSequence.current; resetSession(); assign(result.design); setDesigns(all => [result.design, ...all]); return result.design;
  };
  const targetTouched = useRef(false);
  useEffect(() => {
    const images = listUiReferenceImages(attachments);
    setReferenceRoles((previous) => {
      const next = {};
      images.forEach((image, index) => {
        const key = referenceAttachmentKey(image);
        next[key] = previous[key] || inferReferenceRole(image, index, images);
      });
      return next;
    });
    if (!targetTouched.current && images[0]) setReferenceTarget(inferReferenceTarget(images[0]));
  }, [attachments]);
  useEffect(() => {
    const saved = document?.designMemory?.reference;
    if (!saved?.attachment || pinnedReferences.length) return;
    setPinnedReferences([{ ...saved.attachment, isImage: true, kind: 'image', width: saved.width, height: saved.height }]);
  }, [document?.designId, document?.designMemory?.reference, pinnedReferences.length]);
  const specImages = listUiReferenceImages(attachments).length
    ? listUiReferenceImages(attachments)
    : listUiReferenceImages(pinnedReferences);
  const pinItem = specImages.find((item) => referenceRoles[referenceAttachmentKey(item)] === 'primary') || specImages[0] || null;
  const pinSrc = useUiReferencePreview(pinItem);
  const hasReference = specImages.length > 0;
  const uploadFiles = useCallback((event) => {
    if (event?.replace) setAttachments((previous) => previous.filter((item) => !isUiReferenceImage(item)));
    attachmentUpload.upload(event);
  }, [attachmentUpload]);
  const submit = async (event, override, freshTitle) => {
    event?.preventDefault?.();
    // ChatComposer supplies request options in argument three; only templates
    // provide a title and intentionally start a fresh design.
    freshTitle = typeof freshTitle === 'string' ? freshTitle : '';
    if (!allowed() || working || loadingSession || lock.current) return;
    const draft = (typeof override === 'string' ? override : prompt).trim();
    const liveImages = listUiReferenceImages(attachments);
    const referenceImages = liveImages.length ? liveImages : listUiReferenceImages(pinnedReferences);
    if (!draft && !referenceImages.length) return;
    const roles = referenceImages.map((item, index) => {
      const key = referenceAttachmentKey(item);
      const role = referenceRoles[key] || inferReferenceRole(item, index, referenceImages);
      return { name: item.name, role, roleLabel: referenceRoleLabel(role) };
    });
    const composed = composeUiReferencePrompt({
      prompt: draft,
      hasReference: referenceImages.length > 0,
      referenceMode,
      target: referenceTarget,
      behaviour: referenceBehaviour,
      roles,
    });
    const assetHint = (robloxProjectAssets || []).map(asset => asset.robloxAssetId || asset.assetId || asset.id).filter(Boolean).map(id => `rbxassetid://${id}`).join(', ');
    const message = assetHint ? `${composed}\n\nUse these Roblox assets: ${assetHint}` : composed;
    if (referenceImages.length) setPinnedReferences(referenceImages);
    if (mockRuns?.enabled) {
      setPrompt('');
      setError('');
      setPendingPrompt(composed);
      await mockRuns.play('ui-happy-path', {
        projectId,
        chatId: designRef.current?.chatId || designRef.current?.designId || 'mock-chat',
        designId: designRef.current?.designId || 'mock-design',
        sourceRevision: designRef.current?.document?.revision || 'mock-rev',
        prompt: composed,
      });
      return;
    }
    lock.current = true; const requestScope = scopeRef.current; setBusy('Starting build'); setError('');
    try {
      const target = freshTitle || !designRef.current ? await createBlank(freshTitle || 'Untitled UI') : designRef.current;
      if (!target || requestScope !== scopeRef.current) return;
      const targetDoc = target.document; const selectedMode = freshTitle ? 'agent' : mode;
      const taskAttachments = liveImages.length ? attachments : [...referenceImages, ...attachments.filter(item => !isUiReferenceImage(item))];
      const retryMessage = preserveFailedUiRequest(message, targetDoc, history);
      const input = { message: retryMessage, mode: selectedMode, workspace: 'ui_creator', designId: target.designId,
        baseRevision: targetDoc.revision, uiIntent: targetDoc.sourceFiles?.length || targetDoc.screens?.some(s => s.nodes?.length) ? 'edit' : 'create', projectId,
        chatId: target.chatId || target.designId, attachments: normalizeChatAttachments(taskAttachments, { includeData: false }),
        executionInput: { settings: { modelVersion, referenceMode, referenceTarget, referenceBehaviour }, applyMode: 'manual_review', studioEnabled: false } };
      const inputKey = JSON.stringify(input);
      if (requestKey.current?.input !== inputKey) requestKey.current = { input: inputKey, key: `ui-task:${crypto.randomUUID()}` };
      setPendingPrompt(composed); setPrompt('');
      const result = await createTask(input, { idempotencyKey: requestKey.current.key });
      if (scopeRef.current !== requestScope || designRef.current?.designId !== input.designId) return;
      if (selectedMode === 'ask') {
        setBusy('Answering'); const controller = new AbortController(); askController.current = controller;
        await askUiQuestion({ uid: user.uid, chatId: input.chatId, projectId, prompt: composed, modelVersion, attachments: input.attachments,
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
  const retrySavedSource = async () => {
    const previous = sourceRetryCandidate, target = designRef.current;
    if (!previous || !target || !allowed() || working || lock.current) return;
    lock.current = true; setBusy('Retrying source'); setError('');
    try {
      const input = { message: previous.intent.original, mode: 'agent', workspace: 'ui_creator',
        designId: target.designId, baseRevision: target.document.revision, uiIntent: previous.intent.uiIntent,
        retryFromJobId: previous.uiBuild.jobId, projectId, chatId: target.chatId || target.designId,
        attachments: previous.intent.attachments || [],
        executionInput: { settings: { modelVersion, referenceMode, referenceTarget, referenceBehaviour },
          applyMode: 'manual_review', studioEnabled: false } };
      const result = await createTask(input, { idempotencyKey: `ui-source-retry:${crypto.randomUUID()}` });
      if (designRef.current?.designId === input.designId && result.task?.taskId) {
        setPendingPrompt(input.message); setTask(result.task); setEvents([]); setFiles([]); setFilesError('');
        setSourceRetryCandidate(null);
      }
    } catch (e) { report(e); }
    finally { lock.current = false; setBusy(''); }
  };
  const applySaved = useCallback(async () => {
    const target = designRef.current;
    if (mockRuns?.enabled || !target || !studioReady || working || loadingSession || lock.current) return;
    lock.current = true; const requestScope = scopeRef.current; setBusy('Applying to Studio'); setError('');
    const applyIdentity = JSON.stringify([requestScope, target.designId, target.document.revision]);
    if (applyRequestKey.current?.identity !== applyIdentity) applyRequestKey.current = { identity: applyIdentity, key: `ui-apply:${crypto.randomUUID()}` };
    try {
      const result = await createTask({ message: 'Apply this saved UI in Studio and review its appearance.', mode: 'agent', workspace: 'ui_creator',
        designId: target.designId, baseRevision: target.document.revision, uiIntent: 'apply', projectId, chatId: target.chatId || target.designId,
        executionInput: { settings: { modelVersion }, applyMode: 'auto_after_approval', studioEnabled: true } }, { idempotencyKey: applyRequestKey.current.key });
      if (requestScope === scopeRef.current && designRef.current?.designId === target.designId) { setTask(result.task); setEvents([]); setConnectApply(null); applyRequestKey.current = null; }
    } catch (e) { if (requestScope === scopeRef.current) report(e); } finally { if (requestScope === scopeRef.current) { setBusy(''); lock.current = false; } }
  }, [mockRuns, studioReady, working, projectId, modelVersion, report]);
  useEffect(() => { if (connectApply && connectApply === document?.designId && studioReady && !working) { setConnectApply(null); void applySaved(); } }, [connectApply, document?.designId, studioReady, working, applySaved]);
  const connect = () => { if (saved) setConnectApply(document.designId); onOpenStudio?.(); };
  const retryReview = async () => {
    if (!allowed() || !saved || working || lock.current) return;
    const requestScope = scopeRef.current, target = designRef.current;
    lock.current = true; setBusy('Reviewing the render'); setError('');
    const repairBrief = prompt.trim();
    const reviewMessage = 'Review the saved UI on desktop and phone, including its declared states. Preserve the implementation unless an observed visual defect requires a repair.';
    try {
      const latest = (await getUiDesign(target.designId)).design;
      if (scopeRef.current !== requestScope || designRef.current?.designId !== target.designId) return;
      if (!latest?.document?.revision) throw new Error('The saved UI could not be refreshed. Try again.');
      assign(latest);
      const input = { message: repairBrief ? `${reviewMessage}\n\nTargeted repair brief:\n${repairBrief}` : reviewMessage,
        mode: 'agent', workspace: 'ui_creator', designId: latest.designId, baseRevision: latest.document.revision,
        uiIntent: 'review', projectId, chatId: latest.chatId || latest.designId,
        executionInput: { settings: { modelVersion }, studioEnabled: false } };
      const identity = JSON.stringify(input);
      if (requestKey.current?.input !== identity) requestKey.current = { input: identity, key: `ui-review:${crypto.randomUUID()}` };
      const result = await createTask(input, { idempotencyKey: requestKey.current.key });
      if (scopeRef.current !== requestScope || designRef.current?.designId !== target.designId) return;
      if (!result.task?.taskId) throw new Error(result.decision?.message || result.message || 'The review could not start.');
      setTask(result.task); setEvents([]); setPrompt(''); requestKey.current = null;
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
  const stop = async () => {
    if (mockRuns?.enabled && (mockRuns.playing || mockRuns.frame?.task || mockRuns.frame?.placeholder)) {
      mockRuns.stop();
      setPendingPrompt('');
      return;
    }
    setStopping(true); try { if (busy === 'Answering') { askController.current?.abort(); return; } if (taskId) { await cancelTask(taskId); setTask(t => ({ ...t, status: 'cancelled' })); } } catch (e) { report(e); } finally { setStopping(false); }
  };
  const newUI = async () => {
    if (working || !allowed()) return;
    ++loadSequence.current;
    resetSession();
    try { window.localStorage.removeItem(lastOpenKey); } catch {}
    targetTouched.current = false;
    setPrompt('');
    setAttachments([]);
    setPinnedReferences([]);
    setReferenceRoles({});
    setReferenceMode('replicate');
    setReferenceTarget('responsive');
    setReferenceBehaviour('infer');
    setError('');
    setDrawer('');
  };
  const checkpoint = async () => { try { await createUiCheckpoint(document.designId, { expectedRevision: document.revision }); await openDrawer('history'); } catch (e) { report(e); } };
  const restore = async c => { try { await restoreUiCheckpoint(document.designId, c.checkpointId, document.revision); await load(document.designId); } catch (e) { report(e); } };
  const rename = async title => { try { await renameUiDesign(document.designId, document.revision, title); await load(document.designId); } catch (e) { report(e); } };
  const remove = async () => { const target = design; if (!target || working) return; try { await deleteUiDesign(target.designId); setUndo(target); setDesigns(all => all.filter(d => d.designId !== target.designId)); resetSession(); setDrawer(''); } catch (e) { report(e); } };
  const recover = async (target = undo) => { if (!target?.designId) return; try { await recoverUiDesign(target.designId); setDesigns(all => [target, ...all.filter(d => d.designId !== target.designId)]); await load(target.designId); setDeletedDesigns(all => all.filter(d => d.designId !== target.designId)); setUndo(null); } catch (e) { report(e); } };
  const messages = history.map(m => ({ ...m, metadata: { ...m.metadata, ...metadata } }));
  const livePrompt = livePending || currentTask?.intent?.original;
  const showPrompt = livePrompt && !messages.some(m => m.role === 'user' && m.content === livePrompt);
  const progress = liveEvents.filter(e => e.eventType === 'ui_build_progress').map(e => actions[e.payload?.action] || UI_BUILD_LABELS[e.payload?.stage]).filter(Boolean).filter((label, i, all) => i === 0 || label !== all[i - 1]);
  const status = presentation.state === 'idle' ? '' : presentation.label;
  const showLoadingChain = Boolean((liveBusy && !loadingSession) || currentTask?.uiBuild) && (working || presentation.terminal || mockActive);
  const conversation = <><Conversation className="ui-creator__conversation"><ConversationContent className="ui-creator__messages">
    {messages.length ? <MessageList messages={messages} activeMode="ui" isBusy={working} studioConnected={studioReady} studioSessionId={studioSessionId} notify={notify}/> : null}
    {showPrompt ? <div className="uc-session-message">{livePrompt}</div> : null}
    {showLoadingChain ? <UiLoadingChain busy={liveBusy} task={currentTask} /> : null}
    {chatImages.length ? <UiGeneratedImageFeed images={chatImages} projectId={projectId} onPublish={publishGeneratedImage} publishingId={publishingId} publishDisabledReason={robloxUpload.readiness?.ready ? '' : robloxUpload.readiness?.message || ''} /> : null}
    {presentation.terminal && !working ? <p className="uc-file-note nx-result-reveal">{mockRuns?.frame?.placeholder || status}</p> : null}
    {!working && sourceRetryCandidate && !saved ? <div className="uc-chat-actions"><button type="button" onClick={retrySavedSource}>Retry source with saved plan</button></div> : null}

    {answer ? <MessageList messages={[{ id: 'live-answer', role: 'assistant', content: answer, metadata }]} activeMode="ui" isBusy={working}/> : null}
    {!working && !loadingSession && saved ? <div className="uc-chat-actions"><button type="button" onClick={studioReady ? applySaved : connect}>{studioReady ? 'Apply this UI to Studio' : 'Connect Studio to apply'}</button></div> : null}
    {!working && !loadingSession && saved && currentBuild && build?.stage === 'failed' && (build.errorCode === 'UI_VISUAL_REVIEW_INCOMPLETE' || build.message === 'Invalid UI visual review.') ? <button type="button" className="uc-button" onClick={retryReview}>Retry review</button> : null}
    {liveTask?.mode === 'plan' && !build ? <div className="uc-session-message"><p>{liveTask.intent?.normalizedGoal}</p><button className="uc-button uc-primary" onClick={async () => { try { const result = await approveTask(taskId, { executionInput: { settings: { modelVersion }, applyMode: 'manual_review', studioEnabled: false } }); setTask(result.task); } catch (e) { report(e); } }}>Build this plan</button></div> : null}
  </ConversationContent><ConversationScrollButton/></Conversation>{active || busy === 'Answering' || (mockActive && mockRuns.playing) ? <div className="uc-conversation-footer"><button onClick={stop}>Stop {busy === 'Answering' ? 'response' : 'build'}</button></div> : null}</>;
  const composer = <><ModelRoutingNotice routing={build?.modelRouting} /><ModelRequestEstimate prompt={prompt} model={modelVersion} projectId={projectId} requestCategory="ui_generation" enabled={Boolean(user?.uid) && !working} />
  <CreationPromptComposer prompt={prompt} setPrompt={setPrompt} attachments={attachments} setAttachments={setAttachments}
    onFileUpload={uploadFiles} onRetryAttachment={attachmentUpload.retry} onSubmit={submit} onStop={stop} onCancel={stop}
    isGenerating={working} presentation={presentation} compactStatus disabled={Boolean(liveBusy)}
    placeholder={hasReference ? 'What should I change from this reference?' : 'Describe your UI…'}
    promptAriaLabel="UI prompt" submitLabel="Send prompt"
    mode={mode} showDock={false} showWorkspaceOptions={false} modeControl={null}
    studioConnectionRequired={false} studioConnected={studioReady} studioConnectionType={studio?.connectionType}
    onStudioConnectionOpen={onOpenStudio} onOpenAssetLibrary={onOpenAssetLibrary} assetLibraryOpen={assetLibraryOpen}
    onCloseAssetLibrary={onCloseAssetLibrary} onConfirmProjectAssets={onConfirmProjectAssets}
    onRemoveProjectAsset={onRemoveProjectAsset} robloxProjectAssets={robloxProjectAssets} robloxStatus={robloxStatus}
    robloxSelectedCreator={robloxSelectedCreator} projectAssetSaving={projectAssetSaving} assetProjectId={projectId}/></>;
  const showLiveFiles = active && !previewIdentity && !manifest?.lastSuccessfulPreviewJobId && (['generating', 'repairing', 'preparing', 'building_model', 'design_preview'].includes(build?.stage)
    || Boolean(build?.sourceFiles?.length && previewIdentity !== build?.sourceRevision));
  const generationCards = useMemo(() => getUiGenerationCards({ busy: liveBusy, task: currentTask }), [liveBusy, currentTask]);
  const showGenerationCards = generationCards.length > 0;
  const livePreview = <><UiReferenceDetails document={document} build={build}/><div hidden={showLiveFiles && !showGenerationCards} className="uc-preview-content"><UiPreviewPane userId={user?.uid} designId={document?.designId} projectId={projectId} sourceRevision={document?.revision}
    capture={manifest?.capture} states={manifest?.states || []} viewports={manifest?.viewports || []} capabilities={manifest?.capabilities}
    lastSuccessfulJobId={manifest?.lastSuccessfulPreviewJobId} renderJobs={build?.sourceRevision === document?.revision && build?.snapshotId === manifest?.capture?.snapshotId ? build?.matrix : []}
    studioConnected={studioReady} hasNodes={saved} studioReceipt={applied} onApplyToStudio={applySaved} onConnectStudio={connect}
    onRefreshCapture={studioReady && !document?.sourceFiles ? sync : undefined} sourceOwned={Boolean(document?.sourceFiles)} onRefreshManifest={refreshManifest} captureBusy={busy === 'Capturing UI'} applyBusy={working || loadingSession}
    updatingRevision={liveBusy === 'Starting build' || (['generating','repairing'].includes(build?.stage) && active)} previewFailed={currentBuild && build?.stage === 'preview_unavailable'} buildFailure={currentBuild && build?.stage === 'failed' ? build.message || 'The UI build could not finish.' : null} pendingStudioCommand={currentBuild && build?.stage === 'awaiting_studio' ? build.commandId : null}
    onRenderStatus={onRenderStatus} generationCards={generationCards} run={active ? { stage: actions[build?.action] || UI_BUILD_LABELS[build?.stage] || 'Starting build', working: presentation.active } : null}
    referenceImage={pinSrc ? { src: pinSrc, alt: pinItem?.name || 'Uploaded UI reference', width: pinItem?.width, height: pinItem?.height } : null}
    onMatchCloser={() => submit(null, MATCH_CLOSER_PROMPT)}/></div>
    {showLiveFiles && !showGenerationCards ? <UiLiveFiles key={taskId || 'mock-ui'} files={liveFiles || build?.sourceFiles || []} stage={build?.stage} action={build?.action} working={presentation.active}/> : null}</>;
  return <WorkspacePresentationContext.Provider value={presentation}><UiCreatorChrome document={document} designs={designs} projectTitle={projectTitle} studioReady={studioReady} working={working} presentation={presentation} loading={Boolean(busy)} status={status}
    sharedHeader={sharedHeader} headerActionTarget={headerActionTarget} onHeaderModalChange={onHeaderModalChange}
    saved={saved} applied={applied} applyState={applyState} visuallyReviewed={visuallyReviewed}
    error={error} onDismissError={() => setError('')} modelControl={modelControl} studioControl={studioControl} onModeChange={onModeChange}
    onChangeProject={onChangeProject} onOpenEvidence={onOpenEvidence} onOpenStudio={connect} onAccount={() => navigateTo?.('/settings')}
    landing={!document && !livePending && !liveTask && liveBusy !== 'Opening UI'}
    onFileUpload={uploadFiles} attachments={attachments}
    onBuild={() => submit()}
    onRemoveReferences={() => setAttachments((previous) => previous.filter((item) => !isUiReferenceImage(item)))}
    onRemoveReference={(item) => setAttachments((previous) => previous.filter((entry) => referenceAttachmentKey(entry) !== referenceAttachmentKey(item)))}
    referenceMode={referenceMode} onReferenceMode={setReferenceMode}
    referenceTarget={referenceTarget} onReferenceTarget={(value) => { targetTouched.current = true; setReferenceTarget(value); }}
    referenceBehaviour={referenceBehaviour} onReferenceBehaviour={setReferenceBehaviour}
    referenceRoles={referenceRoles}
    onReferenceRole={(key, role) => setReferenceRoles((previous) => {
      const next = { ...previous, [key]: role };
      if (role === 'primary') {
        Object.keys(next).forEach((other) => { if (other !== key && next[other] === 'primary') next[other] = 'other'; });
      }
      return next;
    })}
    referencePin={hasReference ? <UiReferencePin mode={referenceMode} image={{ ...pinItem, src: pinSrc, alt: pinItem?.name }} /> : null}
    onNew={newUI} onLoad={load} onApply={applySaved} onDrawer={openDrawer} onPrompt={setPrompt} onTemplate={t => submit(null, t.prompt, t.title)}
    onRename={rename} onDelete={remove} undo={undo} onUndo={() => recover()} drawer={drawer} onCloseDrawer={closeDrawer}
    drawerContent={<>{progress.length ? <details className="uc-build-timeline" open={drawer === 'history'}><summary>Build activity</summary><ol className="uc-live-actions" aria-label="Build actions">{progress.map((label, i) => <li key={i} data-active={presentation.active && i === progress.length - 1}>{label}</li>)}</ol></details> : null}<UiImplementationDrawer tab={drawer} document={document} files={files} readFile={readFile} working={working} build={build} liveFiles={build?.sourceFiles || []} onReview={retryReview} hasRepairBrief={Boolean(document?.sourceFiles?.length && prompt.trim())}
      filesError={filesError} onRetryFiles={() => openDrawer(drawer)} deletedDesigns={deletedDesigns} onRecover={recover} checkpoints={checkpoints} onCheckpoint={checkpoint} onRestore={restore} onAssets={() => navigateTo?.('/assets')} onSuggest={setPrompt}/></>}
    composer={composer} conversation={conversation} livePreview={livePreview}/></WorkspacePresentationContext.Provider>;
}
