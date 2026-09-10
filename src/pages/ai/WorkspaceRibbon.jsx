import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Code2, MoreHorizontal } from "lucide-react";
import UniversalBrand from "../../components/universal/UniversalBrand";
import "./WorkspaceRibbon.css";

/** One stable header; the active workspace supplies only its action slot. */
export default function WorkspaceRibbon({ mode, onModeChange, uiEnabled = true, animateEnabled = false,
  projectTitle, modelControl, studioControl, accountControl, actionSlotRef, assetControls,
  onChangeProject, onOpenEvidence, evidenceOpen = false, evidenceButtonRef, isBusy = false, inert = false }) {
  const [expanded, setExpanded] = useState(false);
  const tools = useRef(null), more = useRef(null);
  useEffect(() => { setExpanded(false); }, [mode]);
  useEffect(() => {
    if (!expanded) return undefined;
    const outside = event => {
      if (!tools.current?.contains(event.target) && !event.target.closest?.('[role="dialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]')) setExpanded(false);
    };
    const escape = event => {
      if (event.key === 'Escape' && !event.defaultPrevented && !event.target.closest?.('[role="dialog"], [role="menu"], [role="listbox"]')) { setExpanded(false); more.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [expanded]);
  return <header className="workspace-header" data-workspace-ribbon inert={inert ? '' : undefined}>
    <div className="workspace-header__identity">
      <UniversalBrand compact />
      <button className="workspace-header__project" onClick={onChangeProject} title={projectTitle || 'Choose project'} aria-label={`Change game. Current game: ${projectTitle || 'Choose game'}`}>
        <span>{projectTitle || 'Choose project'}</span><ChevronDown size={13} aria-hidden="true" />
      </button>
    </div>
    <div className="workspace-header__tabs" role="group" aria-label="Workspace mode" data-tour="mode-switcher">
      {[['agent','Agent'], ...(uiEnabled ? [['ui','UI']] : []), ['asset','Assets'], ...(animateEnabled ? [['animate','Animate']] : [])].map(([id,label]) =>
        <button type="button" key={id} data-optional={id === 'animate' || undefined} aria-pressed={mode === id} onClick={() => onModeChange(id)}>{label}</button>)}
    </div>
    <div className="workspace-header__right">
      <div className="workspace-header__tools" ref={tools}>
        <button ref={more} type="button" className="workspace-header__more" aria-label="Page actions" aria-expanded={expanded} aria-controls="workspace-page-actions" onClick={() => setExpanded(value => !value)}><MoreHorizontal size={18} /></button>
        <div id="workspace-page-actions" className="workspace-header__actions" data-open={expanded}>
          {mode === 'asset' ? assetControls : <div className="workspace-header__model">{modelControl}</div>}
          {mode === 'agent' ? <button ref={evidenceButtonRef} type="button" className="workspace-header__files" aria-label="Code / Files" aria-expanded={evidenceOpen} onClick={onOpenEvidence}><Code2 size={15} /><span>Code / Files</span>{isBusy ? <i className="nx-build-signal" data-active="true" aria-label="Build running" /> : null}</button> : null}
          <div ref={actionSlotRef} className="workspace-header__page-slot" />
          {animateEnabled ? <button className="workspace-header__optional-mode" type="button" onClick={() => onModeChange('animate')}>Animation workspace</button> : null}
        </div>
      </div>
      <div className="workspace-header__studio" data-tour="studio-pair">{studioControl}</div>
      <div className="workspace-header__account">{accountControl}</div>
    </div>
  </header>;
}
