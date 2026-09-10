import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { MemoryRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import WorkspaceRibbon from '../pages/ai/WorkspaceRibbon';
import WorkspaceShell from '../components/ai/workspace/WorkspaceShell';
import ProjectTreeSidebar from '../components/sidebar/ProjectTreeSidebar';
import ChatView from '../components/ai/ChatView';
import ChatComposer from '../components/ai/chat/ChatComposer';
import ModelSwitcher from '../components/ai/ModelSwitcher';
import CodeFileTree from '../components/ai/workspace/CodeFileTree';
import WorkspaceDetailsPanel from '../components/ai/workspace/WorkspaceDetailsPanel';
import MarkdownMessage from '../components/ai/chat/MarkdownMessage';
import { Hero } from '../components/ui/tailwind-css-background-snippet';
import { SiteToastProvider, notifyToast } from '../components/ui/toast-1';
import { summarizeEntitlements } from '../lib/billingSummary';
import { desktopRequest } from '../lib/workspaceRuntime';
import { SettingsProvider } from '../context/SettingsContext';
import { BillingProvider } from '../context/BillingContext';
import { RobloxConnectionProvider } from '../context/RobloxConnectionContext';
import { setDesktopIdentity } from './identity';
import ConflictReview from './ConflictReview';
import '../index.css';
import '../design/nexus-foundation.css';
import '../design/nexus-primitives.css';
import '../design/nexus-motion.css';
import '../styles/aiTheme.css';
import '../pages/ai/AgentWorkspaceLayout.css';
import '../components/ai/chat/WorkspaceControls.css';
import './desktopWorkspace.css';

const rows = entities => (entities || []).map(entity => ({ ...entity.data, id: entity.id }));
const notify = value => notifyToast(typeof value === 'string' ? { message: value } : value);
const BillingPage = lazy(() => import('../pages/BillingPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const SupportPage = lazy(() => import('../pages/SupportPage'));
const SupportTicketPage = lazy(() => import('../pages/SupportTicketPage'));
const ContactPage = lazy(() => import('../pages/ContactPage'));

export default function DesktopWorkspace({ onBack, EditorComponent }) {
  return <MemoryRouter initialEntries={['/ai']}><SiteToastProvider><BillingProvider><RobloxConnectionProvider><SettingsProvider><Suspense fallback={<p role="status">Opening workspace…</p>}><Routes>
    <Route path="/ai" element={<WorkspaceContent onBack={onBack} EditorComponent={EditorComponent} />} />
    <Route path="/settings" element={<AccountPage onBack={onBack}><SettingsPage /></AccountPage>} />
    <Route path="/billing" element={<AccountPage onBack={onBack}><BillingPage /></AccountPage>} />
    <Route path="/support" element={<AccountPage onBack={onBack}><SupportPage /></AccountPage>} />
    <Route path="/support/:ticketId" element={<AccountPage onBack={onBack}><SupportTicketPage /></AccountPage>} />
    <Route path="/contact" element={<AccountPage onBack={onBack}><ContactPage /></AccountPage>} />
    <Route path="*" element={<AccountPage onBack={onBack}><p>Open this account page on the NexusRBX website.</p><button className="desktop-action" onClick={() => void window.nexusWorkspace.openExternal('https://nexusrbx.com')}>Open NexusRBX</button></AccountPage>} />
  </Routes></Suspense></SettingsProvider></RobloxConnectionProvider></BillingProvider></SiteToastProvider></MemoryRouter>;
}

function AccountPage({ children, onBack }) {
  return <div className="desktop-account-page"><nav className="desktop-account-nav" aria-label="Desktop account navigation"><Link to="/ai">Workspace</Link><Link to="/settings">Settings</Link><Link to="/billing">Billing</Link><Link to="/support">Support</Link><button onClick={onBack}>Connector diagnostics</button></nav>{children}</div>;
}

function WorkspaceContent({ onBack, EditorComponent: CodeWorkspace }) {
  const navigate = useNavigate();
  const api = window.nexusWorkspace;
  const [snapshot, setSnapshot] = useState(null);
  const [conversationId, setConversationId] = useState('');
  const selected = useRef('');
  const refreshSequence = useRef(0);
  const [projectId, setProjectId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState('agent');
  const [model, setModel] = useState('nexus-free');
  const [panel, setPanel] = useState(null);
  const [sidebar, setSidebar] = useState(true);
  const [sidebarView, setSidebarView] = useState('chats');
  const [drawerWidth, setDrawerWidth] = useState(520);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [studio, setStudio] = useState(null);
  const [studioId, setStudioId] = useState('');
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState('');
  const [detailsView, setDetailsView] = useState('summary');
  const [account, setAccount] = useState(null);
  const [accountError, setAccountError] = useState('');
  const [approvedPlanId, setApprovedPlanId] = useState('');
  const [planDraft, setPlanDraft] = useState(null);
  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [olderMessages, setOlderMessages] = useState([]);
  const [extraChats, setExtraChats] = useState([]);
  const [chatCursor, setChatCursor] = useState(undefined);
  const [olderCursor, setOlderCursor] = useState(null);

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    const result = await api.snapshot(selected.current || undefined);
    if (sequence === refreshSequence.current) setSnapshot(result);
    return result;
  }, [api]);
  const act = useCallback(async operation => {
    setError(''); setBusy(true);
    try { return await operation(); }
    catch (failure) { setError(failure.message || 'This action could not be completed.'); return null; }
    finally { setBusy(false); }
  }, []);
  const select = useCallback(async id => {
    selected.current = id; setConversationId(id); setApprovedPlanId(''); setPlanDraft(null); setOlderMessages([]); setOlderCursor(null); setFiles([]); setActiveFileId('');
    const next = await refresh();
    const chat = next.conversations.find(item => item.id === id);
    if (chat) { setProjectId(chat.data.projectId || ''); setSidebarView('chats'); }
  }, [refresh]);
  const loadAccount = useCallback(async () => {
    try { const response = await desktopRequest('/api/desktop/account'); const data = await response.json(); setDesktopIdentity(data.identity); setAccount(data); setAccountError(''); }
    catch (failure) { setAccountError(failure.message); }
  }, []);
  useEffect(() => {
    let mounted = true;
    const unsubscribe = api.onChange(() => { void refresh().catch(failure => { if (mounted) setError(failure.message); }); });
    void api.open().then(async initial => {
      if (!mounted) return;
      setSnapshot(initial);
      if (initial.conversations[0]) await select(initial.conversations[0].id);
      if (mounted) void loadAccount();
    }).catch(failure => { if (mounted) setError(failure.message); });
    return () => { mounted = false; ++refreshSequence.current; unsubscribe(); };
  }, [api, refresh, select, loadAccount]);
  const chats = [...new Map([...extraChats, ...rows(snapshot?.conversations)].map(row => [row.id, row])).values()];
  const projects = rows(snapshot?.projects).map(item => ({ ...item, projectId: item.id }));
  const chat = chats.find(item => item.id === conversationId);
  const project = projects.find(item => item.id === projectId);
  const messages = [...new Map([...olderMessages, ...rows(snapshot?.messages).filter(item => item.conversationId === conversationId)].map(row => [row.id, row])).values()];
  const run = rows(snapshot?.runs).find(item => item.id === snapshot?.activeRunId);
  const interrupted = rows(snapshot?.runs).find(item => item.conversationId === conversationId && item.status === 'interrupted');
  const plan = rows(snapshot?.plans).find(item => item.conversationId === conversationId);
  const billing = summarizeEntitlements(account);
  const artifact = { id: `desktop:${conversationId}`, artifactId: `desktop:${conversationId}`, title: project?.title || chat?.title || 'Studio files', files };
  const activeFile = files.find(file => file.id === activeFileId) || null;
  const ensureConversation = async () => {
    if (selected.current) return selected.current;
    const id = await api.createConversation(projectId || undefined); await select(id); return id;
  };
  const newChat = async (parent = projectId) => { const id = await api.createConversation(parent || undefined); await select(id); };
  const submit = async event => {
    event?.preventDefault?.();
    if (!prompt.trim() || snapshot?.activeRunId) return;
    await act(async () => {
      const id = await ensureConversation();
      await api.submit({ conversationId: id, instruction: prompt, mode, model, studioId: studioId || undefined, approvedPlanId: approvedPlanId || undefined });
      setPrompt(''); setApprovedPlanId(''); await refresh();
    });
  };
  const command = async (name, payload = {}, expectedPlaceSignature) => {
    if (!studioId) throw new Error('Choose a Studio window first.');
    return api.studioAction({ command: name, payload, studioId, operationId: crypto.randomUUID(), expectedPlaceSignature });
  };
  const connectStudio = async id => {
    const result = await api.studio(id || undefined); setStudio(result);
    if (result.activeStudioId !== studioId) { setFiles([]); setActiveFileId(''); }
    setStudioId(result.activeStudioId || ''); return result;
  };
  const manifest = async () => {
    let cursor; let more = true; let truncated = false; const instances = [];
    for (let page = 0; more && page < 50; page++) {
      const result = await command('get_project_manifest', { pageSize: 200, ...(cursor ? { cursor } : {}) });
      instances.push(...(result.instances || [])); cursor = result.cursor; more = result.hasMore; truncated ||= result.truncated;
    }
    const scripts = instances.filter(item => item.isScript);
    if (truncated || more) setError('The Studio manifest is bounded. Some files may be outside this result; use targeted reads for the remaining scripts.');
    setFiles(scripts.map(script => ({ ...script, id: script.path, path: script.path, name: script.name || script.path.split('.').at(-1), content: '', originalContent: '', language: 'luau', unread: true })));
    setPanel('files');
  };
  const openFile = async file => {
    if (typeof file === 'string') file = files.find(item => item.id === file);
    if (!file) throw new Error('This file is no longer open.');
    if (file.unread) {
      const result = await command('read_script', { path: file.path });
      const content = result.source ?? result.content ?? result.script?.source;
      if (typeof content !== 'string') throw new Error('Studio did not return script source.');
      file = { ...file, content, originalContent: content, expectedSourceHash: result.sourceHash || result.hash || result.script?.sourceHash, expectedPlaceSignature: result.desktopPlaceSignature, unread: false };
      setFiles(previous => previous.map(item => item.id === file.id ? file : item));
    }
    setActiveFileId(file.id); setPanel('code');
  };
  const saveFile = async file => {
    if (!file?.expectedSourceHash) throw new Error('Reload this script from Studio before saving.');
    await command('write_script', { path: file.path, source: file.content, expectedSourceHash: file.expectedSourceHash }, file.expectedPlaceSignature);
    await openFile({ ...file, unread: true });
  };
  const openArtifact = async item => {
    const file = { id: item.id, name: item.name || 'Saved script', path: item.path || item.name || 'Saved script', content: item.code || item.source || '', originalContent: item.code || item.source || '', language: 'luau' };
    setFiles(previous => [...previous.filter(entry => entry.id !== file.id), file]); setActiveFileId(file.id); setPanel('code');
  };
  const renderPanel = name => {
    if (name === 'files') return <><button className="desktop-action" disabled={!studioId || busy} onClick={() => void act(manifest)}>Refresh Studio files</button><CodeFileTree artifact={artifact} activeFileId={activeFileId} onSelectFile={file => void act(() => openFile(file))} /></>;
    if (name === 'code') return <Suspense fallback={<p role="status">Opening editor…</p>}><CodeWorkspace artifact={artifact} activeFile={activeFile} onSelectFile={file => void act(() => openFile(file))}
      onChangeContent={(_artifactId, id, content) => setFiles(previous => previous.map(file => file.id === id ? { ...file, content, dirty: content !== file.originalContent } : file))}
      onSaveFile={file => act(() => saveFile(file || activeFile))} onSaveAllFiles={() => act(async () => { for (const file of files.filter(item => item.dirty)) await saveFile(file); })}
      onRevertFile={file => setFiles(previous => previous.map(item => item.id === file.id ? { ...item, content: item.originalContent, dirty: false } : item))}
      onRefreshFile={file => act(() => openFile({ ...file, unread: true }))} onCloseFile={id => setFiles(previous => previous.filter(item => item.id !== id))}
      onSaveToCreations={() => act(async () => { const id = await ensureConversation(); for (const file of files) await api.saveEntity({ kind: 'artifact', data: { conversationId: id, name: file.name, code: file.content, path: file.path } }); await refresh(); })}
      exportRuntime={{ studioId, download: async (blob, name) => api.downloadBytes(name, new Uint8Array(await blob.arrayBuffer())),
        apply: async () => { const edits = files.filter(file => file.dirty); if (!edits.length) throw new Error('There are no edited Studio files to apply.'); for (const file of edits) await saveFile(file); },
        verify: async input => (await desktopRequest('/api/ai/verify', { method: 'POST', body: JSON.stringify(input) })).json() }} notify={notify} saving={busy} /></Suspense>;
    if (name === 'details') return <WorkspaceDetailsPanel view={detailsView} onViewChange={setDetailsView} artifact={artifact} projectContext={{}} agentRun={run} notify={notify} />;
    if (name === 'assets') return <div className="desktop-records"><h2>Saved creations and files</h2>{rows(snapshot?.artifacts).map(item => <div key={item.id}><button onClick={() => void act(() => item.code || item.source ? openArtifact(item) : api.saveFile(item.id))}>{item.name || item.title || 'File'}</button><button onClick={() => void act(() => api.saveFile(item.id))}>Download</button>{item.conflictOf && <p>Conflicting edit — both versions are retained.</p>}</div>)}<button className="desktop-action" onClick={() => void act(async () => { const id = await ensureConversation(); await api.attachFile(id); await refresh(); })}>Attach file</button></div>;
    return <div className="desktop-records"><h2>Run history</h2>{rows(snapshot?.runs).map(item => <article key={item.id}><strong>{item.stage || item.mode}</strong><p>{item.status}</p>{item.error && <p role="alert">{item.error}</p>}{item.status === 'interrupted' && <button disabled={!!snapshot?.activeRunId} onClick={() => void act(() => api.resume(item.id))}>Resume saved run</button>}</article>)}<button className="desktop-action" disabled={!studioId || !!snapshot?.activeRunId} onClick={() => void act(() => command('run_play_test'))}>Playtest in Studio</button><button className="desktop-action" disabled={!studioId || !!snapshot?.activeRunId} onClick={() => void act(() => command('undo_last_batch'))}>Undo last Studio changes</button></div>;
  };
  return <div className="nexus-studio-root desktop-shared-workspace"><Hero /><div className="ai-page nexus-studio-page relative flex h-full flex-col overflow-hidden font-sans">
    <WorkspaceRibbon mode="agent" uiEnabled={false} projectTitle={project?.title || 'Choose project'} onChangeProject={() => { setSidebarView('projects'); setSidebar(true); }}
      onModeChange={() => setPanel('assets')} onOpenEvidence={() => setPanel(panel ? null : 'files')} evidenceOpen={!!panel} isBusy={!!snapshot?.activeRunId}
      modelControl={<ModelSwitcher value={model} onChange={setModel} isPremium={billing.isPremium} isStarterOrAbove={billing.isStarterOrAbove} onStarterNudge={() => setError('Choose an available model or manage your plan in account settings.')} />}
      studioControl={<div className="desktop-studio-picker"><select aria-label="Studio window" value={studioId} onChange={event => void act(() => connectStudio(event.target.value))}><option value="">Select Studio</option>{(studio?.availableStudios || []).map(item => <option key={item.studioId} value={item.studioId}>{item.label || item.studioId}</option>)}</select><button disabled={busy || !!snapshot?.activeRunId} onClick={() => void act(() => connectStudio(studioId))}>Connect</button></div>}
      accountControl={<button className="desktop-action" onClick={() => navigate('/settings')}>Settings</button>} />
    {(error || snapshot?.error) && <div role="alert" className="desktop-error">{error || snapshot.error}<button onClick={() => { setError(''); void act(refresh); }}>Retry</button></div>}
    {conflictsOpen && <ConflictReview api={api} onClose={() => setConflictsOpen(false)} />}
    <div className="nexus-studio-layout flex min-h-0 flex-1 overflow-hidden">
      {sidebar && <aside className="nexus-project-sidebar desktop-projects"><ProjectTreeSidebar onNavigate={navigate} projects={projects} chats={chats} currentProjectId={projectId} currentChatId={conversationId} showProjectList={sidebarView === 'projects'} showAllChats={sidebarView === 'chats' && !projectId && !!chats.length} onCollapse={() => setSidebar(false)}
        onOpenProject={id => { setProjectId(id || ''); setSidebarView(id ? 'chats' : 'projects'); selected.current = ''; setConversationId(''); }} onOpenChat={id => void act(() => select(id))} onNewChat={id => void act(() => newChat(id))}
        onCreateProject={title => act(async () => { const entity = await api.saveEntity({ kind: 'project', data: { title } }); setProjectId(entity.id); setSidebarView('chats'); await refresh(); return { projectId: entity.id, title }; })}
        onRenameProject={(id, title) => act(async () => { await api.saveEntity({ kind: 'project', id, data: { title } }); await refresh(); })} onRenameChat={(id, title) => act(async () => { await api.saveEntity({ kind: 'conversation', id, data: { title } }); await refresh(); })}
        onDeleteProject={id => void act(async () => { await api.saveEntity({ kind: 'project', id, data: {}, deleted: true }); setProjectId(''); await refresh(); })} onDeleteChat={id => void act(async () => { await api.saveEntity({ kind: 'conversation', id, data: {}, deleted: true }); if (id === selected.current) await select(''); else await refresh(); })} />
        <button className="desktop-action" onClick={() => { setSidebarView('projects'); setSidebar(true); }}>All projects</button><button className="desktop-action" onClick={() => void act(() => newChat())}>New chat</button>
        {(chatCursor === undefined ? snapshot?.nextConversationCursor : chatCursor) && <button onClick={() => void act(async () => { const page = await api.list({ kind: 'conversation', cursor: chatCursor === undefined ? snapshot.nextConversationCursor : chatCursor }); setExtraChats(previous => [...previous, ...rows(page.entities)]); setChatCursor(page.nextCursor); })}>Load more chats</button>}
      </aside>}
      <main className="nexus-studio-main flex min-h-0 min-w-0 flex-1 flex-col"><WorkspaceShell activePanel={panel} onPanelChange={setPanel} drawerWidth={drawerWidth} onDrawerWidthChange={setDrawerWidth} renderPanel={renderPanel}>
        <div className="flex min-h-0 flex-1 flex-col">
          {(olderCursor || (!olderMessages.length && snapshot?.nextMessageCursor)) && <button onClick={() => void act(async () => { const page = await api.list({ kind: 'message', conversationId, cursor: olderCursor || snapshot.nextMessageCursor, limit: 100 }); setOlderMessages(previous => [...rows(page.entities).reverse(), ...previous]); setOlderCursor(page.nextCursor); })}>Load earlier messages</button>}
          <ChatView chatId={conversationId} messages={messages} pendingMessage={snapshot?.preview ? { id: 'live', content: snapshot.preview, role: 'assistant' } : null} generationStage={run?.stage} activeMode={mode} user={{ uid: snapshot?.accountId }} isBusy={!!snapshot?.activeRunId} showHeader={false} onQuickStart={setPrompt} recentProjects={projects} onOpenProject={setProjectId} onOpenFile={item => void act(() => openArtifact(item))} notify={notify} />
          {plan && <details className="desktop-plan"><summary>Plan · version {plan.version}</summary>{planDraft === null ? <MarkdownMessage text={plan.content} /> : <textarea aria-label="Edit plan" value={planDraft} onChange={event => setPlanDraft(event.target.value)} />}
            <button onClick={() => planDraft === null ? setPlanDraft(plan.content) : void act(async () => { await api.editPlan(plan.id, planDraft); setPlanDraft(null); setApprovedPlanId(''); await refresh(); })}>{planDraft === null ? 'Edit plan' : 'Save revision'}</button>
            <button disabled={planDraft !== null || !!snapshot?.activeRunId} onClick={() => void act(async () => { await api.approvePlan(plan.id); setApprovedPlanId(plan.id); setMode('agent'); setPrompt('Implement the approved plan.'); await refresh(); })}>Approve and prepare execution</button></details>}
          {interrupted && !snapshot?.activeRunId && <button className="desktop-action" onClick={() => void act(() => api.resume(interrupted.id))}>Resume interrupted run</button>}
          {snapshot?.approval && <section className="desktop-confirm" role="region" aria-label="Confirm Studio action"><strong>Confirm {snapshot.approval.command}</strong><p>Studio window: {snapshot.approval.studioId}</p><pre>{JSON.stringify(snapshot.approval.payload, null, 2)}</pre><button onClick={() => void api.approveTool(snapshot.approval.runId, true).catch(failure => setError(failure.message))}>Run this action</button><button onClick={() => void api.approveTool(snapshot.approval.runId, false).catch(failure => setError(failure.message))}>Decline</button></section>}
          <ChatComposer prompt={prompt} setPrompt={setPrompt} mode={['ask','plan','agent'].includes(mode) ? mode : 'agent'} onModeChange={setMode} onSubmit={submit} onStop={() => void act(() => api.cancel())} isGenerating={!!snapshot?.activeRunId} disabled={!snapshot || busy}
            attachments={[]} setAttachments={() => {}} onAttachmentRequest={() => void act(async () => { await api.attachFile(await ensureConversation()); await refresh(); })} onFileUpload={() => void act(async () => { await api.attachFile(await ensureConversation()); await refresh(); })}
            studioConnected={!!studioId} studioSessionId={studioId} studioPlaceName={studio?.placeName} studioConnectionType="local_mcp" onStudioConnectionOpen={() => void act(() => connectStudio(studioId))}
            onDockNewChat={() => void act(() => newChat())} onDockOpenAssets={() => setPanel('assets')} onDockOpenActivity={() => setPanel('activity')} onDockOpenNavigation={() => setSidebar(!sidebar)}
            tokensLeft={billing.totalRemaining} tokensLimit={billing.subLimit} planKey={billing.plan} dailyUsage={billing.dailyUsage} includedUsage={billing.includedUsage} premiumBalance={billing.premiumBalance} isFreeUsagePlan={billing.isFreeUsagePlan} billingLoading={!account && !accountError} billingError={accountError || null} />
        </div>
      </WorkspaceShell></main>
    </div>
    <footer className="desktop-status"><button onClick={() => setSidebar(!sidebar)}>Projects</button><span role="status">{snapshot?.sync || 'Opening workspace…'}</span><button onClick={() => void act(() => api.sync())}>Sync now</button><button onClick={() => setConflictsOpen(value => !value)}>Review conflicts</button><button onClick={() => void act(() => api.exportHistory())}>Export history</button><select aria-label="Specialist mode" value={mode} onChange={event => setMode(event.target.value)}><option value="agent">Agent</option><option value="ask">Ask</option><option value="plan">Plan</option><option value="debug">Debug</option><option value="quick_script">Quick Script</option><option value="studio_agent">Studio Agent</option></select><button onClick={() => void loadAccount()}>Refresh usage</button></footer>
  </div></div>;
}
