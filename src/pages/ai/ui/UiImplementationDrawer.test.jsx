import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UiImplementationDrawer from './UiImplementationDrawer';
import { selectOption } from '../../../testUtils/selectOption';
import { downloadUiModel } from '../../../lib/uiDesignApi';
jest.mock('../../../lib/uiDesignApi', () => ({ downloadUiModel: jest.fn() }));
const mockEditorLayout = jest.fn();
jest.mock('@monaco-editor/react',()=>({value,options,onMount})=>{
  require('react').useEffect(()=>{ onMount?.({layout:mockEditorLayout}); },[onMount]);
  return <textarea aria-label="Saved source" readOnly={options.readOnly} value={value} data-automatic-layout={String(options.automaticLayout)}/>;
});
const document={designId:'design',revision:'revision',screens:[{nodes:[{id:'root',name:'Root',interactions:{}}]}],assets:[]};
const files=[{kind:'file',artifactId:'artifact',revision:'file-rev',path:'ReplicatedStorage/UI/GeneratedUI'},{kind:'file',artifactId:'artifact',revision:'file-rev',path:'StarterGui/UI/Controller'}];
test('Luau reads the exact saved artifact while the build continues, without compiling',async()=>{
  const readFile=jest.fn(async({path})=>({source:path.endsWith('Controller') ? 'local controller = true' : 'return { RealUI = true }',revision:'file-rev'}));
  render(<UiImplementationDrawer tab="luau" document={document} files={files} readFile={readFile} working/>);
  await screen.findByLabelText('Saved source');
  expect(readFile).toHaveBeenCalledWith({artifactId:'artifact',revision:'file-rev',path:'ReplicatedStorage/UI/GeneratedUI'},expect.objectContaining({signal:expect.anything()}));
  expect(screen.getByLabelText('Saved source')).toHaveValue('return { RealUI = true }');expect(screen.getByLabelText('Saved source')).toHaveAttribute('readonly');
  expect(screen.getByText(/Build continues/)).toBeVisible();
  await selectOption(screen.getByLabelText('Generated file'), 'StarterGui/UI/Controller');
  await waitFor(()=>expect(screen.getByLabelText('Saved source')).toHaveValue('local controller = true'));
  expect(readFile).toHaveBeenCalledTimes(2);
});
test('no generated files means no sample scaffold or export',()=>{
  render(<UiImplementationDrawer tab="luau" document={null} files={[]} readFile={jest.fn()}/>);
  expect(screen.getByText('No generated files yet')).toBeVisible();expect(screen.getByRole('button',{name:'Download'})).toBeDisabled();
});
test('source-owned files remain readable when the task workspace has no files',async()=>{
  const readFile=jest.fn();
  const saved={...document,sourceFiles:[
    {path:'View.luau',content:'return { saved = true }'},
    {path:'Controller.client.luau',content:'local gui = script.Parent'},
  ]};
  const {rerender}=render(<UiImplementationDrawer tab="files" document={saved} files={[]} readFile={readFile}/>);
  expect(screen.queryByText('No generated files yet')).not.toBeInTheDocument();
  expect(await screen.findByLabelText('Saved source')).toHaveValue('return { saved = true }');
  await selectOption(screen.getByLabelText('Generated file'), 'Controller.client.luau');
  await waitFor(()=>expect(screen.getByLabelText('Saved source')).toHaveValue('local gui = script.Parent'));
  expect(readFile).not.toHaveBeenCalled();
  rerender(<UiImplementationDrawer tab="files" document={{...saved,revision:'next-revision',sourceFiles:[
    {path:'View.luau',content:'return { saved = true }'},
    {path:'Controller.client.luau',content:'local gui = script.Parent -- revised'},
  ]}} files={[]} readFile={readFile}/>);
  await waitFor(()=>expect(screen.getByLabelText('Saved source')).toHaveValue('local gui = script.Parent -- revised'));
});
test('saved RBXM export remains available without a hydrated build, and a missing model leaves source readable',async()=>{
  downloadUiModel.mockRejectedValueOnce(new Error('The RBXM is not available yet. Your source files are saved.'));
  const saved={...document,sourceFiles:[{path:'View.luau',content:'return { saved = true }'}]};
  render(<UiImplementationDrawer tab="files" document={saved} files={[]} readFile={jest.fn()}/>);
  expect(await screen.findByLabelText('Saved source')).toHaveValue('return { saved = true }');
  const button=screen.getByRole('button',{name:'Download RBXM'});
  expect(button).toBeEnabled();
  fireEvent.click(button);
  await waitFor(()=>expect(downloadUiModel).toHaveBeenCalledWith('design'));
  expect(await screen.findByRole('alert')).toHaveTextContent('RBXM is not available yet');
  expect(screen.getByLabelText('Saved source')).toHaveValue('return { saved = true }');
});
test('source editor defers layout after container resize instead of using Monaco automatic layout',async()=>{
  const previousObserver=global.ResizeObserver;
  const previousFrame=window.requestAnimationFrame;
  const previousCancel=window.cancelAnimationFrame;
  let observerCallback;
  let frameCallback;
  const disconnect=jest.fn();
  global.ResizeObserver=class { constructor(callback){observerCallback=callback;} observe(){} disconnect(){disconnect();} };
  window.requestAnimationFrame=jest.fn(callback=>{frameCallback=callback;return 1;});
  window.cancelAnimationFrame=jest.fn();
  try {
    const saved={...document,sourceFiles:[{path:'View.luau',content:'return {}'}]};
    const {unmount}=render(<UiImplementationDrawer tab="files" document={saved} files={[]} readFile={jest.fn()}/>);
    expect(await screen.findByLabelText('Saved source')).toHaveAttribute('data-automatic-layout','false');
    const initialLayouts=mockEditorLayout.mock.calls.length;
    observerCallback();
    expect(mockEditorLayout).toHaveBeenCalledTimes(initialLayouts);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    frameCallback();
    expect(mockEditorLayout).toHaveBeenCalledTimes(initialLayouts+1);
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  } finally {
    global.ResizeObserver=previousObserver;
    window.requestAnimationFrame=previousFrame;
    window.cancelAnimationFrame=previousCancel;
  }
});
test('deleted designs remain recoverable after reopening the drawer',()=>{
  const recover=jest.fn();render(<UiImplementationDrawer tab="trash" deletedDesigns={[{designId:'deleted',title:'Saved shop'}]} onRecover={recover}/>);
  fireEvent.click(screen.getByRole('button',{name:'Restore UI'}));expect(recover).toHaveBeenCalledWith({designId:'deleted',title:'Saved shop'});
});
test('saved source can be reviewed without legacy screen nodes',()=>{
  const onReview=jest.fn();
  const sourceOwned={designId:'design',revision:'source-revision',screens:[{nodes:[]}],
    sourceFiles:[{path:'View.luau',content:'return {}'},{path:'Controller.client.luau',content:'local root = script.Parent'}]};
  const {rerender}=render(<UiImplementationDrawer tab="history" document={sourceOwned} onReview={onReview}/>);
  fireEvent.click(screen.getByRole('button',{name:'Review saved UI'}));
  expect(onReview).toHaveBeenCalledTimes(1);
  rerender(<UiImplementationDrawer tab="history" document={sourceOwned} onReview={onReview} hasRepairBrief/>);
  expect(screen.getByRole('button',{name:'Repair saved UI'})).toBeEnabled();
  rerender(<UiImplementationDrawer tab="history" document={sourceOwned} onReview={onReview} working/>);
  expect(screen.getByRole('button',{name:'Review saved UI'})).toBeDisabled();
  rerender(<UiImplementationDrawer tab="history" document={{...sourceOwned,revision:null}} onReview={onReview}/>);
  expect(screen.queryByRole('button',{name:'Review saved UI'})).not.toBeInTheDocument();
});
