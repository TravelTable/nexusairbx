import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { SettingsProvider } from "./context/SettingsContext";
import { BillingProvider } from "./context/BillingContext";
import { initProductAnalytics } from "./lib/productAnalytics";

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
root.render(
  <React.StrictMode>
    <BillingProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </BillingProvider>
  </React.StrictMode>
);

// Fire-and-forget analytics AFTER mount. The product analytics module handles
// provider loading, anonymous identity, consent/opt-out, and local debug mode.
initProductAnalytics();
