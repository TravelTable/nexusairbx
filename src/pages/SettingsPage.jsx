import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Database,
  HelpCircle,
  Loader2,
  LogOut,
  Menu,
  RefreshCcw,
  Save,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Users,
  Wand2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { auth } from "../firebase";
import { useBilling } from "../context/BillingContext";
import { useSettings } from "../context/SettingsContext";
import { authedFetch } from "../lib/billing";
import {
  beginRobloxOAuth,
  beginRobloxReauthorization,
  disconnectRobloxOAuth,
  getRobloxOAuthStatus,
  getRobloxOperations,
  setRobloxTargetCreator,
} from "../lib/robloxOAuthApi";
import { DEFAULT_SETTINGS } from "../lib/settingsSchema";
import { CHAT_MODES } from "../components/ai/chatConstants";
import ModelSwitcher from "../components/ai/ModelSwitcher";
import BrutalAuditor from "../components/ai/BrutalAuditor";
import FreeUsageMeter from "../components/FreeUsageMeter";
import ProNudgeModal from "../components/ProNudgeModal";
import { Alert, AlertDescription, AlertTitle } from "../components/shadcn/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/shadcn/alert-dialog";
import { Badge } from "../components/shadcn/badge";
import { Button } from "../components/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/shadcn/card";
import { Input } from "../components/shadcn/input";
import { Label } from "../components/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/shadcn/select";
import { Separator } from "../components/shadcn/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/shadcn/sheet";
import { Skeleton } from "../components/shadcn/skeleton";
import { Switch } from "../components/shadcn/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/shadcn/table";
import { Textarea } from "../components/shadcn/textarea";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "ai", label: "AI", icon: Bot },
  { id: "roblox", label: "Roblox + Studio", icon: Wand2 },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "team", label: "Team", icon: Users },
  { id: "account", label: "Account/Data", icon: Database },
  { id: "help", label: "Help", icon: HelpCircle },
];

const ADMIN_ITEM = { id: "admin", label: "Admin", icon: Shield };
const CODE_STYLE_OPTIONS = [
  { value: "optimized", label: "Optimized" },
  { value: "safe", label: "Safer edits" },
  { value: "verbose", label: "Verbose" },
];
const VERBOSITY_OPTIONS = [
  { value: "concise", label: "Concise" },
  { value: "balanced", label: "Balanced" },
  { value: "detailed", label: "Detailed" },
];
const STUDIO_POLICY_OPTIONS = [
  { value: "after_validation", label: "Push after validation" },
  { value: "manual_review", label: "Manual review first" },
  { value: "off", label: "Never push automatically" },
];

async function readJson(res, fallbackMessage) {
  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }
  if (!res.ok) throw new Error(data?.error || text || fallbackMessage);
  return data || {};
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat().format(number);
}

function formatDate(value) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function statusTone(state) {
  if (state === "good") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (state === "warn") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  return "border-border bg-muted/40 text-muted-foreground";
}

function SaveStatus({ status, error, lastSavedAt, onRetry }) {
  if (status === "saving") {
    return (
      <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Badge variant="destructive" className="gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          Save failed
        </Badge>
        {error && <span className="max-w-[20rem] truncate text-xs text-muted-foreground">{error}</span>}
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          <RefreshCcw className="h-4 w-4" />
          Reload
        </Button>
      </div>
    );
  }
  if (status === "saved") {
    return (
      <Badge variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        {lastSavedAt ? `Saved ${formatDate(lastSavedAt)}` : "Saved"}
      </Badge>
    );
  }
  return <Badge variant="secondary">Idle</Badge>;
}

function NavList({ items, activeTab, onSelect }) {
  return (
    <nav className="space-y-1" aria-label="Settings sections">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeTab;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </span>
            {active && <ChevronRight className="h-4 w-4" />}
          </button>
        );
      })}
    </nav>
  );
}

function Panel({ title, description, actions, children, className }) {
  return (
    <Card className={className}>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon = HelpCircle, title, description, action }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function HealthTile({ icon: Icon, label, value, detail, state = "neutral", action }) {
  return (
    <div className={cn("rounded-lg border p-4", statusTone(state))}>
      <div className="flex items-start justify-between gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        {action}
      </div>
      <div className="mt-3">
        <div className="text-xs font-medium uppercase text-current/70">{label}</div>
        <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
        {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onCheckedChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4">
      <div className="space-y-1">
        <Label className="text-sm font-semibold">{label}</Label>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} aria-label={label} />
    </div>
  );
}

function ConfirmationAction({
  trigger,
  title,
  description,
  confirmationText,
  actionLabel,
  onConfirm,
  destructive = true,
}) {
  const [value, setValue] = useState("");
  const [running, setRunning] = useState(false);
  const matches = value === confirmationText;

  return (
    <AlertDialog onOpenChange={(open) => !open && setValue("")}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`confirm-${confirmationText}`}>Type {confirmationText} to continue</Label>
          <Input
            id={`confirm-${confirmationText}`}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matches || running}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            onClick={async (event) => {
              event.preventDefault();
              if (!matches || running) return;
              setRunning(true);
              try {
                await onConfirm();
              } finally {
                setRunning(false);
              }
            }}
          >
            {running && <Loader2 className="h-4 w-4 animate-spin" />}
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DataStateAlert({ state, onRetry, label }) {
  if (state.status === "loading") {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{label} could not load</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{state.error}</span>
          {onRetry && (
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              <RefreshCcw className="h-4 w-4" />
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const {
    settings,
    updateSettings,
    reloadSettings,
    user,
    loading: settingsLoading,
    saveStatus,
    saveError,
    lastSavedAt,
  } = useSettings();
  const billing = useBilling() || {};
  const isAdmin = Boolean(billing.isAdmin || billing.flags?.isAdmin);
  const [activeTab, setActiveTab] = useState("overview");
  const [proNudgeReason, setProNudgeReason] = useState("");
  const [usageState, setUsageState] = useState({ status: "idle", logs: [], chartData: [], error: "" });
  const [teamState, setTeamState] = useState({ status: "idle", teams: [], error: "" });
  const [teamName, setTeamName] = useState("");
  const [robloxState, setRobloxState] = useState({ status: "idle", statusData: null, operations: [], error: "" });
  const [robloxAction, setRobloxAction] = useState("");
  const [adminState, setAdminState] = useState({ status: "idle", stats: null, users: [], error: "" });
  const [adminInspector, setAdminInspector] = useState({ uid: "", status: "idle", data: null, error: "" });
  const [tokenAdjust, setTokenAdjust] = useState({ uid: "", amount: "", reason: "" });
  const [notice, setNotice] = useState("");
  const [longForm, setLongForm] = useState({
    codingStandards: settings.codingStandards || "",
    gameSpec: settings.gameSpec || "",
  });

  const navItems = useMemo(() => (isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS), [isAdmin]);
  const robloxStatus = robloxState.statusData;
  const robloxConnected = Boolean(robloxStatus?.connected);
  const selectedCreator = robloxStatus?.connection?.selectedCreator || null;
  const creators = Array.isArray(robloxStatus?.connection?.creators) ? robloxStatus.connection.creators : [];
  const selectedCreatorKey = selectedCreator ? `${selectedCreator.type}:${selectedCreator.id}` : "none";
  const longFormDirty =
    longForm.codingStandards !== (settings.codingStandards || "") ||
    longForm.gameSpec !== (settings.gameSpec || "");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    const allowedTabs = new Set([...NAV_ITEMS.map((item) => item.id), "admin"]);
    if (requestedTab && allowedTabs.has(requestedTab)) {
      setActiveTab(requestedTab);
    }
    const robloxResult = params.get("roblox");
    if (robloxResult === "connected") setNotice("Roblox connection updated.");
    if (robloxResult === "error") setNotice(params.get("message") || "Roblox authorization failed.");
  }, []);

  useEffect(() => {
    if (!longFormDirty) {
      setLongForm({
        codingStandards: settings.codingStandards || "",
        gameSpec: settings.gameSpec || "",
      });
    }
  }, [longFormDirty, settings.codingStandards, settings.gameSpec]);

  const setTab = useCallback((tab) => {
    setActiveTab(tab);
    navigate(`/settings?tab=${tab}`, { replace: true });
  }, [navigate]);

  const loadUsage = useCallback(async () => {
    if (!user) return;
    setUsageState((state) => ({ ...state, status: "loading", error: "" }));
    try {
      const data = await readJson(await authedFetch("/api/user/usage?days=30", { noCache: true }), "Failed to load usage.");
      setUsageState({
        status: "ready",
        logs: Array.isArray(data.logs) ? data.logs : [],
        chartData: Array.isArray(data.chartData) ? data.chartData : [],
        error: "",
      });
    } catch (error) {
      setUsageState((state) => ({ ...state, status: "error", error: error.message || "Failed to load usage." }));
    }
  }, [user]);

  const loadTeams = useCallback(async () => {
    if (!user) return;
    setTeamState((state) => ({ ...state, status: "loading", error: "" }));
    try {
      const data = await readJson(await authedFetch("/api/user/teams", { noCache: true }), "Failed to load teams.");
      setTeamState({ status: "ready", teams: Array.isArray(data.teams) ? data.teams : [], error: "" });
    } catch (error) {
      setTeamState((state) => ({ ...state, status: "error", error: error.message || "Failed to load teams." }));
    }
  }, [user]);

  const loadRoblox = useCallback(async () => {
    if (!user) return;
    setRobloxState((state) => ({ ...state, status: "loading", error: "" }));
    try {
      const [statusData, operationsData] = await Promise.all([
        getRobloxOAuthStatus(),
        getRobloxOperations({ limit: 20 }).catch(() => ({ operations: [] })),
      ]);
      setRobloxState({
        status: "ready",
        statusData,
        operations: Array.isArray(operationsData.operations) ? operationsData.operations : [],
        error: "",
      });
    } catch (error) {
      setRobloxState((state) => ({ ...state, status: "error", error: error.message || "Failed to load Roblox status." }));
    }
  }, [user]);

  const loadAdmin = useCallback(async () => {
    if (!user || !isAdmin) return;
    setAdminState((state) => ({ ...state, status: "loading", error: "" }));
    try {
      const [stats, usersData] = await Promise.all([
        readJson(await authedFetch("/api/dev/stats", { noCache: true }), "Failed to load admin stats."),
        readJson(await authedFetch("/api/dev/users", { noCache: true }), "Failed to load users."),
      ]);
      setAdminState({
        status: "ready",
        stats,
        users: Array.isArray(usersData.users) ? usersData.users : Array.isArray(usersData) ? usersData : [],
        error: "",
      });
    } catch (error) {
      setAdminState((state) => ({ ...state, status: "error", error: error.message || "Failed to load admin data." }));
    }
  }, [isAdmin, user]);

  useEffect(() => {
    if (!user) return;
    loadUsage();
    loadRoblox();
  }, [loadRoblox, loadUsage, user]);

  useEffect(() => {
    if (activeTab === "team") loadTeams();
    if (activeTab === "admin") loadAdmin();
    if (activeTab === "roblox") loadRoblox();
  }, [activeTab, loadAdmin, loadRoblox, loadTeams]);

  const updateSetting = useCallback(async (patch) => {
    const result = await updateSettings(patch);
    if (!result.ok) setNotice(result.error || "Setting could not be saved.");
    return result;
  }, [updateSettings]);

  const createTeam = async (event) => {
    event.preventDefault();
    const name = teamName.trim();
    if (!name) return;
    setTeamState((state) => ({ ...state, status: "loading", error: "" }));
    try {
      await readJson(
        await authedFetch("/api/user/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }),
        "Failed to create team."
      );
      setTeamName("");
      await loadTeams();
    } catch (error) {
      setTeamState((state) => ({ ...state, status: "error", error: error.message || "Failed to create team." }));
    }
  };

  const redirectFromBilling = async (runner) => {
    const data = await runner();
    if (data?.url) window.location.assign(data.url);
  };

  const clearUserData = async (type) => {
    const data = await readJson(
      await authedFetch(`/api/user/data/${type}`, { method: "DELETE" }),
      `Failed to clear ${type}.`
    );
    setNotice(`${type === "chats" ? "Chats" : "Scripts"} cleared (${formatNumber(data.count)} records).`);
  };

  const inspectUser = async () => {
    const uid = adminInspector.uid.trim();
    if (!uid) return;
    setAdminInspector((state) => ({ ...state, status: "loading", error: "" }));
    try {
      const data = await readJson(
        await authedFetch(`/api/dev/user-inspector/${encodeURIComponent(uid)}`, { noCache: true }),
        "Failed to inspect user."
      );
      setAdminInspector((state) => ({ ...state, status: "ready", data, error: "" }));
    } catch (error) {
      setAdminInspector((state) => ({ ...state, status: "error", error: error.message || "Failed to inspect user." }));
    }
  };

  const adjustTokens = async (event) => {
    event.preventDefault();
    const uid = tokenAdjust.uid.trim();
    const amount = Number(tokenAdjust.amount);
    if (!uid || !Number.isFinite(amount)) return;
    await readJson(
      await authedFetch("/api/dev/adjust-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, amount, reason: tokenAdjust.reason || "Settings admin adjustment" }),
      }),
      "Failed to adjust tokens."
    );
    setTokenAdjust({ uid: "", amount: "", reason: "" });
    setNotice("Token adjustment saved.");
    await loadAdmin();
  };

  const renderOverview = () => {
    const health = [
      {
        icon: Bot,
        label: "AI model",
        value: settings.modelVersion || DEFAULT_SETTINGS.modelVersion,
        detail: settings.chatMode ? `${settings.chatMode} mode` : "Default agent mode",
        state: "good",
      },
      {
        icon: CreditCard,
        label: "Billing",
        value: billing.loading ? "Loading" : billing.plan || "FREE",
        detail: billing.error || `${formatNumber(billing.totalRemaining)} tokens available`,
        state: billing.error ? "warn" : "good",
      },
      {
        icon: Wand2,
        label: "Roblox OAuth",
        value: robloxConnected ? "Connected" : "Not connected",
        detail: selectedCreator ? `${selectedCreator.type} ${selectedCreator.id}` : "No creator target selected",
        state: robloxConnected ? "good" : "warn",
      },
      {
        icon: Save,
        label: "Asset upload consent",
        value: settings.robloxAssetUploadsEnabled ? "Auto upload enabled" : "Manual only",
        detail: settings.robloxAssetUploadsEnabled ? "Generated assets can upload to Roblox." : "No Roblox asset writes are allowed.",
        state: settings.robloxAssetUploadsEnabled ? "good" : "neutral",
      },
    ];

    return (
      <div className="space-y-6">
        {notice && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Status</AlertTitle>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}

        <Panel
          title="Connection health"
          description="A quick read on the services NexusRBX needs for generation, billing, Roblox publishing, and Studio handoff."
          actions={
            <Button type="button" variant="outline" size="sm" onClick={() => { loadUsage(); loadRoblox(); billing.refresh?.(); }}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {health.map((item) => (
              <HealthTile key={item.label} {...item} />
            ))}
          </div>
        </Panel>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Panel
            title="Usage"
            description="Recent token activity from your account."
            actions={<Button type="button" variant="outline" size="sm" onClick={loadUsage}><RefreshCcw className="h-4 w-4" />Retry</Button>}
          >
            <DataStateAlert state={usageState} onRetry={loadUsage} label="Usage" />
            {usageState.status === "ready" && usageState.chartData.length > 0 && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usageState.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <ChartTooltip />
                    <Area type="monotone" dataKey="tokens" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.18)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            {usageState.status === "ready" && usageState.chartData.length === 0 && (
              <EmptyState
                icon={Activity}
                title="No usage yet"
                description="Usage will appear here after you run AI generation or Studio-assisted work."
                action={<Button asChild><Link to="/ai">Open AI workspace</Link></Button>}
              />
            )}
          </Panel>

          <Panel title="Workspace shortcut" description="Jump back with your current readiness state in view.">
            <div className="space-y-4">
              <FreeUsageMeter dailyUsage={billing.dailyUsage} fairUse={billing.fairUse} />
              <Button asChild className="w-full">
                <Link to="/ai">
                  Open AI workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    );
  };

  const renderAI = () => (
    <div className="space-y-6">
      <Panel title="AI defaults" description="These defaults are used when new chats and generation runs start.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>Model</Label>
            <ModelSwitcher
              value={settings.modelVersion}
              isPremium={billing.isPremium}
              onChange={(modelVersion) => updateSetting({ modelVersion })}
              onProNudge={(reason) => setProNudgeReason(reason)}
              fullWidth
            />
          </div>
          <div className="space-y-2">
            <Label>Chat mode</Label>
            <Select value={settings.chatMode} onValueChange={(chatMode) => updateSetting({ chatMode })}>
              <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
              <SelectContent>
                {CHAT_MODES.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>{mode.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Code style</Label>
            <Select value={settings.codeStyle} onValueChange={(codeStyle) => updateSetting({ codeStyle })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CODE_STYLE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Response detail</Label>
            <Select value={settings.verbosity} onValueChange={(verbosity) => updateSetting({ verbosity })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VERBOSITY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="creativity">Creativity</Label>
              <span className="text-sm text-muted-foreground">{Math.round(Number(settings.creativity) * 100)}%</span>
            </div>
            <Input
              id="creativity"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.creativity}
              onChange={(event) => updateSetting({ creativity: Number(event.target.value) })}
              className="h-10"
            />
          </div>
        </div>
        <Separator className="my-6" />
        <div className="grid gap-3 lg:grid-cols-2">
          <ToggleRow
            label="Show thinking summaries"
            description="Keep concise reasoning summaries visible in the AI workspace."
            checked={settings.showThinking}
            onCheckedChange={(showThinking) => updateSetting({ showThinking })}
          />
          <ToggleRow
            label="Game wizard prompts"
            description="Use guided prompts for new Roblox game concepts."
            checked={settings.enableGameWizard}
            onCheckedChange={(enableGameWizard) => updateSetting({ enableGameWizard })}
          />
        </div>
      </Panel>

      <Panel
        title="Project context"
        description="Long-form instructions save explicitly so accidental edits do not overwrite your workspace defaults."
        actions={
          <Button type="button" onClick={() => updateSetting(longForm)} disabled={!longFormDirty || saveStatus === "saving"}>
            {saveStatus === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save context
          </Button>
        }
      >
        {saveStatus === "error" && saveError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Context was not saved</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="codingStandards">Coding standards</Label>
            <Textarea
              id="codingStandards"
              value={longForm.codingStandards}
              onChange={(event) => setLongForm((draft) => ({ ...draft, codingStandards: event.target.value }))}
              rows={10}
              placeholder="Preferred patterns, naming, validation rules, and Studio constraints."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gameSpec">Game context</Label>
            <Textarea
              id="gameSpec"
              value={longForm.gameSpec}
              onChange={(event) => setLongForm((draft) => ({ ...draft, gameSpec: event.target.value }))}
              rows={10}
              placeholder="Current game genre, systems, folders, monetization, and known constraints."
            />
          </div>
        </div>
      </Panel>
    </div>
  );

  const renderRoblox = () => (
    <div className="space-y-6">
      <Panel
        title="Roblox write consent"
        description="This is the master switch for generated asset uploads. Off means NexusRBX will not write Roblox assets automatically."
      >
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">Auto Upload Assets</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {settings.robloxAssetUploadsEnabled
                  ? "Generated assets may upload immediately through your connected Roblox OAuth account."
                  : "Generated assets stay local until you explicitly upload them."}
              </p>
            </div>
            <Switch
              checked={settings.robloxAssetUploadsEnabled}
              onCheckedChange={(robloxAssetUploadsEnabled) => updateSetting({ robloxAssetUploadsEnabled })}
              aria-label="Auto Upload Assets"
            />
          </div>
        </div>
      </Panel>

      <Panel
        title="Roblox OAuth"
        description="Connect Roblox for Creator Store and Open Cloud workflows."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={loadRoblox}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        }
      >
        <DataStateAlert state={robloxState} onRetry={loadRoblox} label="Roblox" />
        {robloxState.status !== "loading" && (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={robloxConnected ? "default" : "secondary"}>{robloxConnected ? "Connected" : "Disconnected"}</Badge>
                  {selectedCreator && <Badge variant="outline">{selectedCreator.type} {selectedCreator.id}</Badge>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {robloxConnected ? "OAuth is ready for scoped Roblox operations." : "Connect Roblox to enable publishing and creator targeting."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={async () => {
                    setRobloxAction("connect");
                    try {
                      await beginRobloxOAuth({ bundles: ["core", "creator_store_write"], returnPath: "/settings?tab=roblox" });
                    } finally {
                      setRobloxAction("");
                    }
                  }}
                  disabled={robloxAction === "connect"}
                >
                  {robloxAction === "connect" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {robloxConnected ? "Reconnect" : "Connect"}
                </Button>
                {robloxConnected && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        setRobloxAction("reauthorize");
                        try {
                          await beginRobloxReauthorization({ bundles: ["core", "creator_store_write"], returnPath: "/settings?tab=roblox" });
                        } finally {
                          setRobloxAction("");
                        }
                      }}
                      disabled={robloxAction === "reauthorize"}
                    >
                      Reauthorize
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={async () => {
                        setRobloxAction("disconnect");
                        try {
                          await disconnectRobloxOAuth();
                          await loadRoblox();
                        } finally {
                          setRobloxAction("");
                        }
                      }}
                      disabled={robloxAction === "disconnect"}
                    >
                      Disconnect
                    </Button>
                  </>
                )}
              </div>
            </div>

            {robloxConnected && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label>Creator target</Label>
                  <Select
                    value={selectedCreatorKey}
                    onValueChange={async (value) => {
                      if (value === "none") return;
                      const [type, id] = value.split(":");
                      await setRobloxTargetCreator({ type, id });
                      await loadRoblox();
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select creator" /></SelectTrigger>
                    <SelectContent>
                      {creators.length === 0 && <SelectItem value="none" disabled>No creators available</SelectItem>}
                      {creators.map((creator) => (
                        <SelectItem key={`${creator.type}:${creator.id}`} value={`${creator.type}:${creator.id}`}>
                          {creator.label || `${creator.type} ${creator.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Granted capabilities</Label>
                  <div className="flex min-h-10 flex-wrap gap-2 rounded-md border border-border bg-muted/20 p-2">
                    {(robloxStatus?.capabilities?.granted || []).length > 0 ? (
                      robloxStatus.capabilities.granted.slice(0, 8).map((capability) => (
                        <Badge key={capability.id || capability.label} variant="outline">
                          {capability.label || capability.id}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No scoped capabilities found.</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Studio handoff" description="Control when validated work can move toward Studio.">
        <div className="grid gap-3 lg:grid-cols-2">
          <ToggleRow
            label="Studio auto push"
            description="Allow approved generated changes to move toward the active Studio session."
            checked={settings.studioAutoPushEnabled}
            onCheckedChange={(studioAutoPushEnabled) => updateSetting({ studioAutoPushEnabled })}
          />
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
            <Label>Push policy</Label>
            <Select value={settings.studioAutoPushPolicy} onValueChange={(studioAutoPushPolicy) => updateSetting({ studioAutoPushPolicy })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STUDIO_POLICY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Panel>

      <Panel title="Roblox operations" description="Recent Roblox upload and polling activity.">
        {robloxState.operations.length === 0 ? (
          <EmptyState icon={Wand2} title="No Roblox operations yet" description="OAuth uploads and asset polling receipts will appear here." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {robloxState.operations.map((operation) => (
                <TableRow key={operation.id || operation.operationId || operation.createdAt}>
                  <TableCell>{operation.operationId || operation.type || operation.id || "Operation"}</TableCell>
                  <TableCell><Badge variant="outline">{operation.status || operation.state || "Unknown"}</Badge></TableCell>
                  <TableCell>{formatDate(operation.updatedAt || operation.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6">
      <Panel
        title="Billing plan"
        description="Plan, token balance, subscription controls, and billing recovery states."
        actions={<Button type="button" variant="outline" size="sm" onClick={billing.refresh}><RefreshCcw className="h-4 w-4" />Refresh</Button>}
      >
        {billing.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Billing unavailable</AlertTitle>
            <AlertDescription>{billing.error}</AlertDescription>
          </Alert>
        )}
        {billing.loading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <HealthTile icon={CreditCard} label="Plan" value={billing.plan || "FREE"} detail={billing.cycle || "No billing cycle"} state="good" />
            <HealthTile icon={Sparkles} label="Included tokens" value={formatNumber(billing.subRemaining)} detail="Subscription balance" state="neutral" />
            <HealthTile icon={Activity} label="Premium balance" value={formatNumber(billing.paygRemaining)} detail="Pay-as-you-go balance" state="neutral" />
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" onClick={() => redirectFromBilling(() => billing.subscriptionCheckout?.({ plan: "PRO", interval: "month" }))}>
            Upgrade to Pro
          </Button>
          <Button type="button" variant="outline" onClick={() => redirectFromBilling(() => billing.premiumBalanceCheckout?.({ packageKey: "starter" }))}>
            Add Premium Balance
          </Button>
          <Button type="button" variant="secondary" onClick={() => redirectFromBilling(() => billing.portal?.())}>
            Manage billing
          </Button>
          {!billing.isFreeUsagePlan && (
            <ConfirmationAction
              trigger={<Button type="button" variant="destructive">Cancel plan</Button>}
              title="Cancel subscription"
              description="Your paid subscription will be cancelled through the billing provider. Existing generated data is not deleted."
              confirmationText="CANCEL PLAN"
              actionLabel="Cancel plan"
              onConfirm={async () => {
                await billing.cancel?.();
                setNotice("Subscription cancellation requested.");
              }}
            />
          )}
        </div>
      </Panel>
    </div>
  );

  const renderTeam = () => (
    <div className="space-y-6">
      <Panel title="Team workspace" description="Create a shared team record for collaboration.">
        <form onSubmit={createTeam} className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 space-y-2">
            <Label htmlFor="teamName">Team name</Label>
            <Input id="teamName" value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Creator group name" />
          </div>
          <Button type="submit" className="self-end" disabled={!teamName.trim() || teamState.status === "loading"}>
            {teamState.status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
            Create team
          </Button>
        </form>
        <Separator className="my-6" />
        <DataStateAlert state={teamState} onRetry={loadTeams} label="Teams" />
        {teamState.status === "ready" && teamState.teams.length === 0 && (
          <EmptyState icon={Users} title="No teams yet" description="Create a team to start grouping shared artifacts and collaborators." />
        )}
        {teamState.status === "ready" && teamState.teams.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Members</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamState.teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>{team.name || "Untitled team"}</TableCell>
                  <TableCell><Badge variant="outline">{team.ownerId === user?.uid ? "Owner" : "Member"}</Badge></TableCell>
                  <TableCell>{Array.isArray(team.members) ? team.members.length : 1}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );

  const renderAccount = () => (
    <div className="space-y-6">
      <Panel title="Account" description="Signed-in identity and session controls.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Signed in as</div>
            <div className="mt-1 font-semibold">{user?.email || "Unknown user"}</div>
            <div className="mt-1 text-xs text-muted-foreground">UID {user?.uid || "Unavailable"}</div>
          </div>
          <Button type="button" variant="outline" onClick={() => signOut(auth)}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </Panel>

      <Panel title="Data recovery limits" description="Destructive actions require confirmation and cannot be undone from this interface.">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <h3 className="font-semibold">Clear chats</h3>
            <p className="mt-1 text-sm text-muted-foreground">Deletes stored chat threads and messages for this account.</p>
            <ConfirmationAction
              trigger={<Button type="button" variant="destructive" className="mt-4"><Trash2 className="h-4 w-4" />Clear chats</Button>}
              title="Clear all chats"
              description="This deletes your chat history. Generated artifacts already exported elsewhere are not recovered here."
              confirmationText="CLEAR CHATS"
              actionLabel="Clear chats"
              onConfirm={() => clearUserData("chats")}
            />
          </div>
          <div className="rounded-lg border border-border p-4">
            <h3 className="font-semibold">Clear scripts</h3>
            <p className="mt-1 text-sm text-muted-foreground">Deletes saved scripts and version records for this account.</p>
            <ConfirmationAction
              trigger={<Button type="button" variant="destructive" className="mt-4"><Trash2 className="h-4 w-4" />Clear scripts</Button>}
              title="Clear all scripts"
              description="This deletes saved script records and their versions. Studio files are not rolled back by this action."
              confirmationText="CLEAR SCRIPTS"
              actionLabel="Clear scripts"
              onConfirm={() => clearUserData("scripts")}
            />
          </div>
        </div>
      </Panel>
    </div>
  );

  const renderHelp = () => (
    <div className="space-y-6">
      <Panel title="Help and onboarding" description="Restart guided setup or return to the AI workspace.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              localStorage.removeItem("nexus_tutorial_completed");
              navigate("/ai");
            }}
          >
            Restart walkthrough
          </Button>
          <Button asChild>
            <Link to="/ai">
              Open AI workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Panel>
    </div>
  );

  const renderAdmin = () => {
    if (!isAdmin) {
      return (
        <Panel title="Admin access" description="This section is limited to accounts with the admin claim.">
          <EmptyState icon={Shield} title="Permission denied" description="Your account does not have access to admin settings." />
        </Panel>
      );
    }

    return (
      <div className="space-y-6">
        <Panel
          title="Admin overview"
          description="Developer-only usage and user inspection tools."
          actions={<Button type="button" variant="outline" size="sm" onClick={loadAdmin}><RefreshCcw className="h-4 w-4" />Refresh</Button>}
        >
          <DataStateAlert state={adminState} onRetry={loadAdmin} label="Admin data" />
          {adminState.status === "ready" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <HealthTile icon={Users} label="Users" value={formatNumber(adminState.stats?.users || adminState.users.length)} detail="Known accounts" />
              <HealthTile icon={Activity} label="Runs" value={formatNumber(adminState.stats?.runs || adminState.stats?.jobs || 0)} detail="Tracked jobs" />
              <HealthTile icon={Sparkles} label="Tokens" value={formatNumber(adminState.stats?.tokens || 0)} detail="Reported usage" />
            </div>
          )}
        </Panel>

        <Panel title="Token adjustment" description="Apply a manual token adjustment with an audit reason.">
          <form onSubmit={adjustTokens} className="grid gap-3 lg:grid-cols-[1fr_10rem_1fr_auto]">
            <Input placeholder="User UID" value={tokenAdjust.uid} onChange={(event) => setTokenAdjust((state) => ({ ...state, uid: event.target.value }))} />
            <Input placeholder="Amount" value={tokenAdjust.amount} onChange={(event) => setTokenAdjust((state) => ({ ...state, amount: event.target.value }))} />
            <Input placeholder="Reason" value={tokenAdjust.reason} onChange={(event) => setTokenAdjust((state) => ({ ...state, reason: event.target.value }))} />
            <Button type="submit">Apply</Button>
          </form>
        </Panel>

        <Panel title="User inspector" description="Load account details without exposing this section to non-admin users.">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="User UID"
              value={adminInspector.uid}
              onChange={(event) => setAdminInspector((state) => ({ ...state, uid: event.target.value }))}
            />
            <Button type="button" onClick={inspectUser} disabled={!adminInspector.uid.trim() || adminInspector.status === "loading"}>
              {adminInspector.status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
              Inspect
            </Button>
          </div>
          {adminInspector.status === "error" && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Inspector failed</AlertTitle>
              <AlertDescription>{adminInspector.error}</AlertDescription>
            </Alert>
          )}
          {adminInspector.status === "ready" && (
            <pre className="mt-4 max-h-80 overflow-auto rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
              {JSON.stringify(adminInspector.data, null, 2)}
            </pre>
          )}
          {adminInspector.status === "idle" && (
            <EmptyState icon={Shield} title="No user selected" description="Enter a UID to inspect billing, settings, and usage state." />
          )}
        </Panel>

        <Panel title="Brutal auditor" description="Existing developer audit tool.">
          <BrutalAuditor />
        </Panel>
      </div>
    );
  };

  const renderActiveTab = () => {
    if (!isAdmin && activeTab === "admin") return renderAdmin();
    if (activeTab === "ai") return renderAI();
    if (activeTab === "roblox") return renderRoblox();
    if (activeTab === "billing") return renderBilling();
    if (activeTab === "team") return renderTeam();
    if (activeTab === "account") return renderAccount();
    if (activeTab === "help") return renderHelp();
    if (activeTab === "admin") return renderAdmin();
    return renderOverview();
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-md border border-border bg-muted p-2">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">Settings</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Configure AI defaults, Roblox consent, billing, team access, and account data from one place.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <SaveStatus status={saveStatus} error={saveError} lastSavedAt={lastSavedAt} onRetry={() => reloadSettings()} />
            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" className="lg:hidden" aria-label="Open settings navigation">
                  <Menu className="h-4 w-4" />
                  Sections
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                  <SheetDescription>Choose a settings section.</SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <NavList items={navItems} activeTab={activeTab} onSelect={setTab} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {!user && !settingsLoading ? (
          <Panel title="Sign in required" description="Settings sync requires an authenticated account.">
            <EmptyState
              icon={Shield}
              title="Permission denied"
              description="Sign in to edit persisted settings and account data."
              action={<Button asChild><Link to="/login">Sign in</Link></Button>}
            />
          </Panel>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-6 rounded-lg border border-border bg-card p-2">
                <NavList items={navItems} activeTab={activeTab} onSelect={setTab} />
              </div>
            </aside>
            <section className="min-w-0">
              {settingsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-80 w-full" />
                </div>
              ) : (
                renderActiveTab()
              )}
            </section>
          </div>
        )}
      </div>

      <ProNudgeModal
        isOpen={Boolean(proNudgeReason)}
        onClose={() => setProNudgeReason("")}
        reason={proNudgeReason}
      />
    </main>
  );
}
