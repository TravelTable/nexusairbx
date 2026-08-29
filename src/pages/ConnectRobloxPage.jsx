import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Check, Loader, LogOut, PlugZap } from "lib/icons";
import { signOut } from "firebase/auth";

import { auth } from "../firebase";
import { useRobloxConnection } from "../context/RobloxConnectionContext";
import { beginRobloxOAuth, ROBLOX_PRODUCT_DEFAULT_CAPABILITIES } from "../lib/robloxOAuthApi";
import { connectRobloxPath, safeSignupReturnPath } from "../lib/signupRobloxOnboarding";
import { AuthStatusAlert, NexusAuthShell } from "../components/auth/NexusAuthShell";
import { Button } from "../components/shadcn/button";

const CAPABILITY_COPY = [
  "Confirm your Roblox identity",
  "Read and upload Roblox assets",
  "Search the Creator Store",
];

export default function ConnectRobloxPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const roblox = useRobloxConnection();
  const refreshRoblox = roblox.refresh;
  const [action, setAction] = useState("");
  const [localError, setLocalError] = useState("");
  const returnPath = useMemo(
    () => safeSignupReturnPath(searchParams.get("return"), "/ai"),
    [searchParams]
  );
  const callbackReturnPath = connectRobloxPath(returnPath);
  const callbackError = searchParams.get("roblox") === "error"
    ? searchParams.get("message") || "Roblox connection was cancelled."
    : "";

  useEffect(() => {
    if (searchParams.get("roblox") === "connected") {
      void refreshRoblox({ force: true });
    }
  }, [refreshRoblox, searchParams]);

  useEffect(() => {
    if (roblox.status?.onboarding?.satisfied === true && roblox.connected) {
      navigate(returnPath, { replace: true });
    }
  }, [navigate, returnPath, roblox.connected, roblox.status]);

  if (roblox.authReady && !roblox.user) {
    return <Navigate to="/signin" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;
  }

  if (roblox.user && roblox.user.emailVerified !== true) {
    return <Navigate to="/verify-email" replace state={{ returnPath: callbackReturnPath }} />;
  }

  const connect = async () => {
    setAction("connect");
    setLocalError("");
    try {
      const result = await beginRobloxOAuth({
        capabilities: ROBLOX_PRODUCT_DEFAULT_CAPABILITIES,
        returnPath: callbackReturnPath,
      });
      if (result?.authorized) await refreshRoblox({ force: true });
    } catch (error) {
      setLocalError(error?.message || "Could not start Roblox authorization.");
    } finally {
      setAction("");
    }
  };

  const leave = async () => {
    setAction("signout");
    await signOut(auth);
    navigate("/", { replace: true });
  };

  const statusMessage = localError || callbackError || roblox.error?.message || "";
  const primaryLabel = action === "connect"
    ? "Opening Roblox…"
    : roblox.phase === "checking"
      ? "Checking connection…"
      : statusMessage
        ? "Retry Roblox connection"
        : "Connect Roblox";

  return (
    <NexusAuthShell
      title="Connect your Roblox account"
      description="Finish account setup so NexusRBX can work with your Roblox identity and creation tools."
    >
      <div className="grid gap-5">
        <ol className="grid grid-cols-3 gap-2" aria-label="Account setup progress">
          {["Account", "Email", "Roblox"].map((label, index) => {
            const complete = index < 2;
            return (
              <li key={label} className="grid gap-2 text-xs font-semibold text-[var(--ds-text-muted)]">
                <span className={`h-1 rounded-full ${complete ? "bg-[var(--ds-success)]" : "bg-[var(--ds-accent)]"}`} />
                <span className="flex items-center gap-1.5">
                  {complete ? <Check className="h-3.5 w-3.5" /> : <PlugZap className="h-3.5 w-3.5" />}
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        <AuthStatusAlert status={statusMessage ? "error" : "idle"} message={statusMessage} />

        <div className="rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] p-4">
          <h2 className="text-sm font-semibold text-[var(--ds-text)]">Standard Roblox access</h2>
          <ul className="mt-3 grid gap-2 text-sm text-[var(--ds-text-secondary)]">
            {CAPABILITY_COPY.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ds-success)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-[var(--ds-text-muted)]">
            NexusRBX stores the connection securely. Roblox will show the exact permissions before you approve them.
          </p>
        </div>

        <Button
          type="button"
          className="h-12 w-full rounded-[10px] bg-[var(--ds-text)] text-[var(--ds-bg-canvas)]"
          disabled={Boolean(action) || roblox.phase === "checking"}
          onClick={connect}
        >
          {action === "connect" || roblox.phase === "checking" ? <Loader className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
          {primaryLabel}
        </Button>
        <Button type="button" variant="ghost" className="h-11" disabled={Boolean(action)} onClick={leave}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </NexusAuthShell>
  );
}
