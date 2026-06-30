import fs from "fs";
import path from "path";

const root = new URL("..", import.meta.url).pathname;
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") walk(full);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
}
walk(path.join(root, "src"));
walk(path.join(root, "public-frontend"));

const icons = new Set();
for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const re = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;
  let m;
  while ((m = re.exec(content))) {
    m[1].split(",").forEach((part) => {
      const p = part.trim();
      const asMatch = p.match(/^(\w+)\s+as\s+\w+$/);
      if (asMatch) icons.add(asMatch[1]);
      else if (/^\w+$/.test(p)) icons.add(p);
    });
  }
}
console.log([...icons].sort().join("\n"));
console.error("TOTAL:", icons.size);
