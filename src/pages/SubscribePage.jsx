import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Home,
  Check,
  CreditCard,
  Shield,
  Zap,
  Code,
  Settings,
  Users,
  BookOpen,
  ChevronDown,
  Sparkles,
  Loader2,
  AlertTriangle,
  DollarSign,
  ExternalLink,
  ArrowUpRight,
  CheckCircle,
  Lock,
  ArrowRight,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NexusRBXHeader from "../components/NexusRBXHeader";
import NexusRBXFooter from "../components/NexusRBXFooter";
import { getEntitlements, startCheckout, openPortal } from "../lib/billing";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { PRICE } from "../lib/prices";

// PAYG tokens by price ID
const PAYG_TOKENS_BY_PRICE_ID = {
  [PRICE.payg.pack100k]: 100000,
  [PRICE.payg.pack500k]: 500000,
  [PRICE.payg.pack1m]: 1000000,
};

// Subscription plan definitions
const plans = [
  {
    id: "free",
    name: "Free",
    description: "For hobbyists and beginners",
    monthlyUSD: 0,
    yearlyUSD: 0,
    tokenAllowancePM: 50_000,
    approxScriptsPM: "~30 short scripts",
    features: [
      { text: "AI script generation (basic model)", included: true },
      { text: "Daily throttle & 1k min tokens/request", included: true },
      { text: "Community support", included: true },
      { text: "Script history (7 days)", included: true },
      { text: "GPT‑4.1 access", included: false },
      { text: "Custom templates", included: false },
      { text: "Priority support", included: false },
    ],
    cta: "Get Started",
    popular: false,
    highlight: false,
    stripePriceId: null,
    color: "from-gray-500 to-gray-700",
  },
  {
    id: "pro",
    name: "Pro",
    description: "For serious Roblox developers",
    monthlyUSD: 14.99,
    yearlyUSD: 133.99,
    tokenAllowancePM: 500_000,
    approxScriptsPM: "~70–100 medium scripts",
    features: [
      { text: "GPT‑4.1 script generation", included: true },
      { text: "500k tokens / month (resets)", included: true },
      { text: "Advanced simulation", included: true },
      { text: "Email support", included: true },
      { text: "Script history (unlimited)", included: true },
      { text: "Custom templates (up to 10)", included: true },
      { text: "Roblox Studio plugin", included: true },
      { text: "API access (rate‑limited)", included: true },
    ],
    cta: "Upgrade to Pro",
    popular: true,
    highlight: true,
    stripePriceId: (cycle) =>
      cycle === "monthly" ? PRICE.sub.proMonthly : PRICE.sub.proYearly,
    color: "from-[#9b5de5] to-[#00f5d4]",
  },
  {
    id: "team",
    name: "Team",
    description: "For development teams",
    monthlyUSD: 49.99,
    yearlyUSD: 449.91,
    tokenAllowancePM: 1_500_000,
    approxScriptsPM: "~200–300 medium scripts",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Up to 5 seats included", included: true },
      { text: "Team collaboration tools", included: true },
      { text: "Priority support", included: true },
      { text: "Custom templates (unlimited)", included: true },
      { text: "Full API access", included: true },
      { text: "Optional custom fine‑tuning add‑on", included: true },
      { text: "Dedicated account manager (add‑on)", included: false },
    ],
    cta: "Upgrade to Team",
    popular: false,
    highlight: false,
    stripePriceId: (cycle) =>
      cycle === "monthly" ? PRICE.sub.teamMonthly : PRICE.sub.teamYearly,
    color: "from-[#00f5d4] to-[#9b5de5]",
  },
];

const faqs = [
  {
    id: "billing",
    question: "How does billing work?",
    answer:
      "Choose a monthly or annual subscription; token allowance resets monthly. You can also buy Pay‑As‑You‑Go packs that never expire.",
  },
  {
    id: "tokens",
    question: "What are tokens and how are they used?",
    answer:
      "We meter GPT‑4.1 input + output tokens. Each request deducts the exact tokens used, with a 1,000‑token minimum per request to prevent abuse.",
  },
  {
    id: "allowance",
    question: "What happens if I run out of tokens?",
    answer:
      "You can either wait for your monthly reset or buy a Pay‑As‑You‑Go pack to top up instantly.",
  },
  {
    id: "rollover",
    question: "Do unused subscription tokens roll over?",
    answer:
      "No rollover on subscriptions. PAYG packs never expire and stack with your subscription.",
  },
  {
    id: "refunds",
    question: "Can I cancel or get a refund?",
    answer:
      "Cancel anytime. Pro-rated refunds aren’t available during an active billing period.",
  },
  {
    id: "api",
    question: "Is API access included?",
    answer:
      "Pro includes rate‑limited API access with your token balance. Team increases limits and supports service accounts.",
  },
];

const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || process.env.VITE_API_ORIGIN;

export default function SubscribePage() {
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [showFaq, setShowFaq] = useState({});
  const [user, setUser] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [checkoutState, setCheckoutState] = useState("idle");
  const [portalLoading, setPortalLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [entitlements, setEntitlements] = useState(null);
  const [entStatus, setEntStatus] = useState("loading");

  const navigate = useNavigate();
  const sessionUnsubs = useRef([]);
  const portalUnsubs = useRef([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const refreshEntitlements = useCallback(async () => {
    if (!user) {
      setEntStatus("ready");
      return;
    }
    setEntStatus("loading");
    try {
      const apiEnt = await getEntitlements({ noCache: true });
      setEntitlements({
        plan: apiEnt.plan || "FREE",
        cycle: apiEnt.cycle || null,
        limit: apiEnt?.sub?.limit || 0,
        used: apiEnt?.sub?.used || 0,
        subRemaining: Math.max(0, (apiEnt?.sub?.limit || 0) - (apiEnt?.sub?.used || 0)),
        paygRemaining: apiEnt?.payg?.remaining || 0,
        resetsAt: apiEnt?.sub?.resetsAt || null,
      });
      setEntStatus("ready");
    } catch (e) {
      setEntStatus("error");
      setError(e.message);
    }
  }, [user]);

  useEffect(() => {
    if (authReady) refreshEntitlements();
  }, [authReady, refreshEntitlements]);

  const handleCheckout = async (priceId, mode) => {
    if (!user) {
      navigate("/signin", { state: { from: { pathname: "/subscribe" } } });
      return;
    }
    setCheckoutState("starting");
    try {
      const r = await startCheckout(priceId, mode);
      if (r?.url) {
        window.location.href = r.url;
        return;
      }
      if (r?.sessionDocPath) {
        const db = getFirestore();
        const unsub = onSnapshot(doc(db, r.sessionDocPath), (snap) => {
          const data = snap.data();
          if (data?.url) window.location.href = data.url;
          if (data?.error) {
            setError(data.error.message);
            setCheckoutState("error");
          }
        });
        sessionUnsubs.current.push(unsub);
      }
    } catch (e) {
      setError(e.message);
      setCheckoutState("error");
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const r = await openPortal();
      if (r?.url) {
        window.location.href = r.url;
      } else if (r?.portalDocPath) {
        const db = getFirestore();
        const unsub = onSnapshot(doc(db, r.portalDocPath), (snap) => {
          const data = snap.data();
          if (data?.url) window.location.href = data.url;
        });
        portalUnsubs.current.push(unsub);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setPortalLoading(false);
    }
  };

  const toggleFaq = (id) => setShowFaq((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col relative overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#9b5de5]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00f5d4]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      
      <NexusRBXHeader
        navLinks={[
          { id: 1, text: "Home", href: "/", icon: Home },
          { id: 2, text: "AI Console", href: "/ai" },
          { id: 3, text: "Docs", href: "/docs", icon: BookOpen },
          { id: 4, text: "Contact", href: "/contact" },
        ]}
        navigate={navigate}
        user={user}
        tokenInfo={entitlements}
      />

      <main className="flex-grow relative z-10">
        {/* Hero Section */}
        <section className="pt-12 pb-8 px-4">
          <div className="max-w-5xl mx-auto text-center space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#00f5d4] text-xs font-bold"
            >
              <Sparkles className="w-3 h-3" />
              <span>Simple, Usage-Based Pricing</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-black tracking-tight"
            >
              Build Faster with <br />
              <span className="bg-gradient-to-r from-[#9b5de5] via-[#00f5d4] to-[#9b5de5] text-transparent bg-clip-text bg-[length:200%_auto] animate-[shimmer_4s_linear_infinite]">
                Nexus Premium
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed"
            >
              Unlock the full potential of AI-powered Roblox development. Choose the plan that fits your workflow.
            </motion.p>

            {/* Billing Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center gap-4 pt-8"
            >
              <div className="bg-white/5 p-1.5 rounded-2xl border border-white/10 flex items-center gap-1">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${
                    billingCycle === "monthly"
                      ? "bg-white text-black shadow-xl"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                    billingCycle === "yearly"
                      ? "bg-white text-black shadow-xl"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Yearly
                  <span className="px-2 py-0.5 rounded-md bg-[#00f5d4] text-black text-[10px] font-black uppercase">
                    Save 25%
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-24 px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, idx) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                cycle={billingCycle}
                delay={idx * 0.1}
                isCurrent={entitlements?.plan === plan.id.toUpperCase()}
                onSelect={() => {
                  const pid = typeof plan.stripePriceId === "function" 
                    ? plan.stripePriceId(billingCycle) 
                    : plan.stripePriceId;
                  if (pid) handleCheckout(pid, "subscription");
                  else if (plan.id === "free") navigate("/ai");
                }}
              />
            ))}
          </div>
        </section>

        {/* Current Plan Status (If Logged In) */}
        <AnimatePresence>
          {user && entitlements && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="max-w-4xl mx-auto px-4 mb-24"
            >
              <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <CreditCard className="w-32 h-32" />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-4 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <div className="w-3 h-3 rounded-full bg-[#00f5d4] animate-pulse" />
                      <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Current Subscription</span>
                    </div>
                    <h2 className="text-3xl font-bold">
                      {entitlements.plan} <span className="text-gray-500 font-normal">Plan</span>
                    </h2>
                    <div className="flex items-center gap-6 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#9b5de5]" />
                        <span>{entitlements.subRemaining.toLocaleString()} tokens left</span>
                      </div>
                      {entitlements.resetsAt && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-[#00f5d4]" />
                          <span>Resets {new Date(entitlements.resetsAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="px-8 py-4 rounded-2xl bg-white text-black font-bold hover:bg-gray-200 transition-all flex items-center gap-2 shadow-xl active:scale-95 disabled:opacity-50"
                  >
                    {portalLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings className="w-5 h-5" />}
                    Manage Billing
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* FAQ Section */}
        <section className="pb-24 px-4">
          <div className="max-w-3xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold">Common Questions</h2>
              <p className="text-gray-400">Everything you need to know about Nexus billing.</p>
            </div>
            
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden transition-all hover:border-white/20"
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4"
                  >
                    <span className="font-bold text-lg">{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showFaq[faq.id] ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {showFaq[faq.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-6 pb-6 text-gray-400 leading-relaxed"
                      >
                        <div className="pt-4 border-t border-white/5">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="pb-24 px-4">
          <div className="max-w-5xl mx-auto p-12 rounded-[3rem] bg-gradient-to-br from-[#9b5de5]/20 to-[#00f5d4]/20 border border-white/10 text-center space-y-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
            <div className="relative z-10 space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold">Ready to build the future?</h2>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
                Join thousands of developers using Nexus to ship high-quality Roblox games faster than ever.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button
                  onClick={() => navigate("/ai")}
                  className="px-10 py-4 rounded-2xl bg-white text-black font-bold text-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all active:scale-95"
                >
                  Open AI Console
                </button>
                <button
                  onClick={() => navigate("/contact")}
                  className="px-10 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold text-lg hover:bg-white/10 transition-all active:scale-95"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <NexusRBXFooter navigate={navigate} />

      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}

function PricingCard({ plan, cycle, delay, isCurrent, onSelect }) {
  const price = cycle === "monthly" ? plan.monthlyUSD : (plan.yearlyUSD / 12).toFixed(2);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`relative p-6 rounded-[2rem] bg-[#0f1117] border transition-all duration-500 flex flex-col group ${
        plan.highlight 
          ? 'border-[#9b5de5] shadow-[0_0_50px_rgba(155,93,229,0.15)] scale-105 z-20' 
          : 'border-white/10 hover:border-white/20 z-10'
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white text-[10px] font-black uppercase tracking-widest shadow-xl">
          Most Popular
        </div>
      )}

      <div className="space-y-6 mb-8">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">{plan.name}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{plan.description}</p>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-black">${price}</span>
          <span className="text-gray-500 font-medium">/mo</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Monthly Allowance</div>
          <div className="text-lg font-bold text-white">{plan.tokenAllowancePM.toLocaleString()} Tokens</div>
          <div className="text-[11px] text-gray-500">{plan.approxScriptsPM}</div>
        </div>
      </div>

      <div className="flex-grow space-y-4 mb-8">
        {plan.features.map((feature, i) => (
          <div key={i} className={`flex items-start gap-3 text-sm ${feature.included ? 'text-gray-300' : 'text-gray-600'}`}>
            {feature.included ? (
              <Check className="w-5 h-5 text-[#00f5d4] flex-shrink-0" />
            ) : (
              <X className="w-5 h-5 text-gray-800 flex-shrink-0" />
            )}
            <span className={feature.included ? '' : 'line-through'}>{feature.text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onSelect}
        disabled={isCurrent}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 group/btn ${
          isCurrent
            ? 'bg-white/5 text-gray-500 cursor-default'
            : plan.highlight
              ? 'bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white shadow-xl hover:shadow-[0_0_30px_rgba(155,93,229,0.4)] active:scale-95'
              : 'bg-white text-black hover:bg-gray-200 active:scale-95'
        }`}
      >
        {isCurrent ? (
          <>
            <CheckCircle className="w-5 h-5" />
            Current Plan
          </>
        ) : (
          <>
            {plan.cta}
            <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
          </>
        )}
      </button>
    </motion.div>
  );
}

function X({ className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
