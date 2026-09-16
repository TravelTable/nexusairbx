import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getEntitlements, openPortal, startCreditPackCheckout } from "../lib/billing";
import { CREDIT_PACKS, formatMoney } from "../lib/planCatalog";
import { trackProductEvent } from "../lib/productAnalytics";
import TeamBillingPanel from "../components/billing/TeamBillingPanel";
import { Alert, Button } from "../components/ui";
import { CreditCard, Coins, Activity, Clock } from "lib/icons";
import { openAccountLink } from "../lib/workspaceRuntime";
import { formatNexusCredits as credits } from "../lib/creditDenomination";
import "./BillingPage.css";

const legacyDollars = (value) =>
  (Number(value || 0) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 });

function date(value) {
  if (!value) return "Not scheduled";
  const result = new Date(value);
  return Number.isFinite(result.getTime())
    ? result.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "Not scheduled";
}

function planLabel(ent) {
  const tier =
    ent?.plan === "PRO_PLUS"
      ? "Pro+"
      : ent?.plan === "STARTER"
        ? "Starter"
        : ent?.plan === "PRO"
          ? "Pro"
          : ent?.plan === "TEAM"
            ? "Team"
            : "Free";
  const v2 = ent?.catalogVersion === "v2";
  return `${tier}${ent.grandfathered || (!v2 && tier !== "Free") ? " · existing plan" : ""}`;
}

function Panel({ title, description, actions, children }) {
  return (
    <section className="billing-panel">
      {title || description || actions ? (
        <header className="billing-panel-header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="billing-actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="billing-panel-body">{children}</div>
    </section>
  );
}

function HealthTile({ icon: Icon, label, value, detail }) {
  return (
    <div className="billing-health">
      <span className="billing-health__icon">
        <Icon aria-hidden="true" />
      </span>
      <div className="billing-health__copy">
        <span className="billing-health__label">{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [ent, setEnt] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(
    () =>
      onAuthStateChanged(getAuth(), (account) => {
        setUser(account);
        setEnt(null);
        setReady(true);
      }),
    []
  );

  useEffect(() => {
    if (!user) return undefined;
    let canceled = false;
    setError("");
    getEntitlements({ noCache: true })
      .then((value) => {
        if (!canceled) setEnt(value);
      })
      .catch((e) => {
        if (!canceled) setError(e.message || "Billing could not be loaded.");
      });
    return () => {
      canceled = true;
    };
  }, [user, reload]);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("checkout");
    if (result) void trackProductEvent("checkout_returned", { checkout_result: result });
  }, []);

  async function open(action, id) {
    setBusy(id);
    setError("");
    try {
      const result = await action();
      if (!result.url) throw new Error("Billing is still being prepared. Please retry shortly.");
      if (id === "portal") void trackProductEvent("billing_portal_opened", {});
      await openAccountLink(result.url);
      setBusy("");
    } catch (e) {
      setError(e.message || "Could not open Stripe.");
      setBusy("");
    }
  }

  const v2 = ent?.catalogVersion === "v2";
  const sub = ent?.subscription;
  const returned =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("checkout") === "success";
  const badge = ent ? planLabel(ent) : "";
  const tier = badge.replace(/ · existing plan$/, "");
  const subscribed = Boolean(sub?.status) || (tier && tier !== "Free");
  const portalButton = (
    <Button
      type="button"
      disabled={Boolean(busy)}
      loading={busy === "portal"}
      loadingLabel="Opening…"
      onClick={() => open(openPortal, "portal")}
    >
      Payment details, invoices, and cancellation
    </Button>
  );
  const plansLink = (
    <a className="nx-control nx-text-action" href="/pricing">
      View plans
    </a>
  );

  return (
    <main id="main-content" className="billing-page">
      <div className="billing-wrap">
        <header className="billing-header">
          <div className="billing-header-copy">
            <h1>Billing and credits</h1>
            {ent ? (
              <span className="billing-plan-badge" aria-label="Current plan">
                {badge}
              </span>
            ) : null}
            {ent ? (
              <p className="billing-scope">
                Your {ent.billingScope?.type === "team" ? "Team workspace" : "personal account"} is the billing scope
                shown here.
              </p>
            ) : null}
          </div>
          {ent ? <div className="billing-actions">{subscribed ? portalButton : plansLink}</div> : null}
        </header>

        {!ready ? (
          <p role="status">Loading your account…</p>
        ) : !user ? (
          <p>
            <a href="/signin?next=/billing">Sign in</a> to see your plan and credits.
          </p>
        ) : (
          <>
            {returned ? (
              <Alert tone="success" title="Returned from checkout" actions={
                <Button type="button" variant="secondary" onClick={() => setReload((n) => n + 1)}>
                  Refresh billing
                </Button>
              }>
                Your balance updates after Stripe confirms payment.
              </Alert>
            ) : null}
            {error ? (
              <Alert tone="danger" title="Billing could not be loaded" actions={
                <Button type="button" variant="secondary" onClick={() => setReload((n) => n + 1)}>
                  Retry
                </Button>
              }>
                {error}
              </Alert>
            ) : null}
            {!ent && !error ? <p role="status">Loading billing…</p> : null}
            {ent ? (
              <>
                <div className="billing-kpis">
                  <HealthTile
                    icon={CreditCard}
                    label={v2 ? "Included remaining" : "Existing allowance"}
                    value={
                      v2
                        ? credits(ent.includedCredits?.remainingMicros) +
                          " remaining of " +
                          credits(ent.includedCredits?.limitMicros)
                        : ent.plan === "FREE" || !ent.plan
                          ? "Free Auto · daily fair-use limits apply"
                          : "$" + legacyDollars(ent.includedUsage?.remainingMicros) + " included usage remaining"
                    }
                    detail={v2 ? "Included Nexus Credits" : "Existing allowance"}
                  />
                  <HealthTile
                    icon={Coins}
                    label={v2 ? "Purchased" : "Premium Balance"}
                    value={
                      v2
                        ? credits(ent.purchasedCredits?.remainingMicros) + " · no expiration"
                        : "$" + legacyDollars(ent.premiumBalance?.balanceMicros) + " · preserved"
                    }
                    detail={v2 ? "Purchased Nexus Credits" : "Preserved balance"}
                  />
                  {v2 ? (
                    <HealthTile
                      icon={Activity}
                      label="Total"
                      value={credits(ent.totalAvailableCreditsMicros) + " Nexus Credits"}
                      detail="Available now"
                    />
                  ) : null}
                  <HealthTile
                    icon={Clock}
                    label="Next refresh"
                    value={
                      ent.usageWindow?.type === "rolling_30_days"
                        ? "Rolling 30 days · usage becomes available as it ages out"
                        : date(ent.refreshAt || ent.includedUsage?.resetsAt || ent.dailyUsage?.resetsAt)
                    }
                    detail="Included credits"
                  />
                </div>

                <Panel
                  title="Subscription"
                  description="Stripe remains the source for payment methods, invoices, and cancellation."
                  actions={subscribed ? plansLink : portalButton}
                >
                  {sub?.status === "past_due" ? (
                    <Alert tone="danger">
                      Payment needs attention.{" "}
                      {sub.graceEndsAt
                        ? "Recovery access ends " + date(sub.graceEndsAt) + "."
                        : "Update your payment method to restore your subscription."}
                    </Alert>
                  ) : null}
                  {sub?.cancelAtPeriodEnd ? (
                    <Alert tone="warning">
                      Canceled for renewal. Access continues until {date(sub.currentPeriodEnd)}.
                    </Alert>
                  ) : null}
                  {v2 && ent.warningLevel ? (
                    <p role="status" className="billing-note">
                      {ent.warningLevel}% of your included credits have been consumed. Purchased credits are used next;
                      there is no automatic top-up.
                    </p>
                  ) : null}
                  <dl className="billing-rows">
                    <div>
                      <dt>Status</dt>
                      <dd>{sub?.status || "No active subscription"}</dd>
                    </div>
                    <div>
                      <dt>Renewal</dt>
                      <dd>
                        {sub?.cancelAtPeriodEnd ? "Not renewing" : date(sub?.currentPeriodEnd)}
                        {sub?.interval === "year"
                          ? " · annual payment"
                          : sub?.interval === "month"
                            ? " · monthly payment"
                            : ""}
                      </dd>
                    </div>
                  </dl>
                </Panel>

                {v2 && tier !== "Free" ? (
                  <Panel
                    title="Credit packs"
                    description="One-time purchases. Included credits are consumed first; purchased credits never expire and are not redeemable for cash."
                  >
                    <div className="billing-packs">
                      {CREDIT_PACKS.map((pack) => (
                        <article className="billing-pack" key={pack.id}>
                          <h3>{pack.name}</h3>
                          <p className="billing-pack-price">{formatMoney(pack.price)}</p>
                          <p>{pack.displayCreditsLabel} credits</p>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={Boolean(busy)}
                            loading={busy === pack.id}
                            loadingLabel="Opening…"
                            onClick={() => open(() => startCreditPackCheckout({ creditPack: pack.id }), pack.id)}
                          >
                            {pack.name} · {pack.displayCreditsLabel} credits · {formatMoney(pack.price)}
                          </Button>
                        </article>
                      ))}
                    </div>
                    <p className="billing-note">USD, plus applicable tax. Confirm your final total on Stripe.</p>
                  </Panel>
                ) : null}

                <Panel>
                  <details className="billing-disclosure">
                    <summary>How credits work</summary>
                    <p>
                      Credits meter AI usage rather than messages. Request size, project context, output length and
                      model choice all affect the charge, so Nexus does not promise a fixed number of generations.
                    </p>
                    <p>
                      Included credits refresh monthly and do not roll over. Purchased credits do not expire. There is
                      no automatic top-up.
                    </p>
                  </details>
                </Panel>

                <TeamBillingPanel />
              </>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
