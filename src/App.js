import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from "react-router-dom";
import { BillingProvider } from "./context/BillingContext";

// Suppress ResizeObserver loop error (Monaco Editor/Chrome bug)
if (typeof window !== "undefined") {
  const observerErr = "ResizeObserver loop completed with undelivered notifications.";
  window.addEventListener("error", (e) => {
    if (e.message === observerErr) {
      e.stopImmediatePropagation();
    }
  });
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
const NexusRBXNotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const CodeModal = lazy(() => import("./CodeModal"));

function ScriptShareModalWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <CodeModal
      open={open}
      onClose={() => {
        setOpen(false);
        setTimeout(() => navigate("/ai"), 200);
      }}
      scriptId={id}
      readOnly={true}
    />
  );
}


function App() {
  return (
    <BillingProvider backendUrl={process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app"}>
      <Router>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white bg-black">Loading...</div>}>
          <Routes>
            <Route path="/" element={<NexusRBXHomepageContainer />} />
            <Route path="/docs" element={<NexusRBXDocsPageContainer />} />
            <Route path="/ai" element={<NexusRBXAIPageContainer />} />
            <Route path="/billing" element={<NexusRBXBillingPageContainer />} />
            <Route path="/contact" element={<NexusRBXContactPageContainer />} />
            <Route path="/privacy" element={<NexusRBXPrivacyPageContainer />} />
            <Route path="/subscribe" element={<NexusRBXSubscribePageContainer />} />
            <Route path="/signin" element={<NexusRBXSignInPageContainer />} />
            <Route path="/signup" element={<NexusRBXSignUpPageContainer />} />
            <Route path="/terms" element={<NexusRBXTermsPageContainer />} />
            <Route path="/script/:id" element={<ScriptShareModalWrapper />} />
            <Route path="*" element={<NexusRBXNotFoundPage />} />
          </Routes>
        </Suspense>
      </Router>
    </BillingProvider>
  );
}

export default App;