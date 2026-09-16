/* global BigInt */
import catalog from '../data/billingCatalog.v2.json';

// Display-only conversion. Never send this rounded value back as a wallet amount.
export const CREDIT_DENOMINATION = Object.freeze(catalog.creditDenomination);

// Avoid BigInt ** — Turbopack/SWC can rewrite it to Math.pow, which rejects BigInt.
function pow10(exponent) {
  return BigInt(`1${'0'.repeat(exponent)}`);
}

export function displayCreditsFromMicros(value, { decimalPlaces = 2, rounding = 'nearest' } = {}) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('INVALID_CREDIT_AMOUNT');
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 6) throw new Error('INVALID_CREDIT_PRECISION');
  if (!['nearest', 'ceil', 'floor'].includes(rounding)) throw new Error('INVALID_CREDIT_ROUNDING');
  const scale = pow10(decimalPlaces);
  const denominator = BigInt(CREDIT_DENOMINATION.internalMicrosPerCredit);
  const adjustment = rounding === 'ceil' ? denominator - BigInt(1) : rounding === 'nearest' ? denominator / BigInt(2) : BigInt(0);
  return Number((BigInt(value) * scale + adjustment) / denominator) / Number(scale);
}

export function formatDisplayCredits(value, options = {}) {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2, ...options });
}

export function formatNexusCredits(internalMicros, options = {}) {
  if (internalMicros == null) return '—';
  return formatDisplayCredits(displayCreditsFromMicros(internalMicros, options), {
    maximumFractionDigits: options.decimalPlaces ?? 2,
    ...(options.minimumFractionDigits != null ? { minimumFractionDigits: options.minimumFractionDigits } : {}),
  });
}

export function withDisplayCatalogCredits(entry) {
  // The catalog's legacy credit grant stays canonical. Decimal catalog amounts
  // are converted exactly, without multiplying a floating-point financial value.
  const [whole, fraction = ''] = String(entry.credits).split('.');
  const scale = pow10(fraction.length);
  const amount = BigInt(whole) * scale + BigInt(fraction || '0');
  const creditsMicros = Number(amount * BigInt(catalog.microcreditsPerCredit) / scale);
  const displayCredits = displayCreditsFromMicros(creditsMicros);
  const displayCreditsLabel = formatDisplayCredits(displayCredits);
  return { ...entry, creditsMicros, displayCredits, displayCreditsLabel,
    ...(entry.features ? { features: entry.features.map(feature => feature.replace(/^[\d,.]+ Nexus Credits\b/, `${displayCreditsLabel} Nexus Credits`)) } : {}) };
}
