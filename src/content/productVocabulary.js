export const PRODUCT_TERMS = Object.freeze({
  product: "NexusRBX",
  workspace: "Nexus Workspace",
  studioPlugin: "NexusRBX Studio Plugin",
  connector: "NexusRBX Connector",
  studioProtocol: "Studio MCP",
  changeSet: "Change set",
  snapshot: "Snapshot",
  verification: "Verification",
});

export const PRODUCT_JOURNEY = Object.freeze([
  "Describe",
  "Plan",
  "Generate",
  "Review",
  "Apply",
  "Verify",
  "Improve or recover",
]);

export const STUDIO_INTEGRATIONS = Object.freeze({
  recommended: Object.freeze({
    id: "studio-plugin",
    name: PRODUCT_TERMS.studioPlugin,
    audience: "Most creators",
    description: "The Studio-side companion for ordinary Nexus Workspace builds.",
  }),
  advanced: Object.freeze({
    id: "connector",
    name: PRODUCT_TERMS.connector,
    protocol: PRODUCT_TERMS.studioProtocol,
    audience: "Advanced and local workflows",
    description: "A local connection and diagnostics layer for advanced Studio workflows.",
  }),
});

