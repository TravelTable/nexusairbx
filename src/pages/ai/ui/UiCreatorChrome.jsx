import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Box, Check, ChevronDown, Code2, FileCode2, FolderOpen, History, LayoutGrid, MessageSquare, Plus, ShieldCheck, Sparkles, X } from 'lucide-react';
import './UiCreatorChrome.css';

export const UI_TEMPLATES = [
  { title: 'Shop Menu', icon: '◇', prompt: 'Build a responsive Roblox shop menu with dark translucent panels, purple accents, item categories, a currency balance, a product grid, clear purchase actions, and empty and insufficient-currency states.' },
  { title: 'Inventory', icon: '▦', prompt: 'Build a responsive Roblox inventory with item search, category filters, rarity badges, selected item details, equip and unequip actions, and a friendly empty inventory state.' },
  { title: 'Settings Panel', icon: '☷', prompt: 'Build a Roblox settings panel with accessible volume controls, graphics and gameplay settings, save and reset actions, and clear confirmation feedback.' },
];
const drawerTabs = [['luau','Luau'],['json','JSON'],['files','Files'],['assets','Assets'],['interactions','Interactions'],['history','Revisions']];

export default function UiCreatorChrome({ document, designs = [], projectTitle, studioReady, working, loading, status,
  saved, applied, ready, error, onDismissError, modelControl, studioControl, onModeChange, onChangeProject,
  onOpenEvidence, onOpenStudio, onAccount, onNew, onLoad, onApply, onDrawer, onPrompt, onTemplate,
  drawer, onCloseDrawer, drawerContent, composer, conversation, livePreview, onRename, onDelete, undo, onUndo }) {
  const [library, setLibrary] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState('');
  const panel = useRef(null), titleInput = useRef(null);
  useEffect(() => { if (renaming) titleInput.current?.focus(); }, [renaming]);
  const drawerOpen = Boolean(drawer);
  const [mobile, setMobile] = useState(() => window.matchMedia?.('(max-width: 900px)').matches || false);
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
    panel.current?.querySelector('button')?.focus();
    const keyboard = e => {
      if (e.key === 'Escape') { onCloseDrawer(); return; }
      if (e.key !== 'Tab' || !window.matchMedia?.('(max-width: 900px)').matches) return;
      const controls = [...panel.current.querySelectorAll('button:not(:disabled), input, select, textarea, [tabindex="0"]')];
      const first = controls[0], last = controls.at(-1);
      if (e.shiftKey && window.document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && window.document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    window.document.addEventListener('keydown', keyboard);
    return () => { window.document.removeEventListener('keydown', keyboard); if (previous?.isConnected) previous.focus(); };
  }, [drawerOpen, onCloseDrawer]);
  return <div className="uc-app">
    <header className="uc-topbar" inert={mobile && drawerOpen ? '' : undefined}>
      <button className="uc-mobile-menu" aria-label="Toggle project navigation" aria-expanded={navOpen} onClick={() => setNavOpen(v => !v)}><LayoutGrid size={18}/></button>
      <button className="uc-brand" onClick={onChangeProject}><b>N</b><strong>Nexus<span>RBX</span></strong></button>
      <nav className="uc-modes" aria-label="Creation modes">{[['agent','Chat',MessageSquare],['ui','UI',LayoutGrid],['asset','Asset',Box],['evidence','Evidence',ShieldCheck]].map(([id,label,Icon]) => <button key={id} aria-label={label} className={id === 'ui' ? 'is-active' : ''} aria-current={id === 'ui' ? 'page' : undefined} onClick={() => id === 'evidence' ? onOpenEvidence?.() : onModeChange?.(id)}><Icon size={17}/><span>{label}</span></button>)}</nav>
      <div className="uc-top-actions">{modelControl}<div className="uc-embedded-studio">{studioControl}</div><button className="uc-button uc-connect" onClick={onOpenStudio}><span className="uc-connect-label">{studioReady ? 'Studio connection' : 'Connect Studio'}</span><span className="uc-connect-short">Studio</span></button><button className="uc-account" aria-label="Account settings" onClick={onAccount}>N</button></div>
    </header>
    <aside className={`uc-sidebar ${navOpen ? 'is-open' : ''}`} aria-label="UI projects" inert={mobile && drawerOpen ? '' : undefined}>
      <button className="uc-back" onClick={onChangeProject}><ArrowLeft size={15}/>Back to projects</button>
      <button className="uc-project" onClick={onChangeProject}><span className="uc-project-icon"><Box size={23}/></span><span><strong>{projectTitle || 'Choose a project'}</strong><small>UI Design Project</small></span><ChevronDown size={14}/></button>
      <span className="uc-section-label">Creator</span>
      <button className="uc-nav-item is-active" disabled={working} onClick={onNew}><Plus size={18}/>New UI</button>
      <button className="uc-nav-item" onClick={() => onDrawer('files')}><FileCode2 size={18}/>Project Files</button>
      <button className="uc-nav-item" aria-expanded={library} onClick={() => setLibrary(v => !v)}><LayoutGrid size={18}/>UI Library</button>
      <button className="uc-nav-item" onClick={() => onDrawer('history')}><History size={18}/>Versions</button>
      <span className="uc-section-label">Recent</span>
      <div className="uc-design-list">{designs.length ? designs.map(d => <button key={d.designId} disabled={loading} className={`uc-nav-item ${document?.designId === d.designId ? 'is-selected' : ''}`} onClick={() => { onLoad(d.designId); setNavOpen(false); }}><FolderOpen size={17}/><span>{d.title || 'Untitled UI'}</span></button>) : <p className="uc-muted">No saved UIs yet. Start with an idea below.</p>}</div>
      <div className="uc-studio-card"><span className={`uc-dot ${studioReady ? 'is-connected' : ''}`}/><div><strong>{studioReady ? 'Studio Connected' : 'Studio not connected'}</strong><small>{studioReady ? 'Ready to apply your UI' : 'You can still build and save'}</small></div></div>
      <button className="uc-text-button" onClick={() => onDrawer('trash')}>Recently deleted</button><div className="uc-sidebar-footer"><b>N</b><span>NexusRBX<small>Build. Design. Play.</small></span></div>
    </aside>
    <section className="uc-main" aria-label="UI Creator" inert={mobile && drawerOpen ? '' : undefined}>
      <header className="uc-heading"><div><h1>UI Creator</h1><p>Describe it. Build it. Bring it into your game.</p></div><div className="uc-heading-actions"><button className="uc-button" aria-expanded={Boolean(drawer)} aria-controls="ui-build-drawer" onClick={() => onDrawer('luau')}><Code2 size={16}/>Code / Files</button>{saved && !applied && !working ? <button className="uc-button uc-primary" onClick={studioReady ? onApply : onOpenStudio}>{studioReady ? 'Apply to Studio' : 'Connect & Apply'}</button> : null}</div></header>
      {error ? <div className="uc-error" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={onDismissError}><X size={16}/></button></div> : null}
      {undo ? <div className="uc-notice" role="status">UI moved to recently deleted.<button onClick={onUndo}>Undo</button></div> : null}
      <div className="uc-session-header"><div className="uc-design-title">{renaming ? <form onSubmit={async e => { e.preventDefault(); if (title.trim()) { await onRename(title.trim()); setRenaming(false); } }}><input aria-label="UI name" ref={titleInput} maxLength={120} value={title} onChange={e => setTitle(e.target.value)}/><button aria-label="Save UI name"><Check size={16}/></button><button type="button" aria-label="Cancel rename" onClick={() => setRenaming(false)}><X size={16}/></button></form> : <><strong>{document?.title || 'New build session'}</strong>{document ? <button className="uc-text-button" disabled={working} onClick={() => { setTitle(document.title); setRenaming(true); }}>Rename</button> : null}</>}</div><div className="uc-statuses" aria-label="Build status"><span data-state={saved ? 'success' : 'pending'}>{saved ? 'Saved' : 'Not generated yet'}</span><span data-state={applied ? 'success' : 'pending'}>{applied ? 'Applied to Studio' : 'Studio not applied yet'}</span>{ready ? <span data-state="success">Ready</span> : null}</div></div>
      {library ? <section className="uc-library" aria-label="UI templates"><header><strong>Start a new UI</strong><button aria-label="Close templates" onClick={() => setLibrary(false)}><X size={16}/></button></header><p>Each template starts a new build session.</p><div className="uc-template-grid">{UI_TEMPLATES.map(t => <button key={t.title} disabled={working} onClick={() => { setLibrary(false); onTemplate(t); }}><span>{t.icon}</span><strong>{t.title}</strong><small>Build with AI →</small></button>)}</div></section> : null}
      <div className="uc-session"><section className="uc-conversation" aria-label="AI build conversation"><header><Sparkles size={15}/><strong>Build session</strong><span role="status" aria-live="polite">{status || 'Ready for your idea'}</span></header>{conversation}</section><div className="uc-preview-stage">{livePreview}</div></div>
      <div className="uc-composer">{composer}<p>Your next message continues this UI. <button disabled={working} onClick={onNew}>Start a new UI</button></p></div>
    </section>
    {drawer ? <><button className="uc-drawer-backdrop" aria-label="Close files drawer backdrop" tabIndex={-1} onClick={onCloseDrawer}/><aside id="ui-build-drawer" ref={panel} className="uc-drawer" role="dialog" aria-modal={mobile || undefined} aria-label="Code and files"><header><div><Code2 size={18}/><strong>Code / Files</strong></div><button aria-label="Close files drawer" onClick={onCloseDrawer}><X size={19}/></button></header><p className="uc-drawer-caption">Inspect your saved implementation while the build continues.</p><nav aria-label="Implementation views">{drawerTabs.map(([id,label]) => <button key={id} aria-pressed={drawer === id} onClick={() => onDrawer(id)}>{label}</button>)}</nav><div className="uc-drawer-content">{drawerContent}</div><footer><button className="uc-text-button" disabled={!document || working} onClick={onDelete}>Move UI to recently deleted</button></footer></aside></> : null}
  </div>;
}
