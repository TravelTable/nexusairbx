import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "@fontsource-variable/sofia-sans-condensed/wght.css";
import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";
import "@fontsource-variable/atkinson-hyperlegible-mono/wght.css";
import "@fontsource-variable/instrument-sans/wght.css";
import "@fontsource-variable/dm-sans/wght.css";
import App from "./App";
import "./index.css";
import "./design/nexus-foundation.css";
import "./design/nexus-primitives.css";
import "./design/nexus-motion.css";
import { SettingsProvider } from "./context/SettingsContext";
import { BillingProvider } from "./context/BillingContext";
import { RobloxConnectionProvider } from "./context/RobloxConnectionContext";
import { SiteToastProvider } from "./components/ui/toast-1";
import { auth } from "./firebase";
import { applyAuthPersistence, readAuthPersistencePreference } from "./lib/firebaseAuth";
import { installAppCheckFetchInterceptor } from "./lib/appCheck";
import { initProductAnalytics } from "./lib/productAnalytics";
import {
  ensureLocalDevelopmentAuth,
  shouldUseLocalDevelopmentAuth,
  startLocalDevelopmentAuthRecovery,
} from "./lib/localDevelopmentAuth";

let authPersistencePromise = Promise.resolve();
if (typeof window !== "undefined") {
  authPersistencePromise = applyAuthPersistence(auth, readAuthPersistencePreference());
  installAppCheckFetchInterceptor();
}

// Suppress ResizeObserver loop error (Monaco Editor/Chrome bug)
if (typeof window !== "undefined") {
  const observerErr = "ResizeObserver loop completed with undelivered notifications.";
  window.addEventListener("error", (e) => {
    if (e.message === observerErr) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
  });

  window.addEventListener("unhandledrejection", (e) => {
    if (
      e.reason &&
      e.reason.message &&
      e.reason.message.includes("ResizeObserver loop completed with undelivered notifications")
    ) {
      e.preventDefault();
      return false;
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));

function renderApp() {
  root.render(
    <React.StrictMode>
      <HelmetProvider>
        <BillingProvider>
          <RobloxConnectionProvider>
            <SiteToastProvider>
              <SettingsProvider>
                <App />
              </SettingsProvider>
            </SiteToastProvider>
          </RobloxConnectionProvider>
        </BillingProvider>
      </HelmetProvider>
    </React.StrictMode>
  );
}

if (shouldUseLocalDevelopmentAuth()) {
  void authPersistencePromise
    .then(() => ensureLocalDevelopmentAuth(auth))
    .catch((error) => {
      console.error("Automatic local developer sign-in failed:", error?.message || error);
    })
    .finally(() => {
      renderApp();
      startLocalDevelopmentAuthRecovery(auth);
    });
} else {
  renderApp();
}

// Fire-and-forget analytics AFTER mount. The product analytics module handles
// provider loading, anonymous identity, consent/opt-out, and local debug mode.
initProductAnalytics();
