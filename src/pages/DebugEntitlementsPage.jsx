import React from 'react';
import { getEntitlements } from '../lib/billing';

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
    <main className="min-h-screen bg-[var(--ds-bg-canvas)] p-6 text-[var(--ds-text)]">
      <div className="mx-auto max-w-5xl">
      <p className="mb-2 text-sm font-semibold text-[var(--ds-accent)]">Admin diagnostics</p>
      <h1 className="mb-3 text-2xl font-semibold tracking-[-0.025em]">Entitlements Debug</h1>
      <div className="flex gap-2 mb-4">
        <button
          className="min-h-11 rounded-[10px] bg-[var(--ds-accent)] px-4 py-2 font-semibold text-[var(--ds-accent-foreground)] hover:bg-[var(--ds-accent-hover)]"
          onClick={() => fetchEntitlements(true)}
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh (force token)"}
        </button>
        <button
          className="min-h-11 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-4 py-2 text-[var(--ds-text)] hover:bg-[var(--ds-fill-hover)]"
          onClick={() => fetchEntitlements(false)}
          disabled={loading}
        >
          Refresh (no force)
        </button>
      </div>
      {error && <div role="alert" className="mb-3 rounded-lg border border-[color-mix(in_srgb,var(--ds-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_8%,transparent)] p-3 text-[var(--ds-danger)]">Error: {error}</div>}
      {!error && data && (
        <pre className="overflow-auto rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] p-4 text-xs text-[var(--ds-text-secondary)]">
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
