import React from 'react';
import { render, screen } from '@testing-library/react';
import { TokenBar } from './AiComponents';

jest.mock('../../lib/billing', () => require('../../lib/billingSummary'));

test('workspace meter displays v2 canonical microcredits in the current denomination', () => {
  render(<TokenBar plan="pro" includedUsage={{ catalogVersion: 'v2', creditRemainingMicros: 9000000,
    percentUsed: 0, billingScope: { type: 'team' } }} />);
  expect(screen.getByRole('link', { name: '1,000 Nexus Credits' })).toHaveAttribute('href', '/billing');
  expect(screen.getByRole('status')).toHaveTextContent('Team pool');
});

test('unlimited accounts retain a credit-labelled purchased balance while legacy balance stays in USD', () => {
  const view = render(<TokenBar plan="pro" unlimitedTokens premiumBalance={{ currency: 'credits', balanceMicros: 9000000 }} />);
  expect(screen.getByText('Purchased credits:')).toHaveTextContent('1,000');
  expect(screen.queryByText(/\$9\.00/)).not.toBeInTheDocument();
  view.rerender(<TokenBar plan="pro" unlimitedTokens premiumBalance={{ currency: 'usd', balanceMicros: 9000000 }} />);
  expect(screen.getByText('Premium Balance:')).toHaveTextContent('$9.00');
});
