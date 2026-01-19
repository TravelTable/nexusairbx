import React from 'react';

// Debug page: pulls /api/billing/entitlements and shows JSON + quick actions
export default function DebugEntitlementsPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [data, setData] = React.useState(null);

  async function fetchEntitlements(force = true) {
    setLoading(true);
    setError("");
    try {
      // force fresh ID token and bypass caches
      const token = await window.firebaseAuth.currentUser.getIdToken(force);
      const res = await fetch("https://nexusrbx-backend-production.up.railway.app/api/billing/entitlements?t=" + Date.now(), {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
          "Cache-Control": "no-store",
          "Pragma": "no-cache",
        },
        mode: "cors",
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { throw new Error(`Non-JSON (${res.status}) ${text?.slice(0,200)}`); }
      if (!res.ok) throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
      setData(json);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { fetchEntitlements(true); }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-6">
      <h1 className="text-2xl font-bold mb-3">Entitlements Debug</h1>
      <div className="flex gap-2 mb-4">
        <button
          className="px-3 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => fetchEntitlements(true)}
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh (force token)"}
        </button>
        <button
          className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
          onClick={() => fetchEntitlements(false)}
          disabled={loading}
        >
          Refresh (no force)
        </button>
      </div>
      {error && <div className="mb-3 text-red-300">Error: {error}</div>}
      {!error && data && (
        <pre className="bg-black/40 border border-gray-700 rounded p-3 overflow-auto text-xs">
{JSON.stringify(data, null, 2)}
        </pre>
      )}
      <div className="mt-4 text-xs text-gray-400">
        Expect <code>plan</code> to be <code>PRO</code> or <code>TEAM</code> after a successful sub.
        If it’s <code>FREE</code>:
        1) webhook didn’t write <code>users/{`{uid}`}.stripe</code>,
        2) Stripe Extension didn’t create <code>customers/{`{uid}`}/subscriptions</code>,
        or 3) the <code>price_…</code> isn’t mapped in <code>src/pricing.js</code>.
      </div>
    </div>
  );
}
