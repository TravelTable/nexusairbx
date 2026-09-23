import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import FinancialPlans from './FinancialPlans';
import { trackProductEvent } from '../../lib/productAnalytics';

jest.mock('../../lib/productAnalytics', () => ({ trackProductEvent: jest.fn() }));

test('public plans show the same denomination as billing with accessible credit values', () => {
  render(<FinancialPlans />);
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  expect(screen.getByText('1,000')).toBeInTheDocument();
  expect(screen.getByText('166.67')).toBeInTheDocument();
  expect(screen.getByText('1,666.67 credits per seat, pooled monthly')).toBeInTheDocument();
});

test('catalog is a tools list of Starter and Pro with checkout, not a marketing essay', () => {
  render(<FinancialPlans />);

  expect(screen.getByRole('heading', { name: 'Build with Nexus from $2/month.', level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Starter' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
  expect(screen.getByText('$2')).toBeInTheDocument();
  expect(screen.getByText('$14.99')).toBeInTheDocument();

  expect(screen.getByRole('link', { name: /Get Starter/i })).toHaveAttribute('href', '/subscribe?plan=STARTER&interval=month');
  expect(screen.getByRole('link', { name: /Get Pro/i })).toHaveAttribute('href', '/subscribe?plan=PRO&interval=month');

  expect(screen.queryByText(/PLAN FINDER/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/How far do Nexus Credits go/i)).not.toBeInTheDocument();
  expect(screen.queryByText('START BUILDING')).not.toBeInTheDocument();
  expect(screen.queryByText('BUILD SERIOUSLY')).not.toBeInTheDocument();
  expect(screen.queryByText('✓')).not.toBeInTheDocument();
  expect(screen.getByText(/USD, plus applicable tax/i)).toBeInTheDocument();
  expect(screen.getByText(/no free AI trial/i)).toBeInTheDocument();
  expect(screen.getByText(/do not roll over/i)).toBeInTheDocument();

  const starter = screen.getByRole('article', { name: /Starter/i });
  expect(within(starter).getByText('Monthly Nexus Credits')).toBeInTheDocument();
  expect(within(starter).getByText('166.67')).toBeInTheDocument();
});

test('Team is a checkout card for pooled credits and larger seats', () => {
  render(<FinancialPlans />);
  expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Set up Team/i })).toHaveAttribute('href', '/subscribe?plan=TEAM&interval=month');
  expect(screen.getByText('Team collaboration for 5 seats, using each member\'s own credits')).toBeInTheDocument();
  expect(screen.getByText('1,666.67 credits per seat, pooled monthly')).toBeInTheDocument();
});

test('annual billing updates Pro checkout while Starter stays monthly', () => {
  render(<FinancialPlans />);
  fireEvent.click(screen.getByRole('button', { name: /Annually/i }));
  expect(trackProductEvent).toHaveBeenCalledWith('billing_period_selected', { billing_interval: 'year' });
  expect(screen.getByRole('link', { name: /Get Pro/i })).toHaveAttribute('href', '/subscribe?plan=PRO&interval=year');
  expect(screen.getByRole('link', { name: /Get Starter/i })).toHaveAttribute('href', '/subscribe?plan=STARTER&interval=month');
  expect(screen.getByText('$12.74')).toBeInTheDocument();

  const starter = screen.getByRole('article', { name: /Starter/i });
  const pro = screen.getByRole('article', { name: /Pro/i });
  expect(within(starter).getByText('Monthly only')).toBeInTheDocument();
  expect(within(pro).getByText('Save 15%')).toBeInTheDocument();
});

test('catalog credit ledger shows Pro multiple without a progress meter', () => {
  render(<FinancialPlans />);
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  const pro = screen.getByRole('article', { name: /Pro/i });
  const starter = screen.getByRole('article', { name: /Starter/i });
  expect(within(pro).getByText(/× Starter credits/)).toBeInTheDocument();
  expect(within(pro).getByText('Recommended')).toBeInTheDocument();
  expect(within(starter).getByText('3 active projects · 2 builds at a time')).toBeInTheDocument();
  expect(within(pro).getByText('Add credits whenever you need them')).toBeInTheDocument();
  expect(screen.queryByText('✓')).not.toBeInTheDocument();
});

test('plan and team actions keep pricing analytics', () => {
  render(<FinancialPlans />);
  expect(trackProductEvent).toHaveBeenCalledWith('pricing_viewed', { catalog_version: 'v2' });
  fireEvent.click(screen.getByRole('link', { name: /Get Pro/i }));
  expect(trackProductEvent).toHaveBeenCalledWith('pricing_plan_selected', {
    subscription_plan: 'PRO',
    billing_interval: 'month',
  });
  fireEvent.click(screen.getByRole('link', { name: /Set up Team/i }));
  expect(trackProductEvent).toHaveBeenCalledWith('pricing_plan_selected', {
    subscription_plan: 'TEAM',
    billing_interval: 'month',
  });
  expect(trackProductEvent).not.toHaveBeenCalledWith(
    'pricing_build_profile_selected',
    expect.anything(),
  );
});

test('compact homepage catalog keeps credit meters, hides Team, and is not a feature checklist', () => {
  render(<FinancialPlans compact />);
  expect(screen.getByRole('heading', { name: 'Build with Nexus from $2/month.', level: 2 })).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: 'Pro monthly credit allowance' })).toHaveAttribute('aria-valuenow', '1000');
  expect(screen.getByRole('progressbar', { name: 'Starter monthly credit allowance' })).toHaveAttribute('aria-valuenow', '166.67');
  expect(screen.getByText('1,000')).toBeInTheDocument();
  expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();
  expect(screen.queryByText('3 active projects · 2 builds at a time')).not.toBeInTheDocument();
  expect(screen.queryByText(/How far do Nexus Credits go/i)).not.toBeInTheDocument();
  expect(screen.queryByText('START BUILDING')).not.toBeInTheDocument();
  expect(screen.queryByText('✓')).not.toBeInTheDocument();
  expect(trackProductEvent).not.toHaveBeenCalledWith('pricing_viewed', expect.anything());
});
