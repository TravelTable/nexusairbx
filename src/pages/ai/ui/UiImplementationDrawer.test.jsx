import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UiImplementationDrawer from './UiImplementationDrawer';
import { selectOption } from '../../../testUtils/selectOption';
jest.mock('@monaco-editor/react',()=>({value,options})=><textarea aria-label="Saved source" readOnly={options.readOnly} value={value}/>);
const document={designId:'design',revision:'revision',screens:[{nodes:[{id:'root',name:'Root',interactions:{}}]}],assets:[]};
const files=[{kind:'file',artifactId:'artifact',revision:'file-rev',path:'ReplicatedStorage/UI/GeneratedUI'},{kind:'file',artifactId:'artifact',revision:'file-rev',path:'StarterGui/UI/Controller'}];
test('Luau reads the exact saved artifact while the build continues, without compiling',async()=>{
  const readFile=jest.fn(async()=>({source:'return { RealUI = true }',revision:'file-rev'}));
  render(<UiImplementationDrawer tab="luau" document={document} files={files} readFile={readFile} working/>);
  await screen.findByLabelText('Saved source');
  expect(readFile).toHaveBeenCalledWith({artifactId:'artifact',revision:'file-rev',path:'ReplicatedStorage/UI/GeneratedUI'},expect.objectContaining({signal:expect.anything()}));
  expect(screen.getByLabelText('Saved source')).toHaveValue('return { RealUI = true }');expect(screen.getByLabelText('Saved source')).toHaveAttribute('readonly');
  expect(screen.getByText(/Build continues/)).toBeVisible();
  await selectOption(screen.getByLabelText('Generated file'), 'StarterGui/UI/Controller');
  await waitFor(()=>expect(readFile).toHaveBeenCalledTimes(2));
});
test('no generated files means no sample scaffold or export',()=>{
  render(<UiImplementationDrawer tab="luau" document={null} files={[]} readFile={jest.fn()}/>);
  expect(screen.getByText('No generated files yet')).toBeVisible();expect(screen.getByRole('button',{name:'Download'})).toBeDisabled();
});
test('deleted designs remain recoverable after reopening the drawer',()=>{
  const recover=jest.fn();render(<UiImplementationDrawer tab="trash" deletedDesigns={[{designId:'deleted',title:'Saved shop'}]} onRecover={recover}/>);
  fireEvent.click(screen.getByRole('button',{name:'Restore UI'}));expect(recover).toHaveBeenCalledWith({designId:'deleted',title:'Saved shop'});
});
