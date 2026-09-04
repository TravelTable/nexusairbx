import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from "react-router-dom";
import AuthRedirectHandler from "./components/AuthRedirectHandler";
import SiteShell from "./components/site/SiteShell";
import RobloxConnectionGate from "./components/auth/RobloxConnectionGate";
import { ASSET_PLATFORM_READS_ENABLED } from "./lib/assetPlatformApi";
import { shouldUseLocalDevelopmentAuth } from "./lib/localDevelopmentAuth";

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
const NexusRBXSubscribePageContainer = lazy(() => import("./pages/SubscribePage"));
const NexusRBXSignInPageContainer = lazy(() => import("./pages/SignInPage"));
const NexusRBXForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const NexusRBXSignUpPageContainer = lazy(() => import("./pages/SignUpPage"));
const NexusRBXVerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const NexusRBXConnectRobloxPage = lazy(() => import("./pages/ConnectRobloxPage"));
const NexusRBXCliAuthorizePage = lazy(() => import("./pages/CliAuthorizePage"));
const NexusRBXTermsPage = lazy(() => import("./pages/TermsPage"));
const NexusRBXPrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const NexusRBXSettingsPageContainer = lazy(() => import("./pages/SettingsPage"));
const NexusRBXIconGeneratorPage = lazy(() => import("./pages/IconGeneratorPage"));
const NexusRBXIconGeneratorUnavailablePage = lazy(() => import("./pages/IconGeneratorUnavailablePage"));
const NexusRBXAssetLibraryPage = lazy(() => import("./pages/AssetLibraryPage"));
const NexusRBXAssetDetailPage = lazy(() => import("./pages/AssetDetailPage"));
const NexusRBXAssetPlatformUnavailablePage = lazy(() => import("./pages/AssetPlatformUnavailablePage"));
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

function withRobloxConnectionGate(element) {
  return <RobloxConnectionGate>{element}</RobloxConnectionGate>;
}

export const AUTHENTICATED_ICON_DETAIL_ROUTE = "/icons-market/:id";

export function IconGeneratorRouteContent({
  readsEnabled = ASSET_PLATFORM_READS_ENABLED,
}) {
  return readsEnabled ? <NexusRBXIconGeneratorPage /> : <NexusRBXIconGeneratorUnavailablePage />;
}

export function AssetLibraryRouteContent({
  readsEnabled = ASSET_PLATFORM_READS_ENABLED,
}) {
  return readsEnabled
    ? <NexusRBXAssetLibraryPage />
    : <NexusRBXAssetPlatformUnavailablePage view="library" />;
}

export function AssetDetailRouteContent({
  readsEnabled = ASSET_PLATFORM_READS_ENABLED,
}) {
  return readsEnabled
    ? <NexusRBXAssetDetailPage />
    : <NexusRBXAssetPlatformUnavailablePage view="detail" />;
}

function App() {
  const localDevelopmentAuth = shouldUseLocalDevelopmentAuth();
  return (
    <Router>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-foreground" role="status">Loading…</div>}>
        {localDevelopmentAuth ? null : <AuthRedirectHandler />}
        <Routes>
          <Route path="/" element={withSiteShell(<NexusRBXHomepageV2 />, "marketing")} />
          <Route path="/downloads" element={withSiteShell(<NexusRBXDownloadsPage />, "marketing")} />
          <Route path="/ai" element={withRobloxConnectionGate(<NexusRBXAIPageContainer />)} />
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
          <Route path="/subscribe" element={withSiteShell(<NexusRBXSubscribePageContainer />, "checkout")} />
          <Route
            path="/signin"
            element={localDevelopmentAuth
              ? <Navigate to="/ai" replace />
              : withSiteShell(<NexusRBXSignInPageContainer />, "auth")}
          />
          <Route path="/signup" element={withSiteShell(<NexusRBXSignUpPageContainer />, "auth")} />
          <Route path="/forgot-password" element={withSiteShell(<NexusRBXForgotPasswordPage />, "auth")} />
          <Route path="/verify-email" element={withSiteShell(<NexusRBXVerifyEmailPage />, "auth")} />
          <Route path="/connect-roblox" element={withSiteShell(<NexusRBXConnectRobloxPage />, "auth")} />
          <Route path="/cli/authorize" element={withSiteShell(<NexusRBXCliAuthorizePage />, "auth")} />
          <Route path="/legal" element={<Navigate to="/legal/terms" replace />} />
          <Route path="/legal/terms" element={withSiteShell(<NexusRBXTermsPage />, "legal")} />
          <Route path="/legal/privacy" element={withSiteShell(<NexusRBXPrivacyPage />, "legal")} />
          <Route path="/terms" element={<Navigate to="/legal/terms" replace />} />
          <Route path="/privacy" element={<Navigate to="/legal/privacy" replace />} />
          <Route path="/tools/icon-generator" element={withRobloxConnectionGate(withSiteShell(<IconGeneratorRouteContent />, "tools"))} />
          <Route path="/assets" element={withRobloxConnectionGate(withSiteShell(<AssetLibraryRouteContent />, "tools"))} />
          <Route path="/assets/:assetId" element={withRobloxConnectionGate(withSiteShell(<AssetDetailRouteContent />, "tools"))} />
          <Route path="/icons-market" element={withSiteShell(<NexusRBXIconsMarketPage />, "tools")} />
          <Route path={AUTHENTICATED_ICON_DETAIL_ROUTE} element={withSiteShell(<NexusRBXIconDetailPage />, "tools")} />
          <Route path="/script/:id" element={withRobloxConnectionGate(withSiteShell(<NexusRBXScriptPage />, "workspace"))} />
          {/* NEW: on-screen entitlements debugger */}
          <Route path="/debug/entitlements" element={withSiteShell(<AdminRoute><DebugEntitlementsPage /></AdminRoute>, "account")} />
          <Route path="*" element={withSiteShell(<NexusRBXNotFoundPage />, "marketing")} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
