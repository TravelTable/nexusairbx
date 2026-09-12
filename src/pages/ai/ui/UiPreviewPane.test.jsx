import React from 'react';
import { selectOption } from '../../../testUtils/selectOption';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UiPreviewPane from './UiPreviewPane';
import useUiPreview from '../../../hooks/useUiPreview';
jest.mock('../../../hooks/useUiPreview', () => jest.fn());
const capture={snapshotId:'snap',sourceRevision:'rev',treeHash:'tree',complete:true};
const base={userId:'user',designId:'design',projectId:'project',sourceRevision:'rev',capture,
  viewports:[{id:'desktop',label:'Desktop',width:1280,height:720},{id:'phone',label:'Phone',width:390,height:844}],
  states:[{id:'open',label:'Shop open',stale:false},{id:'old',label:'Old state',stale:true}],
  capabilities:{previewEnabled:true,rendererAvailable:true},studioConnected:true,hasNodes:true};
const waiting={status:'waiting_capture',imageUrl:'',preview:null,error:'',retry:jest.fn()};
const image={status:'ready',imageUrl:'blob:verified',error:'',retry:jest.fn(),preview:{sourceRevision:'rev',viewportId:'desktop',stateLabel:'Default',snapshotId:'snap',rendererBackend:'private',viewport:{width:1280,height:720},warnings:[]}};
beforeEach(()=>{jest.clearAllMocks();useUiPreview.mockReturnValue(waiting);});
test('empty preview encourages generation without Studio and shows no fabricated image',()=>{
  render(<UiPreviewPane {...base} hasNodes={false} studioConnected={false} capture={null}/>);
  expect(screen.getByText(/Use the chat to describe a shop/)).toBeVisible();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
test('a failed build without a model stops preparing and cannot retry a nonexistent capture',()=>{
  render(<UiPreviewPane {...base} capture={null} buildFailure="A paid plan is required."/>);
  expect(screen.getAllByText('Build failed').length).toBeGreaterThan(0);
  expect(screen.getByText(/A paid plan is required/)).toBeVisible();
  expect(screen.queryByText('Preparing preview')).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Retry Preview'})).not.toBeInTheDocument();
});

test('saved designs request Pinevex automatically without Studio',()=>{
  render(<UiPreviewPane {...base} capture={{...capture,captureKind:'design'}} studioConnected={false} run={{stage:'Building UI layout'}}/>);
  expect(useUiPreview).toHaveBeenLastCalledWith(expect.objectContaining({snapshotId:'snap',enabled:true,waitForBuild:false}));
  expect(screen.queryByRole('button',{name:'Connect Studio'})).not.toBeInTheDocument();
});

test('a previous revision cannot be requested as the current capture',()=>{
  render(<UiPreviewPane {...base} capture={{...capture,sourceRevision:'old'}}/>);
  expect(useUiPreview).toHaveBeenLastCalledWith(expect.objectContaining({snapshotId:null}));
  expect(screen.getByRole('button',{name:/Phone/})).toBeDisabled();
});
test('device and state switches only change the requested render identity',async()=>{
  useUiPreview.mockReturnValue(image);const apply=jest.fn(),sync=jest.fn();
  render(<UiPreviewPane {...base} onApplyToStudio={apply} onRefreshCapture={sync}/>);
  fireEvent.click(screen.getByRole('button',{name:/Phone/}));
  await selectOption(screen.getByLabelText('Preview state'), 'Shop open');
  expect(useUiPreview).toHaveBeenLastCalledWith(expect.objectContaining({viewportId:'phone',stateId:'open',snapshotId:'snap'}));
  expect(apply).not.toHaveBeenCalled();expect(sync).not.toHaveBeenCalled();expect(screen.queryByRole('option',{name:'Old state'})).not.toBeInTheDocument();
});
test('render failure preserves the earlier image and retries preview without applying or capturing',async()=>{
  const retry=jest.fn(),apply=jest.fn(),sync=jest.fn(),refresh=jest.fn();
  useUiPreview.mockReturnValue({...image,status:'error',earlier:true,error:'Renderer offline',retry,preview:{...image.preview,sourceRevision:'old'}});
  render(<UiPreviewPane {...base} onApplyToStudio={apply} onRefreshCapture={sync} onRefreshManifest={refresh}/>);
  expect(screen.getByRole('img')).toHaveAttribute('src','blob:verified');expect(screen.getByText('Previous preview')).toBeVisible();
  expect(screen.getByText(/Your saved work is retained/)).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Retry Preview'}));await waitFor(()=>expect(retry).toHaveBeenCalledTimes(1));
  expect(refresh).toHaveBeenCalledTimes(1);expect(apply).not.toHaveBeenCalled();expect(sync).not.toHaveBeenCalled();
});
test('renderer outage still keeps the prior Pinevex image visible',()=>{
  useUiPreview.mockReturnValue({...image,earlier:true});
  render(<UiPreviewPane {...base} capabilities={{rendererAvailable:false}}/>);
  expect(screen.getByRole('img')).toBeVisible();expect(screen.getByRole('button',{name:'Retry Preview'})).toBeVisible();
  expect(useUiPreview).toHaveBeenLastCalledWith(expect.objectContaining({enabled:false}));
});
test('the retained image keeps its original device and state caption during updates',()=>{
  useUiPreview.mockReturnValue({...image,earlier:true,preview:{...image.preview,viewportId:'phone',stateLabel:'Shop open',sourceRevision:'old'}});
  render(<UiPreviewPane {...base} run={{stage:'Rendering preview'}}/>);
  expect(screen.getByText(/Phone · Shop open · Pinevex/)).toBeVisible();
});
test('build render jobs are observed directly instead of starting duplicate renders',()=>{
  render(<UiPreviewPane {...base} renderJobs={[{stateId:'default',viewportId:'desktop',jobId:'build-render'}]} run={{stage:'Rendering preview'}}/>);
  expect(useUiPreview).toHaveBeenLastCalledWith(expect.objectContaining({renderJobId:'build-render',waitForBuild:true}));
});
