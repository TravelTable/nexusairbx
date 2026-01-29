import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  User,
  Bot,
  Shield,
  Trash2,
  CreditCard,
  Activity,
  ChevronRight,
  LogOut,
  Mail,
  Zap,
  AlertTriangle,
  CheckCircle,
  Loader2,
  BarChart3,
  LayoutDashboard,
  History,
  Settings as SettingsIcon,
  Globe,
  Terminal,
  Users,
  Database,
  PlusCircle,
  Code,
  MessageCircle,
  X,
  Search,
  Sparkles,
  Info,
  ArrowUpCircle,
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useBilling } from "../context/BillingContext";
import { CHAT_MODES } from "../components/ai/ChatView";
import { BACKEND_URL } from "../config";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
} from "recharts";

const DEV_EMAIL = "jackt1263@gmail.com";

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 backdrop-blur-xl hover:border-gray-700 transition-colors group">
    <div className="flex justify-between items-start mb-3">
      <div className={`p-2 rounded-xl bg-gray-800 group-hover:scale-110 transition-transform ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className="text-gray-500 text-xs font-medium mb-1">{title}</p>
    <h4 className="text-xl font-bold text-white">{value}</h4>
  </div>
);

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "usage", label: "Usage & Analytics", icon: Activity },
  { id: "ai", label: "AI Configuration", icon: Bot },
  { id: "teams", label: "Teams", icon: Users },
  { id: "account", label: "Account", icon: User },
  { id: "help", label: "Help & Tutorials", icon: MessageCircle },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const user = auth.currentUser;
  const isDev = user?.email === DEV_EMAIL;

  const finalTabs = useMemo(() => {
    if (isDev) {
      return [...TABS, { id: "developer", label: "Developer", icon: Terminal }];
    }
    return TABS;
  }, [isDev]);

  const { settings, updateSettings } = useSettings();
  const [codingStandards, setCodingStandards] = useState(settings.codingStandards || "");
  const { plan, totalRemaining, subLimit, resetsAt, portal, cancel } = useBilling();
  const [usageData, setUsageData] = useState({ logs: [], chartData: [] });
  const [devStats, setDevStats] = useState(null);
  const [devUsers, setDevUsers] = useState([]);
  const [devLoading, setDevLoading] = useState(false);
  const [tokenForm, setTokenForm] = useState({ uid: "", amount: 10000, reason: "" });
  const [inspectorUser, setInspectorUser] = useState(null);
  const [inspectorData, setInspectorData] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [syncCode, setSyncCode] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState("");

  const navigate = useNavigate();

  const fetchUsage = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/user/usage?days=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsageData(data);
      }
    } catch (e) {
      console.error("Failed to fetch usage", e);
    }
  }, [user]);

  const fetchDevData = useCallback(async () => {
    if (!user || !isDev) return;
    setDevLoading(true);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const baseUrl = BACKEND_URL;
      
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${baseUrl}/api/dev/stats`, { headers }),
        fetch(`${baseUrl}/api/dev/users`, { headers })
      ]);

      if (statsRes.ok) setDevStats(await statsRes.json());
      if (usersRes.ok) {
        const data = await usersRes.json();
        setDevUsers(data.users || []);
      }
    } catch (e) {
      console.error("Failed to fetch dev data", e);
    } finally {
      setDevLoading(false);
    }
  }, [isDev, user]);

  const fetchTeams = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app"}/api/user/teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch (e) {
      console.error("Failed to fetch teams", e);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "usage" || activeTab === "dashboard") {
      fetchUsage();
    }
    if (activeTab === "developer" && isDev) {
      fetchDevData();
    }
    if (activeTab === "teams") {
      fetchTeams();
    }
  }, [activeTab, fetchDevData, fetchUsage, fetchTeams, isDev]);

  const fetchInspectorData = async (uid) => {
    setDevLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/dev/user-inspector/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInspectorData(data);
      }
    } catch (e) {
      console.error("Failed to fetch inspector data", e);
    } finally {
      setDevLoading(false);
    }
  };

  const handleAdjustTokens = async (e) => {
    e.preventDefault();
    if (!tokenForm.uid || !tokenForm.amount) return;
    setDevLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/dev/adjust-tokens`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(tokenForm)
      });
      if (res.ok) {
        setSuccessMsg(`Successfully added ${tokenForm.amount} tokens to user.`);
        setTokenForm({ uid: "", amount: 10000, reason: "" });
        fetchDevData();
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to adjust tokens");
        setTimeout(() => setErrorMsg(""), 5000);
      }
    } catch (e) {
      setErrorMsg("Network error");
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setDevLoading(false);
    }
  };


  const handleLogout = async () => {
    await signOut(auth);
    navigate("/signin");
  };

  const handleTriggerClear = (type) => {
    setPendingAction(type);
    setModalOpen(true);
  };

  const handleFinalConfirm = async () => {
    if (!user) return;

    if (pendingAction === "cancel_sub") {
      try {
        await cancel();
        setSuccessMsg("Your subscription has been set to cancel at the end of the current period.");
        setTimeout(() => setSuccessMsg(""), 5000);
      } catch (e) {
        setErrorMsg("Failed to cancel subscription. Please try again.");
        setTimeout(() => setErrorMsg(""), 5000);
      }
      setModalOpen(false);
      setPendingAction(null);
      return;
    }

    const endpoint = pendingAction === "chats" ? "chats" : "scripts";
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/user/data/${endpoint}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSuccessMsg(`Successfully cleared all ${endpoint}.`);
        setTimeout(() => setSuccessMsg(""), 5000);
      }
    } catch (e) {
      setErrorMsg("Failed to clear data. Please try again.");
      setTimeout(() => setErrorMsg(""), 5000);
    }
    setModalOpen(false);
    setPendingAction(null);
  };

  const handleGenerateSyncCode = async () => {
    if (!user) return;
    setSyncLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/plugin/sync-code`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSyncCode(data.syncCode);
      }
    } catch (e) {
      setErrorMsg("Failed to generate sync code.");
    } finally {
      setSyncLoading(false);
    }
  };

  const pieData = useMemo(() => [
    { name: "Used", value: subLimit - totalRemaining },
    { name: "Remaining", value: totalRemaining },
  ], [subLimit, totalRemaining]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return devUsers;
    const q = userSearch.toLowerCase();
    return devUsers.filter(u => 
      u.email?.toLowerCase().includes(q) || 
      u.uid?.toLowerCase().includes(q)
    );
  }, [devUsers, userSearch]);

  const COLORS = ["#9b5de5", "#00f5d4"];

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Current Plan" value={plan || "FREE"} icon={Zap} color="text-purple-400" />
              <StatCard title="Tokens Left" value={totalRemaining?.toLocaleString() || "0"} icon={Activity} color="text-cyan-400" />
              <StatCard title="Total Limit" value={subLimit?.toLocaleString() || "0"} icon={Shield} color="text-pink-400" />
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                Token Usage Trend (30 Days)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usageData.chartData}>
                    <defs>
                      <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9b5de5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#9b5de5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                      itemStyle={{ color: '#00f5d4' }}
                    />
                    <Area type="monotone" dataKey="tokens" stroke="#9b5de5" fillOpacity={1} fill="url(#colorTokens)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );

      case "subscription":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Zap className="w-32 h-32 text-purple-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-white">{plan || "FREE"} Plan</h3>
                  {plan === "FREE" && (
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest">Limited Access</span>
                  )}
                </div>
                <p className="text-gray-400 mb-6">
                  {plan === "FREE" 
                    ? "Upgrade to Pro to unlock Smarter AI (GPT-5.2), 20,000 token context limits, and advanced Roblox Studio integration."
                    : `Your Pro subscription includes Smarter AI (GPT-5.2) and a 20,000 token context limit. Resets on ${resetsAt ? new Date(resetsAt).toLocaleDateString() : "N/A"}`}
                </p>
                
                <div className="flex flex-wrap gap-4">
                  {plan !== "FREE" && (
                    <button 
                      onClick={portal}
                      className="px-6 py-3 rounded-xl bg-white text-black font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-xl"
                    >
                      <CreditCard className="w-5 h-5" />
                      Manage Billing & Invoices
                    </button>
                  )}
                  <button 
                    onClick={() => navigate("/subscribe")}
                    className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform ${plan === "FREE" ? 'bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white shadow-[0_0_30px_rgba(155,93,229,0.3)]' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                  >
                    <ArrowUpCircle className="w-5 h-5" />
                    {plan === "FREE" ? "Upgrade to Pro" : "Change Plan"}
                  </button>
                  {plan !== "FREE" && (
                    <button 
                      onClick={() => handleTriggerClear("cancel_sub")}
                      className="px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold flex items-center gap-2 hover:bg-red-500/20 transition-all"
                    >
                      <X className="w-5 h-5" />
                      Cancel Subscription
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-xl">
                <h4 className="text-white font-bold mb-4">Token Balance</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#9b5de5]"></div><span className="text-gray-400">Used</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#00f5d4]"></div><span className="text-gray-400">Remaining</span></div>
                </div>
              </div>
              
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-center">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Monthly Allowance</span>
                    <span className="text-white font-bold">{subLimit?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Used this month</span>
                    <span className="text-purple-400 font-bold">{(subLimit - totalRemaining)?.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#9b5de5] to-[#00f5d4]" 
                      style={{ width: `${((subLimit - totalRemaining) / subLimit) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "usage":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Recent Activity</h3>
                <button onClick={fetchUsage} className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1">
                  <History className="w-4 h-4" /> Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-gray-500 text-sm border-b border-gray-800">
                      <th className="px-6 py-4 font-medium">Action</th>
                      <th className="px-6 py-4 font-medium">Tokens</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {usageData.logs.map((log) => (
                      <tr key={log.id} className="text-gray-300 hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                              <Bot className="w-4 h-4 text-purple-400" />
                            </div>
                            <span className="capitalize">{log.reason?.replace(/-/g, ' ') || 'AI Generation'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-pink-400">-{log.tokens?.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(log.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold">Success</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "ai":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                Global AI Preferences
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Default Model</label>
                  <select 
                    value={settings.modelVersion}
                    onChange={(e) => updateSettings({ modelVersion: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors"
                  >
                    <option value="nexus-4">Nexus-5 (Smarter AI, GPT-5.2)</option>
                    <option value="nexus-3">Nexus-4 (Legacy, Fast)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Creativity Level</label>
                  <select 
                    value={settings.creativity}
                    onChange={(e) => updateSettings({ creativity: parseFloat(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors"
                  >
                    <option value="0.3">Strict (Code Optimized)</option>
                    <option value="0.7">Balanced</option>
                    <option value="1.0">Creative</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Default Chat Mode</label>
                  <select 
                    value={settings.chatMode || "general"}
                    onChange={(e) => updateSettings({ chatMode: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors"
                  >
                    {CHAT_MODES.map(mode => (
                      <option key={mode.id} value={mode.id}>{mode.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Game Profile Wizard</label>
                  <div className="flex items-center justify-between p-3 bg-black border border-gray-800 rounded-xl">
                    <span className="text-xs text-gray-500">Enable the step-by-step game setup wizard</span>
                    <button 
                      onClick={() => updateSettings({ enableGameWizard: !settings.enableGameWizard })}
                      className={`w-12 h-6 rounded-full transition-all relative ${settings.enableGameWizard !== false ? 'bg-[#00f5d4]' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.enableGameWizard !== false ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-2">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <Code className="w-4 h-4 text-purple-400" />
                  Custom Coding Standards
                </label>
                <textarea 
                  value={codingStandards}
                  onChange={(e) => {
                    setCodingStandards(e.target.value);
                    updateSettings({ codingStandards: e.target.value });
                  }}
                  placeholder="e.g. Always use the Knit framework. Follow OOP patterns for modules. Use camelCase for variables."
                  className="w-full h-32 bg-black border border-gray-800 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-colors resize-none font-mono text-sm"
                />
                <p className="text-[10px] text-gray-500 italic">These rules will be injected into every AI generation and QA audit.</p>
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                Global Game Context
              </h3>
              <p className="text-sm text-gray-500 mb-4">Describe your game once, and the AI will remember it in every new chat.</p>
              <textarea 
                value={settings.gameSpec}
                onChange={(e) => updateSettings({ gameSpec: e.target.value })}
                placeholder="e.g. My game is a military simulator set in a desert environment. The UI should be tactical and use dark green and orange accents..."
                className="w-full h-40 bg-black border border-gray-800 rounded-xl p-4 text-white outline-none focus:border-cyan-500 transition-colors resize-none"
              />
            </div>
          </div>
        );

      case "developer":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Total Users" value={devStats?.totalUsers || "..."} icon={Users} color="text-blue-400" />
              <StatCard title="Global Tokens Used" value={devStats?.totalTokensUsed?.toLocaleString() || "..."} icon={Database} color="text-purple-400" />
              <StatCard title="Total Page Views" value={devStats?.pageViews?.toLocaleString() || "..."} icon={Globe} color="text-emerald-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Token Injector */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-pink-400" />
                  Token Injector
                </h3>
                <form onSubmit={handleAdjustTokens} className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">User ID (UID)</label>
                    <input 
                      type="text" 
                      value={tokenForm.uid}
                      onChange={e => setTokenForm({...tokenForm, uid: e.target.value})}
                      placeholder="Paste Firebase UID here..."
                      className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-pink-500 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Amount</label>
                      <input 
                        type="number" 
                        value={tokenForm.amount}
                        onChange={e => setTokenForm({...tokenForm, amount: parseInt(e.target.value)})}
                        className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-pink-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Reason</label>
                      <input 
                        type="text" 
                        value={tokenForm.reason}
                        onChange={e => setTokenForm({...tokenForm, reason: e.target.value})}
                        placeholder="Support, Gift, etc."
                        className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-pink-500 transition-colors"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={devLoading}
                    className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    {devLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Inject Tokens"}
                  </button>
                </form>
              </div>

              {/* System Health */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  System Status
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 rounded-xl bg-black/40 border border-gray-800">
                    <span className="text-gray-400">Backend API</span>
                    <span className="text-green-400 font-bold flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div> Operational</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-black/40 border border-gray-800">
                    <span className="text-gray-400">Database (Firestore)</span>
                    <span className="text-green-400 font-bold flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div> Connected</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-black/40 border border-gray-800">
                    <span className="text-gray-400">AI Models (Comet)</span>
                    <span className="text-green-400 font-bold flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div> Online</span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
                    Developer Email: <span className="font-mono">{DEV_EMAIL}</span> (Infinite Tokens Active)
                  </div>
                </div>
              </div>
            </div>

            {/* User List */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-bold text-white">User Directory (Recent 100)</h3>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="text"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search email or UID..."
                      className="w-full md:w-64 pl-10 pr-4 py-2 bg-black border border-gray-800 rounded-xl text-sm text-white outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <button onClick={fetchDevData} className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 whitespace-nowrap">
                    <History className="w-4 h-4" /> Refresh
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-gray-500 text-sm border-b border-gray-800">
                      <th className="px-6 py-4 font-medium">User</th>
                      <th className="px-6 py-4 font-medium">Plan</th>
                      <th className="px-6 py-4 font-medium">Used</th>
                      <th className="px-6 py-4 font-medium">Joined</th>
                      <th className="px-6 py-4 font-medium">UID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredUsers.map((u) => (
                      <tr 
                        key={u.uid} 
                        className="text-gray-300 hover:bg-white/5 transition-colors text-sm cursor-pointer group"
                        onClick={() => {
                          setInspectorUser(u);
                          fetchInspectorData(u.uid);
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-white group-hover:text-purple-400 transition-colors">{u.email || "Anonymous"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.plan === 'PRO' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {u.plan || 'FREE'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono">{(u.subUsed || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}</td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setTokenForm({...tokenForm, uid: u.uid});
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="text-[10px] font-mono text-gray-600 hover:text-pink-400 transition-colors"
                          >
                            {u.uid}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "teams":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00f5d4]" />
                Team Collaboration
              </h3>
              <p className="text-sm text-gray-500 mb-6">Create teams to share AI chats, scripts, and UI designs with your colleagues.</p>
              
              <div className="flex gap-3 mb-8">
                <input 
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Enter team name..."
                  className="flex-1 bg-black border border-gray-800 rounded-xl px-4 py-3 text-white outline-none focus:border-[#00f5d4] transition-all"
                />
                <button 
                  onClick={async () => {
                    if (!newTeamName.trim()) return;
                    const token = await user.getIdToken();
                    const res = await fetch(`${BACKEND_URL}/api/user/teams`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ name: newTeamName })
                    });
                    if (res.ok) {
                      setNewTeamName("");
                      fetchTeams();
                      setSuccessMsg("Team created successfully!");
                    }
                  }}
                  className="px-6 py-3 rounded-xl bg-[#00f5d4] text-black font-bold hover:scale-105 transition-transform"
                >
                  Create Team
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map(team => (
                  <div key={team.id} className="p-5 rounded-2xl bg-black border border-gray-800 flex items-center justify-between group hover:border-[#00f5d4]/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-[#00f5d4] font-bold">
                        {team.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white">{team.name}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">{team.members?.length || 1} Members</div>
                      </div>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {teams.length === 0 && (
                  <div className="col-span-full py-12 text-center border border-dashed border-gray-800 rounded-2xl">
                    <p className="text-sm text-gray-500">You haven't joined any teams yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "help":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 backdrop-blur-xl">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#00f5d4]" />
                Tutorials & Onboarding
              </h3>
              <p className="text-gray-400 mb-8">Need a refresher on how to use the Nexus AI Console? You can replay the interactive tour or the welcome guide at any time.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    localStorage.removeItem("nexusrbx:tourComplete");
                    localStorage.removeItem("nexusrbx:onboardingComplete");
                    setSuccessMsg("Tutorials reset! Visit the AI Console to see them.");
                    setTimeout(() => setSuccessMsg(""), 5000);
                  }}
                  className="p-6 rounded-2xl bg-black border border-gray-800 hover:border-[#9b5de5] transition-all text-left group"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-white group-hover:text-[#9b5de5] transition-colors">Replay Interactive Tour</span>
                    <Zap className="w-5 h-5 text-gray-600 group-hover:text-[#9b5de5]" />
                  </div>
                  <p className="text-xs text-gray-500">Reset the step-by-step spotlight tour of the AI interface.</p>
                </button>

                <button 
                  onClick={() => {
                    localStorage.removeItem("nexusrbx:onboardingComplete");
                    setSuccessMsg("Welcome guide reset! Visit the AI Console to see it.");
                    setTimeout(() => setSuccessMsg(""), 5000);
                  }}
                  className="p-6 rounded-2xl bg-black border border-gray-800 hover:border-[#00f5d4] transition-all text-left group"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-white group-hover:text-[#00f5d4] transition-colors">Replay Welcome Guide</span>
                    <Info className="w-5 h-5 text-gray-600 group-hover:text-[#00f5d4]" />
                  </div>
                  <p className="text-xs text-gray-500">Reset the high-level welcome modal for the AI Console.</p>
                </button>
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 backdrop-blur-xl">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-purple-400" />
                Community & Support
              </h3>
              <p className="text-gray-400 mb-6">Join our community to get help, share your creations, and stay updated on new features.</p>
              <div className="flex flex-wrap gap-4">
                <a href="https://discord.gg/" target="_blank" rel="noreferrer" className="px-6 py-3 rounded-xl bg-[#5865F2] text-white font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                  Join Discord
                </a>
                <a href="/contact" className="px-6 py-3 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors">
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        );

      case "account":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-purple-500/20">
                  {user?.email?.[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{user?.displayName || "Nexus Developer"}</h3>
                  <p className="text-gray-400 flex items-center gap-2"><Mail className="w-4 h-4" /> {user?.email}</p>
                </div>
              </div>
              
              <button 
                onClick={handleLogout}
                className="w-full py-3 rounded-xl border border-gray-800 text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 transition-all flex items-center justify-center gap-2 font-bold"
              >
                <LogOut className="w-5 h-5" /> Sign Out
              </button>
            </div>

            {/* Roblox Plugin Sync */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                Roblox Studio Plugin
              </h3>
              <p className="text-sm text-gray-500 mb-6">Sync your NexusRBX account with the Roblox Studio plugin to import your UI boards directly.</p>
              
              {syncCode ? (
                <div className="p-6 rounded-xl bg-black/40 border border-purple-500/30 text-center">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-2">Your Sync Code</p>
                  <div className="text-4xl font-black tracking-[0.5em] text-white mb-4">{syncCode}</div>
                  <p className="text-xs text-purple-400">Enter this code in the NexusRBX Roblox Plugin. Expires in 5 minutes.</p>
                </div>
              ) : (
                <button 
                  onClick={handleGenerateSyncCode}
                  disabled={syncLoading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-bold hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  {syncLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Generate Sync Code
                </button>
              )}
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Danger Zone
              </h3>
              <p className="text-sm text-gray-500 mb-6">Irreversible actions. Please proceed with caution.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => handleTriggerClear("chats")}
                  className="p-4 rounded-xl bg-black border border-gray-800 hover:border-red-500/50 transition-colors text-left group"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white group-hover:text-red-400 transition-colors">Clear Chat History</span>
                    <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-400" />
                  </div>
                  <p className="text-xs text-gray-500">Permanently delete all conversations.</p>
                </button>
                <button 
                  onClick={() => handleTriggerClear("scripts")}
                  className="p-4 rounded-xl bg-black border border-gray-800 hover:border-red-500/50 transition-colors text-left group"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white group-hover:text-red-400 transition-colors">Delete All Scripts</span>
                    <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-400" />
                  </div>
                  <p className="text-xs text-gray-500">Wipe your entire script library.</p>
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-gray-200 flex flex-col md:flex-row">
      {/* User Inspector Modal */}
      {inspectorUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-xl font-bold text-white">
                  {inspectorUser.email?.[0].toUpperCase() || "?"}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{inspectorUser.email || "Anonymous User"}</h3>
                  <p className="text-xs text-gray-500 font-mono">{inspectorUser.uid}</p>
                </div>
              </div>
              <button 
                onClick={() => { setInspectorUser(null); setInspectorData(null); setShowRawJson(false); }}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {devLoading && !inspectorData ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                  <p className="text-gray-500 animate-pulse">Crawling Firebase collections...</p>
                </div>
              ) : inspectorData ? (
                <>
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 transition-all"
                    >
                      {showRawJson ? "View Formatted" : "View Raw JSON"}
                    </button>
                  </div>

                  {showRawJson ? (
                    <pre className="bg-black/50 p-6 rounded-2xl border border-gray-800 text-[10px] font-mono text-cyan-400 overflow-x-auto">
                      {JSON.stringify(inspectorData, null, 2)}
                    </pre>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Profile & Billing */}
                      <div className="space-y-6">
                        <div className="bg-black/30 border border-gray-800 rounded-2xl p-5">
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <User className="w-4 h-4" /> Account Profile
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="text-purple-400 font-bold">{inspectorData.profile?.plan || "FREE"}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Sub Used</span><span className="text-white">{inspectorData.profile?.subUsed?.toLocaleString() || 0}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Sub Limit</span><span className="text-white">{inspectorData.profile?.subLimit?.toLocaleString() || 0}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">PAYG Balance</span><span className="text-cyan-400 font-bold">{inspectorData.tokens?.balance?.toLocaleString() || 0}</span></div>
                          </div>
                        </div>

                        <div className="bg-black/30 border border-gray-800 rounded-2xl p-5">
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <CreditCard className="w-4 h-4" /> Stripe Data
                          </h4>
                          {inspectorData.stripe ? (
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between"><span className="text-gray-500">Customer ID</span><span className="text-white font-mono text-xs">{inspectorData.stripe.stripeId || "N/A"}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-green-400 font-bold">Active</span></div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-600 italic">No Stripe customer record found.</p>
                          )}
                        </div>
                      </div>

                      {/* Activity Summary */}
                      <div className="space-y-6">
                        <div className="bg-black/30 border border-gray-800 rounded-2xl p-5">
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Activity Summary
                          </h4>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 rounded-xl bg-gray-800/50">
                              <div className="text-xl font-bold text-white">{inspectorData.projects?.length || 0}</div>
                              <div className="text-[10px] text-gray-500 uppercase">Projects</div>
                            </div>
                            <div className="p-3 rounded-xl bg-gray-800/50">
                              <div className="text-xl font-bold text-white">{inspectorData.scripts?.length || 0}</div>
                              <div className="text-[10px] text-gray-500 uppercase">Scripts</div>
                            </div>
                            <div className="p-3 rounded-xl bg-gray-800/50">
                              <div className="text-xl font-bold text-white">{inspectorData.chats?.length || 0}</div>
                              <div className="text-[10px] text-gray-500 uppercase">Chats</div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-black/30 border border-gray-800 rounded-2xl p-5 max-h-64 overflow-y-auto">
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <History className="w-4 h-4" /> Recent Usage Logs
                          </h4>
                          <div className="space-y-2">
                            {inspectorData.usageLogs?.map(log => (
                              <div key={log.id} className="flex justify-between items-center p-2 rounded-lg bg-white/5 text-[10px]">
                                <span className="text-gray-400 truncate max-w-[120px]">{log.reason || "AI Generation"}</span>
                                <span className="text-pink-400 font-mono">-{log.tokens?.toLocaleString()}</span>
                              </div>
                            ))}
                            {(!inspectorData.usageLogs || inspectorData.usageLogs.length === 0) && <p className="text-xs text-gray-600 italic">No usage logs found.</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/20 p-4 rounded-xl border border-gray-800">
                  <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Code className="w-3 h-3" /> Recent Projects</h5>
                  <div className="space-y-1">
                    {inspectorData?.projects?.slice(0, 3).map(p => (
                      <div key={p.id} className="text-[10px] text-gray-300 truncate">{p.title || "Untitled"}</div>
                    ))}
                    {(!inspectorData?.projects || inspectorData.projects.length === 0) && <div className="text-[10px] text-gray-600 italic">None</div>}
                  </div>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-gray-800">
                  <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Recent Chats</h5>
                  <div className="space-y-1">
                    {inspectorData?.chats?.slice(0, 3).map(c => (
                      <div key={c.id} className="text-[10px] text-gray-300 truncate">{c.title || "Chat Session"}</div>
                    ))}
                    {(!inspectorData?.chats || inspectorData.chats.length === 0) && <div className="text-[10px] text-gray-600 italic">None</div>}
                  </div>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-gray-800">
                  <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Database className="w-3 h-3" /> Recent Scripts</h5>
                  <div className="space-y-1">
                    {inspectorData?.scripts?.slice(0, 3).map(s => (
                      <div key={s.id} className="text-[10px] text-gray-300 truncate">{s.title || "Script"}</div>
                    ))}
                    {(!inspectorData?.scripts || inspectorData.scripts.length === 0) && <div className="text-[10px] text-gray-600 italic">None</div>}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setTokenForm({...tokenForm, uid: inspectorUser.uid}); setInspectorUser(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="px-4 py-2 rounded-xl bg-pink-600/20 text-pink-400 border border-pink-500/30 text-sm font-bold hover:bg-pink-600/30 transition-all"
                  >
                    Inject Tokens
                  </button>
                </div>
                <button 
                  onClick={() => { setInspectorUser(null); setInspectorData(null); }}
                  className="px-6 py-2 rounded-xl bg-gray-800 text-white text-sm font-bold hover:bg-gray-700 transition-all"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 bg-gray-900/50 border-r border-gray-800 p-6 flex flex-col gap-8 backdrop-blur-2xl">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] flex items-center justify-center shadow-lg shadow-purple-500/20">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Settings</h1>
        </div>

        <nav className="flex flex-col gap-1">
          {finalTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-[#9b5de5]/20 to-[#00f5d4]/20 text-white border border-purple-500/30 shadow-lg shadow-purple-500/5"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? "text-purple-400" : ""}`} />
              <span className="font-bold text-sm">{tab.label}</span>
              {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto text-purple-400" />}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/5">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest font-bold">Support</p>
          <a href="/contact" className="text-sm text-white hover:text-purple-400 transition-colors font-medium">Need help? Contact us</a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{finalTabs.find(t => t.id === activeTab)?.label}</h2>
              <p className="text-sm text-gray-500">Manage your NexusRBX experience and account data.</p>
            </div>
            {activeTab === "dashboard" && (
              <div className="hidden md:block px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                System Online
              </div>
            )}
          </div>

          {/* Notifications */}
          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
              <CheckCircle className="w-5 h-5" /> {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
              <AlertTriangle className="w-5 h-5" /> {errorMsg}
            </div>
          )}

          {renderTabContent()}
        </div>
      </main>

      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleFinalConfirm}
        title={
          pendingAction === "chats" 
            ? "Clear All Chats?" 
            : pendingAction === "cancel_sub" 
              ? "Cancel Subscription?" 
              : "Delete All Scripts?"
        }
        message={
          pendingAction === "chats"
            ? "This will permanently remove your entire conversation history from the database. This action cannot be undone."
            : pendingAction === "cancel_sub"
              ? "Are you sure you want to cancel? You will keep your Pro benefits until the end of your current billing period, but you won't be charged again."
              : "This will permanently delete all scripts you have saved to your library. You will lose access to them immediately."
        }
        warningKeyword={
          pendingAction === "chats" 
            ? "DELETE CHATS" 
            : pendingAction === "cancel_sub" 
              ? "CANCEL" 
              : "DELETE SCRIPTS"
        }
      />
    </div>
  );
};

export default SettingsPage;
