import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import WorkspaceAssetControls from './WorkspaceAssetControls';
jest.mock('../../components/ai/workspace/RobloxDecalUploadDropdown', () => () => <button>Upload Roblox decals</button>);

test('asset search navigates with an encoded query and keeps the real upload entry point', () => {
  const navigateTo = jest.fn();
  render(<WorkspaceAssetControls navigateTo={navigateTo}/>);
  fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'gold coin & stars' } });
  fireEvent.submit(screen.getByRole('search'));
  expect(navigateTo).toHaveBeenCalledWith('/icons-market?q=gold+coin+%26+stars');
  expect(screen.getByRole('button', { name: 'Upload Roblox decals' })).toBeInTheDocument();
});
