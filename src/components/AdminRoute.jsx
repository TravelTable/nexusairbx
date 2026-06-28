import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

/**
 * Renders children only when the signed-in user has Firebase custom claim admin === true.
 */
export default function AdminRoute({ children }) {
  const [state, setState] = useState({ loading: true, allowed: false });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ loading: false, allowed: false });
        return;
      }
      try {
        const tokenResult = await user.getIdTokenResult(true);
        setState({ loading: false, allowed: tokenResult.claims?.admin === true });
      } catch {
        setState({ loading: false, allowed: false });
      }
    });
    return () => unsub();
  }, []);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        Loading...
      </div>
    );
  }

  if (!state.allowed) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}
