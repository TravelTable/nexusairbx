import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Code, Cpu, Download, Layout, Zap } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { Helmet } from "react-helmet";
import { auth } from "../firebase";
import { getEntitlements, summarizeEntitlements } from "../lib/billing";
import NexusRBXHeader from "../components/NexusRBXHeader";
import NexusRBXFooter from "../components/NexusRBXFooter";
import HeroSection from "../components/home/HeroSection";
import FeaturesSection from "../components/home/FeaturesSection";
import CommunityCreationsSection from "../components/home/CommunityCreationsSection";

export default function Homepage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [billing, setBilling] = useState(null);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    if (!user) return setBilling(null);
    getEntitlements().then((data) => setBilling(summarizeEntitlements(data))).catch(() => setBilling(null));
  }, [user]);

  const paid = ["PRO", "PRO_PLUS", "TEAM"].includes(billing?.plan);
  const advertisedTools = [
    { id: 1, title: "Pro-Grade UI Engine", description: "Generate responsive Roblox-native interfaces and reusable Luau components.", icon: Layout, position: "top-[5%] -left-8 xl:-left-32", delay: 0.2 },
    { id: 2, title: "Deep Luau Integration", description: "Create typed client, server and shared modules with Roblox-aware architecture.", icon: Code, position: "top-[20%] -right-8 xl:-right-32", delay: 0.4 },
    { id: 3, title: "Nexus Auto", description: "Automatically chooses an appropriate supported model for each task.", icon: Cpu, position: "bottom-[15%] -left-4 xl:-left-24", delay: 0.6 },
    { id: 4, title: "Studio-Ready Workflow", description: "Move generated scripts and project structure into Roblox Studio.", icon: Download, position: "bottom-[0%] -right-4 xl:-right-24", delay: 0.8 },
  ];
  const featureCards = [
    { id: 1, title: "AI UI Builder", description: "Generate professional Roblox interfaces, states and interactions.", icon: Layout, gradient: "from-purple-600 to-pink-500", button: { text: "Build UI", href: "/ai" } },
    { id: 2, title: paid ? "Your paid plan" : "Paid plans from $19.99", description: paid ? "Use Nexus Auto, model selection and Included Usage." : "Get higher Included Usage, model selection and optional Premium Direct access.", icon: Cpu, gradient: "from-cyan-500 to-blue-600", button: { text: paid ? "Manage billing" : "Compare plans", href: paid ? "/billing" : "/subscribe" } },
    { id: 3, title: "Smart Scripting", description: "Generate and revise Luau systems with Roblox-aware project context.", icon: Zap, gradient: "from-pink-500 to-purple-600", button: { text: "Start Scripting", href: "/ai" } },
  ];

  function submit(event) {
    event.preventDefault();
    const prompt = inputValue.trim();
    if (!prompt) return;
    navigate("/ai", { state: { initialPrompt: prompt, aiResult: null } });
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <Helmet>
        <title>NexusRBX — AI Roblox UI Builder and Script Generator</title>
        <meta name="description" content="Generate Roblox UI and Luau projects with Nexus Auto and professional usage controls." />
        <meta property="og:title" content="NexusRBX — AI Roblox Development" />
        <meta property="og:description" content="Build Roblox interfaces and Luau systems with AI-assisted workflows." />
        <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "NexusRBX", applicationCategory: "DeveloperApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "19.99", priceCurrency: "USD" } })}</script>
      </Helmet>
      <NexusRBXHeader navigate={navigate} user={user} handleLogin={() => navigate("/signin")} tokenInfo={billing} />
      <main>
        <HeroSection advertisedTools={advertisedTools} randomUsers={[{ letter: "J", color: "from-purple-500 to-indigo-500" }, { letter: "A", color: "from-cyan-500 to-blue-500" }, { letter: "T", color: "from-pink-500 to-rose-500" }]} handleSubmit={submit} inputValue={inputValue} handleInputChange={(event) => setInputValue(event.target.value)} loading={false} error="" />
        <FeaturesSection featureCards={featureCards} navigate={navigate} />
        <CommunityCreationsSection />
      </main>
      <NexusRBXFooter navigate={navigate} footerLinks={[{ id: 1, text: "Terms", href: "/terms" }, { id: 2, text: "Privacy", href: "/privacy" }, { id: 3, text: "Contact", href: "/contact" }, { id: 4, text: "Docs", href: "/docs" }]} />
    </div>
  );
}
