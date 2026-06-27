const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "public-frontend", "out");
const buildDir = path.join(root, "build");
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

if (fs.existsSync(craIndexPath) && !fs.existsSync(spaShellPath)) {
  fs.renameSync(craIndexPath, spaShellPath);
}

fs.cpSync(outDir, buildDir, { recursive: true });
console.log("Merged public-frontend/out into build/ for static CDN serving.");
