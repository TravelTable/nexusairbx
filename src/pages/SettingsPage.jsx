import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  Palette,
  RefreshCcw,
  Save,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Users,
  Wand2,
} from "lib/icons";
import { auth } from "../firebase";
import { useBilling } from "../context/BillingContext";
import { useSettings } from "../context/SettingsContext";
import { authedFetch } from "../lib/billing";
import { isRetryableApiError, readJsonResponse, withApiRetryCooldown } from "../lib/apiErrors";
import {
  beginRobloxOAuth,
  beginRobloxReauthorization,
  ensureRobloxCapabilities,
  getRobloxOAuthStatus,
  getRobloxOperations,
  needsRobloxUpgrade,
  ROBLOX_PRODUCT_DEFAULT_CAPABILITIES,
  revokeRobloxOAuth,
  setRobloxTargetCreator,
} from "../lib/robloxOAuthApi";
import RobloxAuthorizationRequired from "../components/roblox/RobloxAuthorizationRequired";
import { DEFAULT_SETTINGS } from "../lib/settingsSchema";
import { CHAT_MODES } from "../components/ai/chatConstants";
import ModelSwitcher from "../components/ai/ModelSwitcher";
import BrutalAuditor from "../components/ai/BrutalAuditor";
import FreeUsageMeter from "../components/FreeUsageMeter";
import ProNudgeModal from "../components/ProNudgeModal";
import SettingsSignInAction from "../components/settings/SettingsSignInAction";
import AppearanceSelector from "../components/settings/AppearanceSelector";
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
import { Button as BaseButton } from "../components/shadcn/button";
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
import { resolveSettingsTab } from "../lib/settingsNavigation";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "ai", label: "AI", icon: Bot },
  { id: "roblox", label: "Roblox + Studio", icon: Wand2 },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "team", label: "Team", icon: Users },
  { id: "account", label: "Account/Data", icon: Database },
  { id: "help", label: "Help", icon: HelpCircle },
];

const SECTION_META = {
  overview: {
    label: "Overview",
    description: "Check service readiness, recent usage, and the settings that affect your workspace.",
  },
  appearance: {
    label: "Appearance",
    description: "Choose how NexusRBX looks on this device. System follows your operating-system preference.",
  },
  ai: {
    label: "AI",
    description: "Choose the defaults and project context used when a new generation run starts.",
  },
  roblox: {
    label: "Roblox + Studio",
    description: "Manage publishing consent, Roblox authorization, creator targets, and Studio handoff.",
  },
  billing: {
    label: "Billing",
    description: "Review your plan and balances, then manage checkout or subscription changes.",
  },
  team: {
    label: "Team",
    description: "Create and review the workspaces available to your account.",
  },
  account: {
    label: "Account and data",
    description: "Review your signed-in identity, session, and irreversible account-data actions.",
  },
  help: {
    label: "Help",
    description: "Restart onboarding or return to the main AI workspace.",
  },
  admin: {
    label: "Admin",
    description: "Inspect account state and perform restricted developer operations.",
  },
};

const ADMIN_ITEM = { id: "admin", label: "Admin", icon: Shield };
const RETRYABLE_ROBLOX_MESSAGE =
  "Roblox connection is temporarily unavailable while the database is busy. Existing connection data is preserved.";
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
const ASSET_PUBLISHING_OPTIONS = [
  {
    value: "auto_explicit_request",
    label: "Publish explicit requests",
    description: "Recommended. Publish when your request clearly asks NexusRBX to create and use an asset and the creator is unambiguous.",
  },
  {
    value: "review_every_asset",
    label: "Review every asset",
    description: "Keep each generated asset ready for review until you approve publishing.",
  },
  {
    value: "always_project_creator",
    label: "Use the project's creator",
    description: "Publish routine approved assets to the creator saved on the active project.",
  },
  {
    value: "generate_only",
    label: "Generate only",
    description: "Create and save assets in NexusRBX without publishing them to Roblox.",
  },
];
const STUDIO_POLICY_OPTIONS = [
  { value: "after_validation", label: "Push after validation" },
  { value: "manual_review", label: "Manual review first" },
  { value: "off", label: "Never push automatically" },
];
const Button = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <BaseButton
    ref={ref}
    variant={variant}
    className={cn(
      "min-h-11 rounded-full px-5 focus-visible:ring-[var(--ds-focus-ring)]",
      variant === "default" && "bg-accent text-accent-foreground shadow-none hover:bg-accent/90",
      className
    )}
    {...props}
  />
));
Button.displayName = "SettingsButton";

const readJson = readJsonResponse;

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
  if (state === "good") return "border-[var(--ds-success-border)] bg-[var(--ds-success-soft)] text-[var(--ds-success)]";
  if (state === "warn") return "border-[var(--ds-warning-border)] bg-[var(--ds-warning-soft)] text-[var(--ds-warning)]";
  return "border-border bg-muted/40 text-muted-foreground";
}

function UsageTrendChart({ data }) {
  const width = 720;
  const height = 240;
  const padding = { top: 18, right: 18, bottom: 34, left: 52 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = data.map((entry) => Math.max(0, Number(entry.tokens) || 0));
  const maximum = Math.max(1, ...values);
  const points = values.map((value, index) => {
    const ratio = values.length === 1 ? 0.5 : index / (values.length - 1);
    return {
      x: padding.left + ratio * plotWidth,
      y: padding.top + plotHeight - (value / maximum) * plotHeight,
    };
  });
  const linePoints = points.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const areaPath = [
    `M ${firstPoint.x.toFixed(1)} ${(padding.top + plotHeight).toFixed(1)}`,
    ...points.map(({ x, y }) => `L ${x.toFixed(1)} ${y.toFixed(1)}`),
    `L ${lastPoint.x.toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} Z`,
  ].join(" ");
  const gridValues = [maximum, maximum / 2, 0];

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
      <svg
        className="h-56 w-full overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby="usage-trend-title usage-trend-description"
      >
        <title id="usage-trend-title">Recent included usage</title>
        <desc id="usage-trend-description">
          Usage ranges from 0 to {formatNumber(maximum)} across {data.length} recorded dates.
        </desc>
        {gridValues.map((value, index) => {
          const y = padding.top + (index / (gridValues.length - 1)) * plotHeight;
          return (
            <g key={value}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="var(--ds-border)"
                strokeDasharray="5 7"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fill="var(--ds-text-muted)"
                fontSize="12"
              >
                {formatNumber(Math.round(value))}
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="var(--ds-accent-soft)" />
        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--ds-accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map(({ x, y }, index) => (
          <circle
            key={`${data[index]?.date || index}-${values[index]}`}
            cx={x}
            cy={y}
            r="4"
            fill="var(--ds-surface-1)"
            stroke="var(--ds-accent)"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="flex justify-between gap-4 px-1 text-xs text-muted-foreground" aria-hidden="true">
        <span>{data[0]?.date || "First record"}</span>
        <span>{data[data.length - 1]?.date || "Latest record"}</span>
      </div>
    </div>
  );
}

function SaveStatus({ status, error, lastSavedAt, onRetry }) {
  if (status === "saving") {
    return (
      <div role="status" aria-live="polite" aria-atomic="true">
        <Badge variant="outline" className="gap-1.5 border-accent/35 text-accent">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving changes…
        </Badge>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2" role="alert" aria-live="assertive">
        <Badge variant="destructive" className="gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          Save failed
        </Badge>
        {error && <span className="max-w-[20rem] text-xs text-muted-foreground">{error}</span>}
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          <RefreshCcw className="h-4 w-4" />
          Reload settings
        </Button>
      </div>
    );
  }
  if (status === "saved") {
    return (
      <div role="status" aria-live="polite" aria-atomic="true">
        <Badge
          variant="outline"
          className="gap-1.5 border-[var(--ds-success-border)] bg-[var(--ds-success-soft)] text-[var(--ds-success)]"
          title={lastSavedAt ? `Last saved ${formatDate(lastSavedAt)}` : undefined}
        >
          <CheckCircle2 className="h-3 w-3" />
          All changes saved
        </Badge>
      </div>
    );
  }
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      <Badge variant="secondary">Changes save automatically</Badge>
    </div>
  );
}

function NavList({ items, activeTab, onSelect }) {
  return (
    <nav className="space-y-2" aria-label="Settings sections">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeTab;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex min-h-11 w-full items-center justify-between rounded-full px-4 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "bg-accent/10 text-accent"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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

function Panel({ title, description, actions, children, className, tone = "default" }) {
  return (
    <Card className={cn("overflow-hidden rounded-[14px] border-border/60 bg-card shadow-none", tone === "danger" && "border-destructive/40", className)}>
      <CardHeader
        className={cn(
          "flex gap-4 px-6 pb-3 pt-7 sm:flex-row sm:items-start sm:justify-between sm:space-y-0 sm:px-8 sm:pt-8",
          tone === "danger" && "bg-destructive/5"
        )}
      >
        <div className="space-y-1.5">
          <CardTitle className={cn("text-base", tone === "danger" && "text-destructive")}>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent className="px-6 pb-7 pt-4 sm:px-8 sm:pb-8">{children}</CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon = HelpCircle, title, description, action }) {
  return (
    <div className="rounded-[14px] bg-muted/25 p-8 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function HealthTile({ icon: Icon, label, value, detail, state = "neutral", action }) {
  return (
    <div className={cn("rounded-md border p-4", statusTone(state))}>
      <div className="flex items-start justify-between gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        {action}
      </div>
      <div className="mt-3">
        <div className="text-xs font-medium text-current/75">{label}</div>
        <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
        {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onCheckedChange, disabled }) {
  const switchId = React.useId();

  return (
    <div className="flex min-h-20 items-start justify-between gap-5 rounded-[12px] bg-muted/25 p-5">
      <div className="space-y-1">
        <Label htmlFor={switchId} className="text-sm font-semibold">{label}</Label>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <Switch id={switchId} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
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
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const matches = value === confirmationText;

  const reset = () => {
    setValue("");
    setError("");
    setRunning(false);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
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
          {error && <p className="text-sm text-destructive">{error}</p>}
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
              setError("");
              try {
                await onConfirm();
                setOpen(false);
                reset();
              } catch (err) {
                setError(err?.message || "Action failed.");
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
  const location = useLocation();
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
  const [activeTab, setActiveTab] = useState(() => (user ? "overview" : "appearance"));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  const navItems = useMemo(() => {
    if (!user) return NAV_ITEMS.filter((item) => item.id === "appearance");
    return isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;
  }, [isAdmin, user]);
  const fallbackTab = user ? "overview" : "appearance";
  const permissionsReady = !user || billing.loading !== true;
  const activeSection = SECTION_META[activeTab] || SECTION_META.overview;
  const robloxStatus = robloxState.statusData;
  const robloxConnected = Boolean(robloxStatus?.connected);
  const robloxUpgradeRequired = needsRobloxUpgrade(robloxStatus);
  const robloxConnection = robloxStatus?.connection || null;
  const robloxIdentity = robloxConnection?.identity || robloxConnection?.profile || null;
  const selectedCreator = robloxConnection?.selectedCreator || null;
  const creators = (Array.isArray(robloxStatus?.authorizedCreators)
    ? robloxStatus.authorizedCreators
    : Array.isArray(robloxConnection?.creators) ? robloxConnection.creators : [])
    .filter((creator) => creator?.authorized !== false);
  const accessibleUniverses = Array.isArray(robloxStatus?.accessibleUniverses)
    ? robloxStatus.accessibleUniverses
    : Array.isArray(robloxConnection?.universes) ? robloxConnection.universes : [];
  const grantedScopes = Array.isArray(robloxStatus?.grantedScopes)
    ? robloxStatus.grantedScopes
    : Array.isArray(robloxConnection?.grantedScopes) ? robloxConnection.grantedScopes : [];
  const missingScopes = Array.isArray(robloxStatus?.missingScopes) ? robloxStatus.missingScopes : [];
  const missingPermissions = Array.isArray(robloxConnection?.missingPermissions) ? robloxConnection.missingPermissions : [];
  const tokenHealth = robloxStatus?.tokenHealth || robloxConnection?.tokenHealth || null;
  const lastRobloxOperation = robloxStatus?.lastSuccessfulOperation || robloxConnection?.lastSuccessfulOperation || null;
  const selectedCreatorKey = selectedCreator ? `${selectedCreator.type}:${selectedCreator.id}` : "none";
  const publishingPreference = settings.assetPublishingPreference || "auto_explicit_request";
  const publishingPreferenceDetails = ASSET_PUBLISHING_OPTIONS.find((option) => option.value === publishingPreference)
    || ASSET_PUBLISHING_OPTIONS[0];
  const longFormDirty =
    longForm.codingStandards !== (settings.codingStandards || "") ||
    longForm.gameSpec !== (settings.gameSpec || "");

  const setRobloxActionError = useCallback((error, fallbackMessage) => {
    const retryable = isRetryableApiError(error);
    setRobloxState((state) => ({
      ...state,
      error: retryable ? RETRYABLE_ROBLOX_MESSAGE : error?.message || fallbackMessage,
      retryable,
    }));
  }, []);

  useEffect(() => {
    if (!permissionsReady) return;

    const params = new URLSearchParams(location.search);
    const requestedTab = params.get("tab");
    const nextTab = resolveSettingsTab({
      allowedTabs: navItems.map((item) => item.id),
      requestedTab,
      currentTab: activeTab,
      fallbackTab,
    });

    if (!nextTab) return;
    if (nextTab !== activeTab) setActiveTab(nextTab);

    if (requestedTab !== nextTab) {
      params.set("tab", nextTab);
      navigate(
        { pathname: location.pathname, search: `?${params.toString()}` },
        { replace: true },
      );
    }
  }, [activeTab, fallbackTab, location.pathname, location.search, navigate, navItems, permissionsReady]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const robloxResult = params.get("roblox");
    if (robloxResult === "connected") setNotice("Roblox connection updated.");
    if (robloxResult === "error") setNotice(params.get("message") || "Roblox authorization failed.");
  }, [location.search]);

  useEffect(() => {
    if (!longFormDirty) {
      setLongForm({
        codingStandards: settings.codingStandards || "",
        gameSpec: settings.gameSpec || "",
      });
    }
  }, [longFormDirty, settings.codingStandards, settings.gameSpec]);

  const setTab = useCallback((tab) => {
    const nextTab = resolveSettingsTab({
      allowedTabs: navItems.map((item) => item.id),
      requestedTab: tab,
      currentTab: activeTab,
      fallbackTab,
    });
    if (!nextTab) return;

    const params = new URLSearchParams(location.search);
    params.set("tab", nextTab);
    setActiveTab(nextTab);
    setMobileNavOpen(false);
    navigate(
      { pathname: location.pathname, search: `?${params.toString()}` },
      { replace: true },
    );
  }, [activeTab, fallbackTab, location.pathname, location.search, navigate, navItems]);

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
      const data = await withApiRetryCooldown("user:teams", "Failed to load teams.", async () => (
        readJson(await authedFetch("/api/user/teams", { noCache: true }), "Failed to load teams.")
      ));
      setTeamState({ status: "ready", teams: Array.isArray(data.teams) ? data.teams : [], error: "" });
    } catch (error) {
      setTeamState((state) => {
        const message = isRetryableApiError(error)
          ? "Teams are temporarily unavailable while the database is busy. Existing team data is preserved."
          : error.message || "Failed to load teams.";
        return {
          ...state,
          status: isRetryableApiError(error) && state.teams.length > 0 ? "ready" : "error",
          error: message,
          retryable: isRetryableApiError(error),
        };
      });
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
      setRobloxState((state) => {
        const retryable = isRetryableApiError(error);
        return {
          ...state,
          status: retryable && state.statusData ? "ready" : "error",
          error: retryable ? RETRYABLE_ROBLOX_MESSAGE : error.message || "Failed to load Roblox status.",
          retryable,
        };
      });
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
    try {
      const data = await readJson(
        await authedFetch(`/api/user/data/${type}`, { method: "DELETE" }),
        `Failed to clear ${type}.`
      );
      setNotice(`${type === "chats" ? "Chats" : "Scripts"} cleared (${formatNumber(data.count)} records).`);
    } catch (error) {
      const message = error?.message || `Failed to clear ${type}.`;
      setNotice(message);
      throw error;
    }
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
            actions={<Button type="button" variant="outline" size="sm" onClick={loadUsage}><RefreshCcw className="h-4 w-4" />Refresh</Button>}
          >
            <DataStateAlert state={usageState} onRetry={loadUsage} label="Usage" />
            {usageState.status === "ready" && usageState.chartData.length > 0 && (
              <UsageTrendChart data={usageState.chartData} />
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
          <div className="space-y-2" role="group" aria-labelledby="model-setting-label">
            <Label id="model-setting-label">Model</Label>
            <ModelSwitcher
              value={settings.modelVersion}
              isPremium={billing.isPremium}
              isStarterOrAbove={billing.isStarterOrAbove}
              onChange={(modelVersion) => updateSetting({ modelVersion })}
              onProNudge={(reason) => setProNudgeReason(reason)}
              onStarterNudge={() => navigate("/subscribe?highlight=starter")}
              fullWidth
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-mode">Chat mode</Label>
            <Select value={settings.chatMode} onValueChange={(chatMode) => updateSetting({ chatMode })}>
              <SelectTrigger id="chat-mode"><SelectValue placeholder="Select mode" /></SelectTrigger>
              <SelectContent>
                {CHAT_MODES.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>{mode.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="code-style">Code style</Label>
            <Select value={settings.codeStyle} onValueChange={(codeStyle) => updateSetting({ codeStyle })}>
              <SelectTrigger id="code-style"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CODE_STYLE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="response-detail">Response detail</Label>
            <Select value={settings.verbosity} onValueChange={(verbosity) => updateSetting({ verbosity })}>
              <SelectTrigger id="response-detail"><SelectValue /></SelectTrigger>
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
        </div>
      </Panel>

      <Panel
        title="Project context"
        description="Long-form instructions save explicitly so accidental edits do not overwrite your workspace defaults."
        actions={
          <Button type="button" onClick={() => updateSetting(longForm)} disabled={!longFormDirty || saveStatus === "saving"}>
            {saveStatus === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saveStatus === "saving" ? "Saving context…" : "Save context"}
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

  const renderAppearance = () => (
    <div className="space-y-6">
      <Panel
        title="Color appearance"
        description="NexusRBX applies this choice before the page paints, including the public site and AI workspace."
      >
        <AppearanceSelector
          value={settings.theme}
          onChange={(theme) => updateSetting({ theme })}
          disabled={saveStatus === "saving"}
        />
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {user
            ? "Your appearance preference syncs with your NexusRBX account and remains available on this device."
            : "This preference is saved on this device. Sign in when you want it synchronized with your account."}
        </p>
        {!user && <div className="mt-4"><SettingsSignInAction /></div>}
      </Panel>
    </div>
  );

  const renderRoblox = () => (
    <div className="space-y-6">
      <Panel
        title="Roblox write consent"
        description="Auto Upload Assets is the master consent for every Roblox asset write. Your local NexusRBX assets remain available either way."
      >
        <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">Auto Upload Assets</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {settings.robloxAssetUploadsEnabled
                  ? "Generated assets may upload immediately through your connected Roblox OAuth account."
                  : "No Roblox asset writes are allowed. Generation can continue and assets stay saved in NexusRBX."}
              </p>
            </div>
            <Switch
              checked={settings.robloxAssetUploadsEnabled}
              onCheckedChange={(robloxAssetUploadsEnabled) => updateSetting({ robloxAssetUploadsEnabled })}
              aria-label="Auto Upload Assets"
            />
          </div>
          <Separator />
          <div className="grid gap-2 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
            <div className="space-y-2">
              <Label htmlFor="asset-publishing-preference">Publishing preference</Label>
              <Select
                value={publishingPreference}
                onValueChange={(assetPublishingPreference) => updateSetting({ assetPublishingPreference })}
                disabled={!settings.robloxAssetUploadsEnabled}
              >
                <SelectTrigger id="asset-publishing-preference" aria-describedby="asset-publishing-preference-help">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_PUBLISHING_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p id="asset-publishing-preference-help" className="text-sm leading-6 text-muted-foreground">
              {settings.robloxAssetUploadsEnabled
                ? publishingPreferenceDetails.description
                : "Turn on Auto Upload Assets to configure publishing. NexusRBX will not publish while the master switch is off."}
            </p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Roblox OAuth"
        description="Your Roblox identity, authorized creator targets, scopes, and token health. OAuth credentials never appear here."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={loadRoblox}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        }
      >
        <DataStateAlert state={robloxState} onRetry={loadRoblox} label="Roblox" />
        {robloxConnected && robloxUpgradeRequired && (
          <RobloxAuthorizationRequired
            connected
            upgradeRequired
            capabilityIds={ROBLOX_PRODUCT_DEFAULT_CAPABILITIES}
            onAuthorize={async () => {
              try {
                await ensureRobloxCapabilities({
                  capabilities: ROBLOX_PRODUCT_DEFAULT_CAPABILITIES,
                  returnPath: "/settings?tab=roblox",
                });
              } catch (error) {
                setRobloxActionError(error, "Failed to start Roblox authorization.");
              }
            }}
            className="border-[var(--ds-warning-border)] bg-[var(--ds-warning-soft)] text-[var(--ds-warning)]"
          />
        )}
        {robloxState.status !== "loading" && (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={robloxConnected ? "outline" : "secondary"}
                    className={robloxConnected ? "border-[var(--ds-success-border)] bg-[var(--ds-success-soft)] text-[var(--ds-success)]" : undefined}
                  >
                    {robloxConnected ? "Connected" : "Disconnected"}
                  </Badge>
                  {selectedCreator && <Badge variant="outline">{selectedCreator.type} {selectedCreator.id}</Badge>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {robloxConnected
                    ? `${robloxIdentity?.displayName || robloxIdentity?.name || robloxIdentity?.username || "Roblox account"}${robloxIdentity?.username ? ` (@${robloxIdentity.username})` : ""}${robloxIdentity?.userId || robloxIdentity?.id || robloxIdentity?.sub ? ` · User ${robloxIdentity.userId || robloxIdentity.id || robloxIdentity.sub}` : ""}`
                    : "Connect Roblox to enable publishing and creator targeting."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={async () => {
                    setRobloxAction("connect");
                    try {
                      await beginRobloxOAuth({ returnPath: "/settings?tab=roblox" });
                    } catch (error) {
                      setRobloxActionError(error, "Could not start Roblox connection.");
                    } finally {
                      setRobloxAction("");
                    }
                  }}
                  disabled={robloxAction === "connect"}
                >
                  {robloxAction === "connect" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {robloxAction === "connect"
                    ? (robloxConnected ? "Reconnecting…" : "Connecting…")
                    : (robloxConnected ? "Reconnect" : "Connect")}
                </Button>
                {robloxConnected && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        setRobloxAction("reauthorize");
                        try {
                          await beginRobloxReauthorization({ returnPath: "/settings?tab=roblox" });
                        } catch (error) {
                          setRobloxActionError(error, "Could not start Roblox reauthorization.");
                        } finally {
                          setRobloxAction("");
                        }
                      }}
                      disabled={robloxAction === "reauthorize"}
                    >
                      {robloxAction === "reauthorize" && <Loader2 className="h-4 w-4 animate-spin" />}
                      {robloxAction === "reauthorize" ? "Reauthorizing…" : "Reauthorize"}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={async () => {
                        setRobloxAction("revoke");
                        try {
                          await revokeRobloxOAuth();
                          await loadRoblox();
                        } catch (error) {
                          setRobloxActionError(error, "Could not revoke Roblox access.");
                        } finally {
                          setRobloxAction("");
                        }
                      }}
                      disabled={robloxAction === "revoke"}
                    >
                      {robloxAction === "revoke" && <Loader2 className="h-4 w-4 animate-spin" />}
                      {robloxAction === "revoke" ? "Revoking…" : "Revoke access"}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {robloxConnected && (
              <div className="space-y-4">
                {(missingScopes.length > 0 || missingPermissions.length > 0) && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Roblox permission required</AlertTitle>
                    <AlertDescription>
                      Reauthorize Roblox to restore: {[...missingScopes, ...missingPermissions].join(", ")}.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                  <Label htmlFor="roblox-creator-target">Creator target</Label>
                  <Select
                    value={selectedCreatorKey}
                    onValueChange={async (value) => {
                      if (value === "none") return;
                      const [type, id] = value.split(":");
                      try {
                        await setRobloxTargetCreator({ type, id });
                        await loadRoblox();
                      } catch (error) {
                        setRobloxActionError(error, "Failed to update Roblox creator target.");
                      }
                    }}
                  >
                    <SelectTrigger id="roblox-creator-target"><SelectValue placeholder="Select creator" /></SelectTrigger>
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
                    <Label>Granted scopes</Label>
                    <div className="flex min-h-10 flex-wrap gap-2 rounded-md border border-border bg-muted/20 p-2">
                      {grantedScopes.length > 0 ? (
                        grantedScopes.slice(0, 10).map((scope) => (
                          <Badge key={scope} variant="outline">
                            {scope}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No OAuth scopes reported.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <HealthTile
                    icon={Shield}
                    label="Token health"
                    value={tokenHealth?.status || "Unknown"}
                    detail={tokenHealth?.accessTokenExpiresAt ? `Access expires ${formatDate(tokenHealth.accessTokenExpiresAt)}` : "Refresh is handled securely by the server."}
                    state={tokenHealth?.status === "healthy" || tokenHealth?.status === "valid" ? "good" : "neutral"}
                  />
                  <HealthTile
                    icon={Users}
                    label="Creator targets"
                    value={formatNumber(creators.length)}
                    detail={`${formatNumber(creators.filter((creator) => creator.type === "Group").length)} authorized groups`}
                    state={creators.length ? "good" : "warn"}
                  />
                  <HealthTile
                    icon={Sparkles}
                    label="Universes"
                    value={formatNumber(accessibleUniverses.length)}
                    detail="Accessible resources reported by Roblox"
                    state="neutral"
                  />
                  <HealthTile
                    icon={Activity}
                    label="Last operation"
                    value={lastRobloxOperation?.type || "None recorded"}
                    detail={lastRobloxOperation?.occurredAt ? formatDate(lastRobloxOperation.occurredAt) : "No successful operation reported yet"}
                    state={lastRobloxOperation ? "good" : "neutral"}
                  />
                </div>

                <details className="rounded-lg border border-border bg-muted/20 p-4">
                  <summary className="cursor-pointer text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    Authorized creators and universes
                  </summary>
                  <div className="mt-4 grid gap-5 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Creator targets</Label>
                      {creators.length ? (
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {creators.map((creator) => (
                            <li key={`${creator.type}:${creator.id}`} className="rounded-md border border-border bg-background/40 p-3">
                              <span className="font-medium text-foreground">{creator.name || `${creator.type} ${creator.id}`}</span>
                              <span className="ml-2">{creator.type} {creator.id}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-muted-foreground">No authorized creators reported.</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Accessible universes</Label>
                      {accessibleUniverses.length ? (
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {accessibleUniverses.map((universe) => (
                            <li key={universe.id} className="rounded-md border border-border bg-background/40 p-3">
                              <span className="font-medium text-foreground">{universe.name || `Universe ${universe.id}`}</span>
                              <span className="ml-2">{universe.id}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-muted-foreground">No accessible universes were reported.</p>}
                    </div>
                  </div>
                </details>

                <div className="space-y-2">
                  <Label>Granted capabilities</Label>
                  <div className="flex min-h-10 flex-wrap gap-2 rounded-md border border-border bg-muted/20 p-2">
                    {(robloxStatus?.capabilities?.granted || []).length > 0 ? (
                      robloxStatus.capabilities.granted.slice(0, 8).map((capability) => (
                        <Badge key={capability.id || capability.label || capability} variant="outline">
                          {capability.label || capability.id || capability}
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
            <Label htmlFor="studio-push-policy">Push policy</Label>
            <Select value={settings.studioAutoPushPolicy} onValueChange={(studioAutoPushPolicy) => updateSetting({ studioAutoPushPolicy })}>
              <SelectTrigger id="studio-push-policy"><SelectValue /></SelectTrigger>
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
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" onClick={() => redirectFromBilling(() => billing.subscriptionCheckout?.({ plan: "PRO", interval: "month" }))}>
            Upgrade to Pro
          </Button>
          <Button type="button" variant="outline" onClick={() => redirectFromBilling(() => billing.premiumBalanceCheckout?.({ packageKey: "starter" }))}>
            Add Premium Balance
          </Button>
          <Button type="button" variant="secondary" onClick={() => redirectFromBilling(() => billing.portal?.())}>
            Manage billing
          </Button>
        </div>
        {!billing.isFreeUsagePlan && (
          <div className="mt-6 flex flex-col gap-4 border-t border-destructive/25 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-destructive">Cancel subscription</h3>
              <p className="mt-1 text-sm text-muted-foreground">Stops renewal without deleting your generated data.</p>
            </div>
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
          </div>
        )}
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
            {teamState.status === "loading" ? "Creating team…" : "Create team"}
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
      <Panel title="Profile and session" description="Signed-in identity and session controls.">
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

      <Panel
        title="Danger zone"
        description="These actions permanently remove account data. Each one requires typed confirmation."
        tone="danger"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-destructive/25 bg-destructive/[0.03] p-4">
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
          <div className="rounded-md border border-destructive/25 bg-destructive/[0.03] p-4">
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
          <form onSubmit={adjustTokens} className="grid gap-3 lg:grid-cols-[1fr_10rem_1fr_auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="token-adjustment-uid">User UID</Label>
              <Input id="token-adjustment-uid" placeholder="User UID" value={tokenAdjust.uid} onChange={(event) => setTokenAdjust((state) => ({ ...state, uid: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token-adjustment-amount">Amount</Label>
              <Input id="token-adjustment-amount" inputMode="numeric" placeholder="Amount" value={tokenAdjust.amount} onChange={(event) => setTokenAdjust((state) => ({ ...state, amount: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token-adjustment-reason">Reason</Label>
              <Input id="token-adjustment-reason" placeholder="Reason" value={tokenAdjust.reason} onChange={(event) => setTokenAdjust((state) => ({ ...state, reason: event.target.value }))} />
            </div>
            <Button
              type="submit"
              disabled={!tokenAdjust.uid.trim() || !tokenAdjust.amount.trim() || !Number.isFinite(Number(tokenAdjust.amount))}
            >
              Apply
            </Button>
          </form>
        </Panel>

        <Panel title="User inspector" description="Load account details without exposing this section to non-admin users.">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="admin-inspector-uid">User UID</Label>
              <Input
                id="admin-inspector-uid"
                placeholder="User UID"
                value={adminInspector.uid}
                onChange={(event) => setAdminInspector((state) => ({ ...state, uid: event.target.value }))}
              />
            </div>
            <Button type="button" onClick={inspectUser} disabled={!adminInspector.uid.trim() || adminInspector.status === "loading"}>
              {adminInspector.status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
              {adminInspector.status === "loading" ? "Inspecting…" : "Inspect"}
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
    if (activeTab === "appearance") return renderAppearance();
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
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:gap-14 lg:px-14 lg:py-20">
        <header className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-accent/10 p-3 text-accent">
              <Settings className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-[var(--ds-font-display)] text-4xl font-bold leading-tight tracking-[-0.035em] sm:text-5xl">Settings</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Configure AI defaults, Roblox consent, billing, team access, and account data from one place.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
            <SaveStatus status={saveStatus} error={saveError} lastSavedAt={lastSavedAt} onRetry={() => reloadSettings()} />
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" className="lg:hidden" aria-label="Open settings sections">
                  <Menu className="h-4 w-4" />
                  Sections
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(22rem,100vw)]">
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

        {notice && (
          <Alert role="status" aria-live="polite">
            <Activity className="h-4 w-4" />
            <AlertTitle>Settings update</AlertTitle>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}

        {!user && activeTab !== "appearance" && !settingsLoading ? (
          <Panel title="Sign in required" description="Settings sync requires an authenticated account.">
            <EmptyState
              icon={Shield}
              title="Permission denied"
              description="Sign in to edit persisted settings and account data."
              action={<SettingsSignInAction />}
            />
          </Panel>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
            <aside className="hidden lg:block">
              <div className="sticky top-8 p-1">
                <NavList items={navItems} activeTab={activeTab} onSelect={setTab} />
              </div>
            </aside>
            <section className="min-w-0" aria-labelledby="settings-section-title">
              <div className="mb-9">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Account settings</p>
                <h2 id="settings-section-title" className="mt-3 text-2xl font-semibold tracking-[-0.02em]">
                  {activeSection.label}
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{activeSection.description}</p>
              </div>
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
