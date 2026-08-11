import React from 'react';
import { getEntitlements } from '../lib/billing';
import {
  editorialDisplayClass,
  editorialGutterClass,
  editorialPrimaryButtonClass,
  editorialSecondaryButtonClass,
} from '../components/site/editorialUi';

// Admin-only debug page: pulls /api/billing/entitlements and shows JSON
export default function DebugEntitlementsPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [data, setData] = React.useState(null);

  async function fetchEntitlements(force = true) {
    setLoading(true);
    setError("");
    try {
      const json = await getEntitlements({ noCache: force });
      setData(json);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { fetchEntitlements(true); }, []);

  return (
    <main className={`${editorialGutterClass} min-h-screen bg-[var(--ds-bg-canvas)] py-16 text-[var(--ds-text)] sm:py-20`}>
      <div className="mx-auto max-w-5xl">
      <p className="mb-2 text-sm font-semibold text-[var(--ds-accent)]">Admin diagnostics</p>
      <h1 className={`${editorialDisplayClass} mb-5 text-5xl`}>Entitlements Debug</h1>
      <div className="mb-8 flex flex-wrap gap-3">
        <button
          className={editorialPrimaryButtonClass}
          onClick={() => fetchEntitlements(true)}
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh (force token)"}
        </button>
        <button
          className={editorialSecondaryButtonClass}
          onClick={() => fetchEntitlements(false)}
          disabled={loading}
        >
          Refresh (no force)
        </button>
      </div>
      {error && <div role="alert" className="mb-3 rounded-lg border border-[color-mix(in_srgb,var(--ds-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_8%,transparent)] p-3 text-[var(--ds-danger)]">Error: {error}</div>}
      {!error && data && (
        <pre className="overflow-auto rounded-[14px] bg-[var(--ds-surface-1)] p-6 text-xs text-[var(--ds-text-secondary)]">
{JSON.stringify(data, null, 2)}
        </pre>
      )}
      <div className="mt-4 text-xs text-[var(--ds-text-muted)]">
        Expect <code>plan</code> to be <code>PRO</code> or <code>TEAM</code> after a successful sub.
        If it’s <code>FREE</code>:
        1) webhook didn’t write <code>users/{`{uid}`}.stripe</code>,
        2) Stripe Extension didn’t create <code>customers/{`{uid}`}/subscriptions</code>,
        or 3) the <code>price_…</code> isn’t mapped in <code>src/pricing.js</code>.
      </div>
      </div>
    </main>
  );
}
