import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NexusSelect from './NexusSelect';
import { selectOption } from '../../testUtils/selectOption';

function Example({ disabled = false }) {
  const [value, setValue] = useState('');
  return <form aria-label="Settings"><label>Mode<NexusSelect name="mode" required disabled={disabled}
    value={value} onChange={event => setValue(event.target.value)}>
    <option value="">Choose a mode</option><optgroup label="Creation">
      <option value="build">Build</option><option value="ask">Ask</option><option value="plan" disabled>Plan</option>
    </optgroup>
  </NexusSelect></label></form>;
}

test('custom options update the field and preserve required empty values in forms', async () => {
  render(<Example />);
  const trigger = screen.getByRole('combobox', { name: 'Mode' });
  const form = screen.getByRole('form', { name: 'Settings' });
  expect(form.checkValidity()).toBe(false);
  await selectOption(trigger, 'Build');
  expect(trigger).toHaveTextContent('Build');
  expect(form.checkValidity()).toBe(true);
  expect(new FormData(form).get('mode')).toBe('build');
  await selectOption(trigger, 'Choose a mode');
  expect(trigger).toHaveTextContent('Choose a mode');
  expect(new FormData(form).get('mode')).toBe('');
  expect(form.checkValidity()).toBe(false);
});

test('grouped options preserve disabled states and Escape returns keyboard focus', async () => {
  render(<Example />);
  const trigger = screen.getByRole('combobox', { name: 'Mode' });
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  expect(await screen.findByRole('group', { name: 'Creation' })).toBeVisible();
  expect(screen.getByRole('option', { name: 'Plan' })).toHaveAttribute('aria-disabled', 'true');
  fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});

test('disabled controls cannot open', () => {
  render(<Example disabled />);
  expect(screen.getByRole('combobox', { name: 'Mode' })).toBeDisabled();
});
