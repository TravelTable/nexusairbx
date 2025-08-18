import React, { useState } from "react";
import {
  Home,
  Check,
  X,
  CreditCard,
  Shield,
  Zap,
  Code,
  Settings,
  Users,
  Github,
  BookOpen,
  ChevronDown,
  Sparkles,
  Star,
} from "lucide-react";

// Stripe Price IDs (example). Swap to your real ones.
const PRICE = {
  sub: {
    starterMonthly: "price_sub_starter_m",
    starterYearly: "price_sub_starter_y",
    proMonthly: "price_sub_pro_m",
    proYearly: "price_sub_pro_y",
    teamMonthly: "price_sub_team_m",
    teamYearly: "price_sub_team_y",
  },
  payg: {
    pack100k: "price_payg_100k",
    pack500k: "price_payg_500k",
    pack1m: "price_payg_1m",
  },
};

// Helper: what the user sees depends on cycle
const planPrice = (p, cycle) =>
  cycle === "monthly" ? p.monthlyUSD : p.yearlyUSD;

const plans = [
  {
    id: "free",
    name: "Free",
    description: "For hobbyists and beginners",
    monthlyUSD: 0,
    yearlyUSD: 0,
    tokenAllowancePM: 50_000, // tokens per month
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
  },
  {
    id: "pro",
    name: "Pro",
    description: "For serious Roblox developers",
    monthlyUSD: 19.99,
    yearlyUSD:
      Math.round((19.99 * 12 * 0.75 + Number.EPSILON) * 100) / 100, // 179.91
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
    cta: "Subscribe Now",
    popular: true,
    highlight: true,
    stripePriceId: (cycle) =>
      cycle === "monthly" ? PRICE.sub.proMonthly : PRICE.sub.proYearly,
  },
  {
    id: "team",
    name: "Team",
    description: "For development teams",
    monthlyUSD: 49.99,
    yearlyUSD:
      Math.round((49.99 * 12 * 0.75 + Number.EPSILON) * 100) / 100, // 449.91
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
    cta: "Contact Sales",
    popular: false,
    highlight: false,
    stripePriceId: (cycle) =>
      cycle === "monthly" ? PRICE.sub.teamMonthly : PRICE.sub.teamYearly,
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
      "Cancel anytime. Your plan stays active until the period ends. We don't offer refunds for partial periods.",
  },
  {
    id: "api",
    question: "Is API access included?",
    answer:
      "Pro includes rate‑limited API access with your token balance. Team increases limits and supports service accounts.",
  },
];

// Checkout function for Stripe
async function checkout(priceId) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId }),
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
}

// Container Component
export default function NexusRBXSubscribePageContainer() {
  const [billingCycle, setBillingCycle] = useState("yearly");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showFaq, setShowFaq] = useState({});

  const handleBillingCycleChange = (cycle) => {
    setBillingCycle(cycle);
  };

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
  };

  const toggleFaq = (id) => {
    setShowFaq((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <NexusRBXSubscribePage
      billingCycle={billingCycle}
      selectedPlan={selectedPlan}
      showFaq={showFaq}
      plans={plans}
      faqs={faqs}
      handleBillingCycleChange={handleBillingCycleChange}
      handlePlanSelect={handlePlanSelect}
      toggleFaq={toggleFaq}
    />
  );
}

// UI Component
function NexusRBXSubscribePage({
  billingCycle,
  selectedPlan,
  showFaq,
  plans,
  faqs,
  handleBillingCycleChange,
  handlePlanSelect,
  toggleFaq,
}) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
              NexusRBX
            </div>
            <div className="ml-2 text-sm text-gray-400">Pricing</div>
          </div>

          <nav className="hidden md:flex space-x-6">
            <a
              href="/"
              className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center"
            >
              <Home className="h-4 w-4 mr-1" />
              Home
            </a>
            <a
              href="/ai"
              className="text-gray-300 hover:text-white transition-colors duration-300"
            >
              AI Console
            </a>
            <a
              href="/docs"
              className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center"
            >
              <BookOpen className="h-4 w-4 mr-1" />
              Docs
            </a>
            <a
              href="/contact"
              className="text-gray-300 hover:text-white transition-colors duration-300"
            >
              Contact
            </a>
          </nav>

          <button className="md:hidden text-gray-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-[#9b5de5] via-[#f15bb5] to-[#00f5d4] text-transparent bg-clip-text">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Unlock GPT‑4.1‑powered Roblox scripting with transparent, usage‑based pricing.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="bg-gray-900/50 p-1 rounded-lg inline-flex">
              <button
                onClick={() => handleBillingCycleChange("monthly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                  billingCycle === "monthly"
                    ? "bg-[#9b5de5]/30 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => handleBillingCycleChange("yearly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center ${
                  billingCycle === "yearly"
                    ? "bg-[#9b5de5]/30 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Yearly
                <span className="ml-2 text-xs py-0.5 px-1.5 bg-[#00f5d4]/20 text-[#00f5d4] rounded-sm">
                  Save 25%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-gray-900/30 border rounded-xl overflow-hidden transition-all duration-300 ${
                  plan.highlight
                    ? "border-[#9b5de5] shadow-lg shadow-[#9b5de5]/10"
                    : "border-gray-800 hover:border-gray-700"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      MOST POPULAR
                    </div>
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{plan.description}</p>

                  <div className="mb-1">
                    <div className="flex items-end">
                      <span className="text-4xl font-bold">
                        $
                        {billingCycle === "monthly"
                          ? plan.monthlyUSD
                          : (plan.yearlyUSD / 12).toFixed(2)}
                      </span>
                      {plan.monthlyUSD > 0 && (
                        <span className="text-gray-400 ml-2 mb-1">
                          /month
                          {billingCycle === "yearly" ? ", billed annually" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 mb-4">
                    {plan.tokenAllowancePM.toLocaleString()} tokens / month • {plan.approxScriptsPM}
                  </div>

                  <button
                    onClick={() => {
                      if (plan.id === "free") {
                        window.location.href = "/signup";
                        return;
                      }
                      const pid =
                        typeof plan.stripePriceId === "function"
                          ? plan.stripePriceId(billingCycle)
                          : plan.stripePriceId;
                      if (pid) checkout(pid);
                    }}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
                      plan.highlight
                        ? "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white hover:shadow-lg hover:shadow-[#9b5de5]/20"
                        : "bg-gray-800 text-white hover:bg-gray-700"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>

                <div className="border-t border-gray-800 p-6">
                  <h4 className="font-medium mb-4">Features</h4>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-[#00f5d4] mr-3 shrink-0" />
                        ) : (
                          <X className="h-5 w-5 text-gray-600 mr-3 shrink-0" />
                        )}
                        <span
                          className={
                            feature.included ? "text-gray-300" : "text-gray-500"
                          }
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* PAYG Top-Up Packs */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-6">
              Need more? Pay‑As‑You‑Go Packs
            </h2>
            <p className="text-center text-gray-400 mb-8">
              Buy tokens that never expire. Perfect for bursts or topping up mid‑month.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: "Top‑Up 100k",
                  tokens: 100_000,
                  price: 5,
                  priceId: PRICE.payg.pack100k,
                },
                {
                  name: "Top‑Up 500k",
                  tokens: 500_000,
                  price: 15,
                  priceId: PRICE.payg.pack500k,
                  popular: true,
                },
                {
                  name: "Top‑Up 1M",
                  tokens: 1_000_000,
                  price: 25,
                  priceId: PRICE.payg.pack1m,
                },
              ].map((p) => (
                <div
                  key={p.name}
                  className={`bg-gray-900/30 border ${
                    p.popular ? "border-[#9b5de5]" : "border-gray-800"
                  } rounded-xl p-6`}
                >
                  {p.popular && (
                    <div className="text-xs font-bold mb-2 text-[#9b5de5]">
                      BEST VALUE
                    </div>
                  )}
                  <div className="text-lg font-semibold mb-1">{p.name}</div>
                  <div className="text-gray-400 mb-4">
                    {p.tokens.toLocaleString()} tokens • ≈{" "}
                    {Math.round(p.tokens / 7000)} medium scripts
                  </div>
                  <div className="text-3xl font-bold mb-4">${p.price}</div>
                  <button
                    onClick={() => checkout(p.priceId)}
                    className="w-full py-3 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
                  >
                    Buy Pack
                  </button>
                </div>
              ))}
            </div>
            <p className="text-center text-gray-500 text-sm mt-4">
              Packs do not expire. Applied instantly after checkout.
            </p>
          </div>

          {/* Features Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-12">
              Everything You Need for Roblox Development
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-gray-900/20 border border-gray-800 rounded-xl p-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#9b5de5] to-[#f15bb5] flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">AI Script Generation</h3>
                <p className="text-gray-400">
                  Generate powerful Roblox scripts with simple natural language prompts. Our AI understands Roblox-specific concepts and can create complex scripts in seconds.
                </p>
              </div>

              <div className="bg-gray-900/20 border border-gray-800 rounded-xl p-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f15bb5] to-[#00f5d4] flex items-center justify-center mb-4">
                  <Code className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Secure Simulation</h3>
                <p className="text-gray-400">
                  Test your scripts in a sandboxed environment that mimics Roblox's behavior without risking your account or game integrity.
                </p>
              </div>

              <div className="bg-gray-900/20 border border-gray-800 rounded-xl p-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00f5d4] to-[#9b5de5] flex items-center justify-center mb-4">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Custom Templates</h3>
                <p className="text-gray-400">
                  Create and save templates for frequently used script patterns. Customize AI outputs to match your coding style and project requirements.
                </p>
              </div>

              <div className="bg-gray-900/20 border border-gray-800 rounded-xl p-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Security First</h3>
                <p className="text-gray-400">
                  All scripts are analyzed for potential security issues and harmful code patterns before execution, ensuring safe development.
                </p>
              </div>

              <div className="bg-gray-900/20 border border-gray-800 rounded-xl p-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f15bb5] to-[#9b5de5] flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Team Collaboration</h3>
                <p className="text-gray-400">
                  Share scripts, templates, and projects with team members. Collaborate in real-time with version history and comments.
                </p>
              </div>

              <div className="bg-gray-900/20 border border-gray-800 rounded-xl p-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00f5d4] to-[#f15bb5] flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  Transparent Token Pricing • No hidden limits
                </h3>
                <p className="text-gray-400">
                  Choose the plan that fits your needs, from free for hobbyists to team plans for professional development studios. No hidden throttles or surprise overages.
                </p>
              </div>
            </div>
          </div>

          {/* Testimonials */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-12">
              What Our Users Say
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gray-900/20 border border-gray-800 rounded-xl p-6">
                <div className="flex mb-4">
                  <Star className="h-5 w-5 text-[#f15bb5]" />
                  <Star className="h-5 w-5 text-[#f15bb5]" />
                  <Star className="h-5 w-5 text-[#f15bb5]" />
                  <Star className="h-5 w-5 text-[#f15bb5]" />
                  <Star className="h-5 w-5 text-[#f15bb5]" />
                </div>
                <p className="text-gray-300 italic mb-4">
                  "NexusRBX has completely transformed how I develop for Roblox. I can prototype new features in minutes instead of hours, and the simulation environment catches bugs before they cause problems."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] flex items-center justify-center mr-3">
                    <span className="font-bold">JD</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Jake Davis</h4>
                    <p className="text-gray-400 text-sm">Roblox Game Developer</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/20 border border-gray-800 rounded-xl p-6">
                <div className="flex mb-4">
                  <Star className="h-5 w-5 text-[#f15bb5]" />
                  <Star className="h-5 w-5 text-[#f15bb5]" />
                  <Star className="h-5 w-5 text-[#f15bb5]" />
                  <Star className="h-5 w-5 text-[#f15bb5]" />
                  <Star className="h-5 w-5 text-[#f15bb5]" />
                </div>
                <p className="text-gray-300 italic mb-4">
                  "As someone learning Roblox development, NexusRBX has been an incredible learning tool. I can generate scripts and then study how they work, which has accelerated my learning process tremendously."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f15bb5] to-[#00f5d4] flex items-center justify-center mr-3">
                    <span className="font-bold">SM</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Sarah Miller</h4>
                    <p className="text-gray-400 text-sm">Student & Hobbyist</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/20 border border-gray-800 rounded-xl p-6">
                <div className="flex mb-4">
                  <Star className="h-5 w-5 text-[#f15bb5]" />
                  <Star className="h-5 w-5 text-[#f15bb5]" />
                  <Star className="h-5 w-5 text-[#f15bb5]" />
                  <Star className="h-5 w-5 text-[#f15bb5]" />
                  <Star className="h-5 w-5 text-[#f15bb5]" />
                </div>
                <p className="text-gray-300 italic mb-4">
                  "Our development team has cut production time by 40% since adopting NexusRBX. The team collaboration features and custom templates have standardized our code and improved quality across all our games."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00f5d4] to-[#9b5de5] flex items-center justify-center mr-3">
                    <span className="font-bold">RT</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Ryan Thompson</h4>
                    <p className="text-gray-400 text-sm">
                      Studio Lead, BlockWorks Games
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>

            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="bg-gray-900/20 border border-gray-800 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full p-6 text-left flex justify-between items-center"
                  >
                    <h3 className="font-medium text-lg">{faq.question}</h3>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${
                        showFaq[faq.id] ? "transform rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showFaq[faq.id] && (
                    <div className="px-6 pb-6 text-gray-400">
                      <div className="pt-2 border-t border-gray-800">
                        {faq.answer}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="rounded-xl bg-gradient-to-r from-[#9b5de5]/20 to-[#00f5d4]/20 border border-gray-800 p-8 md:p-12 text-center">
            <div className="inline-block mb-6">
              <Sparkles className="h-12 w-12 text-[#9b5de5]" />
            </div>
            <h2 className="text-3xl font-bold mb-4">
              Ready to Transform Your Roblox Development?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of developers who are creating amazing Roblox experiences with the power of AI.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a
                href="/signup"
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-medium hover:shadow-lg hover:shadow-[#9b5de5]/20 transform hover:translate-y-[-2px] transition-all duration-300"
              >
                Get Started for Free
              </a>
              <a
                href="/contact"
                className="px-8 py-3 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-700 transition-all duration-300"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 px-4 bg-black/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="text-xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text mr-2">
              NexusRBX
            </div>
            <div className="text-sm text-gray-400">Pricing</div>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <a
              href="/terms"
              className="text-gray-400 hover:text-white transition-colors duration-300"
            >
              Terms
            </a>
            <a
              href="/privacy"
              className="text-gray-400 hover:text-white transition-colors duration-300"
            >
              Privacy
            </a>
            <a
              href="/contact"
              className="text-gray-400 hover:text-white transition-colors duration-300"
            >
              Contact
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-white transition-colors duration-300 flex items-center gap-2"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-4 text-center text-gray-500 text-sm">
          © 2023 NexusRBX. All rights reserved.
        </div>
      </footer>
    </div>
  );
}