import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useBilling } from "../context/BillingContext";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "usage", label: "Usage & Analytics", icon: Activity },
  { id: "ai", label: "AI Configuration", icon: Bot },
  { id: "account", label: "Account", icon: User },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  const { plan, totalRemaining, subLimit, resetsAt, refresh: refreshBilling, portal } = useBilling();
  const [usageData, setUsageData] = useState({ logs: [], chartData: [] });
  const [usageLoading, setUsageLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    if (activeTab === "usage" || activeTab === "dashboard") {
      fetchUsage();
    }
  }, [activeTab]);

  const fetchUsage = async () => {
    if (!user) return;
    setUsageLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app"}/api/user/usage?days=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsageData(data);
      }
    } catch (e) {
      console.error("Failed to fetch usage", e);
    } finally {
      setUsageLoading(false);
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
    const endpoint = pendingAction === "chats" ? "chats" : "scripts";
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app"}/api/user/data/${endpoint}`, {
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

  const pieData = useMemo(() => [
    { name: "Used", value: subLimit - totalRemaining },
    { name: "Remaining", value: totalRemaining },
  ], [subLimit, totalRemaining]);

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
                <h3 className="text-2xl font-bold text-white mb-2">{plan || "FREE"} Plan</h3>
                <p className="text-gray-400 mb-6">Your subscription resets on {resetsAt ? new Date(resetsAt).toLocaleDateString() : "N/A"}</p>
                
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={portal}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                  >
                    <CreditCard className="w-5 h-5" />
                    Manage Billing & Invoices
                  </button>
                  <button 
                    onClick={() => navigate("/subscribe")}
                    className="px-6 py-3 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors"
                  >
                    Upgrade Plan
                  </button>
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
                    <option value="nexus-4">Nexus-4 (High Accuracy)</option>
                    <option value="nexus-3">Nexus-3 (Fast)</option>
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
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 bg-gray-900/50 border-r border-gray-800 p-6 flex flex-col gap-8 backdrop-blur-2xl">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] flex items-center justify-center shadow-lg shadow-purple-500/20">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Settings</h1>
        </div>

        <nav className="flex flex-col gap-1">
          {TABS.map((tab) => (
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
              <h2 className="text-2xl font-bold text-white mb-1">{TABS.find(t => t.id === activeTab)?.label}</h2>
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
        title={pendingAction === "chats" ? "Clear All Chats?" : "Delete All Scripts?"}
        message={
          pendingAction === "chats"
            ? "This will permanently remove your entire conversation history from the database. This action cannot be undone."
            : "This will permanently delete all scripts you have saved to your library. You will lose access to them immediately."
        }
        warningKeyword={pendingAction === "chats" ? "DELETE CHATS" : "DELETE SCRIPTS"}
      />
    </div>
  );
};

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

export default SettingsPage;
