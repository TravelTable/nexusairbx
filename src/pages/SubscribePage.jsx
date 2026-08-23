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
import "./AccountLedger.css";

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
      <main id="main-content" className="account-ledger-page account-ledger-page--center">
        {pageHead}
        <section className="account-ledger-center-state" aria-labelledby="missing-plan-title">
          <p className="account-ledger-kicker">Checkout record</p>
          <h1 id="missing-plan-title" className="account-ledger-title account-ledger-title--compact">Choose a plan first</h1>
          <p className="account-ledger-intro">
            Your plan selection is missing or has expired. Return to pricing to create a new checkout review.
          </p>
          <a
            href="/pricing"
            className="account-ledger-link account-ledger-link--primary"
          >
            View pricing
          </a>
        </section>
      </main>
    );
  }

  if (!authReady || !user) {
    return (
      <main id="main-content" className="account-ledger-page account-ledger-page--center">
        {pageHead}
        <div className="account-ledger-loading" role="status">
          <Loader2 className="account-ledger-icon animate-spin" aria-hidden="true" />
          <p>Taking you to sign in…</p>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="account-ledger-page">
      {pageHead}
      <div className="account-ledger-wrap account-ledger-wrap--narrow account-ledger-charge-layout">
        <section aria-labelledby="checkout-title">
          <p className="account-ledger-kicker">Charge record</p>
          <h1 id="checkout-title" className="account-ledger-title account-ledger-title--compact">
            Review your {plan.name} plan
          </h1>
          <p className="account-ledger-intro">
            Confirm the plan and billing schedule below. Stripe will securely collect and process your payment details.
          </p>

          <dl className="account-ledger-charge-record">
            <div className="account-ledger-charge-row">
              <dt>Plan</dt>
              <dd>{plan.name}</dd>
            </div>
            <div className="account-ledger-charge-row">
              <dt>Best for</dt>
              <dd>{plan.audience}</dd>
            </div>
            {intent.plan === PLAN.TEAM && (
              <div className="account-ledger-charge-row">
                <dt>Seats</dt>
                <dd>{seatCount} paid seats</dd>
              </div>
            )}
            <div className="account-ledger-charge-row">
              <dt>Billing schedule</dt>
              <dd>{intent.interval === BILLING_INTERVAL.YEAR ? `${formatMoney(billedTotal)} billed yearly` : "Billed monthly"}</dd>
            </div>
            {plan.perSeat && (
              <div className="account-ledger-charge-row">
                <dt>Unit price</dt>
                <dd>{intent.interval === BILLING_INTERVAL.YEAR ? `${formatMoney(plan.yearly)} per user, per year` : `${formatMoney(plan.monthly)} per user, per month`}</dd>
              </div>
            )}
            <div className="account-ledger-charge-row account-ledger-charge-total">
              <dt>{intent.interval === BILLING_INTERVAL.YEAR ? "Monthly equivalent" : "Recurring charge"}</dt>
              <dd>{intent.interval === BILLING_INTERVAL.YEAR ? `${formatMoney(monthlyEquivalent)}/month` : `${formatMoney(billedTotal)}/month`}</dd>
            </div>
          </dl>

          <ul className="account-ledger-feature-list" aria-label={`${plan.name} plan features`}>
            {plan.features.map((feature) => (
              <li key={feature}>
                <Check className="account-ledger-icon text-[var(--nx-success)]" aria-hidden="true" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <a href="/pricing" className="account-ledger-link">
            Change plan or billing schedule
          </a>

          <dl className="account-ledger-meta">
            <div>
              <dt>Account</dt>
              <dd>{user.email || "Signed-in NexusRBX account"}</dd>
            </div>
            <div>
              <dt>Processor</dt>
              <dd>Stripe secure checkout</dd>
            </div>
            <div>
              <dt>Renewal</dt>
              <dd>Automatic until cancelled</dd>
            </div>
          </dl>

          {(error || entitlementsError) && (
            <div className="account-ledger-notice account-ledger-notice--danger" role="alert">
              {error || entitlementsError}
            </div>
          )}
          {status && !error && (
            <p className="account-ledger-notice" role="status">{status}</p>
          )}
        </section>

        <aside className="account-ledger-checkout-action" aria-label="Checkout action">
          {entitlementsLoading ? (
            <div className="account-ledger-loading" role="status" aria-label="Checking billing status">
              <Loader2 className="account-ledger-icon animate-spin" aria-hidden="true" />
              <span>Checking billing status…</span>
            </div>
          ) : isSubscriber ? (
            <>
              <Settings className="account-ledger-icon text-[var(--nx-purple)]" aria-hidden="true" />
              <h2>You already have an active plan</h2>
              <p className="account-ledger-section-copy">
                Open billing settings to change, update, or cancel your current subscription.
              </p>
              <button
                type="button"
                onClick={managePlan}
                disabled={Boolean(busyAction)}
                className="account-ledger-button account-ledger-button--block"
              >
                {busyAction === "portal" ? <Loader2 className="account-ledger-icon animate-spin" aria-hidden="true" /> : "Manage plan"}
              </button>
            </>
          ) : (
            <>
              <CreditCard className="account-ledger-icon text-[var(--nx-purple)]" aria-hidden="true" />
              <h2>Payment comes next</h2>
              <p className="account-ledger-section-copy">
                You will review payment details and the renewal schedule on Stripe before confirming.
              </p>
              <button
                type="button"
                onClick={beginCheckout}
                disabled={Boolean(busyAction) || Boolean(entitlementsError)}
                className="account-ledger-button account-ledger-button--primary account-ledger-button--block"
              >
                {busyAction === "checkout" ? <Loader2 className="account-ledger-icon animate-spin" aria-hidden="true" /> : "Continue to secure checkout"}
              </button>
              <p className="account-ledger-detail">
                By continuing, you agree to the Terms of Service. Your subscription renews automatically until cancelled.
              </p>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
