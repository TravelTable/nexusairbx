import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AuthRedirectHandler from "./components/AuthRedirectHandler";
import SiteShell from "./components/site/SiteShell";

// Suppress a known Monaco/Chrome ResizeObserver loop error.

if (typeof window !== "undefined") {
  const observerErr = "ResizeObserver loop completed with undelivered notifications.";
  window.addEventListener("error", (e) => {
    if (e.message === observerErr) {
      e.stopImmediatePropagation();
    }
  });
}

const NexusRBXBillingPageContainer = lazy(() => import("./pages/BillingPage"));
const NexusRBXAIPageContainer = lazy(() => import("./pages/AiPage"));
const NexusRBXHomepageV2 = lazy(() => import("./pages/HomepageV2"));
const NexusRBXDownloadsPage = lazy(() => import("./pages/DownloadsPage"));
const NexusRBXContactPageContainer = lazy(() => import("./pages/ContactPage"));
const NexusRBXPrivacyPageContainer = lazy(() => import("./pages/PrivacyPage"));
const NexusRBXSubscribePageContainer = lazy(() => import("./pages/SubscribePage"));
const NexusRBXSignInPageContainer = lazy(() => import("./pages/SignInPage"));
const NexusRBXSignUpPageContainer = lazy(() => import("./pages/SignUpPage"));
const NexusRBXVerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const NexusRBXTermsPageContainer = lazy(() => import("./pages/TermsPage"));
const NexusRBXSettingsPageContainer = lazy(() => import("./pages/SettingsPage"));
const NexusRBXIconGeneratorPage = lazy(() => import("./pages/IconGeneratorPage"));
const NexusRBXIconsMarketPage = lazy(() => import("./pages/IconsMarketPage"));
const NexusRBXIconDetailPage = lazy(() => import("./pages/IconDetailPage"));
const NexusRBXNotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const NexusRBXScriptPage = lazy(() => import("./pages/ScriptPage"));
const DebugEntitlementsPage = lazy(() => import("./pages/DebugEntitlementsPage"));
const AdminRoute = lazy(() => import("./components/AdminRoute"));
const NexusRBXSupportPage = lazy(() => import("./pages/SupportPage"));
const NexusRBXSupportTicketPage = lazy(() => import("./pages/SupportTicketPage"));
const NexusRBXAdminSupportPage = lazy(() => import("./pages/AdminSupportPage"));
const SupportStaffRoute = lazy(() => import("./components/SupportStaffRoute"));

function withSiteShell(element, variant) {
  return <SiteShell variant={variant}>{element}</SiteShell>;
}

function App() {
  return (
    <Router>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white bg-black">Loading...</div>}>
        <AuthRedirectHandler />
        <Routes>
          <Route path="/" element={withSiteShell(<NexusRBXHomepageV2 />, "marketing")} />
          <Route path="/downloads" element={withSiteShell(<NexusRBXDownloadsPage />, "marketing")} />
          <Route path="/ai" element={<NexusRBXAIPageContainer />} />
          <Route path="/settings" element={withSiteShell(<NexusRBXSettingsPageContainer />, "account")} />
          <Route path="/billing" element={withSiteShell(<NexusRBXBillingPageContainer />, "account")} />
          <Route path="/contact" element={withSiteShell(<NexusRBXContactPageContainer />, "marketing")} />
          <Route path="/support" element={withSiteShell(<NexusRBXSupportPage />, "account")} />
          <Route path="/support/:ticketId" element={withSiteShell(<NexusRBXSupportTicketPage />, "account")} />
          <Route
            path="/admin/support"
            element={withSiteShell(
              <SupportStaffRoute>
                {({ isAdmin }) => <NexusRBXAdminSupportPage isAdmin={isAdmin} />}
              </SupportStaffRoute>,
              "account"
            )}
          />
          <Route path="/privacy" element={withSiteShell(<NexusRBXPrivacyPageContainer />, "legal")} />
          <Route path="/subscribe" element={withSiteShell(<NexusRBXSubscribePageContainer />, "checkout")} />
          <Route path="/signin" element={withSiteShell(<NexusRBXSignInPageContainer />, "auth")} />
          <Route path="/signup" element={withSiteShell(<NexusRBXSignUpPageContainer />, "auth")} />
          <Route path="/verify-email" element={withSiteShell(<NexusRBXVerifyEmailPage />, "auth")} />
          <Route path="/terms" element={withSiteShell(<NexusRBXTermsPageContainer />, "legal")} />
          <Route path="/tools/icon-generator" element={withSiteShell(<NexusRBXIconGeneratorPage />, "tools")} />
          <Route path="/icons-market" element={withSiteShell(<NexusRBXIconsMarketPage />, "tools")} />
          <Route path="/icons/:id" element={withSiteShell(<NexusRBXIconDetailPage />, "tools")} />
          <Route path="/script/:id" element={withSiteShell(<NexusRBXScriptPage />, "tools")} />
          {/* NEW: on-screen entitlements debugger */}
          <Route path="/debug/entitlements" element={withSiteShell(<AdminRoute><DebugEntitlementsPage /></AdminRoute>, "account")} />
          <Route path="*" element={withSiteShell(<NexusRBXNotFoundPage />, "marketing")} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
