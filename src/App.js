import React, { Suspense, lazy, useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useBilling } from "./context/BillingContext";
import { useAuth } from "./context/AuthContext"; // Import AuthContext
import NotificationToast from "./components/NotificationToast"; // Assuming this is the global notification component
import UpdateSubmissionBox from "./components/UpdateSubmissionBox"; // Import the new component
import UpdateLogDisplay from "./components/UpdateLogDisplay";

// Suppress ResizeObserver loop error (Monaco Editor/Chrome bug) AND expose auth for console tests
import { getAuth } from "firebase/auth";

if (typeof window !== "undefined") {
  const observerErr = "ResizeObserver loop completed with undelivered notifications.";
  window.addEventListener("error", (e) => {
    if (e.message === observerErr) {
      e.stopImmediatePropagation();
    }
  });

  // Expose Firebase Auth to the console for quick manual tests
  try {
    // Attach once; won’t throw if run before Firebase init, it’ll attach later on first call
    Object.defineProperty(window, "firebaseAuth", {
      get() { return getAuth(); },
      configurable: true,
    });
  } catch {}
}

const NexusRBXBillingPageContainer = lazy(() => import("./pages/BillingPage"));
const NexusRBXHomepageContainer = lazy(() => import("./pages/Homepage"));
const NexusRBXDocsPageContainer = lazy(() => import("./pages/DocsPage"));
const NexusRBXAIPageContainer = lazy(() => import("./pages/AiPage"));
const NexusRBXContactPageContainer = lazy(() => import("./pages/ContactPage"));
const NexusRBXPrivacyPageContainer = lazy(() => import("./pages/PrivacyPage"));
const NexusRBXSubscribePageContainer = lazy(() => import("./pages/SubscribePage"));
const NexusRBXSignInPageContainer = lazy(() => import("./pages/SignInPage"));
const NexusRBXSignUpPageContainer = lazy(() => import("./pages/SignUpPage"));
const NexusRBXTermsPageContainer = lazy(() => import("./pages/TermsPage"));
const NexusRBXSettingsPageContainer = lazy(() => import("./pages/SettingsPage"));
const NexusRBXIconGeneratorPage = lazy(() => import("./pages/IconGeneratorPage"));
const NexusRBXIconsMarketPage = lazy(() => import("./pages/IconsMarketPage"));
const NexusRBXIconDetailPage = lazy(() => import("./pages/IconDetailPage"));
const NexusRBXNotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const ScriptShareModalWrapper = lazy(() => import("./components/ScriptShareModalWrapper"));
const DebugEntitlementsPage = lazy(() => import("./pages/DebugEntitlementsPage"));

function App() {
  const { portal } = useBilling();
  const { user } = useAuth(); // Get user from AuthContext
  const [notification, setNotification] = useState(null); // State for notifications

  useEffect(() => {
    window.portal = portal;
  }, [portal]);

  // Function to show notifications
  const notify = useCallback(({ message, type = 'info', duration = 3000 }) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), duration);
  }, []);

  return (
    <Router>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white bg-black">Loading...</div>}>
        <Routes>
          <Route path="/" element={<NexusRBXHomepageContainer />} />
          <Route path="/docs" element={<NexusRBXDocsPageContainer />} />
          <Route path="/ai" element={<NexusRBXAIPageContainer />} />
          <Route path="/settings" element={<NexusRBXSettingsPageContainer />} />
          <Route path="/billing" element={<NexusRBXBillingPageContainer />} />
          <Route path="/contact" element={<NexusRBXContactPageContainer />} />
          <Route path="/privacy" element={<NexusRBXPrivacyPageContainer />} />
          <Route path="/subscribe" element={<NexusRBXSubscribePageContainer />} />
          <Route path="/signin" element={<NexusRBXSignInPageContainer />} />
          <Route path="/signup" element={<NexusRBXSignUpPageContainer />} />
          <Route path="/terms" element={<NexusRBXTermsPageContainer />} />
          <Route path="/tools/icon-generator" element={<NexusRBXIconGeneratorPage />} />
          <Route path="/icons-market" element={<NexusRBXIconsMarketPage />} />
          <Route path="/icons/:id" element={<NexusRBXIconDetailPage />} />
          <Route path="/script/:id" element={<ScriptShareModalWrapper />} />
          {/* NEW: on-screen entitlements debugger */}
          <Route path="/debug/entitlements" element={<DebugEntitlementsPage />} />
          <Route path="*" element={<NexusRBXNotFoundPage />} />
        </Routes>
        {/* Render UpdateSubmissionBox conditionally for developers */}
        {/* Render UpdateSubmissionBox conditionally for developers */}
        {user && user.email === "jackt1263@gmail.com" && <UpdateSubmissionBox notify={notify} />}
        {/* Render UpdateLogDisplay for all users */}
        <UpdateLogDisplay />
        {/* Render NotificationToast */}
        {notification && <NotificationToast message={notification.message} type={notification.type} />}
      </Suspense>
    </Router>
  );
}

export default App;
