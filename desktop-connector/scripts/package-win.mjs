import { build, Arch, Platform } from "electron-builder";

const publisherName = process.env.CONNECTOR_WINDOWS_PUBLISHER_NAME?.trim();

await build({
  targets: Platform.WINDOWS.createTarget("nsis", Arch.x64),
  publish: "never",
  config: publisherName ? { win: { signtoolOptions: { publisherName } } } : undefined,
});
