import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UiLiveFiles from './UiLiveFiles';
jest.mock('@monaco-editor/react', () => props => <pre aria-label="Live source">{props.value}</pre>);
test('streams the selected real source and follows newly started files', () => {
  const files = [{ path: 'View.luau', content: 'local UI = {}', status: 'writing' }];
  const view = render(<UiLiveFiles files={files} stage="generating"/>);
  expect(screen.getByLabelText('Live source')).toHaveTextContent('local UI = {}');
  const next = [{ ...files[0], content: 'return UI', status: 'saved' }, { path: 'Controller.client.luau', content: 'local root = script.Parent', status: 'writing' }];
  view.rerender(<UiLiveFiles files={next} stage="generating"/>);
  expect(screen.getByLabelText('Live source')).toHaveTextContent('script.Parent');
  fireEvent.click(screen.getByRole('tab', { name: 'View.luau' }));
  view.rerender(<UiLiveFiles files={[next[0], { ...next[1], content: 'local root = script.Parent\nroot.Enabled = true' }]} stage="generating"/>);
  expect(screen.getByLabelText('Live source')).toHaveTextContent('return UI');
  expect(screen.queryByRole('tab', { name: 'JSON' })).not.toBeInTheDocument();
});
test('packaging keeps completed code inspectable', () => {
  render(<UiLiveFiles files={[{ path: 'View.luau', content: 'return UI', status: 'saved' }]} stage="building_model"/>);
  expect(screen.getByText('Building RBXM')).toBeInTheDocument();
  expect(screen.getByLabelText('Live source')).toHaveTextContent('return UI');
});

test('planning and validation labels do not claim source is still being written', () => {
  const view = render(<UiLiveFiles stage="generating" action="planning_design"/>);
  expect(screen.getByText('Planning the design')).toBeInTheDocument();
  expect(screen.queryByText('Writing files')).not.toBeInTheDocument();
  view.rerender(<UiLiveFiles stage="generating" action="validating_implementation" files={[{path:'View.luau',content:'return {}',status:'saved'}]}/>);
  expect(screen.getByText('Checking UI implementation')).toBeInTheDocument();
});
test('shows the generated manifest count instead of a fixed two-file limit', () => {
  render(<UiLiveFiles files={[
    { path: 'View.luau', content: 'return UI', status: 'saved' },
    { path: 'Controller.client.luau', content: '', status: 'writing' },
    { path: 'Components/Button.luau', content: '', status: 'pending' },
  ]} stage="generating"/>);
  expect(screen.getByText('1 / 3 files')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Components/Button.luau' })).toBeInTheDocument();
});
