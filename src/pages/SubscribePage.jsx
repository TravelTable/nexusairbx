import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, CreditCard, Loader2, Settings } from "lib/icons";
import { Helmet } from "react-helmet-async";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getFirestore, onSnapshot } from "firebase/firestore";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  getEntitlements,
  isSubscriberPlan,
  openPortal,
  startSubscriptionCheckout,
} from "../lib/billing";
import {
  checkoutIntentFromSearchParams,
  readCheckoutIntent,
  saveCheckoutIntent,
} from "../lib/checkoutIntent";
import { formatMoney, getPublicPlan } from "../lib/planCatalog";
import { BILLING_INTERVAL, PLAN } from "../lib/prices";
import { trackProductEvent } from "../lib/productAnalytics";

function subscribeUntilTerminal(unsubscribersRef, documentRef, onValue, onError) {
  let unsubscribe = null;
  let stopRequested = false;
  const stop = () => {
    if (!unsubscribe) {
      stopRequested = true;
      return;
    }
    unsubscribe();
    unsubscribe = null;
    unsubscribersRef.current = unsubscribersRef.current.filter((entry) => entry !== stop);
  };

  unsubscribe = onSnapshot(
    documentRef,
    (snapshot) => {
      if (onValue(snapshot.data()) === true) stop();
    },
    (error) => {
      onError?.(error);
      stop();
    }
  );
  if (stopRequested) stop();
  else unsubscribersRef.current.push(stop);
  return stop;
}

function returnLocation(location) {
  return {
    pathname: location.pathname,
    search: location.search || "",
    hash: location.hash || "",
  };
}

function checkoutErrorMessage(error) {
  if (error?.code === "ACTIVE_SUBSCRIPTION_EXISTS") {
    return "You already have an active subscription. Use Manage plan to make changes.";
  }
  return error?.message || "We could not start checkout. Please try again.";
}

export default function SubscribePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sessionUnsubscribers = useRef([]);
  const [checkoutState] = useState(() => {
    const queryIntent = checkoutIntentFromSearchParams(searchParams);
    if (queryIntent) {
      return { intent: saveCheckoutIntent(queryIntent), restored: false };
    }
    const savedIntent = readCheckoutIntent();
    return { intent: savedIntent, restored: Boolean(savedIntent) };
  });
  const { intent } = checkoutState;
  const plan = useMemo(() => getPublicPlan(intent?.plan), [intent?.plan]);
  const [user, setUser] = useState(() => getAuth().currentUser || null);
  const [authReady, setAuthReady] = useState(() => Boolean(getAuth().currentUser));
  const [entitlements, setEntitlements] = useState(null);
  const [entitlementsLoading, setEntitlementsLoading] = useState(() => Boolean(getAuth().currentUser));
  const [entitlementsError, setEntitlementsError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !intent || user) return;
    saveCheckoutIntent(intent);
    navigate("/signin", {
      replace: true,
      state: { from: returnLocation(location) },
    });
  }, [authReady, intent, location, navigate, user]);

  useEffect(() => {
    const uid = user?.uid;
    if (!authReady || !uid || getAuth().currentUser?.uid !== uid) {
      setEntitlements(null);
      setEntitlementsLoading(false);
      setEntitlementsError("");
      return undefined;
    }
    let active = true;
    setEntitlementsLoading(true);
    setEntitlementsError("");
    getEntitlements({ noCache: true })
      .then((value) => {
        if (active && getAuth().currentUser?.uid === uid) setEntitlements(value);
      })
      .catch(() => {
        if (active && getAuth().currentUser?.uid === uid) {
          setEntitlementsError("We could not verify your billing status. Please refresh and try again.");
        }
      })
      .finally(() => {
        if (active && getAuth().currentUser?.uid === uid) setEntitlementsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authReady, user?.uid]);

  useEffect(() => {
    void trackProductEvent("subscription_viewed", {
      landing_page: "/subscribe",
      subscription_plan: intent?.plan || "none",
      billing_interval: intent?.interval || "none",
    }, { dedupeKey: `subscribe:${intent?.plan || "none"}:${intent?.interval || "none"}` });
  }, [intent?.interval, intent?.plan]);

  useEffect(() => {
    if (!checkoutState.restored || !intent) return;
    void trackProductEvent("checkout_intent_restored", {
      subscription_plan: intent.plan,
      billing_interval: intent.interval,
    }, { dedupeKey: `checkout_intent_restored:${intent.createdAt}` });
  }, [checkoutState.restored, intent]);

  useEffect(() => () => {
    sessionUnsubscribers.current.forEach((unsubscribe) => unsubscribe?.());
    sessionUnsubscribers.current = [];
  }, [user?.uid]);

  const isSubscriber = isSubscriberPlan(entitlements?.plan, entitlements?.entitlements);
  const seatCount = intent?.plan === PLAN.TEAM ? intent.seatCount : 1;
  const unitPrice = intent?.interval === BILLING_INTERVAL.YEAR ? plan?.yearly : plan?.monthly;
  const billedTotal = Number.isFinite(unitPrice) ? unitPrice * seatCount : null;
  const monthlyEquivalent = intent?.interval === BILLING_INTERVAL.YEAR && Number.isFinite(billedTotal)
    ? billedTotal / 12
    : null;

  function watchCheckoutDocument(documentPath) {
    const uid = user?.uid;
    if (!authReady || !uid || getAuth().currentUser?.uid !== uid) return;
    setStatus("Preparing your secure checkout session…");
    subscribeUntilTerminal(
      sessionUnsubscribers,
      doc(getFirestore(), documentPath),
      (data) => {
        if (getAuth().currentUser?.uid !== uid) return true;
        if (data?.url) {
          setStatus("Opening Stripe checkout…");
          window.location.assign(data.url);
          return true;
        }
        if (data?.error) {
          setError(data.error.message || "We could not start checkout. Please try again.");
          setStatus("");
          setBusyAction("");
          return true;
        }
        return false;
      },
      () => {
        setError("Checkout preparation was interrupted. Please try again.");
        setStatus("");
        setBusyAction("");
      }
    );
  }

  async function beginCheckout() {
    if (!intent || !plan || !user || isSubscriber) return;
    setBusyAction("checkout");
    setError("");
    setStatus("Starting checkout…");
    void trackProductEvent("checkout_started", {
      subscription_plan: intent.plan,
      billing_interval: intent.interval,
      ...(intent.plan === PLAN.TEAM ? { team_seats: intent.seatCount } : {}),
    });
    try {
      const result = await startSubscriptionCheckout({
        plan: intent.plan,
        interval: intent.interval,
        ...(intent.plan === PLAN.TEAM ? { seatCount: intent.seatCount } : {}),
      });
      if (result?.url) {
        setStatus("Opening Stripe checkout…");
        window.location.assign(result.url);
        return;
      }
      if (result?.sessionDocPath) {
        watchCheckoutDocument(result.sessionDocPath);
        return;
      }
      throw new Error("Checkout did not return a session.");
    } catch (checkoutError) {
      setError(checkoutErrorMessage(checkoutError));
      setStatus("");
      setBusyAction("");
    }
  }

  function watchPortalDocument(documentPath) {
    const uid = user?.uid;
    if (!authReady || !uid || getAuth().currentUser?.uid !== uid) return;
    setStatus("Preparing your billing portal…");
    subscribeUntilTerminal(
      sessionUnsubscribers,
      doc(getFirestore(), documentPath),
      (data) => {
        if (getAuth().currentUser?.uid !== uid) return true;
        if (data?.url) {
          setStatus("Opening billing settings…");
          window.location.assign(data.url);
          return true;
        }
        if (data?.error) {
          setError(data.error.message || "We could not open billing settings.");
          setStatus("");
          setBusyAction("");
          return true;
        }
        return false;
      },
      () => {
        setError("Billing settings could not be prepared. Please try again.");
        setStatus("");
        setBusyAction("");
      }
    );
  }

  async function managePlan() {
    setBusyAction("portal");
    setError("");
    setStatus("Opening billing settings…");
    try {
      const result = await openPortal();
      if (result?.url) {
        window.location.assign(result.url);
        return;
      }
      if (result?.portalDocPath) {
        watchPortalDocument(result.portalDocPath);
        return;
      }
      throw new Error("Billing settings did not return a portal session.");
    } catch (portalError) {
      setError(portalError?.message || "We could not open billing settings.");
      setStatus("");
      setBusyAction("");
    }
  }

  const pageHead = (
    <Helmet>
      <title>Review your plan | NexusRBX</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );

  if (!intent || !plan) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-[#090b10] px-5 py-16 text-white">
        {pageHead}
        <main className="mx-auto max-w-xl rounded-xl border border-white/10 bg-[#12151c] p-7 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Checkout</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Choose a plan first</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Your plan selection is missing or has expired. Return to pricing to create a new checkout review.
          </p>
          <a
            href="/pricing"
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-slate-950 hover:bg-slate-200"
          >
            View pricing
          </a>
        </main>
      </div>
    );
  }

  if (!authReady || !user) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[#090b10] px-5 text-white">
        {pageHead}
        <div className="text-center" role="status">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-300" />
          <p className="mt-3 text-sm text-slate-400">Taking you to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#090b10] px-5 py-10 text-white sm:py-14">
      {pageHead}
      <main className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="checkout-title">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Final review</p>
          <h1 id="checkout-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Review your {plan.name} plan
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Confirm the plan and billing schedule below. Stripe will securely collect and process your payment details.
          </p>

          <div className="mt-8 border-y border-white/10 py-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">{plan.name}</h2>
                  {intent.plan === PLAN.PRO && (
                    <span className="rounded border border-cyan-300/30 px-2 py-0.5 text-xs font-medium text-cyan-200">
                      Featured
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-400">{plan.audience}</p>
                {intent.plan === PLAN.TEAM && (
                  <p className="mt-3 text-sm text-slate-300">{seatCount} paid seats</p>
                )}
              </div>
              <div className="sm:text-right">
                {intent.interval === BILLING_INTERVAL.YEAR ? (
                  <>
                    <p className="text-2xl font-semibold">{formatMoney(monthlyEquivalent)}/month</p>
                    <p className="mt-1 text-sm text-slate-400">{formatMoney(billedTotal)} billed yearly</p>
                    {plan.perSeat && (
                      <p className="mt-1 text-xs text-slate-500">{formatMoney(plan.yearly)} per user, per year</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-semibold">{formatMoney(billedTotal)}/month</p>
                    <p className="mt-1 text-sm text-slate-400">Billed monthly</p>
                    {plan.perSeat && (
                      <p className="mt-1 text-xs text-slate-500">{formatMoney(plan.monthly)} per user, per month</p>
                    )}
                  </>
                )}
              </div>
            </div>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2" aria-label={`${plan.name} plan features`}>
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm leading-5 text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <a href="/pricing" className="mt-6 inline-flex text-sm font-medium text-cyan-300 hover:text-cyan-200">
              Change plan or billing schedule
            </a>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-slate-200">Account</h2>
            <p className="mt-1 text-sm text-slate-400">{user.email || "Signed-in NexusRBX account"}</p>
          </div>

          {(error || entitlementsError) && (
            <div className="mt-6 rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100" role="alert">
              {error || entitlementsError}
            </div>
          )}
          {status && !error && (
            <p className="mt-5 text-sm text-slate-300" role="status">{status}</p>
          )}
        </section>

        <aside className="h-fit rounded-xl border border-white/10 bg-[#12151c] p-6" aria-label="Checkout summary">
          {entitlementsLoading ? (
            <div className="flex min-h-40 items-center justify-center" role="status" aria-label="Checking billing status">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
            </div>
          ) : isSubscriber ? (
            <>
              <Settings className="h-5 w-5 text-cyan-300" />
              <h2 className="mt-4 text-lg font-semibold">You already have an active plan</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Open billing settings to change, update, or cancel your current subscription.
              </p>
              <button
                type="button"
                onClick={managePlan}
                disabled={Boolean(busyAction)}
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyAction === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage plan"}
              </button>
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5 text-cyan-300" />
              <h2 className="mt-4 text-lg font-semibold">Payment comes next</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                You will review payment details and the renewal schedule on Stripe before confirming.
              </p>
              <button
                type="button"
                onClick={beginCheckout}
                disabled={Boolean(busyAction) || Boolean(entitlementsError)}
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyAction === "checkout" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue to secure checkout"}
              </button>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                By continuing, you agree to the Terms of Service. Your subscription renews automatically until cancelled.
              </p>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
