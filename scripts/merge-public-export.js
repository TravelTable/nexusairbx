const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "public-frontend", "out");
const buildDir = path.join(root, "build");
const publicExportDir = path.join(buildDir, "__public");
const spaShellPath = path.join(buildDir, "__spa-shell.html");
const craIndexPath = path.join(buildDir, "index.html");

if (!fs.existsSync(buildDir)) {
  console.error("Missing build/. Run react-scripts build first.");
  process.exit(1);
}

if (!fs.existsSync(outDir)) {
  console.error("Missing public-frontend/out. Run npm run public:build first.");
  process.exit(1);
}

if (fs.existsSync(craIndexPath)) {
  if (fs.existsSync(spaShellPath)) {
    fs.rmSync(craIndexPath, { force: true });
  } else {
    fs.renameSync(craIndexPath, spaShellPath);
  }
}

fs.rmSync(publicExportDir, { recursive: true, force: true });
fs.cpSync(outDir, publicExportDir, { recursive: true });

function removeHtmlFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const sourcePath = path.join(dir, entry.name);
    if (sourcePath === spaShellPath || sourcePath.startsWith(publicExportDir)) continue;
    if (entry.isDirectory()) {
      removeHtmlFiles(sourcePath);
      continue;
    }
    if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".html") {
      fs.rmSync(sourcePath, { force: true });
    }
  }
}

function copyStaticSidecars(sourceDir, destinationDir) {
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destinationPath, { recursive: true });
      copyStaticSidecars(sourcePath, destinationPath);
      continue;
    }

    if (entry.isFile() && path.extname(entry.name).toLowerCase() !== ".html") {
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

removeHtmlFiles(buildDir);
copyStaticSidecars(outDir, buildDir);

console.log("Merged public-frontend/out into build/__public and copied public static assets.");
