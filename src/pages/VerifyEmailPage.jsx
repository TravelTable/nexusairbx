import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { reload, sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase";
import { authedFetch } from "../lib/billing";
import { NexusAuthShell } from "../components/auth/NexusAuthShell";

const VERIFY_EMAIL_RETURN_PATH_KEY = "nexusrbx:verify-email-return-path";

function safeReturnPath(value, fallback = "/ai") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}

function readStoredReturnPath() {
  try {
    return safeReturnPath(window.sessionStorage.getItem(VERIFY_EMAIL_RETURN_PATH_KEY), "");
  } catch (_) {
    return "";
  }
}

function storeReturnPath(value) {
  try {
    window.sessionStorage.setItem(VERIFY_EMAIL_RETURN_PATH_KEY, value);
  } catch (_) {
    // Verification still works if session storage is unavailable.
  }
}

function clearStoredReturnPath() {
  try {
    window.sessionStorage.removeItem(VERIFY_EMAIL_RETURN_PATH_KEY);
  } catch (_) {
    // Best effort after a completed verification.
  }
}

function returnPathState(value) {
  const parsed = new URL(safeReturnPath(value), "https://nexusrbx.local");
  return {
    from: {
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
    },
  };
}

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [returnPath] = useState(() => {
    const nextPath = safeReturnPath(location.state?.returnPath, "") || readStoredReturnPath() || "/ai";
    storeReturnPath(nextPath);
    return nextPath;
  });
  const [message, setMessage] = useState("Check your inbox and verify your email address to continue.");
  const [cooldown, setCooldown] = useState(0);
  const [busyAction, setBusyAction] = useState("");
  const busy = Boolean(busyAction);

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/signin", { replace: true, state: returnPathState(returnPath) });
    }
  }, [navigate, returnPath]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const checkVerification = async () => {
    const user = auth.currentUser;
    if (!user) return navigate("/signin", { replace: true, state: returnPathState(returnPath) });
    setBusyAction("check");
    try {
      await reload(user);
      if (auth.currentUser?.emailVerified) {
        await auth.currentUser.getIdToken(true);
        clearStoredReturnPath();
        navigate(returnPath, { replace: true });
        return;
      }
      setMessage("Your email is not verified yet. Finish the verification link, then try again.");
    } finally {
      setBusyAction("");
    }
  };

  const resend = async () => {
    const user = auth.currentUser;
    if (!user || cooldown > 0) return;
    setBusyAction("resend");
    try {
      const response = await authedFetch("/api/auth/verification-email/resend", { method: "POST" });
      if (!response.ok) {
        setMessage("Please wait before requesting another verification email.");
        return;
      }
      const result = await response.json();
      if (result.alreadyVerified) {
        await checkVerification();
        return;
      }
      await sendEmailVerification(user);
      setCooldown(Number(result.cooldownSeconds) || 60);
      setMessage("A new verification email has been sent.");
    } catch (_) {
      setMessage("We could not send another email right now. Please try again later.");
    } finally {
      setBusyAction("");
    }
  };

  return (
    <NexusAuthShell title="Verify your email" description="Confirm your address to continue safely into your Nexus workspace.">
      <div className="space-y-5">
        <p
          className="rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-4 py-3 text-sm leading-6 text-[var(--ds-text-secondary)]"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {message}
        </p>
        <button className="min-h-12 w-full rounded-[10px] bg-[var(--ds-text)] px-6 py-2 font-semibold text-[var(--ds-bg-canvas)] transition-colors duration-150 hover:bg-[var(--ds-text-secondary)] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-bg-canvas)] disabled:bg-[var(--ds-fill-active)] disabled:text-[var(--ds-text-muted)] motion-reduce:transition-none" disabled={busy} onClick={checkVerification} type="button">
          {busyAction === "check" ? "Checking verification…" : "I have verified my email"}
        </button>
        <button className="min-h-12 w-full rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface-1)] px-6 py-2 font-semibold text-[var(--ds-text)] transition-colors duration-150 hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-surface-2)] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-bg-canvas)] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none" disabled={busy || cooldown > 0} onClick={resend} type="button">
          {busyAction === "resend"
            ? "Sending verification email…"
            : cooldown > 0
              ? `Resend available in ${cooldown}s`
              : "Resend verification email"}
        </button>
      </div>
    </NexusAuthShell>
  );
}
