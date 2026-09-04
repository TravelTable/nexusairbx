import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { NexusAuthShell } from "../components/auth/NexusAuthShell";
import { authorizeStudioMcpCli } from "../lib/studioBridgeApi";

export default function CliAuthorizePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      redirectUri: params.get("redirect_uri") || "",
      state: params.get("state") || "",
      codeChallenge: params.get("code_challenge") || "",
      codeChallengeMethod: params.get("code_challenge_method") || "",
      connectorVersion: params.get("connector_version") || "",
    };
  }, [location.search]);
  const valid = request.redirectUri && request.state && request.codeChallenge && request.codeChallengeMethod === "S256";

  const authorize = async () => {
    if (!auth.currentUser) {
      navigate("/signin", { state: { from: { pathname: location.pathname, search: location.search } } });
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const result = await authorizeStudioMcpCli(request);
      const callback = new URL(result.redirectUri);
      callback.searchParams.set("code", result.code);
      callback.searchParams.set("state", request.state);
      window.location.assign(callback.toString());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Authorization failed.");
      setBusy(false);
    }
  };

  return (
    <NexusAuthShell title="Authorize NexusRBX CLI" description="Allow the NexusRBX command-line app to connect this computer to your account.">
      <div className="space-y-4">
        <p className="rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-4 py-3 text-sm text-[var(--ds-text-secondary)]">
          The CLI receives its own revocable session. Your website sign-in token is never shared with it.
        </p>
        {status ? <p role="alert" className="text-sm text-red-500">{status}</p> : null}
        <button type="button" disabled={!valid || busy} onClick={authorize} className="min-h-12 w-full rounded-[10px] bg-[var(--ds-text)] px-6 py-2 font-semibold text-[var(--ds-bg-canvas)] disabled:opacity-50">
          {busy ? "Authorizing…" : valid ? "Allow this computer" : "Invalid authorization request"}
        </button>
      </div>
    </NexusAuthShell>
  );
}
