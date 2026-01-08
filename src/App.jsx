import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NexusRBXHomepageContainer from "./pages/Homepage";
import NexusRBXDocsPageContainer from "./pages/DocsPage";
import NexusRBXAIPageContainer from "./pages/AiPage";
import NexusRBXContactPageContainer from "./pages/ContactPage";
import NexusRBXPrivacyPageContainer from "./pages/PrivacyPage";
import NexusRBXSubscribePageContainer from "./pages/SubscribePage";
import SettingsPage from "./pages/SettingsPage";
import { SettingsProvider } from "./context/SettingsContext";
import { BillingProvider } from "./context/BillingContext";
import { Analytics } from "@vercel/analytics/react";

function App() {
  return (
    <Router>
      <BillingProvider>
        <SettingsProvider>
          <Routes>
            <Route path="/" element={<NexusRBXHomepageContainer />} />
            <Route path="/docs" element={<NexusRBXDocsPageContainer />} />
            <Route path="/ai" element={<NexusRBXAIPageContainer />} />
            <Route path="/contact" element={<NexusRBXContactPageContainer />} />
            <Route path="/privacy" element={<NexusRBXPrivacyPageContainer />} />
            <Route path="/subscribe" element={<NexusRBXSubscribePageContainer />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Optionally, add a catch-all 404 route here */}
          </Routes>
        </SettingsProvider>
      </BillingProvider>
      <Analytics />
    </Router>
  );
}

export default App;
