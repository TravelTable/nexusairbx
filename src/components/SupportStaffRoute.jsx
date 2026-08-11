import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../firebase";

export default function SupportStaffRoute({ children }) {
  const location = useLocation();
  const [access, setAccess] = useState({ loading: true, allowed: false, isAdmin: false });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAccess({ loading: false, allowed: false, isAdmin: false });
        return;
      }
      try {
        const token = await user.getIdTokenResult(true);
        const isAdmin = token.claims?.admin === true;
        setAccess({
          loading: false,
          allowed: isAdmin || token.claims?.supportAgent === true,
          isAdmin,
        });
      } catch (_) {
        setAccess({ loading: false, allowed: false, isAdmin: false });
      }
    });
    return unsubscribe;
  }, []);

  if (access.loading) {
    return <div className="grid min-h-[60vh] place-items-center bg-[var(--ds-bg-canvas)] text-sm text-[var(--ds-text-muted)]" role="status">Checking staff access…</div>;
  }

  if (!auth.currentUser) {
    return <Navigate to="/signin" replace state={{ from: { pathname: location.pathname } }} />;
  }

  if (!access.allowed) {
    return <Navigate to="/support" replace />;
  }

  return typeof children === "function" ? children({ isAdmin: access.isAdmin }) : children;
}
