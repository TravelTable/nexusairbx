import { Navigate, useLocation } from "react-router-dom";

import { useRobloxConnection } from "../../context/RobloxConnectionContext";
import { connectRobloxPath } from "../../lib/signupRobloxOnboarding";

export default function RobloxConnectionGate({ children }) {
  const location = useLocation();
  const roblox = useRobloxConnection();

  if (roblox.authReady && roblox.user && roblox.phase === "checking" && !roblox.status) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--ds-bg-canvas)] text-sm text-[var(--ds-text-muted)]" role="status">
        Checking your Roblox connection…
      </div>
    );
  }

  if (roblox.user && roblox.status?.onboarding?.gateActive === true) {
    const returnPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={connectRobloxPath(returnPath)} replace />;
  }

  return children;
}
