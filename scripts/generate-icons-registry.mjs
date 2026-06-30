import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Manual overrides for Lucide -> Hugeicons (verified against free pack exports)
const OVERRIDES = {
  Activity: "Activity01Icon",
  AlertCircle: "AlertCircleIcon",
  AlertOctagon: "AlertDiamondIcon",
  AlertTriangle: "Alert02Icon",
  ArrowLeft: "ArrowLeft01Icon",
  ArrowRight: "ArrowRight01Icon",
  ArrowUp: "ArrowUp01Icon",
  Bell: "Notification01Icon",
  Blocks: "BlocksIcon",
  BookOpen: "BookOpen01Icon",
  Bookmark: "Bookmark01Icon",
  Bot: "BotIcon",
  Box: "PackageIcon",
  Boxes: "PackageDeliveredIcon",
  Brain: "Brain01Icon",
  Bug: "Bug01Icon",
  Calendar: "Calendar01Icon",
  Check: "Tick01Icon",
  CheckCircle: "CheckmarkCircle01Icon",
  CheckCircle2: "CheckmarkCircle02Icon",
  ChevronDown: "ArrowDown01Icon",
  ChevronLeft: "ArrowLeft01Icon",
  ChevronRight: "ArrowRight01Icon",
  ChevronUp: "ArrowUp01Icon",
  Circle: "CircleIcon",
  Clipboard: "ClipboardIcon",
  ClipboardList: "Task01Icon",
  Clock: "Clock01Icon",
  Clock3: "Clock03Icon",
  Cloud: "CloudIcon",
  CloudUpload: "CloudUploadIcon",
  Code: "SourceCodeIcon",
  Code2: "CodeIcon",
  Coins: "Coins01Icon",
  Cookie: "CookieIcon",
  Copy: "Copy01Icon",
  Cpu: "CpuIcon",
  CreditCard: "CreditCardIcon",
  Crown: "CrownIcon",
  Database: "Database01Icon",
  Download: "Download01Icon",
  DownloadCloud: "CloudDownloadIcon",
  Edit: "Edit01Icon",
  ExternalLink: "LinkSquare01Icon",
  Eye: "ViewIcon",
  EyeOff: "ViewOffIcon",
  FileArchive: "Archive01Icon",
  FileCode: "FileScriptIcon",
  FileCode2: "FileCodeIcon",
  FileDown: "FileDownloadIcon",
  FileQuestion: "FileUnknownIcon",
  FileText: "File01Icon",
  Files: "Files01Icon",
  Filter: "FilterIcon",
  Flame: "FireIcon",
  FlaskConical: "TestTubeIcon",
  Folder: "Folder01Icon",
  FolderOpen: "FolderOpenIcon",
  FolderPlus: "FolderAddIcon",
  FolderTree: "FolderTreeIcon",
  Gamepad2: "GameController01Icon",
  Gavel: "LegalHammerIcon",
  Gift: "GiftIcon",
  GitBranch: "GitBranchIcon",
  Github: "GithubIcon",
  Globe: "Globe02Icon",
  Grid: "GridViewIcon",
  Hammer: "HammerIcon",
  Hash: "HashtagIcon",
  HelpCircle: "HelpCircleIcon",
  History: "Clock02Icon",
  Home: "Home01Icon",
  Image: "Image01Icon",
  ImageIcon: "Image01Icon",
  ImagePlus: "ImageAdd01Icon",
  InfinityIcon: "Infinity01Icon",
  Info: "InformationCircleIcon",
  Layers: "Layers01Icon",
  Layout: "Layout01Icon",
  LayoutGrid: "GridViewIcon",
  Library: "LibraryIcon",
  Link: "Link01Icon",
  Link2: "Link02Icon",
  ListChecks: "CheckListIcon",
  ListTodo: "TaskDaily01Icon",
  Loader: null,
  Loader2: null,
  Lock: "SquareLock01Icon",
  LogOut: "Logout01Icon",
  Mail: "Mail01Icon",
  MapPin: "Location01Icon",
  Maximize2: "MaximizeScreenIcon",
  Menu: "Menu01Icon",
  MessageCircle: "Message01Icon",
  MessageSquare: "Message02Icon",
  Minus: "MinusSignIcon",
  Monitor: "ComputerIcon",
  Moon: "Moon01Icon",
  Music: "MusicNote01Icon",
  Package: "PackageIcon",
  Palette: "PaintBoardIcon",
  Pencil: "PencilEdit01Icon",
  Phone: "CallIcon",
  Play: "PlayIcon",
  PlugZap: "Plug01Icon",
  Plus: "Add01Icon",
  Radio: "RadioIcon",
  RefreshCcw: "RefreshIcon",
  RefreshCw: "RefreshIcon",
  Rocket: "Rocket01Icon",
  RotateCcw: "RotateLeft01Icon",
  Save: "FloppyDiskIcon",
  Scale: "BalanceScaleIcon",
  Search: "Search01Icon",
  SearchCheck: "SearchList01Icon",
  Send: "SentIcon",
  Server: "ServerStack01Icon",
  Settings: "Settings01Icon",
  Settings2: "Settings02Icon",
  Share2: "Share01Icon",
  Shield: "Shield01Icon",
  ShieldAlert: "ShieldEnergyIcon",
  ShieldCheck: "SecurityCheckIcon",
  Skull: "SkullIcon",
  SlidersHorizontal: "SlidersHorizontalIcon",
  Smartphone: "SmartPhone01Icon",
  Sparkles: "SparklesIcon",
  Square: "SquareIcon",
  StopCircle: "StopCircleIcon",
  Store: "Store01Icon",
  Tag: "Tag01Icon",
  Terminal: "TerminalIcon",
  TerminalSquare: "TerminalIcon",
  ThumbsDown: "ThumbsDownIcon",
  ThumbsUp: "ThumbsUpIcon",
  Trash2: "Delete02Icon",
  Twitter: "NewTwitterIcon",
  Type: "TextIcon",
  Unlink: "Unlink01Icon",
  Upload: "Upload01Icon",
  UploadCloud: "CloudUploadIcon",
  User: "UserIcon",
  UserCheck: "UserCheck01Icon",
  Users: "UserGroupIcon",
  Volume2: "VolumeHighIcon",
  Wand2: "MagicWand01Icon",
  WandSparkles: "MagicWand02Icon",
  Wrench: "Wrench01Icon",
  X: "Cancel01Icon",
  XCircle: "CancelCircleIcon",
  Zap: "ZapIcon",
  ZoomIn: "ZoomInAreaIcon",
  ZoomOut: "ZoomOutAreaIcon",
};

const typesFile = path.join(
  root,
  "node_modules/@hugeicons/core-free-icons/dist/types/index.d.ts"
);
const typesContent = fs.readFileSync(typesFile, "utf8");
const available = new Set(
  [...typesContent.matchAll(/declare const (\w+Icon):/g)].map((m) => m[1])
);

const lucideIcons = fs
  .readFileSync(path.join(root, "scripts/extract-lucide-icons.mjs"), "utf8");
// re-run extract
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

const lucideSet = new Set();
for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const re = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;
  let m;
  while ((m = re.exec(content))) {
    m[1].split(",").forEach((part) => {
      const p = part.trim();
      const asMatch = p.match(/^(\w+)\s+as\s+\w+$/);
      if (asMatch) lucideSet.add(asMatch[1]);
      else if (/^\w+$/.test(p)) lucideSet.add(p);
    });
  }
}

const missing = [];
const mapping = {};
for (const lucide of [...lucideSet].sort()) {
  const huge = OVERRIDES[lucide];
  if (huge === null) {
    mapping[lucide] = null;
    continue;
  }
  if (!huge) {
    missing.push({ lucide, reason: "no override" });
    continue;
  }
  if (!available.has(huge)) {
    missing.push({ lucide, huge, reason: "not in free pack" });
    continue;
  }
  mapping[lucide] = huge;
}

if (missing.length) {
  console.error("MISSING:", JSON.stringify(missing, null, 2));
  process.exit(1);
}

const imports = [...new Set(Object.values(mapping).filter(Boolean))].sort();
const iconExports = Object.keys(mapping)
  .sort()
  .filter((lucide) => mapping[lucide] !== null)
  .map((lucide) => `export const ${lucide} = createIcon(${mapping[lucide]});`)
  .join("\n");

const loaderExports = mapping.Loader === null
  ? `import PegtopLoader from "../components/ui/PegtopLoader";

export const Loader = PegtopLoader;
export const Loader2 = PegtopLoader;
export const SendPrompt = createIcon(FirstBracketCircleIcon);`
  : "";

const bracketImport = mapping.Loader === null ? "  FirstBracketCircleIcon,\n" : "";

const content = `/**
 * Lucide-compatible icon exports backed by Hugeicons Free (Stroke Rounded).
 * Central registry — swap Hugeicons Pro packs here without touching call sites.
 */
import {
  ${bracketImport}${imports.join(",\n  ")}
} from "@hugeicons/core-free-icons";
import { createIcon } from "./createIcon";

${iconExports}
${loaderExports ? `\n${loaderExports}` : ""}
`;

fs.writeFileSync(path.join(root, "src/lib/icons.js"), content);
console.log(`Generated icons.js with ${Object.keys(mapping).length} icons`);
