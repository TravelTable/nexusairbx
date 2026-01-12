import React, { useEffect, useState, useRef } from "react";
import {
  CreditCard,
  Zap,
  CheckCircle,
  Loader2,
  AlertTriangle,
  DollarSign,
  ExternalLink,
  ArrowUpRight,
  ArrowLeft,
  Info,
} from "lucide-react";
import {
  getEntitlements,
  startCheckout,
  openPortal,
  summarizeEntitlements,
} from "../lib/billing";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { PRICE } from "../lib/prices";
import TokensCounterContainer from "../components/TokensCounterContainer";

const PAYG_TOKENS_BY_PRICE_ID = {
  [PRICE.payg.pack100k]: 100000,
  [PRICE.payg.pack500k]: 500000,
  [PRICE.payg.pack1m]: 1000000,
};

// Subscription plan definitions
const SUBSCRIPTION_PLANS = [
  {
    key: "PRO",
    name: "Pro",
    description: "For individuals and power users.",
    monthlyPrice: 14.99,
    yearlyPrice: 133.99,
    monthlyPriceId: PRICE.sub.proMonthly,
    yearlyPriceId: PRICE.sub.proYearly,
    tokens: 500_000,
    features: [
      "500,000 tokens/month",
      "GPT-5.2 AI Access",
      "Public API Access (Soon)",
      "Priority support",
      "Advanced features",
    ],
    highlight: false,
  },
  {
    key: "TEAM",
    name: "Team",
    description: "For teams and organizations.",
    monthlyPrice: 49.99,
    yearlyPrice: 449.91,
    monthlyPriceId: PRICE.sub.teamMonthly,
    yearlyPriceId: PRICE.sub.teamYearly,
    tokens: 1_500_000,
    features: [
      "1,500,000 tokens/month",
      "GPT-5.2 AI Access",
      "Full Public API Access (Soon)",
      "Team management",
      "Priority support",
      "Advanced features",
    ],
    highlight: true,
  },
];

export default function BillingPage() {
  const [entitlements, setEntitlements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);

  // Debug state (dev only)
  const [debugInfo, setDebugInfo] = useState(null);

  // Firestore session listener ref
  const sessionUnsubRef = useRef(null);
  const portalUnsubRef = useRef(null);

  const navigate = useNavigate();

  // Calculate subRemaining at the top level so it's always up to date
  const subRemaining =
    Math.max(0, (entitlements?.sub?.limit || 0) - (entitlements?.sub?.used || 0));
  const subLimit = entitlements?.sub?.limit || 0;
  const subUsed = entitlements?.sub?.used || 0;
  const subPercent = subLimit > 0 ? Math.round((subRemaining / subLimit) * 100) : 0;

  // For sticky mobile bar
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Success/cancel note auto-dismiss
  useEffect(() => {
    if (!note) return;
    const timeout = setTimeout(() => setNote(""), 7000);
    return () => clearTimeout(timeout);
  }, [note]);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (process.env.NODE_ENV === "development") {
        setDebugInfo((prev) => ({
          ...prev,
          auth: {
            user: currentUser,
            authReady: true,
          },
        }));
      }
    });
    return () => unsub();
  }, []);

  // Read ?checkout=success|cancel for lightweight UX and refresh entitlements on success
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const status = p.get("checkout");
    if (status !== "success" && status !== "cancel") return;

    if (status === "success") {
      setNote("Checkout completed successfully");
    }
    if (status === "cancel") {
      setNote("Checkout was canceled.");
    }

    if (process.env.NODE_ENV === "development") {
      setDebugInfo((prev) => ({
        ...prev,
        urlParams: { checkout: status },
      }));
    }

    let cancelled = false;

    (async () => {
      // Take a snapshot of current values once
      const initialPlan = entitlements?.plan || "FREE";
      const initialPayg = entitlements?.payg?.remaining || 0;

      // First forced refresh
      try {
        const e1 = await getEntitlements({ noCache: true });
        if (!cancelled) setEntitlements(e1);
      } catch {}

      // Poll up to ~30s for actual change
      const start = Date.now();
      while (!cancelled && Date.now() - start < 30000) {
        try {
          const e = await getEntitlements({ noCache: true });
          if (!cancelled) setEntitlements(e);

          const planChanged = e?.plan && e.plan !== initialPlan;
          const paygIncreased = (e?.payg?.remaining || 0) > initialPayg;

          if (planChanged) setNote("Your subscription upgrade is now active!");
          if (paygIncreased) setNote("Your PAYG token purchase is now active!");
        } catch {
          // ignore and keep polling
        }
        await new Promise((r) => setTimeout(r, 1200));
      }

      // Clean the URL so this effect won't run again
      if (!cancelled) {
        const url = new URL(window.location.href);
        url.searchParams.delete("checkout");
        window.history.replaceState({}, "", url.toString());
      }
    })();

    return () => {
      cancelled = true;
    };
    // run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load entitlements
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setLoading(false);
      if (process.env.NODE_ENV === "development") {
        setDebugInfo((prev) => ({
          ...prev,
          entitlements: "No user, skipping entitlements fetch.",
        }));
      }
      return;
    }
    setLoading(true);
    setError("");
    (async () => {
      try {
        if (process.env.NODE_ENV === "development") {
          setDebugInfo((prev) => ({
            ...prev,
            entitlements: "Fetching...",
          }));
        }
        const json = await getEntitlements({ noCache: true });
        if (typeof json !== "object" || json === null) {
          if (process.env.NODE_ENV === "development") {
            setDebugInfo((prev) => ({
              ...prev,
              entitlements: {
                error: "Response is not a valid object",
                raw: json,
              },
            }));
          }
          throw new Error(
            "Could not load billing info. Please refresh or contact support."
          );
        }
        setEntitlements(json);
        if (process.env.NODE_ENV === "development") {
          setDebugInfo((prev) => ({
            ...prev,
            entitlements: {
              status: "success",
              data: json,
            },
          }));
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          setDebugInfo((prev) => ({
            ...prev,
            entitlements: {
              status: "error",
              error: e?.message,
              stack: e?.stack,
            },
          }));
        }
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
    setNote("");
    if (process.env.NODE_ENV === "development") {
      setDebugInfo((prev) => ({
        ...prev,
        checkout: {
          priceId,
          mode,
          status: "starting",
        },
      }));
    }

    // Clean up any previous session listener
    if (sessionUnsubRef.current) {
      sessionUnsubRef.current();
      sessionUnsubRef.current = null;
    }

    try {
      const topupTokens =
        mode === "payment" ? PAYG_TOKENS_BY_PRICE_ID[priceId] || undefined : undefined;
      const r = await startCheckout(priceId, mode, topupTokens); // returns { url } or { sessionDocPath }
      if (process.env.NODE_ENV === "development") {
        setDebugInfo((prev) => ({
          ...prev,
          checkout: {
            priceId,
            mode,
            status: "response",
            response: r,
          },
        }));
      }

      // If direct url, redirect immediately
      if (r?.url) {
        window.location.href = r.url;
        return;
      }

      // If sessionDocPath, listen for url in Firestore
      if (r?.sessionDocPath) {
        setNote("Preparing your checkout session…");
        const db = getFirestore();
        const sessionDocRef = doc(db, r.sessionDocPath);

        sessionUnsubRef.current = onSnapshot(sessionDocRef, (docSnap) => {
          const data = docSnap.data();
          if (process.env.NODE_ENV === "development") {
            setDebugInfo((prev) => ({
              ...prev,
              checkoutSessionDoc: {
                path: r.sessionDocPath,
                data,
              },
            }));
          }
          if (data?.url) {
            window.location.href = data.url;
          } else if (data?.error) {
            setError(
              data.error.message ||
                "There was an error creating your checkout session. Please try again."
            );
            if (sessionUnsubRef.current) {
              sessionUnsubRef.current();
              sessionUnsubRef.current = null;
            }
          }
        });
      } else {
        setNote("Checkout session pending…");
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
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
      }
      setError(
        e?.message ||
          "Could not start checkout. Please try again or contact support."
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  // Portal handler
  const handlePortal = async () => {
    setPortalLoading(true);
    setError("");
    setNote("");

    portalUnsubRef.current?.();
    portalUnsubRef.current = null;

    try {
      const r = await openPortal();
      if (r?.url) {
        window.location.href = r.url;
        return;
      }
      if (r?.portalDocPath) {
        setNote("Preparing your portal session…");
        const db = getFirestore();
        const ref = doc(db, r.portalDocPath);
        portalUnsubRef.current = onSnapshot(ref, (snap) => {
          const data = snap.data();
          if (data?.url) {
            window.location.href = data.url;
          } else if (data?.error) {
            setError(data.error.message || "Portal error. Please try again.");
            portalUnsubRef.current?.();
            portalUnsubRef.current = null;
          }
        });
      } else {
        setNote("Portal session pending…");
      }
    } catch (e) {
      setError(e?.message || "Could not open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  // Live subscription listener (instant UI updates from Firebase Stripe Extension)
  const subsUnsubRef = useRef(null);
  useEffect(() => {
    if (!user) return;

    (async () => {
      const {
        collection,
        onSnapshot,
        query,
        where,
        getFirestore,
      } = await import("firebase/firestore");
      const q = query(
        collection(getFirestore(), `customers/${user.uid}/subscriptions`),
        where("status", "in", ["active", "trialing", "past_due"])
      );

      // Clean any previous subs listener
      subsUnsubRef.current?.();
      subsUnsubRef.current = onSnapshot(q, (snap) => {
        let plan = "FREE";
        let cycle = null;

        snap.forEach((d) => {
          const s = d.data() || {};
          const item =
            Array.isArray(s.items) ? s.items[0]
            : Array.isArray(s.items?.data) ? s.items.data[0]
            : null;
          const priceId = item?.price?.id || null;
          if (!priceId) return;

          // Use the same mapping as backend
          const mapped = typeof PRICE?.sub === "object" && priceId
            ? (() => {
                if (priceId === PRICE.sub.proMonthly)  return { plan: "PRO",  cycle: "MONTHLY" };
                if (priceId === PRICE.sub.proYearly)   return { plan: "PRO",  cycle: "YEARLY"  };
                if (priceId === PRICE.sub.teamMonthly) return { plan: "TEAM", cycle: "MONTHLY" };
                if (priceId === PRICE.sub.teamYearly)  return { plan: "TEAM", cycle: "YEARLY"  };
                return null;
              })()
            : null;

          if (mapped) {
            plan = mapped.plan;
            cycle = mapped.cycle;
          }
        });

        setEntitlements((prev) => ({
          ...(prev || {}),
          plan,
          cycle,
        }));
      });
    })();

    return () => {
      try {
        subsUnsubRef.current?.();
      } catch {}
      subsUnsubRef.current = null;
    };
  }, [user]);

  // Clean up Firestore listeners on unmount
  useEffect(() => {
    return () => {
      sessionUnsubRef.current?.();
      sessionUnsubRef.current = null;
      portalUnsubRef.current?.();
      portalUnsubRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onFocus = async () => {
      if (!user) return;
      try {
        const e = await getEntitlements({ noCache: true });
        setEntitlements(e);
      } catch {}
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user]);

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

  // Next invoice date
  function nextInvoiceDate() {
    if (entitlements?.sub?.nextInvoiceAt) {
      return (
        <div className="text-xs text-gray-500 mt-1">
          Next invoice: {new Date(entitlements.sub.nextInvoiceAt).toLocaleDateString()}
        </div>
      );
    }
    return null;
  }

  // Determine available upgrades
  function getAvailableUpgrades(currentPlan) {
    if (!currentPlan || currentPlan === "FREE") {
      return SUBSCRIPTION_PLANS;
    }
    if (currentPlan === "PRO") {
      return SUBSCRIPTION_PLANS.filter((p) => p.key === "TEAM");
    }
    return [];
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-purple-400" />
        {process.env.NODE_ENV === "development" && <DebugPanel debugInfo={debugInfo} />}
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
          className="mt-6 px-6 py-2 rounded bg-gradient-to-r from-purple-600 to-teal-400 text-white hover:from-purple-700 hover:to-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
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
        {process.env.NODE_ENV === "development" && <DebugPanel debugInfo={debugInfo} />}
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
        {error.includes("Unexpected token") && (
          <div className="mt-2 text-xs text-gray-400 text-center max-w-xs">
            This usually means the server is returning an error page instead of billing data. Please check your network connection or try again later.
          </div>
        )}
        <button
          className="mt-6 px-6 py-2 rounded bg-gradient-to-r from-purple-600 to-teal-400 text-white hover:from-purple-700 hover:to-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
        {process.env.NODE_ENV === "development" && <DebugPanel debugInfo={debugInfo} />}
      </div>
    );
  }

  // Main UI
  const availableUpgrades = getAvailableUpgrades(entitlements?.plan);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 relative pb-24">
      {/* Back to Home Button */}
      <div className="max-w-3xl mx-auto pt-6 px-4 sm:px-6 lg:px-8 flex items-center">
        <button
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-purple-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded px-2 py-1 transition"
          onClick={() => navigate("/")}
          aria-label="Back to Home"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-medium">Back to Home</span>
        </button>
      </div>

      <div className="max-w-3xl mx-auto py-10 px-4 sm:px-5 lg:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">Billing & Subscription</h1>
          <p className="text-gray-400">
            Manage your NexusRBX plan, tokens, and billing.
          </p>
        </div>

        {/* Note block (success/cancel) */}
        {note && (
          <div
            className="mb-5 text-sm rounded-md bg-gray-900 border border-gray-700 px-4 py-2 flex items-center gap-2"
            aria-live="polite"
          >
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span>{note}</span>
          </div>
        )}

        {/* Current Plan */}
        <div className="bg-gray-800 rounded-lg shadow-sm p-5 mb-7 border border-gray-700">
          <div className="flex items-center mb-3">
            <Zap className="h-5 w-5 text-purple-400 mr-2" />
            <h2 className="text-xl font-semibold text-white">Current Plan</h2>
          </div>
          {/* Token Meter */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-400 font-medium">Tokens</span>
              <button
                className="text-xs text-purple-400 underline hover:text-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded px-1 py-0.5"
                onClick={async () => {
                  setLoading(true);
                  setError("");
                  setNote("Refreshing subscription status…");
                  try {
                    setEntitlements(await getEntitlements({ noCache: true }));
                  } catch (e) {
                    setError(e?.message || "Could not load billing info.");
                  } finally {
                    setLoading(false);
                    setNote("");
                  }
                }}
                tabIndex={0}
              >
                Refresh
              </button>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-6 relative overflow-hidden mb-1">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-teal-400 transition-all duration-500"
                style={{
                  width: `${subLimit > 0 ? (subRemaining / subLimit) * 100 : 0}%`,
                  minWidth: subLimit > 0 && subRemaining > 0 ? "2.5rem" : 0,
                }}
              >
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-semibold text-white drop-shadow">
                  {subLimit > 0
                    ? `${subRemaining.toLocaleString()} / ${subLimit.toLocaleString()} (${subPercent}%)`
                    : "No tokens"}
                </span>
              </div>
              {subLimit === 0 && (
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-semibold text-white">
                  0 tokens
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {entitlements?.sub?.resetsAt && (
                <span className="text-xs text-gray-500">
                  Resets {new Date(entitlements.sub.resetsAt).toLocaleDateString()}
                </span>
              )}
              <a
                href="/docs"
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-teal-400 underline ml-2"
              >
                <Info className="h-3 w-3" />
                How tokens work
              </a>
            </div>
          </div>
          {/* Plan Info */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-purple-300">
                {planLabel(entitlements?.plan)} Plan
              </div>
              <div className="text-gray-400 text-sm">
                {planPrice(entitlements?.plan, entitlements?.cycle)}
              </div>
              {entitlements?.plan !== "FREE" && entitlements?.cycle && (
                <div className="text-xs text-gray-500 mt-1">
                  {entitlements.cycle === "YEARLY"
                    ? "Billed yearly"
                    : "Billed monthly"}
                </div>
              )}
              {nextInvoiceDate()}
            </div>
            <div>
              <button
                className="bg-gradient-to-r from-purple-600 to-teal-400 hover:from-purple-700 hover:to-teal-500 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                onClick={handlePortal}
                disabled={checkoutLoading || portalLoading}
              >
                <CreditCard className="h-4 w-4" />
                Manage Billing
                <ExternalLink className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Upgrade Plans Section */}
        {availableUpgrades.length > 0 && (
          <div className="bg-gray-800 rounded-lg shadow-sm p-5 mb-7 border border-purple-700/40">
            <div className="flex items-center mb-3">
              <ArrowUpRight className="h-5 w-5 text-purple-400 mr-2" />
              <h2 className="text-xl font-semibold text-white">
                Upgrade Your Plan
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableUpgrades.map((plan) => (
                <div
                  key={plan.key}
                  className={`relative bg-gray-900 rounded-lg border border-gray-700 p-4 flex flex-col min-h-[260px]`}
                >
                  {plan.highlight && (
                    <span className="absolute top-3 right-3 bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                      Most Popular
                    </span>
                  )}
                  <div className="flex items-center mb-1">
                    <Zap className="h-4 w-4 text-purple-400 mr-1" />
                    <span className="text-lg font-bold text-white">{plan.name}</span>
                  </div>
                  <div className="text-gray-400 mb-1 text-sm">{plan.description}</div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xl font-bold text-green-300">
                      ${plan.monthlyPrice.toFixed(2)}
                    </span>
                    <span className="text-gray-400 text-xs">/month</span>
                    <span className="ml-2 text-gray-500 text-xs">
                      or ${plan.yearlyPrice.toFixed(2)}/year
                    </span>
                  </div>
                  <ul className="mb-2 text-xs text-gray-300 list-disc pl-5 space-y-0.5 leading-tight">
                    {plan.features.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                  <div className="flex flex-col gap-2 mt-auto">
                    <button
                      className="bg-gradient-to-r from-purple-600 to-teal-400 hover:from-purple-700 hover:to-teal-500 text-white px-3 py-1.5 rounded-md font-medium flex items-center gap-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                      onClick={() =>
                        handleCheckout(plan.monthlyPriceId, "subscription")
                      }
                      disabled={checkoutLoading || portalLoading}
                    >
                      Choose Monthly
                    </button>
                    <button
                      className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-md font-medium flex items-center gap-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                      onClick={() =>
                        handleCheckout(plan.yearlyPriceId, "subscription")
                      }
                      disabled={checkoutLoading || portalLoading}
                    >
                      Choose Yearly
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buy PAYG Tokens */}
<div className="bg-gray-800 rounded-lg p-5 mb-7 border border-gray-700">
  <div className="flex items-center mb-3">
    <DollarSign className="h-5 w-5 text-green-400 mr-2" />
    <h2 className="text-xl font-semibold text-white">Buy More Tokens (PAYG)</h2>
  </div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {[
    { label: "100,000", price: "$4.99", id: PRICE.payg.pack100k, scripts: 14 },
    { label: "500,000", price: "$15.19", id: PRICE.payg.pack500k, scripts: 70, popular: true },
    { label: "1,000,000", price: "$24.99", id: PRICE.payg.pack1m, scripts: 140 },
  ].map((p) => (
    <div
      key={p.id}
      className="group relative flex flex-col rounded-lg border border-gray-700 bg-gray-900 p-4 transition-shadow hover:shadow-md hover:shadow-black/30"
    >
      {p.popular && (
        <span className="absolute top-3 right-3 rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white">
          Best Value
        </span>
      )}

      <div className="text-lg font-bold text-white">{p.label}</div>
      <div className="mt-0.5 text-xs text-gray-400">tokens</div>
      <div className="mt-2 text-xl font-semibold text-green-300">{p.price}</div>
      <div className="mt-1 text-[11px] text-gray-500">≈ {p.scripts} medium scripts</div>

      <span className="mt-auto inline-flex items-center justify-center rounded-md bg-yellow-500/90 px-3 py-1.5 text-sm font-semibold text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400">
        Coming Soon
      </span>
    </div>
  ))}
</div>

  <div className="mt-4 text-center text-xs text-gray-500">
    PAYG tokens never expire and are used automatically when subscription tokens run out.
  </div>
</div>


        {/* Info Section */}
        <div className="bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-700">
          <div className="flex items-center mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
            <h2 className="text-xl font-semibold text-white">
              Billing & Support
            </h2>
          </div>
          <ul className="list-disc pl-6 text-gray-300 text-xs space-y-1 leading-tight">
            <li>
              <span className="font-medium text-white">
                Manage payment methods, invoices, and billing info
              </span>{" "}
              via the{" "}
              <button
                className="underline text-purple-400 hover:text-teal-400"
                onClick={handlePortal}
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
              at any time via the Portal.
            </li>
            <li>
              <span className="font-medium text-white">Token usage</span> is
              metered per request. Subscription tokens reset monthly or yearly; PAYG tokens never expire.
            </li>
            <li>
              <span className="font-medium text-white">Need help?</span>{" "}
              <a
                href="/contact"
                className="underline text-purple-400 hover:text-teal-400"
              >
                Contact support
              </a>
              .
            </li>
          </ul>
        </div>
        <div className="mt-4 text-center">
          <a
            href="/contact"
            className="inline-block underline text-purple-400 hover:text-teal-400 text-xs"
          >
            Contact support
          </a>
        </div>
        {process.env.NODE_ENV === "development" && <DebugPanel debugInfo={debugInfo} />}
      </div>

      {/* Sticky Mobile Bar */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-700 to-teal-500 shadow-lg px-4 py-3 flex justify-center sm:hidden">
          <button
            className="w-full max-w-xs bg-white text-purple-700 font-semibold rounded-md px-4 py-2 flex items-center justify-center gap-2 shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            onClick={handlePortal}
            disabled={checkoutLoading || portalLoading}
          >
            <CreditCard className="h-5 w-5" />
            Manage Billing
          </button>
        </div>
      )}
    </div>
  );
}

// DebugPanel component for showing debug info (dev only)
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
