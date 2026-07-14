import { execFileSync } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { basename, join } from "node:path";

if (process.platform !== "darwin") {
  throw new Error("Universal macOS verification must run on macOS.");
}

const [appPath] = process.argv.slice(2);
if (!appPath?.endsWith(".app")) {
  throw new Error("Pass the packaged macOS .app path.");
}

const productName = basename(appPath, ".app");
const frameworksPath = join(appPath, "Contents", "Frameworks");
const executables = [
  join(appPath, "Contents", "MacOS", productName),
  join(frameworksPath, "Electron Framework.framework", "Versions", "A", "Electron Framework"),
  ...["", " (GPU)", " (Plugin)", " (Renderer)"].map((suffix) => {
    const helperName = `${productName} Helper${suffix}`;
    return join(frameworksPath, `${helperName}.app`, "Contents", "MacOS", helperName);
  }),
];

for (const executable of executables) {
  accessSync(executable, constants.R_OK | constants.X_OK);
  execFileSync("lipo", [executable, "-verify_arch", "x86_64", "arm64"], {
    stdio: "inherit",
  });
}

const architectures = execFileSync("lipo", ["-archs", executables[0]], {
  encoding: "utf8",
}).trim();

console.log(`Verified ${executables.length} universal macOS executables: ${architectures}`);
