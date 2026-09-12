import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import WorkingDots from '../../../components/ai/chat/WorkingDots';
import './UiLiveFiles.css';

export default function UiLiveFiles({ files = [], stage, action, working = true }) {
  const [selected, setSelected] = useState('');
  const editorRef = useRef(null);
  const writing = files.find(f => f.status === 'writing');
  const file = files.find(f => f.path === selected) || writing || files[0];
  const lastWriting = useRef('');
  const label = ({ understanding_request: 'Understanding your request', planning_design: 'Planning the design', resolving_assets: 'Resolving icons and assets', generating_artwork: 'Generating artwork', validating_implementation: 'Checking UI implementation' })[action]
    || ({ preparing: 'Saving files', building_model: 'Building RBXM', repairing: 'Refining your UI' })[stage]
    || (['design_preview', 'applying', 'awaiting_studio', 'rendering', 'awaiting_renders', 'reviewing'].includes(stage) ? 'Preparing preview' : working ? 'Writing files' : 'Draft files');
  useEffect(() => {
    if (writing?.path && writing.path !== lastWriting.current) { setSelected(writing.path); lastWriting.current = writing.path; }
  }, [writing?.path]);
  useEffect(() => {
    if (working && file?.status === 'writing') editorRef.current?.revealLine(editorRef.current.getModel()?.getLineCount() || 1);
  }, [file?.content, file?.status, working]);
  return <section className="uc-live-files" aria-label="Generated UI files">
    <div className="uc-live-files__header"><span>{label}{working && <WorkingDots/>}</span>
      <small>{files.length ? `${files.filter(f => f.status === 'saved').length} / ${files.length} files` : ''}</small></div>
    <div className="uc-live-files__tabs" role="tablist" aria-label="Source files">{files.map(f => <button type="button" role="tab" key={f.path} aria-selected={file?.path === f.path} onClick={() => setSelected(f.path)}>{f.path}{f.status === 'writing' && working ? <span className="uc-live-files__dot" aria-label="Writing"/> : null}</button>)}</div>
    <div className="uc-live-files__editor">{file ? <Editor language="lua" theme="vs-dark" value={file.content} onMount={editor => { editorRef.current = editor; }}
      options={{ readOnly: true, domReadOnly: true, ariaLabel: file.path, minimap: { enabled: false }, fontSize: 12, padding: { top: 16 }, automaticLayout: true, wordWrap: 'on', scrollBeyondLastLine: false }}/>
      : <div className="uc-live-files__empty">Your files will appear here as they’re written.{working && <WorkingDots/>}</div>}</div>
  </section>;
}
