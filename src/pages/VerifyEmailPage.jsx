import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { reload, sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase";
import { authedFetch } from "../lib/billing";
import { NexusAuthShell } from "../components/auth/NexusAuthShell";

function safeReturnPath(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/ai";
}

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = useMemo(() => safeReturnPath(location.state?.returnPath), [location.state]);
  const [message, setMessage] = useState("Check your inbox and verify your email address to continue.");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) navigate("/signin", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const checkVerification = async () => {
    const user = auth.currentUser;
    if (!user) return navigate("/signin", { replace: true });
    setBusy(true);
    try {
      await reload(user);
      if (auth.currentUser?.emailVerified) {
        await auth.currentUser.getIdToken(true);
        navigate(returnPath, { replace: true });
        return;
      }
      setMessage("Your email is not verified yet. Finish the verification link, then try again.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    const user = auth.currentUser;
    if (!user || cooldown > 0) return;
    setBusy(true);
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
      setBusy(false);
    }
  };

  return (
    <NexusAuthShell title="Verify your email" description="Verification protects NexusRBX accounts and paid services from automated abuse.">
      <div className="space-y-4">
        <p className="text-sm text-slate-300" role="status">{message}</p>
        <button className="w-full rounded-md bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60" disabled={busy} onClick={checkVerification} type="button">
          I have verified my email
        </button>
        <button className="w-full rounded-md border border-slate-600 px-4 py-2 text-slate-100 disabled:opacity-60" disabled={busy || cooldown > 0} onClick={resend} type="button">
          {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email"}
        </button>
      </div>
    </NexusAuthShell>
  );
}
