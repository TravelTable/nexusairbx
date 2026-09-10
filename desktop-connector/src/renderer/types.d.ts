import type { ConnectorDesktopApi } from "../contracts";
import type { WorkspaceApi } from "../workspace-contracts";

declare global {
  interface Window { nexusConnector?: ConnectorDesktopApi; nexusWorkspace?: WorkspaceApi; }
}

export {};
