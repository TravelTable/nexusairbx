import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, MessageSquare, FolderOpen, Cpu, ShieldCheck } from "lib/icons";
import { useNavigate } from "react-router-dom";
import { startSubscriptionCheckout } from "../lib/billing";
import { PLAN, BILLING_INTERVAL } from "../lib/prices";
import { trackProductEvent } from "../lib/productAnalytics";

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

  if (!isOpen) return null;

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

  const title = blocking
    ? "Starter unlocks more NexusRBX AI"
    : "Unlock what Free users hit first";
  const description = blocking
    ? "Free Quick Script is available with a quota. Starter adds model selection, saved scripts, more daily AI, and 30-day chat history."
    : "For the price of a Robux pack — more AI, model choice, saved scripts, and a month of history.";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[115] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={blocking ? undefined : onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          className="nexus-page-card relative w-full max-w-lg overflow-hidden"
          role="dialog"
          aria-labelledby="starter-promo-title"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1.5 bg-gradient-to-r from-transparent via-[#00f5d4] to-transparent" />

          {!blocking ? (
            <button
              onClick={onClose}
              aria-label="Close Starter offer"
              className="nexus-icon-button absolute top-5 right-5 rounded-full z-10"
            >
              <X className="w-5 h-5" />
            </button>
          ) : null}

          <div className="p-8 pt-10">
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00f5d4]/15 border border-[#00f5d4]/40 text-[10px] font-black uppercase tracking-widest text-[#00f5d4] animate-pulse">
                {blocking ? "Starter — $2/mo" : "Limited — $2/mo"}
              </span>
            </div>

            <div className="text-center mb-6">
              <div className="flex items-end justify-center gap-2 mb-2">
                <span className="text-5xl font-black text-white leading-none">$2</span>
                <span className="text-sm text-gray-500 mb-1">/month</span>
              </div>
              <h2 id="starter-promo-title" className="text-2xl font-black text-white tracking-tight mb-2">
                {title}
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed max-w-md mx-auto">
                {description}
                {!blocking && dailyUsagePercent != null && dailyUsagePercent >= 70 ? (
                  <span className="block mt-2 text-[#00f5d4] font-semibold">
                    You&apos;ve used {dailyUsagePercent}% of today&apos;s allowance.
                  </span>
                ) : null}
              </p>
            </div>

            {!blocking ? (
              <div className="grid grid-cols-3 gap-2 mb-6 text-center text-[10px] font-bold uppercase tracking-wider">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2 text-gray-500">Free</div>
                <div className="rounded-xl border border-[#00f5d4]/40 bg-[#00f5d4]/10 p-2 text-[#00f5d4]">Starter</div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2 text-[#9b5de5]">Pro</div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <BenefitCard icon={Zap} title="Included AI usage" note="Nexus Auto + model choice" />
              <BenefitCard icon={Cpu} title="Pick your AI model" note="Included models" />
              <BenefitCard icon={MessageSquare} title="30 days of chats" note="Saved workspace history" />
              <BenefitCard icon={FolderOpen} title="3 projects, 2 jobs" note="Build more in parallel" />
            </div>

            <p className="text-[10px] text-gray-500 text-center mb-5 leading-relaxed">
              Icon Generator, Premium Direct, and Studio Agent stay on Pro.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                disabled={checkoutBusy}
                onClick={handleCheckout}
                className="focus-ring w-full py-4 rounded-xl border border-[#00f5d4]/30 bg-[#00f5d4] text-black font-black text-lg shadow-panel transition hover:bg-[#5fffee] disabled:opacity-60"
              >
                {checkoutBusy ? "Starting checkout…" : "Get Starter for $2"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/subscribe?highlight=starter")}
                className="focus-ring w-full py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm font-bold hover:bg-white/10 transition"
              >
                Compare all plans
              </button>
              {!blocking ? (
                <>
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="focus-ring w-full py-2 rounded-xl text-gray-500 hover:text-white text-sm font-bold transition-colors"
                  >
                    Maybe later
                  </button>
                  <button
                    type="button"
                    onClick={onDismissLong}
                    className="text-[10px] text-gray-600 hover:text-gray-400 underline underline-offset-2"
                  >
                    Don&apos;t show again for 2 weeks
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" />
              Cancel anytime · Instant access
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function BenefitCard({ icon: Icon, title, note }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
      <div className="w-9 h-9 rounded-xl bg-[#00f5d4]/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#00f5d4]" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-bold text-white leading-tight">{title}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">{note}</div>
      </div>
    </div>
  );
}
