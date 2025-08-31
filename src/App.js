import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from "react-router-dom";
import { BillingProvider } from "./context/BillingContext";

// Suppress ResizeObserver loop error (Monaco Editor/Chrome bug) AND expose auth for console tests
import { getAuth } from "firebase/auth";

if (typeof window !== "undefined") {
  const observerErr = "ResizeObserver loop completed with undelivered notifications.";
  window.addEventListener("error", (e) => {
    if (e.message === observerErr) {
      e.stopImmediatePropagation();
    }
  });

  // Expose Firebase Auth to the console for quick manual tests
  try {
    const auth = getAuth();
    // Attach once; won’t throw if run before Firebase init, it’ll attach later on first call
    Object.defineProperty(window, "firebaseAuth", {
      get() { return getAuth(); },
      configurable: true,
    });
  } catch {}
}

const NexusRBXBillingPageContainer = lazy(() => import("./pages/BillingPage"));
const NexusRBXHomepageContainer = lazy(() => import("./pages/Homepage"));
const NexusRBXDocsPageContainer = lazy(() => import("./pages/DocsPage"));
const NexusRBXAIPageContainer = lazy(() => import("./pages/AiPage"));
const NexusRBXContactPageContainer = lazy(() => import("./pages/ContactPage"));
const NexusRBXPrivacyPageContainer = lazy(() => import("./pages/PrivacyPage"));
const NexusRBXSubscribePageContainer = lazy(() => import("./pages/SubscribePage"));
const NexusRBXSignInPageContainer = lazy(() => import("./pages/SignInPage"));
const NexusRBXSignUpPageContainer = lazy(() => import("./pages/SignUpPage"));
const NexusRBXTermsPageContainer = lazy(() => import("./pages/TermsPage"));
const NexusRBXNotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const CodeModal = lazy(() => import("./CodeModal"));

function ScriptShareModalWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <CodeModal
      open={open}
      onClose={() => {
        setOpen(false);
        setTimeout(() => navigate("/ai"), 200);
      }}
      scriptId={id}
      readOnly={true}
    />
  );
}

// Debug page: pulls /api/billing/entitlements and shows JSON + quick actions
function DebugEntitlementsPage() {
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
        credentials: "include",
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

function App() {
  return (
    <BillingProvider backendUrl={process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app"}>
      <Router>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white bg-black">Loading...</div>}>
          <Routes>
            <Route path="/" element={<NexusRBXHomepageContainer />} />
            <Route path="/docs" element={<NexusRBXDocsPageContainer />} />
            <Route path="/ai" element={<NexusRBXAIPageContainer />} />
            <Route path="/billing" element={<NexusRBXBillingPageContainer />} />
            <Route path="/contact" element={<NexusRBXContactPageContainer />} />
            <Route path="/privacy" element={<NexusRBXPrivacyPageContainer />} />
            <Route path="/subscribe" element={<NexusRBXSubscribePageContainer />} />
            <Route path="/signin" element={<NexusRBXSignInPageContainer />} />
            <Route path="/signup" element={<NexusRBXSignUpPageContainer />} />
            <Route path="/terms" element={<NexusRBXTermsPageContainer />} />
            <Route path="/script/:id" element={<ScriptShareModalWrapper />} />
            {/* NEW: on-screen entitlements debugger */}
            <Route path="/debug/entitlements" element={<DebugEntitlementsPage />} />
            <Route path="*" element={<NexusRBXNotFoundPage />} />
          </Routes>
        </Suspense>
      </Router>
    </BillingProvider>
  );
}

export default App;