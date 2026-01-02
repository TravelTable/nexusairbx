import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Home,
  Check,
  CreditCard,
  Shield,
  Zap,
  Code,
  Settings,
  Users,
  BookOpen,
  ChevronDown,
  Sparkles,
  Loader2,
  AlertTriangle,
  DollarSign,
  ExternalLink,
  ArrowUpRight,
  CheckCircle,
  Lock,
} from "lucide-react";
import NexusRBXHeader from "../components/NexusRBXHeader";
import NexusRBXFooter from "../components/NexusRBXFooter";
import { getEntitlements, startCheckout, openPortal } from "../lib/billing";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { PRICE } from "../lib/prices";

// PAYG tokens by price ID
const PAYG_TOKENS_BY_PRICE_ID = {
  [PRICE.payg.pack100k]: 100000,
  [PRICE.payg.pack500k]: 500000,
  [PRICE.payg.pack1m]: 1000000,
};

// Subscription plan definitions (for upgrades)
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
      "Priority support",
      "Advanced features",
      "Personal use",
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
      "Team management",
      "Priority support",
      "Advanced features",
      "For teams/orgs",
    ],
    highlight: true,
  },
];

// Marketing plans for UI
const plans = [
  {
    id: "free",
    name: "Free",
    description: "For hobbyists and beginners",
    monthlyUSD: 0,
    yearlyUSD: 0,
    tokenAllowancePM: 50_000,
    approxScriptsPM: "~30 short scripts",
    features: [
      { text: "AI script generation (basic model)", included: true },
      { text: "Daily throttle & 1k min tokens/request", included: true },
      { text: "Community support", included: true },
      { text: "Script history (7 days)", included: true },
      { text: "GPT‑4.1 access", included: false },
      { text: "Custom templates", included: false },
      { text: "Priority support", included: false },
    ],
    cta: "Choose Free",
    popular: false,
    highlight: false,
    stripePriceId: null,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For serious Roblox developers",
    monthlyUSD: 14.99,
    yearlyUSD: 133.99,
    tokenAllowancePM: 500_000,
    approxScriptsPM: "~70–100 medium scripts",
    features: [
      { text: "GPT‑4.1 script generation", included: true },
      { text: "500k tokens / month (resets)", included: true },
      { text: "Advanced simulation", included: true },
      { text: "Email support", included: true },
      { text: "Script history (unlimited)", included: true },
      { text: "Custom templates (up to 10)", included: true },
      { text: "Roblox Studio plugin", included: true },
      { text: "API access (rate‑limited)", included: true },
    ],
    cta: "Choose Pro",
    popular: true,
    highlight: true,
    stripePriceId: (cycle) =>
      cycle === "monthly" ? PRICE.sub.proMonthly : PRICE.sub.proYearly,
  },
  {
    id: "team",
    name: "Team",
    description: "For development teams",
    monthlyUSD: 49.99,
    yearlyUSD: 449.91,
    tokenAllowancePM: 1_500_000,
    approxScriptsPM: "~200–300 medium scripts",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Up to 5 seats included", included: true },
      { text: "Team collaboration tools", included: true },
      { text: "Priority support", included: true },
      { text: "Custom templates (unlimited)", included: true },
      { text: "Full API access", included: true },
      { text: "Optional custom fine‑tuning add‑on", included: true },
      { text: "Dedicated account manager (add‑on)", included: false },
    ],
    cta: "Choose Team",
    popular: false,
    highlight: false,
    stripePriceId: (cycle) =>
      cycle === "monthly" ? PRICE.sub.teamMonthly : PRICE.sub.teamYearly,
  },
];

const faqs = [
  {
    id: "billing",
    question: "How does billing work?",
    answer:
      "Choose a monthly or annual subscription; token allowance resets monthly. You can also buy Pay‑As‑You‑Go packs that never expire.",
  },
  {
    id: "tokens",
    question: "What are tokens and how are they used?",
    answer:
      "We meter GPT‑4.1 input + output tokens. Each request deducts the exact tokens used, with a 1,000‑token minimum per request to prevent abuse.",
  },
  {
    id: "allowance",
    question: "What happens if I run out of tokens?",
    answer:
      "You can either wait for your monthly reset or buy a Pay‑As‑You‑Go pack to top up instantly.",
  },
  {
    id: "rollover",
    question: "Do unused subscription tokens roll over?",
    answer:
      "No rollover on subscriptions. PAYG packs never expire and stack with your subscription.",
  },
  {
    id: "refunds",
    question: "Can I cancel or get a refund?",
    answer:
      "Cancel anytime. Pro-rated refunds aren’t available during an active billing period.",
  },
  {
    id: "api",
    question: "Is API access included?",
    answer:
      "Pro includes rate‑limited API access with your token balance. Team increases limits and supports service accounts.",
  },
];

// ENVIRONMENT GUARD
const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || process.env.VITE_API_ORIGIN;
if (!API_ORIGIN) {
  throw new Error(
    "API_ORIGIN is not set. Please set REACT_APP_API_ORIGIN or VITE_API_ORIGIN in your environment."
  );
}

// useStripeMode fetches /api/stripe/mode and returns {mode, error}
function useStripeMode() {
  const [stripeMode, setStripeMode] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_ORIGIN}/api/stripe/mode`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch stripe mode");
        const json = await res.json();
        if (!cancelled) setStripeMode(json?.mode || "unknown");
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return { stripeMode, error };
}

// useEntitlements hook
function useEntitlements(user, debugCallback) {
  const [state, setState] = useState({
    status: "idle", // idle | loading | ready | error
    error: null,
    entitlements: null,
    lastRaw: null,
    lastMerge: null,
  });
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const listenerRef = useRef(null);
  const debounceRef = useRef(null);

  // Merge helper: only plan/cycle from listener, tokens from API
  const mergeEntitlements = useCallback((apiEnt, listenerPlan) => {
    if (!apiEnt) return null;
    const merged = {
      plan: listenerPlan?.plan || apiEnt.plan || "FREE",
      cycle: listenerPlan?.cycle || apiEnt.cycle || null,
      limit: apiEnt?.sub?.limit || 0,
      used: apiEnt?.sub?.used || 0,
      subRemaining: Math.max(0, (apiEnt?.sub?.limit || 0) - (apiEnt?.sub?.used || 0)),
      paygRemaining: apiEnt?.payg?.remaining || 0,
      resetsAt: apiEnt?.sub?.resetsAt || null,
      raw: apiEnt,
    };
    return merged;
  }, []);

  // Initial fetch and refresh
  const fetchEntitlements = useCallback(
    async (force = false) => {
      setState((s) => ({ ...s, status: "loading", error: null }));
      try {
        const apiEnt = await getEntitlements({ noCache: force });
        setState((s) => {
          const merged = mergeEntitlements(apiEnt, s.lastListenerPlan);
          debugCallback?.({
            type: "entitlements_fetch",
            apiEnt,
            merged,
          });
          return {
            ...s,
            status: "ready",
            entitlements: merged,
            lastRaw: apiEnt,
            lastMerge: merged,
            error: null,
          };
        });
      } catch (e) {
        setState((s) => ({
          ...s,
          status: "error",
          error:
            e?.message ||
            "Could not load billing info. Please refresh or contact support.",
        }));
        debugCallback?.({
          type: "entitlements_error",
          error: e?.message,
        });
      }
    },
    [mergeEntitlements, debugCallback]
  );

  // Firestore listener for plan/cycle
  useEffect(() => {
    if (!user) {
      setState((s) => ({
        ...s,
        status: "ready",
        entitlements: null,
        lastListenerPlan: null,
      }));
      return;
    }
    let ignore = false;
    let unsub = null;
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
      unsub = onSnapshot(q, (snap) => {
        if (ignore) return;
        let plan = null;
        let cycle = null;
        snap.forEach((d) => {
          const s = d.data() || {};
          const item =
            Array.isArray(s.items) ? s.items[0]
            : Array.isArray(s.items?.data) ? s.items.data[0]
            : null;
          const priceId = item?.price?.id || null;
          if (!priceId) return;
          if (priceId === PRICE.sub.proMonthly)  { plan = "PRO";  cycle = "MONTHLY"; }
          if (priceId === PRICE.sub.proYearly)   { plan = "PRO";  cycle = "YEARLY";  }
          if (priceId === PRICE.sub.teamMonthly) { plan = "TEAM"; cycle = "MONTHLY"; }
          if (priceId === PRICE.sub.teamYearly)  { plan = "TEAM"; cycle = "YEARLY";  }
        });
        // Only update plan/cycle if present; never set to FREE on empty
        if (plan && cycle) {
          setState((s) => {
            const merged = mergeEntitlements(s.lastRaw, { plan, cycle });
            debugCallback?.({
              type: "entitlements_listener",
              plan,
              cycle,
              merged,
            });
            return {
              ...s,
              entitlements: merged,
              lastListenerPlan: { plan, cycle },
              lastMerge: merged,
            };
          });
        }
      });
      listenerRef.current = unsub;
    })();
    return () => {
      ignore = true;
      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }
    };
  }, [user, mergeEntitlements, debugCallback]);

  // Initial fetch on mount or user change
  useEffect(() => {
    if (!user) {
      setState((s) => ({
        ...s,
        status: "ready",
        entitlements: null,
        lastRaw: null,
        lastMerge: null,
      }));
      return;
    }
    fetchEntitlements(true);
    // eslint-disable-next-line
  }, [user]);

  // Debounced refresh on window focus
  useEffect(() => {
    if (!user) return;
    let last = 0;
    const handler = () => {
      const now = Date.now();
      if (now - last > 2000) {
        fetchEntitlements(true);
        last = now;
      }
    };
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [user, fetchEntitlements]);

  // Public refresh
  const refresh = useCallback(() => {
    setLastRefresh(Date.now());
    fetchEntitlements(true);
  }, [fetchEntitlements]);

  return {
    ...state,
    refresh,
  };
}

// Checkout state machine
const CHECKOUT_STATES = {
  idle: "idle",
  starting: "starting",
  waitingForURL: "waitingForURL",
  redirecting: "redirecting",
  returning: "returning",
  error: "error",
};

const PLAN_COMPARISON = [
  {
    label: "Tokens / month",
    free: "50,000",
    pro: "500,000",
    team: "1,500,000",
  },
  {
    label: "Seats",
    free: "1",
    pro: "1",
    team: "5",
  },
  {
    label: "API",
    free: "—",
    pro: "Limited",
    team: "Full",
  },
  {
    label: "History",
    free: "7 days",
    pro: "Unlimited",
    team: "Unlimited",
  },
  {
    label: "Support",
    free: "Community",
    pro: "Email",
    team: "Priority",
  },
];

export default function NexusRBXBillingMarketingPage() {
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [showFaq, setShowFaq] = useState({});
  const [user, setUser] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [checkoutState, setCheckoutState] = useState(CHECKOUT_STATES.idle);
  const [checkoutTimeline, setCheckoutTimeline] = useState([]);
  const [checkoutTimeout, setCheckoutTimeout] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const [clickedPriceId, setClickedPriceId] = useState(null);
  const [focusedPlan, setFocusedPlan] = useState(null);

  // Firestore session listeners
  const sessionUnsubs = useRef([]);
  const portalUnsubs = useRef([]);

  const navigate = useNavigate();

  // Stripe mode and env
  const { stripeMode, error: stripeModeError } = useStripeMode();

  // Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      setDebugInfo((prev) => ({
        ...prev,
        auth: {
          user: currentUser
            ? {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName,
              }
            : null,
          authReady: true,
        },
      }));
    });
    return () => unsub();
  }, []);

  // useEntitlements hook
  const {
    status: entStatus,
    error: entError,
    entitlements,
    refresh: refreshEntitlements,
    lastRaw,
    lastMerge,
  } = useEntitlements(user, (event) => {
    setDebugInfo((prev) => ({
      ...prev,
      [`entitlements_${event.type}`]: event,
    }));
  });

  // Plan/cycle helpers
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

  // FAQ toggle
  const toggleFaq = (id) =>
    setShowFaq((prev) => ({ ...prev, [id]: !prev[id] }));

  // Login/Logout
  const handleLogin = () => navigate("/signin");
  const handleLogout = () => {
    const auth = getAuth();
    auth.signOut();
    setUser(null);
    navigate("/signin");
  };

  // Focus management for DebugPanel
  const debugPanelRef = useRef(null);
  const debugTriggerRef = useRef(null);

  // Checkout handler (state machine)
  async function handleCheckout(priceId, mode) {
    setClickedPriceId(priceId);
    setCheckoutState(CHECKOUT_STATES.starting);
    setCheckoutTimeline([
      { state: CHECKOUT_STATES.starting, ts: Date.now(), priceId, mode },
    ]);
    setError("");
    setNote("");
    setCheckoutTimeout(false);

    // Clean up previous listeners
    sessionUnsubs.current.forEach((unsub) => unsub());
    sessionUnsubs.current = [];

    try {
      const topupTokens =
        mode === "payment" ? PAYG_TOKENS_BY_PRICE_ID[priceId] || undefined : undefined;
      const r = await startCheckout(priceId, mode, topupTokens);
      setCheckoutTimeline((t) => [
        ...t,
        { state: "startCheckout_response", ts: Date.now(), response: r },
      ]);
      setDebugInfo((prev) => ({
        ...prev,
        checkout: {
          priceId,
          mode,
          status: "response",
          response: r,
        },
      }));

      // If direct url, redirect immediately
      if (r?.url) {
        setCheckoutState(CHECKOUT_STATES.redirecting);
        setCheckoutTimeline((t) => [
          ...t,
          { state: CHECKOUT_STATES.redirecting, ts: Date.now(), url: r.url },
        ]);
        window.location.href = r.url;
        return;
      }

      // If sessionDocPath, listen for url in Firestore
      if (r?.sessionDocPath) {
        setCheckoutState(CHECKOUT_STATES.waitingForURL);
        setNote("Preparing your checkout session…");
        const db = getFirestore();
        const sessionDocRef = doc(db, r.sessionDocPath);

        let timeoutId = setTimeout(() => {
          setCheckoutTimeout(true);
        }, 45000);

        const unsub = onSnapshot(sessionDocRef, (docSnap) => {
          const data = docSnap.data();
          setDebugInfo((prev) => ({
            ...prev,
            checkoutSessionDoc: {
              path: r.sessionDocPath,
              data,
            },
          }));
          if (data?.url) {
            setCheckoutState(CHECKOUT_STATES.redirecting);
            setCheckoutTimeline((t) => [
              ...t,
              { state: CHECKOUT_STATES.redirecting, ts: Date.now(), url: data.url },
            ]);
            clearTimeout(timeoutId);
            window.location.href = data.url;
          } else if (data?.error) {
            setCheckoutState(CHECKOUT_STATES.error);
            setError(
              data.error.message ||
                "There was an error creating your checkout session. Please try again."
            );
            clearTimeout(timeoutId);
            unsub();
          }
        });
        sessionUnsubs.current.push(unsub);
      } else {
        setNote("Checkout session pending…");
      }
    } catch (e) {
      setCheckoutState(CHECKOUT_STATES.error);
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
    }
  }

  // Retry for checkout session
  const retryCheckout = () => {
    setCheckoutTimeout(false);
    if (clickedPriceId) {
      // Find mode by priceId
      let mode = "payment";
      if (
        clickedPriceId === PRICE.sub.proMonthly ||
        clickedPriceId === PRICE.sub.proYearly ||
        clickedPriceId === PRICE.sub.teamMonthly ||
        clickedPriceId === PRICE.sub.teamYearly
      ) {
        mode = "subscription";
      }
      handleCheckout(clickedPriceId, mode);
    }
  };

  // Portal handler
  const handlePortal = async () => {
    setPortalLoading(true);
    setError("");
    setNote("");

    portalUnsubs.current.forEach((unsub) => unsub());
    portalUnsubs.current = [];

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
        const unsub = onSnapshot(ref, (snap) => {
          const data = snap.data();
          if (data?.url) {
            window.location.href = data.url;
          } else if (data?.error) {
            setError(data.error.message || "Portal error. Please try again.");
            unsub();
          }
        });
        portalUnsubs.current.push(unsub);
      } else {
        setNote("Portal session pending…");
      }
    } catch (e) {
      setError(e?.message || "Could not open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  // Clean up Firestore listeners on unmount
  useEffect(() => {
    return () => {
      sessionUnsubs.current.forEach((unsub) => unsub());
      sessionUnsubs.current = [];
      portalUnsubs.current.forEach((unsub) => unsub());
      portalUnsubs.current = [];
    };
  }, []);

  // Read ?checkout=success|cancel for lightweight UX and refresh entitlements on success
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const status = p.get("checkout");
    if (status !== "success" && status !== "cancel") return;

    setCheckoutState(CHECKOUT_STATES.returning);

    if (status === "success") {
      setNote("Checkout completed successfully ✅");
    }
    if (status === "cancel") {
      setNote("Checkout was canceled.");
    }

    setDebugInfo((prev) => ({
      ...prev,
      urlParams: { checkout: status },
    }));

    let cancelled = false;

    (async () => {
      // Take a snapshot of current values once
      const initialPlan = entitlements?.plan || "FREE";
      const initialCycle = entitlements?.cycle || null;
      const initialPayg = entitlements?.paygRemaining || 0;

      // First forced refresh
      try {
        await refreshEntitlements();
      } catch {}

      // Poll up to ~30s for actual change
      const start = Date.now();
      let celebrated = false;
      while (!cancelled && Date.now() - start < 30000) {
        try {
          await refreshEntitlements();
          const e = entitlements;
          const planChanged =
            e?.plan && (e.plan !== initialPlan || e.cycle !== initialCycle);
          const paygIncreased = (e?.paygRemaining || 0) > initialPayg;

          if (!celebrated && (planChanged || paygIncreased)) {
            setNote(
              planChanged
                ? "Your subscription upgrade is now active! 🎉"
                : "Your PAYG token purchase is now active! 🎉"
            );
            celebrated = true;
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Env/stripe mode mismatch guard (dev only)
  const [envMismatch, setEnvMismatch] = useState(false);
  useEffect(() => {
    if (!stripeMode) return;
    if (process.env.NODE_ENV !== "development") return;
    const allPriceIds = Object.values(PRICE.sub)
      .concat(Object.values(PRICE.payg))
      .filter(Boolean);
    const anyLive = allPriceIds.some((id) => id && id.startsWith("price_1"));
    if (
      (stripeMode === "test" && anyLive) ||
      (stripeMode === "live" && !anyLive)
    ) {
      setEnvMismatch(true);
    }
  }, [stripeMode]);

  // Loading skeletons for Current Plan
  function CurrentPlanSkeleton() {
    return (
      <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-5 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-pulse">
        <div className="w-full">
          <div className="h-6 w-3/4 bg-gray-700 rounded mb-3" />
          <div className="h-4 w-1/2 bg-gray-800 rounded mb-2" />
          <div className="h-3 w-1/3 bg-gray-800 rounded" />
        </div>
        <div className="flex flex-col gap-2 md:gap-0 md:flex-row md:items-center md:space-x-3">
          <div className="h-10 w-32 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  // Token meter progress bar
  function TokenMeter({ subRemaining, limit, resetsAt }) {
    const percent =
      limit > 0 ? Math.min(100, Math.round((subRemaining / limit) * 100)) : 0;
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400 font-medium">
            Token usage
          </span>
          <button
            className="text-xs text-purple-400 hover:underline focus:outline-none ml-2"
            style={{ fontSize: 12 }}
            onClick={refreshEntitlements}
            tabIndex={0}
            type="button"
          >
            Refresh
          </button>
        </div>
        <div className="relative w-full h-5 bg-gray-800 rounded-lg overflow-hidden mb-1">
          <div
            className="absolute left-0 top-0 h-full rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] transition-all duration-500"
            style={{
              width: `${percent}%`,
              boxShadow: "0 0 0 1.5px #00f5d4, 0 1px 8px #00f5d4cc",
            }}
          />
          <span
            className="absolute left-1/2 top-1/2 text-xs font-semibold text-white"
            style={{
              transform: "translate(-50%, -50%)",
              zIndex: 2,
              textShadow: "0 1px 4px #000c",
              fontSize: 13,
            }}
          >
            {percent}% left
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
          <span>
            {subRemaining.toLocaleString()} / {limit.toLocaleString()} tokens
          </span>
          {resetsAt && (
            <span>
              Resets {new Date(resetsAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-purple-400">
          <a
            href="/docs/tokens"
            className="hover:underline focus:outline-none"
            tabIndex={0}
          >
            How tokens work
          </a>
        </div>
      </div>
    );
  }

  // Only render CTAs for priceIds in PRICE map
  function isValidPriceId(pid) {
    return (
      Object.values(PRICE.sub).includes(pid) ||
      Object.values(PRICE.payg).includes(pid)
    );
  }
  // Responsive: sticky summary bar on desktop only
  useEffect(() => {
    if (!focusedPlan) return;
    const handleScroll = () => {
      // If user scrolls above pricing cards, clear focus
      const cards = document.getElementById("pricing-cards");
      if (!cards) return;
      const rect = cards.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) return;
      setFocusedPlan(null);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [focusedPlan]);
  // Loading state
  if (entStatus === "loading" || !authReady) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <CurrentPlanSkeleton />
        <DebugPanel
          debugInfo={{
            ...debugInfo,
            API_ORIGIN,
            stripeMode,
            clickedPriceId,
          }}
          ref={debugPanelRef}
          triggerRef={debugTriggerRef}
        />
      </div>
    );
  }

  // Error state
  if (entStatus === "error" || error || entError) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-red-400 mb-4" />
        <div className="text-red-300 font-medium text-center max-w-md">
          {error || entError}
        </div>
        {(error || entError)?.includes("Unexpected token") && (
          <div className="mt-2 text-xs text-gray-400 text-center max-w-xs">
            This usually means the server is returning an error page instead of billing data. Please check your network connection or try again later.
          </div>
        )}
        <button
          className="mt-6 px-6 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
        <DebugPanel
          debugInfo={{
            ...debugInfo,
            API_ORIGIN,
            stripeMode,
            clickedPriceId,
          }}
          ref={debugPanelRef}
          triggerRef={debugTriggerRef}
        />
      </div>
    );
  }

  // Env mismatch error (dev only)
  if (envMismatch) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center">
        <div className="bg-red-900/80 border border-red-700 rounded-lg px-8 py-6 mb-6 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-yellow-400" />
          <div>
            <div className="text-lg font-bold text-red-200 mb-1">
              Environment Mismatch
            </div>
            <div className="text-red-100 text-sm">
              Your frontend and backend Stripe environments do not match. Please check your deployment configuration.
            </div>
          </div>
        </div>
        <DebugPanel
          debugInfo={{
            ...debugInfo,
            API_ORIGIN,
            stripeMode,
            clickedPriceId,
          }}
          ref={debugPanelRef}
          triggerRef={debugTriggerRef}
        />
      </div>
    );
  }

  // Only show upgrades above current plan
  const upgrades = entitlements
    ? SUBSCRIPTION_PLANS.filter(
        (p) =>
          (entitlements.plan === "FREE" && p.key === "PRO") ||
          (entitlements.plan === "PRO" && p.key === "TEAM")
      )
    : [];

  // Slim upgrade banner logic
  const showUpgradeBanner =
    user &&
    entitlements &&
    ((entitlements.plan === "FREE" && upgrades.length > 0) ||
      (entitlements.plan === "PRO" && upgrades.length > 0));

  // Pricing card focus logic
  const focusPlan = (planId) => {
    setFocusedPlan(planId);
    setTimeout(() => {
      const el = document.getElementById(`plan-card-${planId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
    }, 100);
  };

// Plan comparison table
function PlanComparisonTable() {
  return (
    <div className="w-full mb-4 overflow-x-auto">
      <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-5">
        <table className="w-full text-sm text-gray-300 border-separate border-spacing-y-1">
          <thead>
            <tr>
              <th className="w-1/4 text-left font-semibold"></th>
              <th className="w-1/4 text-center font-semibold">Free</th>
              <th className="w-1/4 text-center font-semibold">Pro</th>
              <th className="w-1/4 text-center font-semibold">Team</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_COMPARISON.map((row) => (
              <tr key={row.label}>
                <td className="py-1 pr-2 text-gray-400">{row.label}</td>
                <td className="py-1 text-center">{row.free}</td>
                <td className="py-1 text-center">{row.pro}</td>
                <td className="py-1 text-center">{row.team}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

  // Sticky summary bar (desktop only)
  function StickySummaryBar() {
    // Only show if a plan is focused and not current
    if (!focusedPlan) return null;
    const plan = plans.find((p) => p.id === focusedPlan);
    if (!plan) return null;
    let pid =
      typeof plan.stripePriceId === "function"
        ? plan.stripePriceId(billingCycle)
        : plan.stripePriceId;
    let isCurrentPlan = false;
    if (user && entitlements) {
      if (plan.id === "free" && (!entitlements.plan || entitlements.plan === "FREE")) {
        isCurrentPlan = true;
      }
      if (
        plan.id === "pro" &&
        entitlements.plan === "PRO" &&
        ((billingCycle === "monthly" && entitlements.cycle === "MONTHLY") ||
          (billingCycle === "yearly" && entitlements.cycle === "YEARLY"))
      ) {
        isCurrentPlan = true;
      }
      if (
        plan.id === "team" &&
        entitlements.plan === "TEAM" &&
        ((billingCycle === "monthly" && entitlements.cycle === "MONTHLY") ||
          (billingCycle === "yearly" && entitlements.cycle === "YEARLY"))
      ) {
        isCurrentPlan = true;
      }
    }
    if (isCurrentPlan) return null;
    return (
      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-40 bg-[#18181b]/95 border-t border-gray-800 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <span className="font-medium text-white">
            Your selection:{" "}
            <span className="text-purple-300">{plan.name}</span>
            {plan.monthlyUSD > 0 && (
              <>
                ,{" "}
                <span>
                  {billingCycle === "monthly"
                    ? `$${plan.monthlyUSD}/mo`
                    : `$${(plan.yearlyUSD / 12).toFixed(2)}/mo`}
                </span>
              </>
            )}
          </span>
          <button
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-medium hover:translate-y-[-2px] transition-all duration-200 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
            onClick={() => {
              if (!user) {
                handleLogin();
                return;
              }
              if (pid) handleCheckout(pid, "subscription");
            }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col">
      {/* Header */}
      <NexusRBXHeader
        navLinks={[
          { id: 1, text: "Home", href: "/", icon: Home },
          { id: 2, text: "AI Console", href: "/ai" },
          { id: 3, text: "Docs", href: "/docs", icon: BookOpen },
          { id: 5, text: "Settings", href: "/settings", icon: Settings },
          { id: 4, text: "Contact", href: "/contact" },
        ]}
        handleNavClick={(href, external) => (e) => {
          e.preventDefault();
          if (external) {
            window.open(href, "_blank", "noopener noreferrer");
          } else {
            navigate(href);
          }
        }}
        navigate={navigate}
        user={user}
        handleLogin={handleLogin}
        tokenInfo={entitlements}
        tokenLoading={entStatus === "loading"}
      />

      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Hero */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text"
              style={{
                WebkitTextStroke: "0.5px #fff8",
                textShadow: "0 1px 8px #0008",
              }}
            >
              Choose Your Plan
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-2">
              Roblox scripting powered by GPT-4.1. Clear, usage-based pricing.
            </p>
            <div className="mt-2 flex justify-center">
              {user ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-800 text-gray-200 text-sm font-medium gap-2">
                  <UserAvatar email={user.email} displayName={user.displayName} />
                  {user.email || user.displayName}
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-800 text-gray-400 text-sm font-medium">
                  You’re not signed in
                </span>
              )}
            </div>
          </div>

          {/* Note block (success/cancel) */}
          {note && (
            <div
              className="mb-4 text-sm rounded-md bg-gray-900 border border-gray-700 px-4 py-3 flex items-center gap-2 justify-center"
              aria-live="polite"
            >
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>{note}</span>
            </div>
          )}
          {note && note.includes("success") && (
            <div className="mt-1 text-xs text-gray-400 text-center">Syncing purchase…</div>
          )}

          {/* Current Plan */}
          {user && entitlements ? (
            <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-5 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="w-full md:w-2/3">
                <TokenMeter
                  subRemaining={entitlements.subRemaining}
                  limit={entitlements.limit}
                  resetsAt={entitlements.resetsAt}
                />
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-lg font-bold text-purple-300">
                    {planLabel(entitlements?.plan)} Plan
                  </span>
                  <span className="text-gray-400 text-base ml-0 sm:ml-3">
                    {planPrice(entitlements?.plan, entitlements?.cycle)}
                  </span>
                  {entitlements?.plan !== "FREE" && entitlements?.cycle && (
                    <span className="text-xs text-gray-500 ml-0 sm:ml-3">
                      {entitlements.cycle === "YEARLY"
                        ? "Billed yearly"
                        : "Billed monthly"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 md:gap-0 md:flex-row md:items-center md:space-x-3 w-full md:w-auto">
                <button
                  className="bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition hover:translate-y-[-2px] duration-200 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                  onClick={handlePortal}
                  disabled={portalLoading || checkoutState === CHECKOUT_STATES.starting}
                >
                  <CreditCard className="h-4 w-4" />
                  Manage billing
                </button>
              </div>
            </div>
          ) : (
            <CurrentPlanSkeleton />
          )}

          {/* Upgrade banner */}
          {showUpgradeBanner && upgrades.length > 0 && (
            <div className="mb-4 flex items-center justify-center">
              <div className="inline-flex items-center bg-gray-800 text-gray-200 px-4 py-2 rounded-full text-sm font-medium gap-2">
                <ArrowUpRight className="h-4 w-4 text-purple-400" />
                {entitlements.plan === "FREE" && (
                  <>
                    On Free?{" "}
                    <button
                      className="underline text-purple-400 hover:text-purple-300 focus:outline-none"
                      onClick={() => focusPlan("pro")}
                      type="button"
                    >
                      Upgrade to Pro for 500k tokens/mo →
                    </button>
                  </>
                )}
                {entitlements.plan === "PRO" && (
                  <>
                    On Pro?{" "}
                    <button
                      className="underline text-purple-400 hover:text-purple-300 focus:outline-none"
                      onClick={() => focusPlan("team")}
                      type="button"
                    >
                      Upgrade to Team for 1.5M tokens/mo →
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Plan Comparison Table */}
          <PlanComparisonTable />

          {/* Billing Toggle */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gray-900/50 p-1 rounded-lg inline-flex border border-gray-800">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 rounded-md text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 ${
                  billingCycle === "monthly"
                    ? "bg-[#18181b] text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
                type="button"
                aria-pressed={billingCycle === "monthly"}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-5 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 ${
                  billingCycle === "yearly"
                    ? "bg-[#18181b] text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
                type="button"
                aria-pressed={billingCycle === "yearly"}
              >
                Yearly
                <span className="ml-2 text-[10px] py-0.5 px-1.5 bg-[#00f5d4]/20 text-[#00f5d4] rounded-sm font-semibold">
                  Save 25%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div
            id="pricing-cards"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          >
            {plans.map((plan) => {
              let pid =
                typeof plan.stripePriceId === "function"
                  ? plan.stripePriceId(billingCycle)
                  : plan.stripePriceId;
if (plan.id !== "free" && pid && !isValidPriceId(pid)) return null;

// Determine if this is the user's current plan
let isCurrentPlan = false;
if (user && entitlements) {
  if (plan.id === "free") {
    // Free plan is never "current" if user has upgraded, always show as selectable
    isCurrentPlan = (!entitlements.plan || entitlements.plan === "FREE");
  }
  if (
    plan.id === "pro" &&
    entitlements.plan === "PRO" &&
    ((billingCycle === "monthly" && entitlements.cycle === "MONTHLY") ||
      (billingCycle === "yearly" && entitlements.cycle === "YEARLY"))
  ) {
    isCurrentPlan = true;
  }
  if (
    plan.id === "team" &&
    entitlements.plan === "TEAM" &&
    ((billingCycle === "monthly" && entitlements.cycle === "MONTHLY") ||
      (billingCycle === "yearly" && entitlements.cycle === "YEARLY"))
  ) {
    isCurrentPlan = true;
  }
}

              return (
                <div
                  key={plan.id}
                  id={`plan-card-${plan.id}`}
                  tabIndex={-1}
                  className={`relative bg-gray-900/30 border rounded-xl overflow-hidden transition-all duration-200 outline-none
                    ${plan.highlight
                      ? "border-[#9b5de5] shadow-none"
                      : "border-gray-800 hover:shadow-lg hover:shadow-[#00f5d4]/10"}
                    ${focusedPlan === plan.id ? "ring-2 ring-[#00f5d4] ring-offset-2" : ""}
                  `}
                  style={{
                    boxShadow: plan.highlight
                      ? "0 2px 16px 0 #00f5d420"
                      : undefined,
                  }}
                  onFocus={() => setFocusedPlan(plan.id)}
                  onBlur={() => setFocusedPlan(null)}
                >
                  {/* Popular chip */}
{plan.popular && (
  <div className="absolute top-3 right-3">
    <span className="bg-[#9b5de5] text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
      Most popular
    </span>
  </div>
)}

                  <div className="p-5">
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-gray-400 text-base mb-3">{plan.description}</p>

                    <div className="mb-2 flex items-end gap-2">
                      <span className="text-3xl font-bold">
                        $
                        {billingCycle === "monthly"
                          ? plan.monthlyUSD
                          : (plan.yearlyUSD / 12).toFixed(2)}
                        <span className="text-base font-normal text-gray-400 ml-1">
                          /mo
                        </span>
                      </span>
                      {billingCycle === "yearly" && plan.monthlyUSD > 0 && (
                        <span className="text-xs text-[#00f5d4] bg-[#00f5d4]/10 rounded px-2 py-0.5 font-semibold ml-1">
                          (billed annually)
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400 mb-2">
                      {plan.tokenAllowancePM.toLocaleString()} tokens / month • {plan.approxScriptsPM}
                    </div>

                    {/* CTA */}
                    <div className="mt-4">
                      {isCurrentPlan ? (
                        <div
                          className="w-full py-3 px-4 rounded-lg font-medium bg-gray-800 text-white text-center flex items-center justify-center gap-2 h-[48px]"
                          aria-disabled="true"
                        >
                          <Check className="h-5 w-5 text-[#00f5d4]" />
                          Current plan
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setFocusedPlan(plan.id);
                            if (plan.id === "free") {
                              if (!user) {
                                navigate("/signup");
                              } else {
                                navigate("/ai");
                              }
                              return;
                            }
                            if (!user) {
                              handleLogin();
                              return;
                            }
                            if (pid) handleCheckout(pid, "subscription");
                          }}
                          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 h-[48px]
                            ${plan.highlight
                              ? "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white hover:translate-y-[-2px]"
                              : "bg-gray-800 text-white hover:bg-gray-700 hover:translate-y-[-2px]"}
                            focus:ring-2 focus:ring-purple-400 focus:ring-offset-2
                          `}
                          disabled={
                            checkoutState === CHECKOUT_STATES.starting ||
                            portalLoading
                          }
                        >
                          {plan.id === "free"
                            ? !user
                              ? "Get Started"
                              : "Go to AI Console"
                            : !user
                              ? "Login to Choose"
                              : plan.cta}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-800 p-5 pt-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) =>
                        feature.included ? (
                          <li key={index} className="flex items-center gap-2 text-base">
                            <Check className="h-4 w-4 text-[#00f5d4] mr-1" />
                            <span className="text-gray-200">{feature.text}</span>
                          </li>
                        ) : (
                          <li key={index} className="text-gray-500 text-base pl-5">
                            {feature.text}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PAYG Top-Up Packs */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-center mb-4">
              Need more? Pay‑As‑You‑Go Packs
            </h2>
            <p className="text-center text-gray-400 mb-6">
              Buy tokens that never expire. Perfect for bursts or topping up mid‑month.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {[
    {
      name: "Top‑Up 100k",
      tokens: 100_000,
      price: 4.99,
      priceId: PRICE.payg.pack100k,
    },
    {
      name: "Top‑Up 500k",
      tokens: 500_000,
      price: 15.19,
      priceId: PRICE.payg.pack500k,
      popular: true,
    },
    {
      name: "Top‑Up 1M",
      tokens: 1_000_000,
      price: 24.99,
      priceId: PRICE.payg.pack1m,
    },
  ].map((p) => {
    if (!isValidPriceId(p.priceId)) return null;
    return (
      <div
        key={p.name}
        className="bg-gray-900/30 border border-gray-800 rounded-xl p-5 flex flex-col items-center"
      >
        {p.popular && (
          <div className="mb-2">
            <span className="bg-yellow-400/90 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">
              Best value
            </span>
          </div>
        )}
        <div className="text-lg font-semibold mb-1">{p.name}</div>
        <div className="text-gray-400 mb-1">
          {p.tokens.toLocaleString()} tokens • ≈{" "}
          {Math.round(p.tokens / 7000)} medium scripts
        </div>
        <div className="text-xs text-gray-500 mb-2">
          Based on ~7k tokens per script.
        </div>
        <div className="text-2xl font-bold mb-3">${p.price}</div>
        <span className="w-full py-2 px-4 rounded-lg bg-yellow-500/90 text-white font-semibold text-center shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2">
          Coming Soon
        </span>
      </div>
    );
  })}
</div>
            <p className="text-center text-gray-500 text-sm mt-3">
              Packs do not expire. Applied instantly after checkout.
            </p>
          </div>

          {/* Features Section */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-center mb-8">
              Everything You Need for Roblox Development
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureTile
                icon={<Zap className="h-6 w-6 text-white" />}
                title="AI Script Generation"
                desc="Generate Roblox scripts with natural language prompts. Includes secure simulation for safe testing."
              />
              <FeatureTile
                icon={<Settings className="h-6 w-6 text-white" />}
                title="Custom Templates"
                desc="Save and reuse script templates. Customize AI outputs to match your style."
              />
              <FeatureTile
                icon={<Users className="h-6 w-6 text-white" />}
                title="Team Collaboration"
                desc="Share scripts and templates. Collaborate with teammates in real time."
              />
              <FeatureTile
                icon={<CreditCard className="h-6 w-6 text-white" />}
                title="Transparent Pricing"
                desc="No hidden limits. Usage-based billing with clear token tracking."
              />
            </div>
          </div>

          {/* Testimonials */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-center mb-8">
              What Our Users Say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TestimonialCard
                avatar="JD"
                name="@BlockWizard"
                role="Roblox Creator"
                text="NexusRBX lets me build and test scripts in minutes. The AI is spot-on for Roblox logic."
              />
              <TestimonialCard
                avatar="SM"
                name="@ScriptQueen"
                role="Student & Hobbyist"
                text="I learn by generating and tweaking scripts. It’s the fastest way to level up my skills."
              />
              <TestimonialCard
                avatar="RT"
                name="@StudioLead"
                role="Team Lead"
                text="Our team ships faster and with fewer bugs. Collaboration and templates are game-changers."
              />
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto space-y-3">
              {faqs.slice(0, 6).map((faq) => (
                <div
                  key={faq.id}
                  className="bg-gray-900/20 border border-gray-800 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full p-5 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                    aria-expanded={!!showFaq[faq.id]}
                    aria-controls={`faq-panel-${faq.id}`}
                    type="button"
                    id={`faq-trigger-${faq.id}`}
                  >
                    <h3 className="font-medium text-base">{faq.question}</h3>
                    <ChevronDown
                      className={`h-7 w-7 text-gray-400 transition-transform duration-200 ${
                        showFaq[faq.id] ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {showFaq[faq.id] && (
                    <div
                      id={`faq-panel-${faq.id}`}
                      role="region"
                      aria-labelledby={`faq-trigger-${faq.id}`}
                      className="px-5 pb-5 text-gray-400"
                      style={{ lineHeight: 1.7 }}
                    >
                      <div className="pt-2 border-t border-gray-800">
                        {faq.answer}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Trust signals */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <img
                src="https://stripe.com/img/v3/home/twitter.png"
                alt="Stripe"
                className="h-5 w-5 rounded"
                style={{ filter: "grayscale(1) opacity(0.7)" }}
              />
              Payments by Stripe
            </div>
            <span className="hidden md:inline text-gray-500">·</span>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Lock className="h-4 w-4 text-gray-400" />
              Data encrypted
            </div>
            <span className="hidden md:inline text-gray-500">·</span>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              Cancel anytime
            </div>
          </div>

          {/* Billing & Support Info Section */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-5 mb-10">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">
                Billing & Support
              </h2>
            </div>
            <ul className="list-disc pl-6 text-gray-300 text-sm space-y-1">
              <li>
                <span className="font-medium text-white">
                  Manage payment methods, invoices, and billing info
                </span>{" "}
                via the{" "}
                <button
                  className="underline text-purple-400 hover:text-purple-300 focus:outline-none"
                  onClick={handlePortal}
                  disabled={portalLoading}
                  type="button"
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
                  className="underline text-purple-400 hover:text-purple-300 focus:outline-none"
                >
                  Contact support
                </a>
                .
              </li>
            </ul>
          </div>

          {/* CTA Section */}
          <div className="rounded-xl bg-[#18181b]/80 border border-gray-800 p-8 md:p-10 text-center mb-8">
            <div className="inline-block mb-4">
              <Sparkles className="h-10 w-10 text-[#9b5de5]" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Ready to Transform Your Roblox Development?
            </h2>
            <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
              Join thousands of developers creating amazing Roblox experiences with the power of AI.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
 {!user ? (
  <button
    type="button"
    onClick={() => navigate("/signup")}
    className="px-8 py-3 rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-medium hover:translate-y-[-2px] transition-all duration-200 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
  >
    Get Started Free
  </button>
) : (
  <button
    type="button"
    onClick={() => {
      // If coming from checkout success, clean up URL
      const params = new URLSearchParams(window.location.search);
      if (params.get("checkout") === "success") {
        params.delete("checkout");
        window.history.replaceState({}, "", window.location.pathname + (params.toString() ? "?" + params.toString() : ""));
      }
      navigate("/ai");
    }}
    className="px-8 py-3 rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-medium hover:translate-y-[-2px] transition-all duration-200 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
  >
    Open AI Console
  </button>
)}
              <button
                type="button"
                onClick={() => navigate("/contact")}
                className="px-8 py-3 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-700 transition-all duration-200 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
              >
                Talk to Sales
              </button>
            </div>
          </div>

          {/* Checkout waiting fallback */}
          {checkoutState === CHECKOUT_STATES.waitingForURL && checkoutTimeout && (
            <div className="mt-8 flex flex-col items-center">
              <div className="text-yellow-300 mb-2">
                Still preparing your checkout session…
              </div>
              <button
                type="button"
                className="px-6 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                onClick={retryCheckout}
              >
                Try Again
              </button>
            </div>
          )}

          <DebugPanel
            debugInfo={{
              ...debugInfo,
              API_ORIGIN,
              stripeMode,
              clickedPriceId,
              checkoutTimeline,
              lastEntitlementsRaw: lastRaw,
              lastEntitlementsMerge: lastMerge,
              user: user
                ? {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                  }
                : null,
            }}
            ref={debugPanelRef}
            triggerRef={debugTriggerRef}
          />
        </div>
        <StickySummaryBar />
      </main>

      {/* Footer */}
      <NexusRBXFooter
        page="pricing"
        navigate={navigate}
      />
    </div>
  );
}

// Feature tile
function FeatureTile({ icon, title, desc }) {
  return (
    <div className="bg-gray-900/20 border border-gray-800 rounded-xl p-5 flex flex-col items-start">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-gray-400 text-base">{desc}</p>
    </div>
  );
}

// Testimonial card
function TestimonialCard({ avatar, name, role, text }) {
  return (
    <div className="bg-gray-900/20 border border-gray-800 rounded-xl p-5 flex flex-col">
      <div className="flex items-center mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3">
          <span className="font-bold text-white text-base">{avatar}</span>
        </div>
        <div>
          <h4 className="font-medium text-base text-white flex items-center gap-1">
            {name}
            <Check className="h-4 w-4 text-[#00f5d4]" title="Verified user" />
          </h4>
          <p className="text-gray-400 text-xs">{role}</p>
        </div>
      </div>
      <p className="text-gray-300 italic text-base mb-0" style={{ lineHeight: 1.5 }}>
        {text}
      </p>
    </div>
  );
}

// Avatar for user pill
function UserAvatar({ email, displayName }) {
  const initials =
    (displayName && displayName[0]) ||
    (email && email[0]) ||
    "U";
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] text-white font-bold text-sm mr-1">
      {initials}
    </span>
  );
}

// DebugPanel component for showing debug info
const DebugPanel = React.forwardRef(function DebugPanel(
  { debugInfo, triggerRef },
  ref
) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && ref && ref.current) {
      ref.current.focus();
    }
    if (!open && triggerRef && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [open, ref, triggerRef]);

  if (!debugInfo) return null;

  // Redact tokens, cookies, secrets
  function redact(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(redact);
    const out = {};
    for (const k in obj) {
      if (
        typeof k === "string" &&
        (k.toLowerCase().includes("token") ||
          k.toLowerCase().includes("cookie") ||
          k.toLowerCase().includes("secret"))
      ) {
        out[k] = "[REDACTED]";
      } else if (typeof obj[k] === "object") {
        out[k] = redact(obj[k]);
      } else {
        out[k] = obj[k];
      }
    }
    return out;
  }

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
        ref={triggerRef}
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
        aria-label={open ? "Hide Debug" : "Show Debug"}
        aria-expanded={open}
        aria-controls="debug-panel-content"
      >
        {open ? "Hide Debug" : "Show Debug"}
      </button>
      {open && (
        <div
          ref={ref}
          id="debug-panel-content"
          tabIndex={-1}
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
            outline: "none",
          }}
        >
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {JSON.stringify(redact(debugInfo), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
});
