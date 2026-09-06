import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Check, Loader, LogOut, PlugZap } from "lib/icons";
import { signOut } from "firebase/auth";

import { auth } from "../firebase";
import { useRobloxConnection } from "../context/RobloxConnectionContext";
import { beginRobloxOAuth, ROBLOX_PRODUCT_DEFAULT_CAPABILITIES } from "../lib/robloxOAuthApi";
import { connectRobloxPath, safeSignupReturnPath } from "../lib/signupRobloxOnboarding";
import { AuthStatusAlert, NexusAuthShell } from "../components/auth/NexusAuthShell";
import { Button } from "../components/shadcn/button";
import { robloxSetupErrorMessage } from "../lib/robloxAuthorizationMessages";

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
  const actionRef = useRef(false);
  const callbackSuccess = searchParams.get("roblox") === "connected";
  const [callbackChecked, setCallbackChecked] = useState(false);
  const [callbackDismissed, setCallbackDismissed] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const returnPath = useMemo(
    () => safeSignupReturnPath(searchParams.get("return"), "/ai"),
    [searchParams]
  );
  const callbackReturnPath = connectRobloxPath(returnPath);
  const callbackError = !callbackDismissed && searchParams.get("roblox") === "error"
    ? robloxSetupErrorMessage({ code: searchParams.get("code") })
    : "";

  useEffect(() => {
    if (!callbackSuccess) return undefined;
    let active = true;
    setCallbackChecked(false);
    void refreshRoblox({ force: true }).then((status) => {
      if (!active) return;
      setCallbackChecked(true);
      setCheckFailed(!status);
      if (status?.connected && status?.onboarding?.satisfied === true) {
        navigate(returnPath, { replace: true });
      } else if (!status) {
        setLocalError("We couldn’t check your Roblox connection. Check again to finish setup.");
      }
    }).catch(() => {
      if (!active) return;
      setCallbackChecked(true);
      setCheckFailed(true);
      setLocalError("We couldn’t check your Roblox connection. Check again to finish setup.");
    });
    return () => { active = false; };
  }, [callbackSuccess, navigate, refreshRoblox, returnPath]);

  useEffect(() => {
    if (!callbackSuccess && roblox.phase !== "checking" && roblox.phase !== "refreshing" && !roblox.error && roblox.status?.onboarding?.satisfied === true && roblox.connected) {
      navigate(returnPath, { replace: true });
    }
  }, [callbackSuccess, navigate, returnPath, roblox.connected, roblox.error, roblox.phase, roblox.status]);

  if (roblox.authReady && !roblox.user) {
    return <Navigate to="/signin" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;
  }

  if (roblox.user && roblox.user.emailVerified !== true) {
    return <Navigate to="/verify-email" replace state={{ returnPath: callbackReturnPath }} />;
  }

  const connect = async () => {
    if (actionRef.current) return;
    actionRef.current = true;
    setAction(needsStatusCheck ? "check" : "connect");
    setLocalError("");
    setCallbackDismissed(true);
    try {
      if (needsStatusCheck) {
        const status = await refreshRoblox({ force: true });
        setCheckFailed(!status);
        if (status?.connected && status?.onboarding?.satisfied === true) {
          navigate(returnPath, { replace: true });
        } else if (!status) {
          setLocalError("We couldn’t check your Roblox connection. Try again in a moment.");
        }
        return;
      }
      const result = await beginRobloxOAuth({
        capabilities: ROBLOX_PRODUCT_DEFAULT_CAPABILITIES,
        returnPath: callbackReturnPath,
      });
      if (result?.authorized) {
        const status = await refreshRoblox({ force: true });
        setCheckFailed(!status);
        if (status?.connected && status?.onboarding?.satisfied === true) navigate(returnPath, { replace: true });
        else if (!status) setLocalError("We couldn’t check your Roblox connection. Check again to finish setup.");
      }
    } catch (error) {
      setLocalError(robloxSetupErrorMessage(error));
    } finally {
      actionRef.current = false;
      setAction("");
    }
  };

  const leave = async () => {
    if (actionRef.current) return;
    actionRef.current = true;
    setAction("signout");
    setLocalError("");
    try {
      await signOut(auth);
      navigate("/", { replace: true });
    } catch (_) {
      setLocalError("Couldn’t sign out. Please try again.");
    } finally {
      actionRef.current = false;
      setAction("");
    }
  };

  const checking = roblox.phase === "checking" || roblox.phase === "refreshing" || (callbackSuccess && !callbackChecked);
  const needsStatusCheck = checkFailed || Boolean(roblox.error) || roblox.phase === "unavailable" || (callbackSuccess && callbackChecked && !roblox.status);
  const statusMessage = localError || callbackError || (roblox.error ? "We couldn’t check your Roblox connection. Check again before continuing." : "");
  const primaryLabel = action === "connect"
    ? "Opening Roblox…"
    : checking || action === "check"
      ? "Checking connection…"
      : needsStatusCheck
        ? "Check connection again"
        : roblox.connected
          ? "Update permissions"
          : "Connect Roblox";

  return (
    <NexusAuthShell
      title="Connect your Roblox account"
      description="One last step: connect Roblox to finish setting up NexusRBX. You’ll review and approve access on Roblox, then return here."
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

        {callbackError && searchParams.get("code") === "ROBLOX_OAUTH_DENIED" && !localError
          ? <p role="status" className="text-sm leading-6 text-[var(--ds-text-secondary)]">{callbackError}</p>
          : <AuthStatusAlert status={statusMessage ? "error" : "idle"} message={statusMessage} />}

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
          disabled={Boolean(action) || checking}
          onClick={connect}
        >
          {action === "connect" || action === "check" || checking ? <Loader aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <PlugZap aria-hidden="true" className="h-4 w-4" />}
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
