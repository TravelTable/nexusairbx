import React from "react";
import { X, Zap, MessageSquare, FolderOpen, Cpu, ShieldCheck } from "lib/icons";
import { useNavigate } from "react-router-dom";
import { startSubscriptionCheckout } from "../lib/billing";
import { PLAN, BILLING_INTERVAL } from "../lib/prices";
import { trackProductEvent } from "../lib/productAnalytics";
import Modal from "./Modal";

export default function StarterPromoModal({
  isOpen,
  onClose,
  onDismiss,
  onDismissLong,
  trigger = "workspace_visit",
  dailyUsagePercent = null,
  checkoutBusy = false,
  setCheckoutBusy,
  blocking = false,
}) {
  const navigate = useNavigate();

  const handleCheckout = async () => {
    setCheckoutBusy?.(true);
    void trackProductEvent("checkout_started", {
      subscription_plan: "STARTER",
      landing_page: "/ai",
      promo_trigger: trigger,
    });
    try {
      const result = await startSubscriptionCheckout({
        plan: PLAN.STARTER,
        interval: BILLING_INTERVAL.MONTH,
      });
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error("[StarterPromo] checkout failed", err);
      setCheckoutBusy?.(false);
    }
  };

  const title = blocking ? "Starter unlocks more NexusRBX AI" : "Unlock what Free users hit first";
  const description = blocking
    ? "Free includes a fair-use Agent allowance. Starter adds model selection, saved work, more daily AI, and 30-day chat history."
    : "For the price of a Robux pack — more AI, model choice, saved scripts, and a month of history.";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      titleClassName="sr-only"
      panelClassName="max-w-lg overflow-hidden"
      bodyClassName=""
      overlayClassName="z-[115] bg-black/60 p-4"
      closeOnBackdrop={!blocking}
      closeOnEscape={!blocking}
      showCloseButton={false}
    >
      {!blocking ? (
        <button
          onClick={onClose}
          aria-label="Close Starter offer"
          className="nexus-icon-button absolute right-5 top-5 z-10 h-11 w-11 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
      ) : null}

      <div className="p-8 pt-10">
        <div className="flex items-center justify-center gap-3 mb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-2)] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-secondary)]">
            {blocking ? "Starter — $2/mo" : "Limited — $2/mo"}
          </span>
        </div>

        <div className="text-center mb-6">
          <div className="flex items-end justify-center gap-2 mb-2">
            <span className="text-5xl font-black text-[var(--ds-text)] leading-none">$2</span>
            <span className="text-sm text-[var(--ds-text-subtle)] mb-1">/month</span>
          </div>
          <h2 className="text-2xl font-black text-[var(--ds-text)] tracking-tight mb-2">{title}</h2>
          <p className="text-[var(--ds-text-muted)] text-sm leading-relaxed max-w-md mx-auto">
            {description}
            {!blocking && dailyUsagePercent != null && dailyUsagePercent >= 70 ? (
              <span className="block mt-2 text-accent font-semibold">
                You&apos;ve used {dailyUsagePercent}% of today&apos;s allowance.
              </span>
            ) : null}
          </p>
        </div>

        {!blocking ? (
          <div className="grid grid-cols-3 gap-2 mb-6 text-center text-[10px] font-bold uppercase tracking-wider">
            <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-2 text-[var(--ds-text-subtle)]">
              Free
            </div>
            <div className="rounded-xl border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] p-2 text-accent">
              Starter
            </div>
            <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-2 text-[var(--ds-plan)]">
              Pro
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <BenefitCard icon={Zap} title="Included AI usage" note="Nexus Auto + model choice" />
          <BenefitCard icon={Cpu} title="Pick your AI model" note="Included models" />
          <BenefitCard icon={MessageSquare} title="30 days of chats" note="Saved workspace history" />
          <BenefitCard icon={FolderOpen} title="3 projects, 2 jobs" note="Build more in parallel" />
        </div>

        <p className="text-[10px] text-[var(--ds-text-subtle)] text-center mb-5 leading-relaxed">
          Icon Generator, Premium Direct, and Studio Agent stay on Pro.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={checkoutBusy}
            onClick={handleCheckout}
            className="focus-ring min-h-11 w-full rounded-xl border border-[var(--ds-accent-border)] bg-accent py-4 text-lg font-black text-accent-foreground transition-colors hover:bg-[var(--ds-accent-hover)] active:bg-[var(--ds-accent-pressed)] disabled:opacity-60"
          >
            {checkoutBusy ? "Starting checkout…" : "Get Starter for $2"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/subscribe?highlight=starter")}
            className="focus-ring min-h-11 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] py-3 text-sm font-bold text-[var(--ds-text)] transition-colors hover:bg-[var(--ds-fill-hover)]"
          >
            Compare all plans
          </button>
          {!blocking ? (
            <>
              <button
                type="button"
                onClick={onDismiss}
                className="focus-ring min-h-11 w-full rounded-xl py-2 text-sm font-bold text-[var(--ds-text-subtle)] transition-colors hover:text-[var(--ds-text)]"
              >
                Maybe later
              </button>
              <button
                type="button"
                onClick={onDismissLong}
                className="focus-ring min-h-11 w-full rounded-xl px-3 py-2 text-[10px] text-[var(--ds-text-disabled)] underline underline-offset-2 transition-colors hover:text-[var(--ds-text-muted)]"
              >
                Don&apos;t show again for 2 weeks
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="p-4 bg-[var(--ds-fill-subtle)] border-t border-[var(--ds-border-subtle)] text-center">
        <div className="flex items-center justify-center gap-2 text-[10px] font-black text-[var(--ds-text-subtle)] uppercase tracking-widest">
          <ShieldCheck className="w-3 h-3" />
          Cancel anytime · Instant access
        </div>
      </div>
    </Modal>
  );
}

function BenefitCard({ icon: Icon, title, note }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-2)] text-[var(--ds-text-secondary)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-bold text-[var(--ds-text)] leading-tight">{title}</div>
        <div className="text-[10px] text-[var(--ds-text-subtle)] mt-0.5">{note}</div>
      </div>
    </div>
  );
}
