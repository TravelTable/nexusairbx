/* global BigInt */
import { CREDIT_DENOMINATION, displayCreditsFromMicros, formatNexusCredits, withDisplayCatalogCredits } from './creditDenomination';
import { getPublicPlan, CREDIT_PACKS } from './planCatalog';
import catalog from '../data/billingCatalog.v2.json';

test('display denomination formats balances and grants without changing canonical values', () => {
  expect(CREDIT_DENOMINATION.internalMicrosPerCredit).toBe(9000);
  expect(formatNexusCredits(9e6)).toBe('1,000');
  expect(formatNexusCredits(1)).toBe('0');
  expect(formatNexusCredits(1, { rounding: 'ceil' })).toBe('0.01');
  expect(formatNexusCredits(null)).toBe('—');
  expect(displayCreditsFromMicros(90000)).toBe(10);
  expect(getPublicPlan('PRO')).toMatchObject({ credits: 9, creditsMicros: 9e6, displayCredits: 1000, displayCreditsLabel: '1,000' });
  expect(getPublicPlan('PRO').features[0]).toBe('1,000 Nexus Credits refreshed every month');
  expect(getPublicPlan('STARTER').displayCreditsLabel).toBe('166.67');
  expect(CREDIT_PACKS[0]).toMatchObject({ credits: 9, creditsMicros: 9e6, displayCreditsLabel: '1,000' });
  expect(catalog.plans.find(p => p.id === 'PRO').credits).toBe(9);
});

test('exact decimal conversion, safe bounds and fractional estimates', () => {
  expect(withDisplayCatalogCredits({ credits: 0.29 }).creditsMicros).toBe(290000);
  expect(displayCreditsFromMicros(1_500_000)).toBe(166.67);
  expect(formatNexusCredits(500000, { rounding: 'ceil' })).toBe('55.56');
  expect(displayCreditsFromMicros(Number.MAX_SAFE_INTEGER, { decimalPlaces: 0, rounding: 'floor' }))
    .toBe(Number(BigInt(Number.MAX_SAFE_INTEGER) / BigInt(9000)));
  for (const value of [NaN, Infinity, -1, 1.5, '9000']) expect(() => displayCreditsFromMicros(value)).toThrow();
});

test('source avoids BigInt exponentiation that Turbopack rewrites to Math.pow', () => {
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(path.join(__dirname, 'creditDenomination.js'), 'utf8');
  expect(source).not.toMatch(/\*\*\s*BigInt|BigInt\([^)]*\)\s*\*\*/);
});
