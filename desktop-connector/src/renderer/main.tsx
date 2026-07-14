import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { previewApi } from "./preview";
import "./styles.css";

if (!window.nexusConnector) {
  Object.defineProperty(window, "nexusConnector", { value: previewApi(), configurable: false });
}

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
window.requestAnimationFrame(() => window.nexusConnector?.reportReady());
