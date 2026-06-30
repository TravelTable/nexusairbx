import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const targets = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") walk(full);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) targets.push(full);
  }
}
walk(path.join(root, "src"));
walk(path.join(root, "public-frontend"));

function iconsImportFor(file) {
  if (file.startsWith(path.join(root, "src") + path.sep)) {
    return "lib/icons";
  }
  const rel = path.relative(path.dirname(file), path.join(root, "src/lib/icons"));
  return rel.split(path.sep).join("/");
}

let count = 0;
for (const file of targets) {
  let content = fs.readFileSync(file, "utf8");
  if (!content.includes("lucide-react")) continue;
  const importPath = iconsImportFor(file);
  const next = content.replace(/from\s*['"]lucide-react['"]/g, `from "${importPath}"`);
  if (next !== content) {
    fs.writeFileSync(file, next);
    count++;
    console.log(file.replace(root + path.sep, ""), "->", importPath);
  }
}
console.log(`Updated ${count} files`);
