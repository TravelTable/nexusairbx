import React, { useEffect, useState } from "react";
import {
  CreditCard,
  Zap,
  CheckCircle,
  Loader2,
  AlertTriangle,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { getEntitlements, startCheckout, openPortal } from "../lib/billing";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

// Stripe Price IDs (replace with your real ones if needed)
const PRICE = {
  sub: {
    proMonthly: "price_1Rz8AsAu3NmqHUAu2X27DNPq",
    proYearly: "price_1Rz8CGAu3NmqHUAulBRTflg5",
    teamMonthly: "price_1Rz8FWAu3NmqHUAuJXQXYqxZ",
    teamYearly: "price_1Rz8IrAu3NmqHUAu4YSpwuTP",
  },
  payg: {
    pack100k: "price_1Ryy1HAu3NmqHUAu3Q9qijm3",
    pack500k: "price_1Ryy0vAu3NmqHUAu0aQ0TfYq",
    pack1m: "price_1Ryy0kAu3NmqHUAudDjtBdeg",
  },
};

export default function BillingPage() {
  const [entitlements, setEntitlements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);

  // Debug state
  const [debugInfo, setDebugInfo] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      setDebugInfo((prev) => ({
        ...prev,
        auth: {
          user: currentUser,
          authReady: true,
        },
      }));
    });
    return () => unsub();
  }, []);

  // Read ?checkout=success|cancel for lightweight UX
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const status = p.get("checkout");
    if (status === "success") setNote("Checkout completed successfully ✅");
    if (status === "cancel") setNote("Checkout was canceled.");
    setDebugInfo((prev) => ({
      ...prev,
      urlParams: {
        checkout: status,
      },
    }));
  }, []);

  // Load entitlements
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setLoading(false);
      setDebugInfo((prev) => ({
        ...prev,
        entitlements: "No user, skipping entitlements fetch.",
      }));
      return;
    }
    setLoading(true);
    setError("");
    (async () => {
      try {
        setDebugInfo((prev) => ({
          ...prev,
          entitlements: "Fetching...",
        }));
        const json = await getEntitlements(); // no args; adds token + base URL for you
        // Defensive: If response is not valid JSON, catch and show a friendly error
        if (typeof json !== "object" || json === null) {
          setDebugInfo((prev) => ({
            ...prev,
            entitlements: {
              error: "Response is not a valid object",
              raw: json,
            },
          }));
          throw new Error("Could not load billing info. Please refresh or contact support.");
        }
        setEntitlements(json);
        setDebugInfo((prev) => ({
          ...prev,
          entitlements: {
            status: "success",
            data: json,
          },
        }));
      } catch (e) {
        setDebugInfo((prev) => ({
          ...prev,
          entitlements: {
            status: "error",
            error: e?.message,
            stack: e?.stack,
          },
        }));
        // If error message looks like a JSON parse error, show a friendlier message
        if (
          typeof e?.message === "string" &&
          (e.message.includes("Unexpected token") || e.message.includes("JSON"))
        ) {
          setError(
            "There was a problem loading your billing information. Please try again in a few moments. If the problem persists, contact support."
          );
        } else {
          setError(
            e?.message ||
              "Could not load billing info. Please refresh or contact support."
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [authReady, user]);

  // Stripe Checkout handler
  async function handleCheckout(priceId, mode) {
    setCheckoutLoading(true);
    setError("");
    setDebugInfo((prev) => ({
      ...prev,
      checkout: {
        priceId,
        mode,
        status: "starting",
      },
    }));
    try {
      const r = await startCheckout(priceId, mode); // auto-navigates if URL present
      setDebugInfo((prev) => ({
        ...prev,
        checkout: {
          priceId,
          mode,
          status: "response",
          response: r,
        },
      }));
      if (!r?.url) setNote("Checkout session pending…");
    } catch (e) {
      setDebugInfo((prev) => ({
        ...prev,
        checkout: {
          priceId,
          mode,
          status: "error",
          error: e?.message,
          stack: e?.stack,
        },
      }));
      setError(
        e?.message ||
          "Could not start checkout. Please try again or contact support."
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  // Plan display helpers
  function planLabel(plan) {
    if (!plan) return "Free";
    if (plan === "PRO") return "Pro";
    if (plan === "TEAM") return "Team";
    return plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
  }
  function planPrice(plan, cycle) {
    if (plan === "PRO") {
      return cycle === "YEARLY" ? "$133.99/year" : "$14.99/month";
    }
    if (plan === "TEAM") {
      return cycle === "YEARLY" ? "$449.91/year" : "$49.99/month";
    }
    return "Free";
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-purple-400" />
        <DebugPanel debugInfo={debugInfo} />
      </div>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-yellow-400 mb-4" />
        <div className="text-gray-200 font-medium mb-2">
          You must be logged in to view billing and manage your subscription.
        </div>
        <button
          className="mt-6 px-6 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
          onClick={() => navigate("/signin")}
        >
          Login to Continue
        </button>
        <div className="mt-4 text-gray-400 text-sm">
          Don&apos;t have an account?{" "}
          <a
            href="/signup"
            className="underline text-purple-400 hover:text-purple-300"
          >
            Sign up
          </a>
        </div>
        <DebugPanel debugInfo={debugInfo} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-red-400 mb-4" />
        <div className="text-red-300 font-medium text-center max-w-md">
          {error}
        </div>
        {/* If the error looks like a JSON parse error, show a hint */}
        {error.includes("Unexpected token") && (
          <div className="mt-2 text-xs text-gray-400 text-center max-w-xs">
            This usually means the server is returning an error page instead of billing data. Please check your network connection or try again later.
          </div>
        )}
        <button
          className="mt-6 px-6 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
        <DebugPanel debugInfo={debugInfo} />
      </div>
    );
  }

  // Main UI
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Billing & Subscription
          </h1>
          <p className="text-gray-400">
            Manage your NexusRBX plan, tokens, and billing.
          </p>
        </div>

        {/* Note block (success/cancel) */}
        {note && (
          <div className="mb-6 text-sm rounded-md bg-gray-900 border border-gray-700 px-4 py-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span>{note}</span>
          </div>
        )}

        {/* Current Plan */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8 border border-gray-700">
          <div className="flex items-center mb-4">
            <Zap className="h-6 w-6 text-purple-400 mr-2" />
            <h2 className="text-xl font-semibold text-white">Current Plan</h2>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-lg font-bold text-purple-300">
                {planLabel(entitlements?.plan)} Plan
              </div>
              <div className="text-gray-400 text-sm">
                {planPrice(entitlements?.plan, entitlements?.cycle)}
              </div>
              {entitlements?.cycle && (
                <div className="text-xs text-gray-500 mt-1">
                  {entitlements.cycle === "YEARLY"
                    ? "Billed yearly"
                    : "Billed monthly"}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 md:gap-0 md:flex-row md:items-center md:space-x-3">
              <button
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition disabled:opacity-60"
                onClick={() =>
                  handleCheckout(PRICE.sub.proMonthly, "subscription")
                }
                disabled={checkoutLoading || portalLoading}
              >
                <DollarSign className="h-4 w-4" />
                Change Plan
              </button>
              <button
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition disabled:opacity-60"
                onClick={async () => {
                  setPortalLoading(true);
                  setError("");
                  setDebugInfo((prev) => ({
                    ...prev,
                    portal: { status: "starting" },
                  }));
                  try {
                    const r = await openPortal(); // auto-navigates if URL present
                    setDebugInfo((prev) => ({
                      ...prev,
                      portal: { status: "response", response: r },
                    }));
                    if (!r?.url) setNote("Portal session pending…");
                  } catch (e) {
                    setDebugInfo((prev) => ({
                      ...prev,
                      portal: {
                        status: "error",
                        error: e?.message,
                        stack: e?.stack,
                      },
                    }));
                    setError(
                      "Could not open billing portal. Please try again."
                    );
                  } finally {
                    setPortalLoading(false);
                  }
                }}
                disabled={portalLoading || checkoutLoading}
              >
                <CreditCard className="h-4 w-4" />
                Manage Billing
                <ExternalLink className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">
                Subscription Tokens
              </div>
              <div className="text-lg font-semibold text-gray-100">
                {entitlements?.sub?.used?.toLocaleString() ?? 0} /{" "}
                {entitlements?.sub?.limit?.toLocaleString() ?? 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {entitlements?.sub?.resetsAt ? (
                  <>
                    Resets&nbsp;
                    {new Date(
                      entitlements.sub.resetsAt
                    ).toLocaleDateString()}
                  </>
                ) : (
                  <>No reset date</>
                )}
              </div>
            </div>
            <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">
                PAYG Token Balance
              </div>
              <div className="text-lg font-semibold text-gray-100">
                {entitlements?.payg?.remaining?.toLocaleString() ?? 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">Never expires</div>
            </div>
          </div>
        </div>

        {/* Buy PAYG Tokens */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8 border border-gray-700">
          <div className="flex items-center mb-4">
            <DollarSign className="h-6 w-6 text-green-400 mr-2" />
            <h2 className="text-xl font-semibold text-white">
              Buy More Tokens (PAYG)
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col items-center hover:bg-gray-700 transition disabled:opacity-60"
              onClick={() => handleCheckout(PRICE.payg.pack100k, "payment")}
              disabled={checkoutLoading || portalLoading}
            >
              <div className="text-lg font-bold text-white mb-1">100,000</div>
              <div className="text-xs text-gray-400 mb-2">tokens</div>
              <div className="text-xl font-semibold text-green-300 mb-2">
                $4.99
              </div>
              <div className="text-xs text-gray-500">≈ 14 medium scripts</div>
            </button>
            <button
              className="bg-gray-900 border border-purple-700 rounded-lg p-4 flex flex-col items-center hover:bg-gray-700 transition shadow-lg shadow-purple-700/10 disabled:opacity-60"
              onClick={() => handleCheckout(PRICE.payg.pack500k, "payment")}
              disabled={checkoutLoading || portalLoading}
            >
              <div className="text-lg font-bold text-white mb-1">500,000</div>
              <div className="text-xs text-gray-400 mb-2">tokens</div>
              <div className="text-xl font-semibold text-green-300 mb-2">
                $12.99
              </div>
              <div className="text-xs text-purple-400 font-bold">
                Best Value
              </div>
              <div className="text-xs text-gray-500">≈ 70 medium scripts</div>
            </button>
            <button
              className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col items-center hover:bg-gray-700 transition disabled:opacity-60"
              onClick={() => handleCheckout(PRICE.payg.pack1m, "payment")}
              disabled={checkoutLoading || portalLoading}
            >
              <div className="text-lg font-bold text-white mb-1">1,000,000</div>
              <div className="text-xs text-gray-400 mb-2">tokens</div>
              <div className="text-xl font-semibold text-green-300 mb-2">
                $24.99
              </div>
              <div className="text-xs text-gray-500">≈ 140 medium scripts</div>
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-4 text-center">
            PAYG tokens never expire and are used automatically if you run out
            of subscription tokens.
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-yellow-400 mr-2" />
            <h2 className="text-xl font-semibold text-white">
              Billing & Support
            </h2>
          </div>
          <ul className="list-disc pl-6 text-gray-300 text-sm space-y-2">
            <li>
              <span className="font-medium text-white">
                Manage payment methods, invoices, and billing info
              </span>{" "}
              via the{" "}
              <button
                className="underline text-purple-400 hover:text-purple-300"
                onClick={async () => {
                  setPortalLoading(true);
                  setError("");
                  setDebugInfo((prev) => ({
                    ...prev,
                    portal: { status: "starting" },
                  }));
                  try {
                    const r = await openPortal(); // auto-navigates if URL present
                    setDebugInfo((prev) => ({
                      ...prev,
                      portal: { status: "response", response: r },
                    }));
                    if (!r?.url) setNote("Portal session pending…");
                  } catch (e) {
                    setDebugInfo((prev) => ({
                      ...prev,
                      portal: {
                        status: "error",
                        error: e?.message,
                        stack: e?.stack,
                      },
                    }));
                    setError(
                      "Could not open billing portal. Please try again."
                    );
                  } finally {
                    setPortalLoading(false);
                  }
                }}
                disabled={portalLoading}
              >
                Stripe Portal
              </button>
              .
            </li>
            <li>
              <span className="font-medium text-white">
                Cancel or change your subscription
              </span>{" "}
              at any time via the Portal or the "Change Plan" button.
            </li>
            <li>
              <span className="font-medium text-white">Token usage</span> is
              metered per request. Subscription tokens reset monthly or yearly;
              PAYG tokens never expire.
            </li>
            <li>
              <span className="font-medium text-white">Need help?</span>{" "}
              <a
                href="/contact"
                className="underline text-purple-400 hover:text-purple-300"
              >
                Contact support
              </a>
              .
            </li>
          </ul>
        </div>
        <DebugPanel debugInfo={debugInfo} />
      </div>
    </div>
  );
}

// DebugPanel component for showing debug info
function DebugPanel({ debugInfo }) {
  const [open, setOpen] = useState(false);

  if (!debugInfo) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 1000,
        maxWidth: 400,
        fontSize: 12,
        fontFamily: "monospace",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "#6d28d9",
          color: "white",
          border: "none",
          borderRadius: 4,
          padding: "4px 10px",
          cursor: "pointer",
          marginBottom: 4,
        }}
      >
        {open ? "Hide Debug" : "Show Debug"}
      </button>
      {open && (
        <div
          style={{
            background: "#18181b",
            color: "#d1d5db",
            border: "1px solid #4b5563",
            borderRadius: 6,
            padding: 12,
            maxHeight: 350,
            overflow: "auto",
            boxShadow: "0 2px 8px #0008",
            marginTop: 2,
          }}
        >
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}