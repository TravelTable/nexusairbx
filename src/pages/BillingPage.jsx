import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getEntitlements, openPortal, startCreditPackCheckout } from "../lib/billing";
import { CREDIT_PACKS, formatMoney } from "../lib/planCatalog";
import { trackProductEvent } from "../lib/productAnalytics";
import CreditExplainer from "../components/billing/CreditExplainer";
import TeamBillingPanel from "../components/billing/TeamBillingPanel";
import { openAccountLink } from '../lib/workspaceRuntime';
import "./AccountLedger.css";

const credits = value => (Number(value || 0)/1e6).toLocaleString(undefined, { maximumFractionDigits: 2 });
function date(value) {
  if (!value) return "Not scheduled";
  const result = new Date(value);
  return Number.isFinite(result.getTime()) ? result.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "Not scheduled";
}
export default function BillingPage() {
  const [user, setUser] = useState(null), [ready, setReady] = useState(false);
  const [ent, setEnt] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => onAuthStateChanged(getAuth(), account => {
    setUser(account); setEnt(null); setReady(true);
  }), []);
  useEffect(() => {
    if (!user) return undefined;
    let canceled = false;
    setError("");
    getEntitlements({ noCache: true }).then(value => { if (!canceled) setEnt(value); })
      .catch(e => { if (!canceled) setError(e.message || "Billing could not be loaded."); });
    return () => { canceled = true; };
  }, [user, reload]);
  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("checkout");
    if (result) void trackProductEvent("checkout_returned", { checkout_result: result });
  }, []);
  async function open(action, id) {
    setBusy(id); setError("");
    try {
      const result = await action();
      if (!result.url) throw new Error("Billing is still being prepared. Please retry shortly.");
      if (id === "portal") void trackProductEvent("billing_portal_opened", {});
      await openAccountLink(result.url);
      setBusy('');
    } catch (e) { setError(e.message || "Could not open Stripe."); setBusy(""); }
  }
  const v2 = ent?.catalogVersion === "v2", sub = ent?.subscription;
  const returned = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("checkout") === "success";
  const tier = ent?.plan === "PRO_PLUS" ? "Pro+" : ent?.plan === "STARTER" ? "Starter" : ent?.plan === "PRO" ? "Pro" : ent?.plan === "TEAM" ? "Team" : "Free";
  return <main id="main-content" className="account-ledger-page">
    <div className="account-ledger-wrap account-ledger-wrap--narrow">
      <p className="account-ledger-kicker">Your account</p><h1 className="account-ledger-title">Billing and credits</h1>
      {!ready ? <p role="status">Loading your account…</p> : !user ? <p><a href="/signin?next=/billing">Sign in</a> to see your plan and credits.</p> : <>
        {returned && <p className="account-ledger-notice" role="status">You have returned from checkout. Your balance updates after Stripe confirms payment. <button type="button" onClick={() => setReload(n => n+1)}>Refresh billing</button></p>}
        {error && <p role="alert" className="account-ledger-notice account-ledger-notice--danger">{error} <button type="button" onClick={() => setReload(n => n+1)}>Retry</button></p>}
        {!ent && !error && <p role="status">Loading billing…</p>}
        {ent && <>
          <h2>{tier}{ent.grandfathered || (!v2 && tier !== "Free") ? " · existing plan" : ""}</h2>
          <p>Your {ent.billingScope?.type === "team" ? "Team workspace" : "personal account"} is the billing scope shown here.</p>
          {sub?.status === "past_due" && <p role="alert" className="account-ledger-notice">Payment needs attention. {sub.graceEndsAt ? "Recovery access ends " + date(sub.graceEndsAt) + "." : "Update your payment method to restore your subscription."}</p>}
          {sub?.cancelAtPeriodEnd && <p className="account-ledger-notice">Canceled for renewal. Access continues until {date(sub.currentPeriodEnd)}.</p>}
          <dl className="account-ledger-charge-record">
            <div className="account-ledger-charge-row"><dt>{v2 ? "Included Nexus Credits" : "Existing allowance"}</dt>
              <dd>{v2 ? credits(ent.includedCredits?.remainingMicros) + " remaining of " + credits(ent.includedCredits?.limitMicros) : tier === "Free" ? "Free Auto · daily fair-use limits apply" : "$" + credits(ent.includedUsage?.remainingMicros) + " included usage remaining"}</dd></div>
            <div className="account-ledger-charge-row"><dt>{v2 ? "Purchased Nexus Credits" : "Premium Balance"}</dt><dd>{v2 ? credits(ent.purchasedCredits?.remainingMicros) + " · no expiration" : "$" + credits(ent.premiumBalance?.balanceMicros) + " · preserved"}</dd></div>
            {v2 && <div className="account-ledger-charge-row"><dt>Total available</dt><dd>{credits(ent.totalAvailableCreditsMicros)} Nexus Credits</dd></div>}
            <div className="account-ledger-charge-row"><dt>Next credit refresh</dt><dd>{ent.usageWindow?.type === "rolling_30_days" ? "Rolling 30 days · usage becomes available as it ages out" : date(ent.refreshAt || ent.includedUsage?.resetsAt || ent.dailyUsage?.resetsAt)}</dd></div>
            <div className="account-ledger-charge-row"><dt>Subscription renewal</dt><dd>{sub?.cancelAtPeriodEnd ? "Not renewing" : date(sub?.currentPeriodEnd)}{sub?.interval === "year" ? " · annual payment" : sub?.interval === "month" ? " · monthly payment" : ""}</dd></div>
          </dl>
          {v2 && ent.warningLevel && <p role="status" className="account-ledger-notice">{ent.warningLevel}% of your included credits have been consumed. Purchased credits are used next; there is no automatic top-up.</p>}
          <div className="account-ledger-inline-actions">
            <button type="button" className="account-ledger-button" disabled={Boolean(busy)} onClick={() => open(openPortal, "portal")}>{busy === "portal" ? "Opening…" : "Payment details, invoices, and cancellation"}</button>
            <a className="account-ledger-link" href="/pricing">View plans</a>
          </div>
          {v2 && tier !== "Free" && <section aria-labelledby="credit-pack-title">
            <h2 id="credit-pack-title">Extra room for your next build</h2>
            <p>One-time purchases. Included credits are consumed first; purchased credits never expire and are not redeemable for cash.</p>
            <div className="account-ledger-inline-actions">{CREDIT_PACKS.map(pack =>
              <button key={pack.id} type="button" className="account-ledger-button" disabled={Boolean(busy)}
                onClick={() => open(() => startCreditPackCheckout({ creditPack: pack.id }), pack.id)}>
                {pack.name} · {pack.credits} credits · {formatMoney(pack.price)}
              </button>)}</div>
            <p className="account-ledger-detail">USD, plus applicable tax. Confirm your final total on Stripe.</p>
          </section>}
          <CreditExplainer />
          <TeamBillingPanel />
        </>}
      </>}
    </div>
  </main>;
}
