import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Backpack, Check, ChevronDown, Code2, FolderOpen, History, Plus, Settings2, ShoppingBag, X } from 'lucide-react';
import WorkspaceRibbon from '../WorkspaceRibbon';
import './UiCreatorChrome.css';


export const UI_TEMPLATES = [
  { title: 'Shop Menu', Icon: ShoppingBag, prompt: 'Build a responsive Roblox shop menu with dark translucent panels, purple accents, item categories, a currency balance, a product grid, clear purchase actions, and empty and insufficient-currency states.' },
  { title: 'Inventory', Icon: Backpack, prompt: 'Build a responsive Roblox inventory with item search, category filters, rarity badges, selected item details, equip and unequip actions, and a friendly empty inventory state.' },
  { title: 'Settings Panel', Icon: Settings2, prompt: 'Build a Roblox settings panel with accessible volume controls, graphics and gameplay settings, save and reset actions, and clear confirmation feedback.' },
];
const inspectTabs = [['files','Files'],['luau','Code'],['assets','Assets'],['interactions','Interactions']];

export default function UiCreatorChrome({ document, designs = [], projectTitle, studioReady, working, loading, status,
  saved, applied, applyState = 'Not applied to this Studio', visuallyReviewed = false, error, onDismissError, modelControl, studioControl, onModeChange, onChangeProject,
  onOpenEvidence, onOpenStudio, onAccount, onNew, onLoad, onApply, onDrawer, onPrompt, onTemplate,
  drawer, onCloseDrawer, drawerContent, composer, conversation, livePreview, onRename, onDelete, undo, onUndo,
  sharedHeader = false, headerActionTarget = null, onHeaderModalChange }) {
  const [chatWidth, setChatWidth] = useState(350);
  const session = useRef(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mobileView, setMobileView] = useState('chat');
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState('');
  const panel = useRef(null), picker = useRef(null), titleInput = useRef(null);
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
  useEffect(() => {
    if (!pickerOpen) return undefined;
    const closeOnOutside = event => { if (!picker.current?.contains(event.target) && !event.target.closest?.('[data-ui-picker-trigger]')) setPickerOpen(false); };
    const closeOnEscape = event => { if (event.key === 'Escape') setPickerOpen(false); };
    window.document.addEventListener('pointerdown', closeOnOutside);
    window.document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.document.removeEventListener('pointerdown', closeOnOutside);
      window.document.removeEventListener('keydown', closeOnEscape);
    };
  }, [pickerOpen]);
  const inspectOpen = ['files', 'luau', 'assets', 'interactions'].includes(drawer);
  const needsReview = /review|attention|unavailable|failed|budget|limitation/i.test(status || '');
  const activelyBuilding = working && !/^(Loading project|Opening UI)$/.test(status || '');
  const applicationInFlight = /^(Applying|Awaiting Studio acknowledgement|Acknowledged · verifying|Application outcome uncertain|Apply failed)/.test(applyState);
  const designStatus = !saved ? '' : activelyBuilding ? applicationInFlight ? applyState : 'Building…'
    : needsReview ? 'Needs review' : [visuallyReviewed ? 'Visually reviewed' : 'Saved', applied ? 'Applied' : applyState, 'Runtime not verified'].join(' · ');
  const workspaceActions = <div className="uc-workspace-actions">
    <button type="button" data-ui-picker-trigger aria-expanded={pickerOpen} aria-controls="ui-design-picker" onClick={() => setPickerOpen(value => !value)}><Plus size={15}/>New UI</button>
    <button ref={codeTrigger} type="button" aria-expanded={inspectOpen} aria-controls="ui-build-drawer" onClick={() => onDrawer('files')}><Code2 size={15}/>Inspect</button>
    <button type="button" aria-expanded={drawer === 'history'} aria-controls="ui-build-drawer" onClick={() => onDrawer('history')}><History size={15}/>History</button>
    <button type="button" className="uc-action-primary" disabled={!saved || working} onClick={studioReady ? onApply : onOpenStudio}>Apply to Studio</button>
  </div>;
  return <div className={`uc-app ${sharedHeader ? 'uc-app--shared-header' : ''}`}>
    {!sharedHeader ? <WorkspaceRibbon mode="ui" projectTitle={projectTitle} onChangeProject={onChangeProject} onModeChange={onModeChange} modelControl={modelControl} studioControl={studioControl} inert={mobile && drawerOpen}/> : null}
    {headerActionTarget ? createPortal(workspaceActions, headerActionTarget) : null}
    <section className="uc-main" aria-label="UI Creator" inert={mobile && drawerOpen ? '' : undefined}>
      <header className="uc-local-toolbar">
        <div className="uc-view-tabs" role="tablist" aria-label="UI workspace view">
          <button type="button" role="tab" aria-selected={mobileView === 'chat'} onClick={() => setMobileView('chat')}>Chat</button>
          <button type="button" role="tab" aria-selected={mobileView === 'preview'} onClick={() => setMobileView('preview')}>Preview</button>
        </div>
        {!headerActionTarget ? workspaceActions : null}
      </header>
      {error ? <div className="uc-error" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={onDismissError}><X size={16}/></button></div> : null}
      {undo ? <div className="uc-notice" role="status">UI moved to recently deleted.<button onClick={onUndo}>Undo</button></div> : null}
      {pickerOpen ? <section ref={picker} id="ui-design-picker" className="uc-picker" aria-label="Choose or create a UI">
        <header><div><strong>UI Library</strong><span>Choose a saved UI or start something new.</span></div><button type="button" aria-label="Close UI Library" onClick={() => setPickerOpen(false)}><X size={17}/></button></header>
        <div className="uc-picker-create"><button type="button" className="uc-picker-blank" disabled={working} onClick={() => { setPickerOpen(false); onNew(); }}><Plus size={18}/><span><strong>Blank UI</strong><small>Start from a description</small></span></button>{UI_TEMPLATES.map(t => { const Icon = t.Icon; return <button type="button" key={t.title} disabled={working} onClick={() => { setPickerOpen(false); onTemplate(t); }}><Icon size={18} aria-hidden="true"/><strong>{t.title}</strong></button>; })}</div>
        <div className="uc-picker-recents"><span>Recent UIs</span>{designs.length ? designs.map(d => <button type="button" key={d.designId} disabled={loading} aria-current={document?.designId === d.designId ? 'true' : undefined} onClick={() => { onLoad(d.designId); setPickerOpen(false); }}><FolderOpen size={16}/><span>{d.title || 'Untitled UI'}</span>{document?.designId === d.designId ? <Check size={15}/> : null}</button>) : <p>No saved UIs yet</p>}</div>
        <footer><button type="button" onClick={() => { setPickerOpen(false); onDrawer('trash'); }}>Recently deleted</button></footer>
      </section> : null}
      <div ref={session} className="uc-session" data-mobile-view={mobileView} style={{'--uc-chat-width': `${chatWidth}px`}}><section className="uc-conversation" aria-label="AI build conversation"><header className="uc-pane-header"><span>Chat</span></header>{conversation}<div className="uc-composer">{composer}</div></section><div className="uc-resize" role="separator" aria-label="Resize conversation" aria-orientation="vertical" aria-valuemin={280} aria-valuemax={520} aria-valuenow={chatWidth} tabIndex={0}
        onKeyDown={e => { if (['ArrowLeft','ArrowRight'].includes(e.key)) { e.preventDefault(); setChatWidth(w => Math.max(280, Math.min(520, w + (e.key === 'ArrowRight' ? 20 : -20)))); } }}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setChatWidth(Math.max(280, Math.min(520, session.current.clientWidth - 320, e.clientX - session.current.getBoundingClientRect().left))); }}
        onPointerUp={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}/><section className="uc-preview-pane" aria-label="UI preview"><header className="uc-preview-header"><div><span>Preview</span>{renaming ? <form onSubmit={async e => { e.preventDefault(); if (title.trim()) { await onRename(title.trim()); setRenaming(false); } }}><input aria-label="UI name" ref={titleInput} maxLength={120} value={title} onChange={e => setTitle(e.target.value)}/><button aria-label="Save UI name"><Check size={16}/></button><button type="button" aria-label="Cancel rename" onClick={() => setRenaming(false)}><X size={16}/></button></form> : <div className="uc-design-title"><button type="button" data-ui-picker-trigger aria-label={`Choose UI. Current: ${document?.title || 'New UI'}`} aria-expanded={pickerOpen} aria-controls="ui-design-picker" onClick={() => setPickerOpen(value => !value)}><strong>{document?.title || 'New UI'}</strong><ChevronDown size={15}/></button>{document ? <button type="button" className="uc-rename" disabled={working} onClick={() => { setTitle(document.title); setRenaming(true); }}>Rename</button> : null}</div>}</div>{designStatus ? <span className="uc-design-status" role="status">{designStatus}</span> : null}</header><div className="uc-preview-stage">{livePreview}</div></section></div>
    </section>
    {drawer ? <><button className="uc-drawer-backdrop" aria-label="Close drawer backdrop" tabIndex={-1} onClick={onCloseDrawer}/><aside id="ui-build-drawer" ref={panel} className="uc-drawer nx-workspace-drawer" role="dialog" aria-modal={mobile || undefined} aria-label={drawer === 'history' ? 'UI history' : drawer === 'trash' ? 'Recently deleted UIs' : 'Inspect UI'}><header><div>{drawer === 'history' ? <History size={18}/> : <Code2 size={18}/>}<strong>{drawer === 'history' ? 'History' : drawer === 'trash' ? 'Recently deleted' : 'Inspect'}</strong></div><button aria-label="Close drawer" onClick={onCloseDrawer}><X size={19}/></button></header>{inspectOpen ? <nav aria-label="Inspect views">{inspectTabs.map(([id,label]) => <button key={id} aria-pressed={drawer === id} onClick={() => onDrawer(id)}>{label}</button>)}</nav> : null}<div className="uc-drawer-content">{drawerContent}</div><footer><button className="uc-text-button" disabled={!document || working} onClick={onDelete}>Move UI to recently deleted</button></footer></aside></> : null}
  </div>;
}
