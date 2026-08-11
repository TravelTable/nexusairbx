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
import {
  editorialDisplayClass,
  editorialGutterClass,
  editorialPanelClass,
  editorialPrimaryButtonClass,
  editorialSecondaryButtonClass,
} from "../components/site/editorialUi";

const PLAN_CHOICES = [
  { plan: PLAN.PRO, label: "Pro", month: "$19.99/month", year: "$199/year" },
  { plan: PLAN.PRO_PLUS, label: "Pro+", month: "$39.99/month", year: "$399/year" },
  { plan: PLAN.TEAM, label: "Team", month: "$29/user/month", year: "$290/user/year" },
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--ds-bg-canvas)] text-[var(--ds-text)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--ds-accent)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--ds-bg-canvas)] px-4 text-center text-[var(--ds-text)]">
        <AlertTriangle className="h-8 w-8 text-[var(--ds-warning)]" />
        <h1 className={`${editorialDisplayClass} mt-5 text-4xl`}>Sign in to manage billing</h1>
        <button className={`${editorialPrimaryButtonClass} mt-8`} onClick={() => navigate("/signin")}>
          Login to Continue
        </button>
      </div>
    );
  }

  const included = entitlements?.includedUsage || {};
  const subscription = entitlements?.subscription || {};
  const premiumBalance = entitlements?.premiumBalance || {};
  const isPaid = [PLAN.STARTER, PLAN.PRO, PLAN.PRO_PLUS, PLAN.TEAM].includes(entitlements?.plan);
  const percentUsed = Number.isFinite(Number(included.percentUsed)) ? Number(included.percentUsed) : 0;
  const percentRemaining = Number.isFinite(Number(included.percentRemaining)) ? Number(included.percentRemaining) : 100;

  return (
    <main className="min-h-screen bg-[var(--ds-bg-canvas)] pb-24 text-[var(--ds-text)]">
      <div className={`${editorialGutterClass} mx-auto max-w-7xl pt-10 sm:pt-14 lg:pt-16`}>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
          onClick={() => window.location.assign("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>

        <div className="mt-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between lg:mt-16">
          <div>
            <h1 className={`${editorialDisplayClass} text-5xl sm:text-6xl`}>Billing</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--ds-text-muted)]">Manage your NexusRBX subscription, Included Usage, and Premium Balance.</p>
          </div>
          <button
            type="button"
            onClick={handlePortal}
            disabled={busy === "portal"}
            className={`${editorialSecondaryButtonClass} gap-2`}
          >
            {busy === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
            Manage subscription
          </button>
        </div>

        {note && (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--ds-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-success)_8%,transparent)] px-4 py-3 text-sm text-[var(--ds-success)]">
            <CheckCircle className="h-4 w-4" />
            {note}
          </div>
        )}
        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--ds-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_8%,transparent)] px-4 py-3 text-sm text-[var(--ds-danger)]">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <section className={`${editorialPanelClass} p-6 sm:p-7`}>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Zap className="h-5 w-5 text-[var(--ds-accent)]" />
              Current plan
            </div>
            <div className="mt-5 text-3xl font-semibold tracking-[-0.025em]">{planLabel(entitlements?.plan)}</div>
            <div className="mt-2 text-sm text-[var(--ds-text-muted)]">
              {isPaid ? `${subscription.interval === "year" ? "Yearly" : "Monthly"} billing` : "Free"}
            </div>
            {subscription.currentPeriodEnd && (
              <div className="mt-3 text-sm text-[var(--ds-text-muted)]">
                Billing period ends {formatDate(subscription.currentPeriodEnd)}
              </div>
            )}
            {subscription.cancelAtPeriodEnd && (
              <div className="mt-3 rounded-lg border border-[color-mix(in_srgb,var(--ds-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-warning)_8%,transparent)] px-3 py-2 text-sm text-[var(--ds-warning)]">
                Cancels at period end
              </div>
            )}
            {entitlements?.grandfathered && (
              <div className="mt-3 rounded-lg border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-3 py-2 text-sm text-[var(--ds-accent)]">
                <div className="font-bold">Legacy {planLabel(entitlements.plan)} pricing</div>
                <div className="mt-1 text-xs">Your current subscription price remains active while this subscription continues.</div>
              </div>
            )}
            {entitlements?.team && (
              <div className="mt-3 text-sm text-[var(--ds-text-muted)]">
                Team seats: <span className="font-semibold text-[var(--ds-text)]">{entitlements.team.seatCount}</span>
              </div>
            )}
          </section>

          <section className={`${editorialPanelClass} p-6 sm:p-7`}>
            <div className="text-lg font-semibold">Included Usage</div>
            <div className="mt-5 text-3xl font-semibold tracking-[-0.025em]">{percentUsed}% used</div>
            <div className="mt-1 text-sm text-[var(--ds-text-muted)]">{percentRemaining}% remaining</div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--ds-fill-active)]">
              <div className="h-full rounded-full bg-[var(--ds-accent)]" style={{ width: `${Math.min(100, Math.max(0, percentUsed))}%` }} />
            </div>
            <div className="mt-3 text-sm text-[var(--ds-text-muted)]">Resets {formatDate(included.resetsAt)}</div>
            {included.warningLevel === "WARNING" && <p className="mt-3 text-sm text-[var(--ds-warning)]">You’ve used 70% of your included usage.</p>}
            {included.warningLevel === "CRITICAL" && (
              <p className="mt-3 text-sm text-[var(--ds-warning)]">You’re almost out of included usage. You can continue with Premium Balance or wait for the reset.</p>
            )}
            {included.warningLevel === "REACHED" && (
              <p className="mt-3 text-sm text-[var(--ds-warning)]">Included usage reached. Continue using Premium Balance, or wait until your usage resets.</p>
            )}
          </section>

          <section className={`${editorialPanelClass} p-6 sm:p-7`}>
            <div className="text-lg font-semibold">Premium Balance</div>
            <div className="mt-5 text-3xl font-semibold tracking-[-0.025em]">{dollarsFromMicros(premiumBalance.balanceMicros)} available</div>
            <p className="mt-2 text-sm text-[var(--ds-text-muted)]">Used for supported Premium Direct models.</p>
            <div className="mt-5 grid grid-cols-3 gap-2">
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
                  className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-[var(--ds-border)] bg-transparent px-2 text-xs font-semibold text-[var(--ds-text)] hover:bg-[var(--ds-fill-hover)]"
                >
                  {busy === packageKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-[var(--ds-text-muted)]">
              Premium Balance is prepaid usage credit for supported Premium Direct models. It is not redeemable for cash and is subject to the NexusRBX billing terms.
            </p>
          </section>
        </div>

        <section className={`${editorialPanelClass} mt-8 p-6 sm:p-8`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Upgrade or change plan</h2>
              <p className="mt-1 text-sm text-[var(--ds-text-muted)]">Active subscribers should use billing settings for controlled plan changes.</p>
            </div>
            <div className="inline-flex w-fit rounded-full bg-[var(--ds-fill-subtle)] p-1">
              <button
                type="button"
                onClick={() => setIntervalValue(BILLING_INTERVAL.MONTH)}
                className={`min-h-11 rounded-full px-5 py-2 text-sm font-semibold ${interval === BILLING_INTERVAL.MONTH ? "bg-[var(--ds-surface-2)] text-[var(--ds-accent)]" : "text-[var(--ds-text-secondary)]"}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setIntervalValue(BILLING_INTERVAL.YEAR)}
                className={`min-h-11 rounded-full px-5 py-2 text-sm font-semibold ${interval === BILLING_INTERVAL.YEAR ? "bg-[var(--ds-surface-2)] text-[var(--ds-accent)]" : "text-[var(--ds-text-secondary)]"}`}
              >
                Yearly
              </button>
            </div>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {PLAN_CHOICES.map((choice) => (
              <div key={choice.plan} className="rounded-[14px] bg-[var(--ds-surface-2)] p-5">
                <div className="font-semibold">{choice.label}</div>
                <div className="mt-1 text-sm text-[var(--ds-text-muted)]">{interval === BILLING_INTERVAL.YEAR ? choice.year : choice.month}</div>
                {choice.plan === PLAN.TEAM && (
                  <div className="mt-3">
                    <label className="text-xs text-[var(--ds-text-muted)]" htmlFor="billing-team-seats">Seats</label>
                    <input
                      id="billing-team-seats"
                      type="number"
                      min="2"
                      max="50"
                      value={teamSeats}
                      onChange={(event) => setTeamSeats(Math.min(50, Math.max(2, Number(event.target.value) || 2)))}
                      className="mt-2 min-h-12 w-full rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface-3)] px-4 py-2 text-sm text-[var(--ds-text)] focus:border-[var(--ds-accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]"
                    />
                  </div>
                )}
                <button
                  type="button"
                  disabled={busy === choice.plan || entitlements?.plan === choice.plan}
                  onClick={() => handlePlanCheckout(choice.plan)}
                  className={`${editorialPrimaryButtonClass} mt-5 w-full px-3`}
                >
                  {busy === choice.plan ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : entitlements?.plan === choice.plan ? "Current plan" : `Choose ${choice.label}`}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-[var(--ds-border-subtle)] py-8">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <CreditCard className="h-5 w-5 text-[var(--ds-accent)]" />
            Billing support
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--ds-text-muted)]">
            Manage payment methods, invoices, billing details, and subscription cancellation through Stripe billing settings.
          </p>
        </section>
      </div>
    </main>
  );
}
