import {
  PRODUCT_JOURNEY,
  PRODUCT_TERMS,
  STUDIO_INTEGRATIONS,
} from "./productVocabulary";

test("publishes one canonical user-facing product model", () => {
  expect(PRODUCT_TERMS).toEqual(
    expect.objectContaining({
      product: "NexusRBX",
      workspace: "Nexus Workspace",
      studioPlugin: "NexusRBX Studio Plugin",
      connector: "NexusRBX Connector",
      studioProtocol: "Studio MCP",
      changeSet: "Change set",
      snapshot: "Snapshot",
      verification: "Verification",
    }),
  );
  expect(PRODUCT_JOURNEY).toEqual([
    "Describe",
    "Plan",
    "Generate",
    "Review",
    "Apply",
    "Verify",
    "Improve or recover",
  ]);
  expect(STUDIO_INTEGRATIONS.recommended.name).toBe(
    PRODUCT_TERMS.studioPlugin,
  );
  expect(STUDIO_INTEGRATIONS.advanced.name).toBe(PRODUCT_TERMS.connector);
});
