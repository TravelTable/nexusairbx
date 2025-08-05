import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NexusRBXHomepageContainer from "./pages/Homepage";
import NexusRBXDocsPageContainer from "./pages/DocsPage";
import NexusRBXAIPageContainer from "./pages/AiPage";
import NexusRBXContactPageContainer from "./pages/ContactPage";
import NexusRBXPrivacyPageContainer from "./pages/PrivacyPage";
import NexusRBXSubscribePageContainer from "./pages/SubscribePage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<NexusRBXHomepageContainer />} />
        <Route path="/docs" element={<NexusRBXDocsPageContainer />} />
        <Route path="/ai" element={<NexusRBXAIPageContainer />} />
        <Route path="/contact" element={<NexusRBXContactPageContainer />} />
        <Route path="/privacy" element={<NexusRBXPrivacyPageContainer />} />
        <Route path="/subscribe" element={<NexusRBXSubscribePageContainer />} />
        {/* Optionally, add a catch-all 404 route here */}
      </Routes>
    </Router>
  );
}

export default App;