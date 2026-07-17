import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

export default async function notarizeMac(context) {
  if (context.electronPlatformName !== "darwin") return;

  const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env;
  if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID) {
    if (process.env.CI) throw new Error("Apple notarization credentials are required for a release build.");
    return;
  }

  const appPath = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const archivePath = join(context.appOutDir, `${context.packager.appInfo.productFilename}-notarize.zip`);

  try {
    run("ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", appPath, archivePath]);
    const result = JSON.parse(run("xcrun", [
      "notarytool", "submit", archivePath,
      "--apple-id", APPLE_ID,
      "--password", APPLE_APP_SPECIFIC_PASSWORD,
      "--team-id", APPLE_TEAM_ID,
      "--wait",
      "--output-format", "json",
    ]));
    if (result.status !== "Accepted") throw new Error(`Apple notarization was ${result.status || "not accepted"}.`);
    run("xcrun", ["stapler", "staple", appPath]);
  } finally {
    rmSync(archivePath, { force: true });
  }
}
