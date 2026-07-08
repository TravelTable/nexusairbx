import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, CreditCard, Loader2, Settings } from "lib/icons";
import NexusRBXFooter from "../components/NexusRBXFooter";
import { getEntitlements, openPortal, startSubscriptionCheckout } from "../lib/billing";
import { formatMoney, SUBSCRIPTION_PLANS } from "../lib/planCatalog";
import { BILLING_INTERVAL, PLAN } from "../lib/prices";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { trackProductEvent } from "../lib/productAnalytics";

const PLANS = SUBSCRIPTION_PLANS;

const FAQS = [
  {
    q: "What is Included Usage?",
    a: "Included Usage is the AI capacity bundled with each paid subscription. Nexus Auto and supported included models draw from this allowance. It resets at the end of each billing period.",
  },
  {
    q: "What is Premium Balance?",
    a: "Premium Balance is prepaid usage credit for supported Premium Direct models. It does not expire automatically and is separate from your subscription’s Included Usage.",
  },
  {
    q: "Can paid users choose their model?",
    a: "Yes. Pro, Pro+ and Team members can choose supported models. Included models use the subscription allowance, while higher-cost Premium Direct models use Premium Balance.",
  },
  {
    q: "What happens when Included Usage runs out?",
    a: "Wait for the next billing-period reset, choose to continue with Premium Balance where supported, or move to a plan with a higher included allowance.",
  },
  {
    q: "Do Team plans share usage?",
    a: "Yes. Team Included Usage and Premium Balance are pooled across the team. The included allowance grows with the number of paid seats.",
  },
  {
    q: "What happens to existing subscribers?",
    a: "Existing subscribers remain on their current Stripe price unless they cancel, change plans or are migrated separately.",
  },
];

function currentPlanMatches(entitlements, planId) {
  return String(entitlements?.plan || "FREE") === planId;
}

export default function SubscribePage() {
  const [interval, setIntervalValue] = useState(BILLING_INTERVAL.MONTH);
  const [seatCount, setSeatCount] = useState(2);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [entitlements, setEntitlements] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [busyPlan, setBusyPlan] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState("");
  const sessionUnsubs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    void trackProductEvent("subscription_viewed", {
      landing_page: "/subscribe",
      subscription_plan: entitlements?.plan || "unknown",
    }, { dedupeKey: "subscribe" });
  }, [entitlements?.plan]);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    getEntitlements({ noCache: true }).then(setEntitlements).catch(() => {});
  }, [authReady, user]);

  useEffect(() => () => {
    sessionUnsubs.current.forEach((unsub) => unsub?.());
    sessionUnsubs.current = [];
  }, []);

  const total = useMemo(() => {
    const teamPlan = PLANS.find((p) => p.id === PLAN.TEAM);
    const unit = interval === BILLING_INTERVAL.YEAR ? teamPlan.yearly : teamPlan.monthly;
    return unit * seatCount;
  }, [interval, seatCount]);

  async function beginCheckout(planId) {
    if (planId === PLAN.FREE) {
      navigate("/ai");
      return;
    }
    if (!user) {
      navigate("/signin", { state: { from: { pathname: "/subscribe" } } });
      return;
    }
    setBusyPlan(planId);
    setError("");
    try {
      const result = await startSubscriptionCheckout({
        plan: planId,
        interval,
        ...(planId === PLAN.TEAM ? { seatCount } : {}),
      });
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      if (result?.sessionDocPath) {
        const unsubscribe = onSnapshot(doc(getFirestore(), result.sessionDocPath), (snap) => {
          const data = snap.data();
          if (data?.url) window.location.href = data.url;
          if (data?.error) setError(data.error.message || "Could not start checkout.");
        });
        sessionUnsubs.current.push(unsubscribe);
      }
    } catch (err) {
      setError(
        err?.code === "ACTIVE_SUBSCRIPTION_EXISTS"
          ? "You already have an active NexusRBX subscription. Manage or change it through billing settings."
          : err?.message || "Could not start checkout."
      );
    } finally {
      setBusyPlan(null);
    }
  }

  async function manageBilling() {
    setPortalLoading(true);
    try {
      const result = await openPortal();
      if (result?.url) window.location.href = result.url;
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-white flex flex-col">
      <main className="flex-1">
        <section className="px-4 pt-10 pb-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">NexusRBX Pricing</h1>
                <p className="mt-3 max-w-2xl text-gray-400">
                  Choose the plan that matches your Roblox development workflow. Paid plans include model selection,
                  Included Usage, and optional Premium Direct access through Premium Balance.
                </p>
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
                  Yearly <span className="ml-1 text-xs text-[#00f5d4]">Save 17%</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-4">
              {PLANS.map((plan) => {
                const unitPrice = interval === BILLING_INTERVAL.YEAR ? plan.yearly : plan.monthly;
                const isCurrent = currentPlanMatches(entitlements, plan.id);
                return (
                  <section
                    key={plan.id}
                    className={`relative rounded-lg border p-5 bg-[#11131a] flex flex-col min-h-[520px] ${
                      plan.recommended ? "border-[#00f5d4]/70" : "border-white/10"
                    }`}
                  >
                    {plan.recommended && (
                      <div className="absolute right-4 top-4 rounded-md bg-[#00f5d4] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-black">
                        Recommended
                      </div>
                    )}
                    <h2 className="text-2xl font-bold">{plan.name}</h2>
                    <p className="mt-1 min-h-[42px] text-sm text-gray-400">{plan.audience}</p>
                    <div className="mt-5">
                      <div className="text-4xl font-black">
                        {formatMoney(unitPrice)}
                        {plan.perSeat && unitPrice > 0 && <span className="text-base font-semibold text-gray-400">/user</span>}
                      </div>
                      {unitPrice > 0 && (
                        <div className="mt-1 text-sm text-gray-500">
                          per {interval === BILLING_INTERVAL.YEAR ? "year" : "month"}
                        </div>
                      )}
                      {plan.id === PLAN.TEAM && (
                        <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3">
                          <label className="text-xs font-bold uppercase tracking-wide text-gray-400" htmlFor="team-seats">
                            Seats: 2 - 50
                          </label>
                          <input
                            id="team-seats"
                            type="number"
                            min="2"
                            max="50"
                            value={seatCount}
                            onChange={(event) => setSeatCount(Math.min(50, Math.max(2, Number(event.target.value) || 2)))}
                            className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white"
                          />
                          <div className="mt-2 text-sm font-bold text-white">
                            {seatCount} seats
                            <span className="ml-2 text-[#00f5d4]">
                              {formatMoney(total)}/{interval === BILLING_INTERVAL.YEAR ? "year" : "month"}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">Minimum 2 users</div>
                        </div>
                      )}
                    </div>
                    <ul className="mt-6 space-y-3 text-sm text-gray-300 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00f5d4]" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      disabled={isCurrent || busyPlan === plan.id}
                      onClick={() => beginCheckout(plan.id)}
                      className={`mt-6 h-11 rounded-md px-4 text-sm font-bold transition ${
                        isCurrent
                          ? "bg-white/5 text-gray-500"
                          : plan.recommended
                            ? "bg-[#00f5d4] text-black hover:bg-[#23ffe0]"
                            : "bg-white text-black hover:bg-gray-200"
                      }`}
                    >
                      {busyPlan === plan.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : isCurrent ? "Current Plan" : plan.cta}
                    </button>
                  </section>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-10 border-y border-white/10 bg-[#0d1017]">
          <div className="max-w-7xl mx-auto grid gap-4 md:grid-cols-3">
            <InfoBlock
              title="Included Usage"
              body="Included Usage powers Nexus Auto and supported economical models. It resets at the end of each subscription billing period."
            />
            <InfoBlock
              title="Premium Direct"
              body="Premium Direct lets paid members choose higher-cost models such as flagship GPT, Claude, Gemini and Grok models. Premium Direct usage is deducted from a prepaid Premium Balance."
            />
            <InfoBlock
              title="Premium Balance"
              body="Premium Balance is prepaid usage credit. Add funds only when you need higher-cost models, and keep full control over spending."
            />
          </div>
        </section>

        {user && entitlements && (
          <section className="px-4 py-10">
            <div className="max-w-4xl mx-auto rounded-lg border border-white/10 bg-[#11131a] p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Current Subscription</div>
                <div className="mt-1 text-2xl font-bold">{entitlements.plan || "FREE"}</div>
                {entitlements.includedUsage && (
                  <div className="mt-1 text-sm text-gray-400">
                    Included Usage: {entitlements.includedUsage.percentUsed || 0}% used
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={manageBilling}
                disabled={portalLoading}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-black"
              >
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                Manage Billing
              </button>
            </div>
          </section>
        )}

        <section className="px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold">Pricing FAQs</h2>
            <div className="mt-6 space-y-3">
              {FAQS.map((faq, index) => (
                <div key={faq.q} className="rounded-lg border border-white/10 bg-[#11131a]">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="flex w-full items-center justify-between gap-4 p-4 text-left font-bold"
                  >
                    {faq.q}
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition ${openFaq === index ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === index && <div className="px-4 pb-4 text-sm leading-6 text-gray-400">{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <NexusRBXFooter
        footerLinks={[
          { id: 1, text: "Terms of Service", href: "/terms" },
          { id: 2, text: "Privacy Policy", href: "/privacy" },
          { id: 3, text: "Contact", href: "/contact" },
          { id: 4, text: "Docs", href: "/docs" },
        ]}
        navigate={navigate}
      />
    </div>
  );
}

function InfoBlock({ title, body }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#141821] p-5">
      <div className="flex items-center gap-2 text-lg font-bold">
        <CreditCard className="h-4 w-4 text-[#00f5d4]" />
        {title}
      </div>
      <p className="mt-3 text-sm leading-6 text-gray-400">{body}</p>
    </div>
  );
}
