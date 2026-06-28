const fs = require("fs");
const path = require("path");

const defaultRoot = path.join(__dirname, "..");

function getMergePaths(projectRoot) {
  const outDir = path.join(projectRoot, "public-frontend", "out");
  const buildDir = path.join(projectRoot, "build");
  return {
    outDir,
    buildDir,
    publicExportDir: path.join(buildDir, "__public"),
    spaShellPath: path.join(buildDir, "__spa-shell.html"),
    craIndexPath: path.join(buildDir, "index.html"),
  };
}

function isInsidePath(candidatePath, parentPath) {
  const relativePath = path.relative(parentPath, candidatePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function shouldCopyStaticSidecar(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return extension !== ".html" && extension !== ".txt";
}

function removeHtmlFiles(dir, paths) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const sourcePath = path.join(dir, entry.name);
    if (sourcePath === paths.spaShellPath || isInsidePath(sourcePath, paths.publicExportDir)) continue;
    if (entry.isDirectory()) {
      removeHtmlFiles(sourcePath, paths);
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

    if (entry.isFile() && shouldCopyStaticSidecar(sourcePath)) {
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function mergePublicExport({ projectRoot = defaultRoot, log = console.log } = {}) {
  const paths = getMergePaths(projectRoot);

  if (!fs.existsSync(paths.buildDir)) {
    throw new Error("Missing build/. Run react-scripts build first.");
  }

  if (!fs.existsSync(paths.outDir)) {
    throw new Error("Missing public-frontend/out. Run npm run public:build first.");
  }

  if (fs.existsSync(paths.craIndexPath)) {
    if (fs.existsSync(paths.spaShellPath)) {
      fs.rmSync(paths.craIndexPath, { force: true });
    } else {
      fs.renameSync(paths.craIndexPath, paths.spaShellPath);
    }
  }

  fs.rmSync(paths.publicExportDir, { recursive: true, force: true });
  fs.cpSync(paths.outDir, paths.publicExportDir, { recursive: true });

  removeHtmlFiles(paths.buildDir, paths);
  copyStaticSidecars(paths.outDir, paths.buildDir);

  log("Merged public-frontend/out into build/__public and copied public static assets.");
}

if (require.main === module) {
  try {
    mergePublicExport();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  mergePublicExport,
  shouldCopyStaticSidecar,
};
