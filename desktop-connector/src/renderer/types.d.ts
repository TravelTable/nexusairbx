import type { ConnectorDesktopApi } from "../contracts";

declare global {
  interface Window { nexusConnector?: ConnectorDesktopApi; }
}

export {};
