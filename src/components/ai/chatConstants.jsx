import {
  MessageSquare,
  Layout,
  Code2,
  Rocket,
  Move,
  Database,
  Activity,
  ShieldAlert,
} from "lucide-react";

export const CHAT_MODES = [
  { id: "general", label: "General Assistant", icon: <MessageSquare className="w-4 h-4" />, color: "text-gray-400", bg: "bg-gray-400/10", border: "hover:border-gray-400/50", description: "General Roblox help, debugging, and documentation.", placeholder: "Ask anything about Roblox development...", type: "pure persona" },
  { id: "ui", label: "UI Architect", icon: <Layout className="w-4 h-4" />, color: "text-[#00f5d4]", bg: "bg-[#00f5d4]/10", border: "hover:border-[#00f5d4]/50", description: "Specialized in building and refining Roblox UI manifests.", placeholder: "Describe the UI you want to build (e.g. 'A modern shop menu')...", type: "tool-routing" },
  { id: "logic", label: "Logic Engineer", icon: <Code2 className="w-4 h-4" />, color: "text-[#9b5de5]", bg: "bg-[#9b5de5]/10", border: "hover:border-[#9b5de5]/50", description: "Focused on clean, optimized Luau scripting and bug fixing.", placeholder: "Paste code to optimize or describe a logic problem...", type: "pure persona" },
  { id: "system", label: "System Designer", icon: <Rocket className="w-4 h-4" />, color: "text-blue-400", bg: "bg-blue-400/10", border: "hover:border-blue-400/50", description: "Architecting DataStores, Networking, and Game Loops.", placeholder: "Describe a system (e.g. 'A global leaderboard with DataStores')...", type: "pure persona" },
  { id: "animator", label: "Animator", icon: <Move className="w-4 h-4" />, color: "text-pink-400", bg: "bg-pink-400/10", border: "hover:border-pink-400/50", description: "Tweens, AnimationControllers, and procedural motion.", placeholder: "Describe an animation or tween sequence...", type: "pure persona" },
  { id: "data", label: "Data Specialist", icon: <Database className="w-4 h-4" />, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "hover:border-yellow-400/50", description: "DataStore v2, Caching, Pagination, and Analytics.", placeholder: "Ask about DataStore patterns or data management...", type: "pure persona" },
  { id: "performance", label: "Performance Tuner", icon: <Activity className="w-4 h-4" />, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "hover:border-emerald-400/50", description: "Diagnosing bottlenecks and micro-optimizations.", placeholder: "Paste code to audit for performance issues...", type: "pure persona" },
  { id: "security", label: "Security Auditor", icon: <ShieldAlert className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-400/10", border: "hover:border-red-400/50", description: "RemoteEvent security and anti-exploit patterns.", placeholder: "Audit your Remotes or ask about anti-exploit best practices...", type: "pure persona" },
];
