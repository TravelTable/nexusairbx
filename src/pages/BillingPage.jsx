import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle, CreditCard, Loader2, Plus, Settings, Zap } from "lib/icons";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  dollarsFromMicros,
  getEntitlements,
  openPortal,
  startPremiumBalanceCheckout,
  startSubscriptionCheckout,
} from "../lib/billing";
import { BILLING_INTERVAL, PLAN, PREMIUM_BALANCE_PACKAGE } from "../lib/prices";
import { trackProductEvent } from "../lib/productAnalytics";
import "./AccountLedger.css";

const PLAN_CHOICES = [
  { plan: PLAN.PRO, label: "Pro", month: "$19.99/month", year: "$199/year", fit: "More room for regular build-and-review sessions." },
  { plan: PLAN.PRO_PLUS, label: "Pro+", month: "$39.99/month", year: "$399/year", fit: "Higher Included Usage for larger, more frequent builds." },
  { plan: PLAN.TEAM, label: "Team", month: "$29/user/month", year: "$290/user/year", fit: "Pooled Included Usage under one studio subscription." },
];

function formatDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function planLabel(plan) {
  if (plan === PLAN.PRO_PLUS) return "Pro+";
  if (plan === PLAN.PRO) return "Pro";
  if (plan === PLAN.STARTER) return "Starter";
  if (plan === PLAN.TEAM) return "Team";
  return "Free";
}

function subscribeUntilTerminal(unsubscribersRef, documentRef, onValue) {
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
    (snap) => {
      if (onValue(snap.data()) === true) stop();
    },
    stop
  );
  if (stopRequested) stop();
  else unsubscribersRef.current.push(stop);
  return stop;
}

export default function BillingPage() {
  const testUser =
    process.env.NODE_ENV === "test" && typeof window !== "undefined"
      ? window.__NEXUSRBX_TEST_USER || null
      : null;
  const [user, setUser] = useState(() => getAuth().currentUser || testUser);
  const [authReady, setAuthReady] = useState(() => Boolean(getAuth().currentUser || testUser));
  const [entitlements, setEntitlements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [interval, setIntervalValue] = useState(BILLING_INTERVAL.MONTH);
  const [teamSeats, setTeamSeats] = useState(2);
  const unsubRef = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    void trackProductEvent("subscription_viewed", {
      landing_page: "/billing",
      subscription_plan: entitlements?.plan || "unknown",
    }, { dedupeKey: "billing" });
  }, [entitlements?.plan]);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  async function refresh() {
    const uid = user?.uid;
    if (!authReady || !uid || getAuth().currentUser?.uid !== uid) {
      setEntitlements(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (process.env.NODE_ENV === "test" && typeof window !== "undefined" && window.__NEXUSRBX_TEST_ENTITLEMENTS) {
        if (getAuth().currentUser?.uid === uid) {
          setEntitlements(window.__NEXUSRBX_TEST_ENTITLEMENTS);
        }
        return;
      }
      const value = await getEntitlements({ noCache: true });
      if (getAuth().currentUser?.uid === uid) setEntitlements(value);
    } catch (err) {
      if (getAuth().currentUser?.uid === uid) {
        setError(err?.message || "Could not load billing info.");
      }
    } finally {
      if (getAuth().currentUser?.uid === uid) setLoading(false);
    }
  }

  useEffect(() => {
    if (!authReady || !user?.uid || getAuth().currentUser?.uid !== user.uid) {
      setEntitlements(null);
      setLoading(false);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user?.uid]);

  useEffect(() => () => {
    unsubRef.current.forEach((unsub) => unsub?.());
    unsubRef.current = [];
  }, [user?.uid]);

  async function handlePortal() {
    const uid = user?.uid;
    if (!authReady || !uid || getAuth().currentUser?.uid !== uid) return;
    setBusy("portal");
    setError("");
    try {
      const result = await openPortal();
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      if (result?.portalDocPath) {
        subscribeUntilTerminal(unsubRef, doc(getFirestore(), result.portalDocPath), (data) => {
          if (getAuth().currentUser?.uid !== uid) return true;
          if (data?.url) {
            window.location.href = data.url;
            return true;
          }
          if (data?.error) {
            setError(data.error.message || "Could not open billing portal.");
            return true;
          }
          return false;
        });
      }
    } catch (err) {
      setError(err?.message || "Could not open billing portal.");
    } finally {
      setBusy("");
    }
  }

  async function handlePlanCheckout(plan) {
    const uid = user?.uid;
    if (!authReady || !uid || getAuth().currentUser?.uid !== uid) return;
    setBusy(plan);
    setError("");
    try {
      const result = await startSubscriptionCheckout({
        plan,
        interval,
        ...(plan === PLAN.TEAM ? { seatCount: teamSeats } : {}),
      });
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      if (result?.sessionDocPath) {
        setNote("Preparing your checkout session...");
        subscribeUntilTerminal(unsubRef, doc(getFirestore(), result.sessionDocPath), (data) => {
          if (getAuth().currentUser?.uid !== uid) return true;
          if (data?.url) {
            window.location.href = data.url;
            return true;
          }
          if (data?.error) {
            setError(data.error.message || "Could not start checkout.");
            return true;
          }
          return false;
        });
      }
    } catch (err) {
      setError(
        err?.code === "ACTIVE_SUBSCRIPTION_EXISTS"
          ? "You already have an active NexusRBX subscription. Manage or change it through billing settings."
          : err?.message || "Could not start checkout."
      );
    } finally {
      setBusy("");
    }
  }

  async function handleTopUp(packageKey) {
    const uid = user?.uid;
    if (!authReady || !uid || getAuth().currentUser?.uid !== uid) return;
    setBusy(packageKey);
    setError("");
    try {
      const result = await startPremiumBalanceCheckout({
        packageKey,
        teamId: entitlements?.team?.teamId || undefined,
      });
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      if (result?.sessionDocPath) {
        setNote("Preparing your Premium Balance checkout session...");
        subscribeUntilTerminal(unsubRef, doc(getFirestore(), result.sessionDocPath), (data) => {
          if (getAuth().currentUser?.uid !== uid) return true;
          if (data?.url) {
            window.location.href = data.url;
            return true;
          }
          if (data?.error) {
            setError(data.error.message || "Could not start checkout.");
            return true;
          }
          return false;
        });
      }
    } catch (err) {
      setError(err?.message || "Could not start Premium Balance checkout.");
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return (
      <main id="main-content" className="account-ledger-page account-ledger-page--full account-ledger-page--center" role="status" aria-label="Loading billing record">
        <div className="account-ledger-loading">
          <Loader2 className="account-ledger-icon animate-spin" />
          <span>Loading billing record…</span>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main id="main-content" className="account-ledger-page account-ledger-page--full account-ledger-page--center">
        <section className="account-ledger-center-state" aria-labelledby="billing-sign-in-title">
          <p className="account-ledger-kicker">Account billing</p>
          <h1 id="billing-sign-in-title" className="account-ledger-title account-ledger-title--compact">Sign in to manage billing</h1>
          <p className="account-ledger-intro">Your plan, usage, and payment settings are private to your NexusRBX account.</p>
          <button className="account-ledger-button account-ledger-button--primary" onClick={() => navigate("/signin")}>
            <AlertTriangle className="account-ledger-icon" aria-hidden="true" />
            Sign in to continue
          </button>
        </section>
      </main>
    );
  }

  const included = entitlements?.includedUsage || {};
  const subscription = entitlements?.subscription || {};
  const premiumBalance = entitlements?.premiumBalance || {};
  const isPaid = [PLAN.STARTER, PLAN.PRO, PLAN.PRO_PLUS, PLAN.TEAM].includes(entitlements?.plan);
  const percentUsed = Number.isFinite(Number(included.percentUsed)) ? Number(included.percentUsed) : 0;
  const percentRemaining = Number.isFinite(Number(included.percentRemaining)) ? Number(included.percentRemaining) : 100;

  return (
    <main id="main-content" className="account-ledger-page account-ledger-page--full">
      <div className="account-ledger-wrap">
        <button
          type="button"
          className="account-ledger-back"
          onClick={() => window.location.assign("/")}
        >
          <ArrowLeft className="account-ledger-icon" aria-hidden="true" />
          Back to home
        </button>

        <header className="account-ledger-header">
          <div>
            <p className="account-ledger-kicker">Account record</p>
            <h1 className="account-ledger-title">Billing</h1>
            <p className="account-ledger-intro">See your active plan, the AI work included in this billing period, and optional prepaid credit for supported models.</p>
          </div>
          <div className="account-ledger-actions">
            <button
              type="button"
              onClick={handlePortal}
              disabled={busy === "portal"}
              className="account-ledger-button"
            >
              {busy === "portal" ? <Loader2 className="account-ledger-icon animate-spin" aria-hidden="true" /> : <Settings className="account-ledger-icon" aria-hidden="true" />}
              Manage subscription
            </button>
          </div>
        </header>

        {note && (
          <div className="account-ledger-notice account-ledger-notice--success" role="status">
            <CheckCircle className="account-ledger-icon" aria-hidden="true" />
            {note}
          </div>
        )}
        {error && (
          <div className="account-ledger-notice account-ledger-notice--danger" role="alert">
            <AlertTriangle className="account-ledger-icon" aria-hidden="true" />
            {error}
          </div>
        )}

        <section className="account-ledger-section" aria-label="Current billing record">
          <div className="account-ledger-record-grid">
          <section className="account-ledger-record">
            <h2 className="account-ledger-record-heading">
              <Zap className="account-ledger-icon" aria-hidden="true" />
              Current plan
            </h2>
            <p className="account-ledger-value">{planLabel(entitlements?.plan)}</p>
            <p className="account-ledger-detail">
              {isPaid ? `${subscription.interval === "year" ? "Yearly" : "Monthly"} billing` : "Free"}
            </p>
            {subscription.currentPeriodEnd && (
              <p className="account-ledger-detail">
                Billing period ends {formatDate(subscription.currentPeriodEnd)}
              </p>
            )}
            {subscription.cancelAtPeriodEnd && (
              <p className="account-ledger-state" data-status="waiting_on_customer">Cancels at period end</p>
            )}
            {entitlements?.grandfathered && (
              <div className="account-ledger-detail">
                <strong>Legacy {planLabel(entitlements.plan)} pricing</strong>
                <p className="account-ledger-detail">Your current subscription price remains active while this subscription continues.</p>
              </div>
            )}
            {entitlements?.team && (
              <p className="account-ledger-detail">
                Team seats: <strong>{entitlements.team.seatCount}</strong>
              </p>
            )}
          </section>

          <section className="account-ledger-record">
            <h2 className="account-ledger-record-heading">Included Usage</h2>
            <p className="account-ledger-detail">The AI work included with your plan for the current billing period.</p>
            <p className="account-ledger-value">{percentUsed}% used</p>
            <p className="account-ledger-detail">{percentRemaining}% remaining</p>
            <div
              className="account-ledger-progress"
              role="progressbar"
              aria-label="Included Usage used"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={Math.min(100, Math.max(0, percentUsed))}
            >
              <span style={{ width: `${Math.min(100, Math.max(0, percentUsed))}%` }} />
            </div>
            <p className="account-ledger-detail">Resets {formatDate(included.resetsAt)}</p>
            {included.warningLevel === "WARNING" && <p className="account-ledger-detail text-[var(--nx-warning)]">You’ve used 70% of your included usage.</p>}
            {included.warningLevel === "CRITICAL" && (
              <p className="account-ledger-detail text-[var(--nx-warning)]">You’re almost out of included usage. You can continue with Premium Balance or wait for the reset.</p>
            )}
            {included.warningLevel === "REACHED" && (
              <p className="account-ledger-detail text-[var(--nx-warning)]">Included usage reached. Continue using Premium Balance, or wait until your usage resets.</p>
            )}
          </section>

          <section className="account-ledger-record">
            <h2 className="account-ledger-record-heading">Premium Balance</h2>
            <p className="account-ledger-value">{dollarsFromMicros(premiumBalance.balanceMicros)} available</p>
            <p className="account-ledger-detail">Optional prepaid credit used only when you choose a supported Premium Direct model.</p>
            <div className="account-ledger-topups" aria-label="Premium Balance top ups">
              {[
                ["Add $10", PREMIUM_BALANCE_PACKAGE.PREMIUM_10],
                ["Add $25", PREMIUM_BALANCE_PACKAGE.PREMIUM_25],
                ["Add $50", PREMIUM_BALANCE_PACKAGE.PREMIUM_50],
              ].map(([label, packageKey]) => (
                <button
                  key={packageKey}
                  type="button"
                  onClick={() => handleTopUp(packageKey)}
                  disabled={busy === packageKey}
                  className="account-ledger-button"
                >
                  {busy === packageKey ? <Loader2 className="account-ledger-icon animate-spin" aria-hidden="true" /> : <Plus className="account-ledger-icon" aria-hidden="true" />}
                  {label}
                </button>
              ))}
            </div>
            <p className="account-ledger-detail">
              Premium Balance is prepaid usage credit for supported Premium Direct models. It is not redeemable for cash and is subject to the NexusRBX billing terms.
            </p>
          </section>
          </div>
        </section>

        <section className="account-ledger-section" aria-labelledby="plan-options-title">
          <div className="account-ledger-section-head">
            <div>
              <h2 id="plan-options-title" className="account-ledger-section-title">Choose more room for your builds</h2>
              <p className="account-ledger-section-copy">Compare exact prices here. Active subscribers should use billing settings for controlled plan changes.</p>
            </div>
            <div className="account-ledger-choice-set" aria-label="Billing interval">
              <button
                type="button"
                onClick={() => setIntervalValue(BILLING_INTERVAL.MONTH)}
                aria-pressed={interval === BILLING_INTERVAL.MONTH}
                className="account-ledger-choice"
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setIntervalValue(BILLING_INTERVAL.YEAR)}
                aria-pressed={interval === BILLING_INTERVAL.YEAR}
                className="account-ledger-choice"
              >
                Yearly
              </button>
            </div>
          </div>
          <div className="account-ledger-plan-list">
            {PLAN_CHOICES.map((choice) => (
              <article key={choice.plan} className="account-ledger-plan-row">
                <h3 className="account-ledger-plan-name">{choice.label}</h3>
                <div className="account-ledger-plan-price">{interval === BILLING_INTERVAL.YEAR ? choice.year : choice.month}</div>
                <p className="account-ledger-plan-fit">{choice.fit}</p>
                <div className="account-ledger-plan-action">
                {choice.plan === PLAN.TEAM && (
                  <div className="account-ledger-field-group">
                    <label className="account-ledger-field-label" htmlFor="billing-team-seats">Seats</label>
                    <input
                      id="billing-team-seats"
                      type="number"
                      min="2"
                      max="50"
                      value={teamSeats}
                      onChange={(event) => setTeamSeats(Math.min(50, Math.max(2, Number(event.target.value) || 2)))}
                      className="account-ledger-field"
                    />
                  </div>
                )}
                <button
                  type="button"
                  disabled={busy === choice.plan || entitlements?.plan === choice.plan}
                  onClick={() => handlePlanCheckout(choice.plan)}
                  className="account-ledger-button account-ledger-button--primary"
                >
                  {busy === choice.plan ? <Loader2 className="account-ledger-icon animate-spin" aria-hidden="true" /> : entitlements?.plan === choice.plan ? "Current plan" : `Choose ${choice.label}`}
                </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="account-ledger-section account-ledger-checkout-action" aria-labelledby="billing-support-title">
          <h2 id="billing-support-title" className="account-ledger-record-heading">
            <CreditCard className="account-ledger-icon" aria-hidden="true" />
            Billing settings
          </h2>
          <p className="account-ledger-section-copy">
            Manage payment methods, invoices, billing details, and subscription cancellation through Stripe billing settings.
          </p>
        </section>
      </div>
    </main>
  );
}
