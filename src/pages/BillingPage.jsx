import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle, CreditCard, Loader2, Plus, Settings, Zap } from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  getEntitlements,
  openPortal,
  startPremiumBalanceCheckout,
  startSubscriptionCheckout,
} from "../lib/billing";
import { BILLING_INTERVAL, PLAN, PREMIUM_BALANCE_PACKAGE } from "../lib/prices";
import { trackProductEvent } from "../lib/productAnalytics";

const PLAN_CHOICES = [
  { plan: PLAN.PRO, label: "Pro", month: "$19.99/month", year: "$199/year" },
  { plan: PLAN.PRO_PLUS, label: "Pro+", month: "$39.99/month", year: "$399/year" },
  { plan: PLAN.TEAM, label: "Team", month: "$29/user/month", year: "$290/user/year" },
];

function dollarsFromMicros(micros) {
  const value = Math.max(0, Number(micros || 0)) / 1_000_000;
  return `$${value.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function planLabel(plan) {
  if (plan === PLAN.PRO_PLUS) return "Pro+";
  if (plan === PLAN.PRO) return "Pro";
  if (plan === PLAN.TEAM) return "Team";
  return "Free";
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
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      if (process.env.NODE_ENV === "test" && typeof window !== "undefined" && window.__NEXUSRBX_TEST_ENTITLEMENTS) {
        setEntitlements(window.__NEXUSRBX_TEST_ENTITLEMENTS);
        return;
      }
      setEntitlements(await getEntitlements({ noCache: true }));
    } catch (err) {
      setError(err?.message || "Could not load billing info.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setLoading(false);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user]);

  useEffect(() => () => {
    unsubRef.current.forEach((unsub) => unsub?.());
    unsubRef.current = [];
  }, []);

  async function handlePortal() {
    setBusy("portal");
    setError("");
    try {
      const result = await openPortal();
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      if (result?.portalDocPath) {
        const unsub = onSnapshot(doc(getFirestore(), result.portalDocPath), (snap) => {
          const data = snap.data();
          if (data?.url) window.location.href = data.url;
          if (data?.error) setError(data.error.message || "Could not open billing portal.");
        });
        unsubRef.current.push(unsub);
      }
    } catch (err) {
      setError(err?.message || "Could not open billing portal.");
    } finally {
      setBusy("");
    }
  }

  async function handlePlanCheckout(plan) {
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
        const unsub = onSnapshot(doc(getFirestore(), result.sessionDocPath), (snap) => {
          const data = snap.data();
          if (data?.url) window.location.href = data.url;
          if (data?.error) setError(data.error.message || "Could not start checkout.");
        });
        unsubRef.current.push(unsub);
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
        const unsub = onSnapshot(doc(getFirestore(), result.sessionDocPath), (snap) => {
          const data = snap.data();
          if (data?.url) window.location.href = data.url;
          if (data?.error) setError(data.error.message || "Could not start checkout.");
        });
        unsubRef.current.push(unsub);
      }
    } catch (err) {
      setError(err?.message || "Could not start Premium Balance checkout.");
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090d] text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00f5d4]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#08090d] text-white flex flex-col items-center justify-center px-4 text-center">
        <AlertTriangle className="h-8 w-8 text-yellow-400" />
        <h1 className="mt-4 text-2xl font-bold">Sign in to manage billing</h1>
        <button className="mt-6 rounded-md bg-white px-5 py-2 font-bold text-black" onClick={() => navigate("/signin")}>
          Login to Continue
        </button>
      </div>
    );
  }

  const included = entitlements?.includedUsage || {};
  const subscription = entitlements?.subscription || {};
  const premiumBalance = entitlements?.premiumBalance || {};
  const isPaid = [PLAN.PRO, PLAN.PRO_PLUS, PLAN.TEAM].includes(entitlements?.plan);
  const percentUsed = Number.isFinite(Number(included.percentUsed)) ? Number(included.percentUsed) : 0;
  const percentRemaining = Number.isFinite(Number(included.percentRemaining)) ? Number(included.percentRemaining) : 100;

  return (
    <div className="min-h-screen bg-[#08090d] text-white pb-16">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-gray-400 hover:text-white"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold">Billing</h1>
            <p className="mt-2 text-gray-400">Manage your NexusRBX subscription, Included Usage, and Premium Balance.</p>
          </div>
          <button
            type="button"
            onClick={handlePortal}
            disabled={busy === "portal"}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-black"
          >
            {busy === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
            Manage subscription
          </button>
        </div>

        {note && (
          <div className="mt-5 flex items-center gap-2 rounded-md border border-[#00f5d4]/30 bg-[#00f5d4]/10 px-4 py-3 text-sm text-[#b8fff4]">
            <CheckCircle className="h-4 w-4" />
            {note}
          </div>
        )}
        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <section className="rounded-lg border border-white/10 bg-[#11131a] p-5">
            <div className="flex items-center gap-2 text-lg font-bold">
              <Zap className="h-5 w-5 text-[#00f5d4]" />
              Current plan
            </div>
            <div className="mt-5 text-3xl font-black">{planLabel(entitlements?.plan)}</div>
            <div className="mt-2 text-sm text-gray-400">
              {isPaid ? `${subscription.interval === "year" ? "Yearly" : "Monthly"} billing` : "Free"}
            </div>
            {subscription.currentPeriodEnd && (
              <div className="mt-3 text-sm text-gray-400">
                Billing period ends {formatDate(subscription.currentPeriodEnd)}
              </div>
            )}
            {subscription.cancelAtPeriodEnd && (
              <div className="mt-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
                Cancels at period end
              </div>
            )}
            {entitlements?.grandfathered && (
              <div className="mt-3 rounded-md border border-[#00f5d4]/30 bg-[#00f5d4]/10 px-3 py-2 text-sm text-[#b8fff4]">
                <div className="font-bold">Legacy {planLabel(entitlements.plan)} pricing</div>
                <div className="mt-1 text-xs">Your current subscription price remains active while this subscription continues.</div>
              </div>
            )}
            {entitlements?.team && (
              <div className="mt-3 text-sm text-gray-400">
                Team seats: <span className="font-bold text-white">{entitlements.team.seatCount}</span>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-white/10 bg-[#11131a] p-5">
            <div className="text-lg font-bold">Included Usage</div>
            <div className="mt-5 text-3xl font-black">{percentUsed}% used</div>
            <div className="mt-1 text-sm text-gray-400">{percentRemaining}% remaining</div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#00f5d4]" style={{ width: `${Math.min(100, Math.max(0, percentUsed))}%` }} />
            </div>
            <div className="mt-3 text-sm text-gray-400">Resets {formatDate(included.resetsAt)}</div>
            {included.warningLevel === "WARNING" && <p className="mt-3 text-sm text-yellow-100">You’ve used 70% of your included usage.</p>}
            {included.warningLevel === "CRITICAL" && (
              <p className="mt-3 text-sm text-yellow-100">You’re almost out of included usage. You can continue with Premium Balance or wait for the reset.</p>
            )}
            {included.warningLevel === "REACHED" && (
              <p className="mt-3 text-sm text-yellow-100">Included usage reached. Continue using Premium Balance, or wait until your usage resets.</p>
            )}
          </section>

          <section className="rounded-lg border border-white/10 bg-[#11131a] p-5">
            <div className="text-lg font-bold">Premium Balance</div>
            <div className="mt-5 text-3xl font-black">{dollarsFromMicros(premiumBalance.balanceMicros)} available</div>
            <p className="mt-2 text-sm text-gray-400">Used for supported Premium Direct models.</p>
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
                  className="inline-flex h-10 items-center justify-center gap-1 rounded-md bg-white text-xs font-bold text-black hover:bg-gray-200"
                >
                  {busy === packageKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-gray-500">
              Premium Balance is prepaid usage credit for supported Premium Direct models. It is not redeemable for cash and is subject to the NexusRBX billing terms.
            </p>
          </section>
        </div>

        <section className="mt-6 rounded-lg border border-white/10 bg-[#11131a] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Upgrade or change plan</h2>
              <p className="mt-1 text-sm text-gray-400">Active subscribers should use billing settings for controlled plan changes.</p>
            </div>
            <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1 w-fit">
              <button
                type="button"
                onClick={() => setIntervalValue(BILLING_INTERVAL.MONTH)}
                className={`px-4 py-2 rounded-md text-sm font-bold ${interval === BILLING_INTERVAL.MONTH ? "bg-white text-black" : "text-gray-300"}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setIntervalValue(BILLING_INTERVAL.YEAR)}
                className={`px-4 py-2 rounded-md text-sm font-bold ${interval === BILLING_INTERVAL.YEAR ? "bg-white text-black" : "text-gray-300"}`}
              >
                Yearly
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {PLAN_CHOICES.map((choice) => (
              <div key={choice.plan} className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="font-bold">{choice.label}</div>
                <div className="mt-1 text-sm text-gray-400">{interval === BILLING_INTERVAL.YEAR ? choice.year : choice.month}</div>
                {choice.plan === PLAN.TEAM && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-500" htmlFor="billing-team-seats">Seats</label>
                    <input
                      id="billing-team-seats"
                      type="number"
                      min="2"
                      max="50"
                      value={teamSeats}
                      onChange={(event) => setTeamSeats(Math.min(50, Math.max(2, Number(event.target.value) || 2)))}
                      className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    />
                  </div>
                )}
                <button
                  type="button"
                  disabled={busy === choice.plan || entitlements?.plan === choice.plan}
                  onClick={() => handlePlanCheckout(choice.plan)}
                  className="mt-4 w-full rounded-md bg-white px-3 py-2 text-sm font-bold text-black disabled:bg-white/10 disabled:text-gray-500"
                >
                  {busy === choice.plan ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : entitlements?.plan === choice.plan ? "Current plan" : `Choose ${choice.label}`}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-white/10 bg-[#11131a] p-5">
          <div className="flex items-center gap-2 text-lg font-bold">
            <CreditCard className="h-5 w-5 text-[#00f5d4]" />
            Billing support
          </div>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Manage payment methods, invoices, billing details, and subscription cancellation through Stripe billing settings.
          </p>
        </section>
      </div>
    </div>
  );
}
