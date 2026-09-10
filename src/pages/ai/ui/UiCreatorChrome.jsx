import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Box, Check, ChevronDown, Code2, FileCode2, FolderOpen, History, LayoutGrid, Plus, X } from 'lucide-react';
import WorkspaceRibbon from '../WorkspaceRibbon';
import './UiCreatorChrome.css';
import { Hero } from '../../../components/ui/tailwind-css-background-snippet';


export const UI_TEMPLATES = [
  { title: 'Shop Menu', icon: '◇', prompt: 'Build a responsive Roblox shop menu with dark translucent panels, purple accents, item categories, a currency balance, a product grid, clear purchase actions, and empty and insufficient-currency states.' },
  { title: 'Inventory', icon: '▦', prompt: 'Build a responsive Roblox inventory with item search, category filters, rarity badges, selected item details, equip and unequip actions, and a friendly empty inventory state.' },
  { title: 'Settings Panel', icon: '☷', prompt: 'Build a Roblox settings panel with accessible volume controls, graphics and gameplay settings, save and reset actions, and clear confirmation feedback.' },
];
const drawerTabs = [['luau','Luau'],['files','Files'],['assets','Assets'],['interactions','Interactions'],['history','Revisions']];

export default function UiCreatorChrome({ document, designs = [], projectTitle, studioReady, working, loading, status,
  saved, applied, ready, error, onDismissError, modelControl, studioControl, onModeChange, onChangeProject,
  onOpenEvidence, onOpenStudio, onAccount, onNew, onLoad, onApply, onDrawer, onPrompt, onTemplate,
  drawer, onCloseDrawer, drawerContent, composer, conversation, livePreview, onRename, onDelete, undo, onUndo,
  sharedHeader = false, headerActionTarget = null, onHeaderModalChange }) {
  const [chatWidth, setChatWidth] = useState(350);
  const session = useRef(null);
  const [library, setLibrary] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState('');
  const panel = useRef(null), titleInput = useRef(null);
  const codeTrigger = useRef(null);
  const closeDrawer = useRef(onCloseDrawer);
  closeDrawer.current = onCloseDrawer;
  useEffect(() => { if (renaming) titleInput.current?.focus(); }, [renaming]);
  const drawerOpen = Boolean(drawer);
  const [mobile, setMobile] = useState(() => window.matchMedia?.('(max-width: 900px)').matches || false);
  useEffect(() => {
    onHeaderModalChange?.(mobile && drawerOpen);
    return () => onHeaderModalChange?.(false);
  }, [mobile, drawerOpen, onHeaderModalChange]);
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 900px)');
    if (!media) return undefined;
    const change = () => setMobile(media.matches); change();
    media.addEventListener?.('change', change);
    return () => media.removeEventListener?.('change', change);
  }, []);
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previous = window.document.activeElement;
    const trigger = codeTrigger.current;
    panel.current?.querySelector('button')?.focus();
    const keyboard = e => {
      if (e.defaultPrevented || e.target.closest?.('[role="listbox"]')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeDrawer.current(); return; }
      if (e.key !== 'Tab' || !window.matchMedia?.('(max-width: 900px)').matches) return;
      const controls = [...panel.current.querySelectorAll('button:not(:disabled), input, select, textarea, [tabindex="0"]')];
      const first = controls[0], last = controls.at(-1);
      if (e.shiftKey && window.document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && window.document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    window.document.addEventListener('keydown', keyboard);
    return () => {
      window.document.removeEventListener('keydown', keyboard);
      let attempts = 0;
      const restoreFocus = () => {
        const target = sharedHeader ? trigger : previous;
        if (target?.closest('[inert]') && attempts++ < 60) {
          window.requestAnimationFrame(restoreFocus);
          return;
        }
        if (target?.isConnected) target.focus();
      };
      // The shared header must finish leaving its inert state before restoring focus.
      if (sharedHeader) window.requestAnimationFrame(restoreFocus);
      else restoreFocus();
    };
  }, [drawerOpen, sharedHeader]);
  const codeControl = <button ref={codeTrigger} type="button" className="uc-button" aria-expanded={Boolean(drawer)} aria-controls="ui-build-drawer" onClick={() => onDrawer('luau')}><Code2 size={16}/>Code / Files</button>;
  return <div className={`uc-app ${sharedHeader ? 'uc-app--shared-header' : ''}`}><Hero/>
    {!sharedHeader ? <WorkspaceRibbon mode="ui" projectTitle={projectTitle} onChangeProject={onChangeProject} onModeChange={onModeChange} modelControl={modelControl} studioControl={studioControl} inert={mobile && drawerOpen}/> : null}
    {headerActionTarget ? createPortal(codeControl, headerActionTarget) : null}
    <aside className={`uc-sidebar ${navOpen ? 'is-open' : ''}`} aria-label="UI projects" inert={mobile && drawerOpen ? '' : undefined}>
      <button className="uc-back" onClick={onChangeProject}><ArrowLeft size={15}/>Back to projects</button>
      <button className="uc-project" onClick={onChangeProject}><span className="uc-project-icon"><Box size={23}/></span><span><strong>{projectTitle || 'Choose a project'}</strong><small>UI Design Project</small></span><ChevronDown size={14}/></button>
      <span className="uc-section-label">Creator</span>
      <button className="uc-nav-item is-active" disabled={working} onClick={onNew}><Plus size={18}/>New UI</button>
      <button className="uc-nav-item" onClick={() => onDrawer('files')}><FileCode2 size={18}/>Project Files</button>
      <button className="uc-nav-item" aria-expanded={library} onClick={() => setLibrary(v => !v)}><LayoutGrid size={18}/>UI Library</button>
      <button className="uc-nav-item" onClick={() => onDrawer('history')}><History size={18}/>Versions</button>
      <span className="uc-section-label">Recent</span>
      <div className="uc-design-list">{designs.length ? designs.map(d => <button key={d.designId} disabled={loading} className={`uc-nav-item ${document?.designId === d.designId ? 'is-selected' : ''}`} onClick={() => { onLoad(d.designId); setNavOpen(false); }}><FolderOpen size={17}/><span>{d.title || 'Untitled UI'}</span></button>) : <p className="uc-muted">No saved UIs yet</p>}</div>
      <div className="uc-studio-card"><span className={`uc-dot ${studioReady ? 'is-connected' : ''}`}/><div><strong>{studioReady ? 'Studio Connected' : 'Studio not connected'}</strong><small>{studioReady ? 'Ready to apply your UI' : 'You can still build and save'}</small></div></div>
      <button className="uc-text-button" onClick={() => onDrawer('trash')}>Recently deleted</button><div className="uc-sidebar-footer"><img src="/favicon.png" alt="" width="30" height="30"/><span>NexusRBX<small>Build. Design. Play.</small></span></div>
    </aside>
    <section className="uc-main" aria-label="UI Creator" inert={mobile && drawerOpen ? '' : undefined}>
      <header className="uc-heading"><div className="uc-heading-title"><button className="uc-mobile-menu" aria-label="Toggle UI projects" aria-expanded={navOpen} onClick={() => setNavOpen(v => !v)}><LayoutGrid size={18}/></button></div><div className="uc-heading-actions">{!sharedHeader ? codeControl : null}{saved && !applied && !working ? <button className="uc-button uc-primary" aria-label={studioReady ? 'Apply to Studio' : 'Connect & Apply'} onClick={studioReady ? onApply : onOpenStudio}>{studioReady ? 'Apply to Studio' : 'Studio'}</button> : null}</div></header>
      {error ? <div className="uc-error" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={onDismissError}><X size={16}/></button></div> : null}
      {undo ? <div className="uc-notice" role="status">UI moved to recently deleted.<button onClick={onUndo}>Undo</button></div> : null}
      <div className="uc-session-header"><div className="uc-design-title">{renaming ? <form onSubmit={async e => { e.preventDefault(); if (title.trim()) { await onRename(title.trim()); setRenaming(false); } }}><input aria-label="UI name" ref={titleInput} maxLength={120} value={title} onChange={e => setTitle(e.target.value)}/><button aria-label="Save UI name"><Check size={16}/></button><button type="button" aria-label="Cancel rename" onClick={() => setRenaming(false)}><X size={16}/></button></form> : <><strong>{document?.title || 'New build session'}</strong>{document ? <button className="uc-text-button" disabled={working} onClick={() => { setTitle(document.title); setRenaming(true); }}>Rename</button> : null}</>}</div><div className="uc-statuses" aria-label="Build status"><span data-state={saved ? 'success' : 'pending'}>{saved ? 'Saved' : 'Not generated yet'}</span><span data-state={applied ? 'success' : 'pending'}>{applied ? 'Applied to Studio' : 'Studio not applied yet'}</span>{ready ? <span data-state="success">Ready</span> : null}</div></div>
      {library ? <section className="uc-library" aria-label="UI templates"><header><strong>Start a new UI</strong><button aria-label="Close templates" onClick={() => setLibrary(false)}><X size={16}/></button></header><p>Each template starts a new build session.</p><div className="uc-template-grid">{UI_TEMPLATES.map(t => <button key={t.title} disabled={working} onClick={() => { setLibrary(false); onTemplate(t); }}><span>{t.icon}</span><strong>{t.title}</strong><small>Build with AI →</small></button>)}</div></section> : null}
      <div ref={session} className="uc-session" style={{'--uc-chat-width': `${chatWidth}px`}}><section className="uc-conversation" aria-label="AI build conversation">{conversation}<div className="uc-composer">{composer}</div></section><div className="uc-resize" role="separator" aria-label="Resize conversation" aria-orientation="vertical" aria-valuemin={280} aria-valuemax={520} aria-valuenow={chatWidth} tabIndex={0}
        onKeyDown={e => { if (['ArrowLeft','ArrowRight'].includes(e.key)) { e.preventDefault(); setChatWidth(w => Math.max(280, Math.min(520, w + (e.key === 'ArrowRight' ? 20 : -20)))); } }}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setChatWidth(Math.max(280, Math.min(520, session.current.clientWidth - 320, e.clientX - session.current.getBoundingClientRect().left))); }}
        onPointerUp={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}/><div className="uc-preview-stage">{livePreview}</div></div>
    </section>
    {drawer ? <><button className="uc-drawer-backdrop" aria-label="Close files drawer backdrop" tabIndex={-1} onClick={onCloseDrawer}/><aside id="ui-build-drawer" ref={panel} className="uc-drawer nx-workspace-drawer" role="dialog" aria-modal={mobile || undefined} aria-label="Code and files"><header><div><Code2 size={18}/><strong>Code / Files</strong></div><button aria-label="Close files drawer" onClick={onCloseDrawer}><X size={19}/></button></header><nav aria-label="Implementation views">{drawerTabs.map(([id,label]) => <button key={id} aria-pressed={drawer === id} onClick={() => onDrawer(id)}>{label}</button>)}</nav><div className="uc-drawer-content">{drawerContent}</div><footer><button className="uc-text-button" disabled={!document || working} onClick={onDelete}>Move UI to recently deleted</button></footer></aside></> : null}
  </div>;
}
