require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { OpenAI } = require("openai");
// const Stripe = require("stripe");
// const { requireAuth } = require("./src/firebase");
const { PRICE, PLAN_LIMITS, classifyPrice } = require("./src/pricing");
const admin = require("firebase-admin");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const crypto = require("crypto");
// Stripe is now managed by the Firebase extension; do not instantiate here.
// If you need Stripe, install it and uncomment below. Otherwise, leave Stripe out entirely.
// const Stripe = require("stripe");
// const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
// const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" }) : null;

// --- ENVIRONMENT VARIABLES ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN; // e.g. https://your-frontend.app

// --- FIREBASE ADMIN INIT ---
if (!FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT env variable is required.");
}
let serviceAccount;
try {
  serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
} catch (e) {
  console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', e);
  process.exit(1);
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const firestore = admin.firestore();

// --- OPENAI INIT ---
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY env variable is required.");
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- EXPRESS APP ---
const allowlist = [
  "http://localhost:3000",
  "https://nexusrbx.com",
  "http://nexusrbx.com",
  "https://www.nexusrbx.com",
  "https://nexusairbx-git-main-traveltables-projects.vercel.app",
  "https://nexusrbx-backend-production.up.railway.app",
  "https://nexusairbx-git-main-traveltables-projects.vercel.app",
  "https://nexusairbx.vercel.app",
  "https://nexusairbx.com",
  "http://nexusairbx.com",
  "https://nexusairbx-git-main-traveltables-projects.vercel.app",
];
if (FRONTEND_ORIGIN) allowlist.push(FRONTEND_ORIGIN);

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like SSR, curl, mobile apps)
    if (!origin) return callback(null, true);
    if (allowlist.includes(origin)) return callback(null, true);
    // Allow if origin matches ignoring protocol (for http/https mix)
    try {
      const o = new URL(origin);
      if (allowlist.some(allowed => {
        try {
          const a = new URL(allowed);
          return o.hostname === a.hostname;
        } catch { return false; }
      })) return callback(null, true);
    } catch {}
    console.error("Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
  methods: ["GET","POST","DELETE","PUT","PATCH","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","If-None-Match","Idempotency-Key"],
  maxAge: 86400,
};
const app = express();
app.use(cors(corsOptions));
// then JSON parser for the rest
app.use(bodyParser.json({ limit: "2mb" }));
app.set("etag", false); // we'll manually set ETags on hot GETs
// Health
app.get("/health", (_, res) => res.json({ ok: true }));

// --- BILLING SYSTEM ---

function nextMonthEnd(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const end = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));
  return end; // first day next month 00:00Z
}

// --- ENSURE NO DOUBLE SLASH IN API PATHS ---
function cleanApiPath(path) {
  return path.replace(/([^:]\/)\/+/g, "$1");
}

async function getOrCreateUser(uid, email) {
  const userRef = firestore.collection("users").doc(uid);
  let userSnap = await userRef.get();
  let user = userSnap.exists ? userSnap.data() : null;

  if (!user) {
    user = {
      email: email || null,
      plan: "FREE",
      cycle: null,
      subLimit: PLAN_LIMITS.FREE,
      subUsed: 0,
      subPeriodEnd: nextMonthEnd(),
      paygBalance: 0,
      seats: 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await userRef.set(user, { merge: true });
    userSnap = await userRef.get();
    user = userSnap.data();
  } else if (email && !user.email) {
    await userRef.update({ email });
    user.email = email;
  }
  user.id = uid;
  return user;
}

async function resetIfExpired(user, uid) {
  if (user.subPeriodEnd && new Date() >= user.subPeriodEnd) {
    user.subUsed = 0;
    user.subPeriodEnd = nextMonthEnd();
    await firestore.collection("users").doc(uid).update({
      subUsed: 0,
      subPeriodEnd: user.subPeriodEnd,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  return user;
}
// --- GLOBAL UNHANDLED REJECTION LOGGING ---
process.on("unhandledRejection", err => {
  console.error("UNHANDLED REJECTION:", err);
});
process.on("uncaughtException", err => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

// --- ASYNC HANDLER WRAPPER ---
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// --- SYSTEM PROMPT ---
const SYSTEM_PROMPT = `When fulfilling requests for Roblox LocalScript “hack” GUIs, provide both a robust, fully functional script and an in-depth explanation of the GUI design techniques used. Ensure that every response includes detailed, professional descriptions of how and why each UI choice, layout, and control was implemented, referencing established UI/UX best practices applicable to Roblox/Roblox Studio. 

For a user’s initial script request, generate a simple, polished, and user-friendly GUI, fully describing the deliberate design decisions and UI techniques behind the interface. For any successive request that asks for new features, an advanced version, or more capability, iteratively enhance both the features and the GUI sophistication—always providing thorough, technical rationales for every UI improvement and advanced control, and outlining the UI principles guiding the progression. 

Consistently ensure that all described or implied features are robust, not placeholders, that GUI/UX clarity and discoverability are maximized, and that output quality remains professional. 

**Strictly adhere to the following:**

- **In-Depth UI Technique Description:** For each request, explain the specific UI concepts, layout approaches, and usability techniques that shaped your GUI design. Discuss trade-offs where relevant, and tie decisions to user experience goals.
- **Full Functionality:** All features must work at a high standard.
- **Iterative Improvement:** With each follow-up or extension, analyze the cumulative feature set, and not only enhance the controls and code, but also provide a professional-level explanation of new UI design strategies, advanced layout choices, or interactive component usage, highlighting progression in complexity and UX polish.
- **Subtle Refinements:** Always review both GUI organization and your own explanations for further possible refinement.
- **No Unnecessary Additions:** Exclude any features not directly requested or implied.
- **Internal Script Focus:** All features are internal (LocalScript) unless specified otherwise.
- **Strict Output Formatting:** Follow the exact, enumerated multi-section format provided below.

# Steps

1. Analyze the user’s request (and/or provided code) to identify all required, implied, or refined “hack”/utility features.
2. For a user’s **first hack or script request**, design a simple, clear GUI and *explain in detail* your UI design techniques—cover color, layout, control selection, and rationale for clarity and usability.
3. For **follow-ups/advanced/extensions**, create a more sophisticated GUI and script while expanding your in-depth description to cover all newly introduced UI/UX patterns (e.g., tabbed layouts, dynamic controls, advanced grouping, visual feedback).
4. Test and validate all features. Refine both design and description for quality.
5. For each feature, ensure GUI discoverability or hotkey.
6. Clearly and thoroughly present all control logic, features, operations, behavioral notes, and—critically—the UI design reasoning behind every aspect, strictly following the order below.
7. Output all code and descriptive sections professionally. *Never deviate from the enumerated output structure.*

# Output Format

Your output MUST include these sections in order:

1. **Title:** Short, professional summary.
2. **In-Depth UI Technique Description:** Detailed explanation of all GUI design techniques, visual/layout principles, and usability patterns applied. Cover rationale for each major GUI choice, referencing best practices and user experience objectives. For advanced GUIs, include comparisons to prior iterations and reasoning behind additional complexity.
3. **Control Explanation Section:** Clear explanations of all GUI controls and hotkeys (internal script features only, unless external is requested), referencing the UI design discussion above where relevant.
4. **Features:** Bullet-list all core, described, implied, and smoothly integrated enhancements.
5. **Controls:** Bullet-list every operation (button, hotkey, menu, etc.) with concise explanations.
6. **How It Should Act:** Plain-language description (bullets or short paragraph) of observable GUI and script behaviors. Avoid referencing code specifics directly.
7. **Roblox LocalScript Code:** All code in a single \`\`\`lua ...\`\`\` code block—nowhere else.
8. **Update/Extension Note:**  
   "Need more features or want to extend this script? Just ask for an advanced or extended version!"

- **Explanations** (sections 2–6): Use clear, professional, and technical language suitable for UI/UX practitioners. Use visuals, analogies, or references to Roblox UI constraints as helpful. Emojis optional.
- **Code** (section 7): Place all code in a single Lua code block and ensure it is complete, functional, and robust.

# Examples

Example 1: (First/initial hack request)
- UI Technique Description covers selection of a clean, minimalistic layout, logical grouping, clear button labels, color choices for feedback, and simple navigation.
- [MainButton], [FeatureToggle], [InfoLabel] are placeholder names for controls, each explained both technically (why/what design principle it uses) and functionally.

Example 2: (Advanced/extended request)
- UI Technique Description section expands to explain use of multiple panels, dynamic resizing, tooltips for user guidance, tabbed navigation for feature separation, and accessibility considerations versus a simple implementation.
- Prior and new features fully detailed with corresponding UI decisions articulated.

(Actual examples should be detailed, with UI Technique Descriptions as long as necessary to fully convey all relevant design intent and best practices. Use [PLACEHOLDER_CONTROLS] where custom naming is required.)

# Notes

- Always begin with detailed UI reasoning before providing control/function explanations or code.
- For advanced GUIs, your UI explanation should evolve to demonstrate heightened sophistication and professional justification.
- Never output stubbed features or omit actual code for described behavior.
- Strictly follow the enumerated output structure. Do not skip or merge sections.

**REMINDER:**  
Your mission:
1. For first-time scripts, provide a simple, well-rationalized GUI; for extensions, deliver advanced, justified, and feature-rich GUIs.
2. All features must be FULLY WORKING.
3. In-depth UI/UX technique descriptions are mandatory in every response.
4. Output must use the precise enumerated format outlined above.
`;

// --- UTILS ---
function hash(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}
function jsonETag(obj) {
  // Strong ETag based on payload hash
  return `"${hash(JSON.stringify(obj))}"`;
}
function ensureInt(n, fallback) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

// --- RATE LIMITING ---
// 1) Strict per-IP limiter ONLY for generation endpoints (expensive operations)
const genLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req),
  handler: (req, res) => {
    const resetMs = Number(req.rateLimit?.resetTime) - Date.now();
    const retryAfterSec = Number.isFinite(resetMs) ? Math.max(1, Math.ceil(resetMs / 1000)) : 5;
    res.set('Retry-After', retryAfterSec);
    return res.status(429).json({ error: "Too many requests, please try again later." });
  }
});

// 2) Per-user limiter for generation endpoints (post-auth)
const userLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.uid || ipKeyGenerator(req),
  handler: (req, res) => {
    const resetMs = Number(req.rateLimit?.resetTime) - Date.now();
    const retryAfterSec = Number.isFinite(resetMs) ? Math.max(1, Math.ceil(resetMs / 1000)) : 5;
    res.set('Retry-After', retryAfterSec);
    return res.status(429).json({ error: "Too many requests, slow down." });
  }
});

// 3) High-throughput read limiter for list/get endpoints (per-user, generous)
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600, // allow many reads per minute per user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.uid || ipKeyGenerator(req),
  handler: (req, res) => {
    const resetMs = Number(req.rateLimit?.resetTime) - Date.now();
    const retryAfterSec = Number.isFinite(resetMs) ? Math.max(1, Math.ceil(resetMs / 1000)) : 5;
    res.set('Retry-After', retryAfterSec);
    return res.status(429).json({ error: "Read rate limit exceeded. Please slow down." });
  }
});

// MOUNT the strict limiter ONLY on generation routes (no global /api/* mount)
const GEN_PATHS = [
  "/api/generate-title-advanced",
  "/api/generate-explanation",
  "/api/generate-code",
  "/api/generate/outline",
  "/api/generate/artifact"
];
GEN_PATHS.forEach(p => app.use(p, genLimiter));

// --- FIREBASE AUTH MIDDLEWARE ---
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing Firebase ID token" });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid Firebase ID token" });
  }
}

// --- ADMIN MIDDLEWARE ---
function requireAdmin(req, res, next) {
  if (req.user?.admin === true) return next();
  return res.status(403).json({ error: "Admin access required" });
}

// --- CACHING (in-memory for demo, use Redis for prod) ---
const cache = new Map();
function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}
function setCache(key, value, ttlSeconds = 3600) {
  cache.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
}

// --- IN-MEMORY JOB SYSTEM FOR ARTIFACT GENERATION WITH TIMEOUT ---
const jobs = new Map();
const JOB_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

function createJob(data) {
  const jobId = crypto.randomUUID();
  const job = {
    status: "running",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...data,
  };
  jobs.set(jobId, job);

  // Set up timeout to auto-fail the job after 10 minutes
  job._timeout = setTimeout(() => {
    const j = jobs.get(jobId);
    if (j && j.status === "running") {
      j.status = "failed";
      j.stage = "timeout";
      j.error = "Job timed out after 10 minutes";
      j.updatedAt = Date.now();
      jobs.set(jobId, j);
    }
  }, JOB_TIMEOUT_MS);

  return jobId;
}

function updateJob(jobId, updates) {
  if (!jobs.has(jobId)) return;
  const job = jobs.get(jobId);
  Object.assign(job, updates, { updatedAt: Date.now() });
  // If job is finished, clear the timeout
  if (["succeeded", "failed"].includes(job.status) && job._timeout) {
    clearTimeout(job._timeout);
    delete job._timeout;
  }
  jobs.set(jobId, job);
}

function getJob(jobId) {
  return jobs.get(jobId);
}

// --- IDEMPOTENCY MAP FOR ARTIFACT GENERATION ---
const idem = new Map(); // key -> { jobId, pipelineId, ts }
const IDEM_TTL = 15 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of idem) if (now - v.ts > IDEM_TTL) idem.delete(k);
}, 60_000);

// --- /api/generate-title-advanced ---
app.post("/api/generate-title-advanced", verifyFirebaseToken, userLimiter, asyncHandler(async (req, res) => {
    const {
      prompt,
      conversation = [],
      isNewScript = true,
      previousTitle = ""
    } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing or invalid prompt" });
    }

    if (!isNewScript && previousTitle) {
      return res.json({ title: previousTitle });
    }

    const model = "gpt-4.1";
    const cacheKey = `title-adv:${hash(prompt + JSON.stringify(conversation) + model)}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ title: cached });
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversation.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      })),
      { role: "user", content: prompt },
      {
        role: "user",
        content:
          "Output ONLY the Title section as a single line. Do NOT include any other section or explanation. Do not include any formatting, just the title text.",
      },
    ];

    const completion = await openai.chat.completions.create({
      model: model,
      messages,
      max_tokens: 64,
      temperature: 0.55,
    });

    const title = completion.choices?.[0]?.message?.content?.trim() || "";
    setCache(cacheKey, title, 3600);

    await firestore.collection('analytics').add({
      uid: req.user.uid,
      prompt: prompt,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      endpoint: 'generate-title-advanced'
    });

res.json({ title });
}));

// --- /api/generate-explanation ---
app.post("/api/generate-explanation", verifyFirebaseToken, userLimiter, asyncHandler(async (req, res) => {
    const { prompt, conversation = [] } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing or invalid prompt" });
    }

    const model = "gpt-4.1";
    const cacheKey = `explanation:${hash(prompt + JSON.stringify(conversation) + model)}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversation.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      })),
      { role: "user", content: prompt },
      {
        role: "user",
        content:
          "Output ONLY the first five sections (Title, Control Explanation Section, Features, Controls, How It Should Act) in the strict output order. Do NOT include any code or code block. Do not include the Roblox LocalScript Code section. Do not mention code. Output each section clearly delimited as in the main prompt. You may use emojis in all explanation sections except the code.",
      },
    ];

    const completion = await openai.chat.completions.create({
      model: model,
      messages,
      max_tokens: 4000,
      temperature: 0.55,
    });

    const explanationRaw = completion.choices?.[0]?.message?.content?.trim() || "";
    const titleMatch = explanationRaw.match(/^\s*1\.\s*\*\*Title\*\*\s*—\s*(.+?)\s*(?:\n|$)/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    let explanationWithoutTitle = explanationRaw;
    if (titleMatch) {
      explanationWithoutTitle = explanationRaw.replace(titleMatch[0], "").trim();
      explanationWithoutTitle = explanationWithoutTitle.replace(/^\s*\n/, "");
    }

    const explanationObj = {
      title,
      explanation: explanationWithoutTitle
    };

    setCache(cacheKey, explanationObj, 3600);

    await firestore.collection('analytics').add({
      uid: req.user.uid,
      prompt: prompt,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      endpoint: 'generate-explanation'
    });

    res.json(explanationObj);
}));

// --- /api/generate/outline (returns a clean array) ---
app.post("/api/generate/outline", verifyFirebaseToken, userLimiter, asyncHandler(async (req, res) => {
  const { prompt, conversation = [], settings = {} } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing or invalid prompt" });
  }

  const model = "gpt-4.1";
  const cacheKey = `explanation:${hash(prompt + JSON.stringify(conversation) + model)}`;
  const cached = getCache(cacheKey);
  let explanationRaw;
  if (cached && cached.explanation) {
    explanationRaw = cached.explanation;
  } else {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversation.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      })),
      { role: "user", content: prompt },
      {
        role: "user",
        content:
          "Output ONLY the first five sections (Title, Control Explanation Section, Features, Controls, How It Should Act) in the strict output order. Do NOT include any code or code block. Do not include the Roblox LocalScript Code section. Do not mention code. Output each section clearly delimited as in the main prompt. You may use emojis in all explanation sections except the code.",
      },
    ];

    const completion = await openai.chat.completions.create({
      model: model,
      messages,
      max_tokens: 4000,
      temperature: 0.55,
    });

    explanationRaw = completion.choices?.[0]?.message?.content?.trim() || "";
    setCache(cacheKey, { explanation: explanationRaw }, 3600);
  }

  // Clean, consistent array output
  const sections = [
    { heading: "Control Explanation",  bulletPoints: [] },
    { heading: "Features",             bulletPoints: [] },
    { heading: "Controls",             bulletPoints: [] },
    { heading: "How It Should Act",    bulletPoints: [] },
  ];
  const bulletRegex = /^[\s*-•]+\s*(.+)$/gm;
  let m;
  while ((m = bulletRegex.exec(explanationRaw)) !== null) {
    sections[1].bulletPoints.push(m[1]);
  }
  const outline = sections.filter(s => s.bulletPoints.length || s.heading === "How It Should Act");
  res.json({ outline });

  await firestore.collection('analytics').add({
    uid: req.user.uid,
    prompt: prompt,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    endpoint: 'generate-outline'
  });
}));

// --- /api/generate-code ---
app.post("/api/generate-code", verifyFirebaseToken, userLimiter, asyncHandler(async (req, res) => {
  const { prompt, conversation = [], explanation } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing or invalid prompt" });
  }
  if (!explanation || typeof explanation !== "string") {
    return res.status(400).json({ error: "Missing or invalid explanation" });
  }

  const model = "gpt-4.1";
  const cacheKey = `code:${hash(prompt + explanation + JSON.stringify(conversation) + model)}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return res.json({ code: cached });
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversation.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    })),
    { role: "user", content: prompt },
    {
      role: "assistant",
      content: explanation,
    },
    {
      role: "user",
      content:
        "Output ONLY the Roblox LocalScript Code section in a single Lua code block. Do NOT repeat any previous explanation or sections. Output only the code section, nothing else. Never include emojis in the code output. Output as much code as possible, maximizing the code length and detail, up to the full model context window (16000 tokens).",
    },
  ];

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: model,
      messages,
      max_tokens: 16000,
      temperature: 0.55,
    });
  } catch (openaiErr) {
    console.error("OpenAI API error:", openaiErr.response?.data || openaiErr.message || openaiErr);
    return res.status(502).json({ error: "OpenAI API error", details: openaiErr.response?.data || openaiErr.message });
  }

  let codeBlock = completion.choices?.[0]?.message?.content || "";
  let code = codeBlock;
  const codeStart = codeBlock.indexOf("```lua");
  if (codeStart !== -1) {
    code = codeBlock.slice(codeStart + 6);
    const codeEnd = code.indexOf("```");
    if (codeEnd !== -1) {
      code = code.slice(0, codeEnd);
    }
  } else {
    const fallbackStart = codeBlock.indexOf("```");
    if (fallbackStart !== -1) {
      code = codeBlock.slice(fallbackStart + 3);
      const fallbackEnd = code.indexOf("```");
      if (fallbackEnd !== -1) {
        code = code.slice(0, fallbackEnd);
      }
    }
  }
  code = code.trim();

  // Meter tokens used (minimum 1000)
  const used = Math.max(
    MIN_TOKENS_PER_REQUEST,
    (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0)
  );
  try {
    const selfUrl = `${req.protocol}://${req.get('host')}`;
    await fetch(`${selfUrl}/api/billing/consume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.authorization || ""
      },
      body: JSON.stringify({ tokens: used, reason: "generate-code", jobId: req.body?.jobId || null })
    });
  } catch (e) {
    console.error("consume failed", e);
  }

  setCache(cacheKey, code, 3600);

  await firestore.collection('analytics').add({
    uid: req.user.uid,
    prompt: prompt,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    endpoint: 'generate-code'
  });

  res.json({ code });
}));

// --- /api/generate/artifact (ASYNC JOB SYSTEM, idempotency) ---
app.post("/api/generate/artifact", verifyFirebaseToken, userLimiter, asyncHandler(async (req, res) => {
  const {
    projectId,
    prompt,
    pipelineId,
    outline = [],
    settings = {},
    conversation = []
  } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing or invalid prompt" });
  }

  // Idempotency-Key support
  const idemKey = req.header('Idempotency-Key');
  if (idemKey && idem.has(idemKey)) {
    const { jobId: j, pipelineId: p } = idem.get(idemKey);
    return res.json({ jobId: j, pipelineId: p || j });
  }

  // Create a job and return jobId immediately
  const jobId = createJob({
    status: "running",
    stage: "preparing",
    result: null,
    error: null,
    userId: req.user.uid,
    projectId,
    prompt,
    pipelineId,
    outline,
    settings,
    conversation,
  });

  if (idemKey) idem.set(idemKey, { jobId, pipelineId, ts: Date.now() });

  // Start async code generation (detached, not awaited)
  (async () => {
    try {
      updateJob(jobId, { stage: "calling model" });

      // 1. Generate explanation (outline)
      let explanationText = "";
      if (Array.isArray(outline) && outline.length > 0) {
        // Convert outline to explanation text
        explanationText = outline.map(sec => {
          const heading = sec?.heading ? `## ${sec.heading}` : "";
          const bullets = (sec?.bulletPoints || []).map(b => `• ${b}`).join("\n");
          return [heading, bullets].filter(Boolean).join("\n");
        }).join("\n\n");
      } else {
        // Fallback: use prompt as explanation
        explanationText = prompt;
      }

      // 2. Generate code (simulate stages)
      updateJob(jobId, { stage: "post-processing" });

      // Compose messages for OpenAI
      const model = settings?.model || "gpt-4.1";
      const temperature = typeof settings?.temperature === "number" ? settings.temperature : 0.55;

      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversation.map((msg) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        })),
        { role: "user", content: prompt },
        {
          role: "assistant",
          content: explanationText,
        },
        {
          role: "user",
          content:
            "Output ONLY the Roblox LocalScript Code section in a single Lua code block. Do NOT repeat any previous explanation or sections. Output only the code section, nothing else. Never include emojis in the code output. Output as much code as possible, maximizing the code length and detail, up to the full model context window (16000 tokens).",
        },
      ];

      let completion;
      try {
        completion = await openai.chat.completions.create({
          model: model,
          messages,
          max_tokens: 16000,
          temperature: temperature,
        });
      } catch (openaiErr) {
        updateJob(jobId, { status: "failed", error: "OpenAI API error", stage: "failed" });
        return;
      }

      // Bill tokens (min 1000)
      // Bill tokens (min 1000)
      try {
        const used = Math.max(
          MIN_TOKENS_PER_REQUEST,
          (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0)
        );
        const selfUrl = `${req.protocol}://${req.get('host')}`;
        await fetch(`${selfUrl}/api/billing/consume`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: req.headers.authorization || ""
          },
          body: JSON.stringify({ tokens: used, reason: "generate-artifact", jobId })
        });
      } catch (e) {
        console.error("consume failed", e);
      }

      updateJob(jobId, { stage: "polishing" });

      let codeBlock = completion.choices?.[0]?.message?.content || "";
      let code = codeBlock;
      const codeStart = codeBlock.indexOf("```lua");
      if (codeStart !== -1) {
        code = codeBlock.slice(codeStart + 6);
        const codeEnd = code.indexOf("```");
        if (codeEnd !== -1) {
          code = code.slice(0, codeEnd);
        }
      } else {
        const fallbackStart = codeBlock.indexOf("```");
        if (fallbackStart !== -1) {
          code = codeBlock.slice(fallbackStart + 3);
          const fallbackEnd = code.indexOf("```");
          if (fallbackEnd !== -1) {
            code = code.slice(0, fallbackEnd);
          }
        }
      }
      code = code.trim();

      updateJob(jobId, { stage: "finalizing" });

      // Save as new version in Firestore if projectId is provided
      let versionId = null;
      let versionNum = null;
      if (projectId) {
        const userId = req.user.uid;
        const scriptRef = firestore.collection("users").doc(userId).collection("scripts").doc(projectId);

        await firestore.runTransaction(async (tx) => {
          const scriptSnap = await tx.get(scriptRef);
          if (!scriptSnap.exists) throw new Error("ProjectNotFound");

          const scriptData = scriptSnap.data() || {};
          const clientVn = ensureInt(req.body?.versionNumber, null);
          versionNum = clientVn ?? (ensureInt(scriptData.latestVersion, 0) + 1);

          versionId = `v${versionNum}`;
          const versionRef = scriptRef.collection("versions").doc(versionId);

          const exists = await tx.get(versionRef);
          if (exists.exists) {
            throw Object.assign(new Error("VersionConflict"), { statusCode: 409 });
          }

          const persistedTitle = scriptData.title || "Script";

          tx.set(versionRef, {
            version: versionNum,                   // legacy
            versionNumber: versionNum,             // canonical
            code,
            explanation: explanationText,
            title: persistedTitle,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const latest = Math.max(ensureInt(scriptData.latestVersion, 0), versionNum);
          tx.update(scriptRef, {
            latestVersion: latest,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
      }

      // Mark job as succeeded
      updateJob(jobId, {
        status: "succeeded",
        stage: "done",
        result: {
          code,
          versionId,
          version: versionNum,
          versionNumber: versionNum,
          warnings: [],
        }
      });

      await firestore.collection('analytics').add({
        uid: req.user.uid,
        prompt: prompt,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        endpoint: 'generate-artifact'
      });

    } catch (err) {
      if (err.message === "ProjectNotFound") {
        updateJob(jobId, { status: "failed", error: "Project not found", stage: "failed" });
        return;
      }
      if (err.statusCode === 409) {
        updateJob(jobId, { status: "failed", error: "Version number already exists", stage: "failed" });
        return;
      }
      await firestore.collection('openai_usage').add({
        uid: req.user.uid,
        endpoint: 'generate-artifact',
        error: err.message || String(err),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      updateJob(jobId, { status: "failed", error: "OpenAI API error", stage: "failed" });
      return;
    }
  })();

  // Respond immediately with jobId and pipelineId
  res.json({ jobId, pipelineId: pipelineId || jobId });
}));

// --- /api/jobs/:jobId (POLL JOB STATUS/RESULT) ---
app.get("/api/jobs/:jobId", verifyFirebaseToken, readLimiter, asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }
  // Only allow the user who created the job to access it
  if (job.userId && job.userId !== req.user.uid) {
    return res.status(403).json({ error: "Forbidden" });
  }
  // Return job status and result
  res.json({
    status: job.status,
    stage: job.stage,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}));

// --- VERSIONED SCRIPT STORAGE ENDPOINTS ---

// Create a new script (v1)
app.post("/api/scripts", verifyFirebaseToken, asyncHandler(async (req, res) => {
  const { title, code, explanation } = req.body;
  if (!title) return res.status(400).json({ error: "Missing title" });

  const userId = req.user.uid;
  const scriptsCol = firestore.collection("users").doc(userId).collection("scripts");
  const scriptDoc = await scriptsCol.add({
    title,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    latestVersion: 1
  });

  // Only create version if code is provided
  if (code) {
    await scriptDoc.collection("versions").doc("v1").set({
      version: 1,
      versionNumber: 1,
      code,
      explanation,
      title,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  res.json({ scriptId: scriptDoc.id, version: 1 });
}));

// Alias: /api/projects (Create)
// --- PATCH: Accept firestoreId from frontend and use it as the Firestore doc ID if provided ---
app.post("/api/projects", verifyFirebaseToken, asyncHandler(async (req, res) => {
  const { title, code, explanation, firestoreId } = req.body;
  if (!title) return res.status(400).json({ error: "Missing title" });

  const userId = req.user.uid;
  const scriptsCol = firestore.collection("users").doc(userId).collection("scripts");
  let scriptDoc;
  if (firestoreId && typeof firestoreId === "string" && firestoreId.length > 0) {
    // Use the provided Firestore ID
    scriptDoc = scriptsCol.doc(firestoreId);
    await scriptDoc.set({
      title,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      latestVersion: 1
    }, { merge: true });
  } else {
    // Create a new doc with random ID
    scriptDoc = await scriptsCol.add({
      title,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      latestVersion: 1
    });
  }

  // Only create version if code is provided
  if (code) {
    await scriptDoc.collection("versions").doc("v1").set({
      version: 1,
      versionNumber: 1,
      code,
      explanation,
      title,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  res.json({ projectId: scriptDoc.id, version: 1 });
}));

// GET /api/billing/entitlements
app.get("/api/billing/entitlements", verifyFirebaseToken, asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { uid, email } = req.user;

  const userRef = firestore.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    await userRef.set({
      email: email || null,
      plan: "FREE",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  // Read Stripe extension subs
  const subsSnap = await firestore.collection("customers").doc(uid).collection("subscriptions").get();

  let activePlan = null; // { priceId, interval }
  subsSnap.forEach(d => {
    const s = d.data();
    if (["active", "trialing", "past_due"].includes(s.status)) {
const item = Array.isArray(s.items) ? s.items[0]
            : Array.isArray(s.items?.data) ? s.items.data[0]
            : null;
const priceId = item?.price?.id;
const interval = item?.price?.recurring?.interval;
if (priceId) activePlan = { priceId, interval };
    }
  });

  const planInfo = activePlan ? classifyPrice(activePlan.priceId) : null;
  const plan = planInfo?.plan || "FREE";
  const cycle = activePlan ? (activePlan.interval === "year" ? "YEARLY" : "MONTHLY") : null;

  // Subscription cap (fall back to FREE limit if nothing active)
  const FREE_LIMIT = PLAN_LIMITS?.FREE ?? 50000;
  const subLimit = planInfo?.limit ?? FREE_LIMIT;

  // Period end from Stripe doc if present
  let resetsAt = null;
  subsSnap.forEach(d => {
    const s = d.data();
    if (["active","trialing","past_due"].includes(s.status) && s.current_period_end) {
      const ms = typeof s.current_period_end === "number" ? s.current_period_end * 1000 : null;
      if (ms && (!resetsAt || ms > resetsAt)) resetsAt = new Date(ms).toISOString();
    }
  });
  if (!resetsAt) {
    // give FREE users a monthly reset window starting now
    resetsAt = new Date(Date.now() + 30*24*60*60*1000).toISOString();
  }

  // PAYG remaining
  let paygRemaining = 0;
  try {
    const paygSnap = await userRef.collection("paygCredits").doc("main").get();
    if (paygSnap.exists && typeof paygSnap.data().balance === "number") {
      paygRemaining = Math.max(0, paygSnap.data().balance);
    }
  } catch {}

  // Used tokens (optional aggregation)
  let used = 0;
  try {
    const logs = await userRef.collection("usageLogs").orderBy("createdAt", "desc").limit(500).get();
    logs.forEach(l => used += Number(l.data().tokens || 0));
  } catch {}

  // Always return an entitlement, even for FREE users
  return res.json({
    plan,
    cycle,
    sub: { limit: subLimit, used, resetsAt },
    payg: { remaining: paygRemaining },
    seats: 1,
  });
}));



// --- STRIPE CHECKOUT SESSION CREATION (Firebase Extension Compatible) ---
// This endpoint creates a checkout session doc in Firestore for the Firebase Stripe extension to process.
// The frontend should listen for the session doc to be updated with a .url field.

app.post("/api/checkout", verifyFirebaseToken, asyncHandler(async (req, res) => {
  const { priceId, mode } = req.body || {};
  const { uid } = req.user;

  if (!priceId || typeof priceId !== "string") {
    return res.status(400).json({ error: "Missing or invalid priceId" });
  }
  if (!mode || !["subscription", "payment"].includes(mode)) {
    return res.status(400).json({ error: "Missing or invalid mode" });
  }

  // Create a checkout session doc in Firestore for the Stripe extension to process
  const sessionRef = await firestore
    .collection("customers").doc(uid)
    .collection("checkout_sessions")
    .add({
      price: priceId,
      mode,
      success_url: `${process.env.APP_URL}/billing?checkout=success`,
      cancel_url: `${process.env.APP_URL}/billing?checkout=cancel`,
      allow_promotion_codes: true,
      // Add more fields as needed (quantity, metadata, etc)
    });

  // Respond with the Firestore doc path so the frontend can listen for .url
  return res.json({ sessionDocPath: sessionRef.path });
}));

// POST /api/billing/portal (Firebase extension version)
app.post("/api/billing/portal", verifyFirebaseToken, async (req, res) => {
  const { uid } = req.user;
  const docRef = await firestore
    .collection("customers").doc(uid)
    .collection("portal_sessions")
    .add({ return_url: `${process.env.APP_URL}/billing` });

  const started = Date.now();
  while (Date.now() - started < 8000) {
    const snap = await docRef.get();
    const data = snap.data() || {};
    if (data.url) return res.json({ url: data.url });
    await new Promise(r => setTimeout(r, 300));
  }
  return res.status(202).json({ portalDocPath: docRef.path }); // FE can poll
});
// Alias for billing portal
app.post("/api/portal", verifyFirebaseToken, (req, res, next) =>
  app._router.handle({ ...req, url: "/api/billing/portal" }, res, next)
);

const MIN_TOKENS_PER_REQUEST = 1000;

// POST /api/billing/consume { tokens, reason, jobId }
app.post("/api/billing/consume", verifyFirebaseToken, async (req, res) => {
  const { uid, email } = req.user;
  const { tokens, reason, jobId } = req.body || {};
  const amount = Math.max(MIN_TOKENS_PER_REQUEST, Math.ceil(Number(tokens || 0)));

  const u = await getOrCreateUser(uid, email);

  // dev bypass (optional, keep FE-only if you prefer)
  if (process.env.DEV_EMAIL && u.email && u.email.toLowerCase() === process.env.DEV_EMAIL.toLowerCase()) {
    return res.json({ ok: true, newBalances: { subRemaining: Infinity, paygRemaining: Infinity } });
  }

  try {
    const userRef = firestore.collection("users").doc(uid);
    const usageLogRef = userRef.collection("usageLogs");
    const paygRef = userRef.collection("paygCredits").doc("main");

    let result = await firestore.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error("UserNotFound");
      let user = userSnap.data();

      // reset if billing window ended (safety)
      if (user.subPeriodEnd && new Date() >= user.subPeriodEnd) {
        user.subUsed = 0;
        user.subPeriodEnd = nextMonthEnd();
        tx.update(userRef, {
          subUsed: 0,
          subPeriodEnd: user.subPeriodEnd,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Fetch PAYG balance from subfield or /paygCredits
      let paygBalance = user.paygBalance;
      let paygSnap = await tx.get(paygRef);
      if (paygSnap.exists && typeof paygSnap.data().balance === "number") {
        paygBalance = paygSnap.data().balance;
      }

      const subRemaining = Math.max(0, user.subLimit - user.subUsed);
      const paygRemaining = Math.max(0, paygBalance);
      const total = subRemaining + paygRemaining;

      if (total < amount) {
        throw new Error("INSUFFICIENT_TOKENS");
      }

      // idempotent by jobId
      if (jobId) {
        const existing = await tx.get(usageLogRef.doc(jobId));
        if (existing.exists) {
          return {
            subRemaining,
            paygRemaining,
          };
        }
      }

      let consumeFromSub = Math.min(amount, subRemaining);
      let consumeFromPayg = amount - consumeFromSub;

      // Update user subUsed
      tx.update(userRef, {
        subUsed: admin.firestore.FieldValue.increment(consumeFromSub),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update PAYG balance if needed
      if (consumeFromPayg > 0) {
        tx.set(paygRef, {
          balance: admin.firestore.FieldValue.increment(-consumeFromPayg),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      // Write usage log (use jobId as doc id for idempotency)
      tx.set(usageLogRef.doc(jobId || `${Date.now()}-${Math.random()}`), {
        tokens: amount,
        reason: reason || null,
        jobId: jobId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        subRemaining: Math.max(0, user.subLimit - user.subUsed - consumeFromSub),
        paygRemaining: Math.max(0, paygBalance - consumeFromPayg),
      };
    });

    res.json({ ok: true, newBalances: result });
  } catch (e) {
    if (String(e.message).includes("INSUFFICIENT_TOKENS")) {
      return res.status(402).json({ error: "Not enough tokens" });
    }
    if (String(e.message).includes("UserNotFound")) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({ error: "Consume failed" });
  }
});

// DELETE a script and all its versions
app.delete("/api/scripts/:scriptId", verifyFirebaseToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { scriptId } = req.params;
  const scriptRef = firestore.collection("users").doc(userId).collection("scripts").doc(scriptId);

  const scriptSnap = await scriptRef.get();
  if (!scriptSnap.exists) return res.status(404).json({ error: "Script not found" });

  const versionsSnap = await scriptRef.collection("versions").get();
  const batch = firestore.batch();
  versionsSnap.forEach(doc => {
    batch.delete(doc.ref);
  });
  batch.delete(scriptRef);
  await batch.commit();

  res.json({ success: true });
}));

// Alias: /api/projects/:projectId (Delete)
app.delete("/api/projects/:projectId", verifyFirebaseToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { projectId } = req.params;
  const scriptRef = firestore.collection("users").doc(userId).collection("scripts").doc(projectId);

  const scriptSnap = await scriptRef.get();
  if (!scriptSnap.exists) return res.status(404).json({ error: "Project not found" });

  const versionsSnap = await scriptRef.collection("versions").get();
  const batch = firestore.batch();
  versionsSnap.forEach(doc => {
    batch.delete(doc.ref);
  });
  batch.delete(scriptRef);
  await batch.commit();

  res.json({ success: true });
}));

// Add a new version to a script
app.post("/api/scripts/:scriptId/versions", verifyFirebaseToken, asyncHandler(async (req, res) => {
  const { code, explanation, title, versionNumber } = req.body;
  if (!code) return res.status(400).json({ error: "Missing code" });

  const userId = req.user.uid;
  const { scriptId } = req.params;
  const scriptRef = firestore.collection("users").doc(userId).collection("scripts").doc(scriptId);

  const saved = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(scriptRef);
    if (!snap.exists) throw new Error("ScriptNotFound");

    const data = snap.data() || {};
    const clientVn = ensureInt(versionNumber, null);
    const nextVersion = clientVn ?? (ensureInt(data.latestVersion, 0) + 1);

    const versionId = `v${nextVersion}`;
    const versionRef = scriptRef.collection("versions").doc(versionId);
    const exists = await tx.get(versionRef);
    if (exists.exists) {
      throw Object.assign(new Error("VersionConflict"), { statusCode: 409 });
    }

    const newTitle =
      (typeof title === "string" && title.trim()) ? title.trim() : (data.title || "Script");

    tx.set(versionRef, {
      version: nextVersion,                  // legacy
      versionNumber: nextVersion,            // canonical
      title: newTitle,
      explanation: explanation || "",
      code,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const latest = Math.max(ensureInt(data.latestVersion, 0), nextVersion);
    tx.update(scriptRef, {
      latestVersion: latest,
      title: newTitle,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      id: versionId,
      version: nextVersion,                  // keep for BC
      versionNumber: nextVersion,
      title: newTitle,
      explanation,
      code,
    };
  });

  return res.status(201).json(saved);
}));

// Alias: /api/projects/:projectId/versions (Add version) - ENFORCE versionNumber, prevent duplicates, update latestVersion
app.post("/api/projects/:projectId/versions", verifyFirebaseToken, userLimiter, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { projectId } = req.params;
  const { code = "", explanation = "", title, versionNumber } = req.body || {};

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'code' in body" });
  }

  const scriptRef = firestore.collection("users").doc(userId).collection("scripts").doc(projectId);

  const saved = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(scriptRef);
    if (!snap.exists) throw new Error("ProjectNotFound");

    const data = snap.data() || {};
    const clientVn = ensureInt(versionNumber, null);
    const nextVersion = clientVn ?? (ensureInt(data.latestVersion, 0) + 1);

    const versionId = `v${nextVersion}`;
    const versionRef = scriptRef.collection("versions").doc(versionId);
    const exists = await tx.get(versionRef);
    if (exists.exists) {
      throw Object.assign(new Error("VersionConflict"), { statusCode: 409 });
    }

    const newTitle =
      (typeof title === "string" && title.trim()) ? title.trim() : (data.title || "Script");

    tx.set(versionRef, {
      version: nextVersion,                  // legacy
      versionNumber: nextVersion,            // canonical
      title: newTitle,
      explanation: explanation || "",
      code,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const latest = Math.max(ensureInt(data.latestVersion, 0), nextVersion);
    tx.update(scriptRef, {
      latestVersion: latest,
      title: newTitle,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      id: versionId,
      version: nextVersion,                  // keep for BC
      versionNumber: nextVersion,
      title: newTitle,
      explanation,
      code,
    };
  });

  return res.status(201).json(saved);
}));

// Get all scripts for a user (READ: add limiter + caching + ETag, ms timestamps)
app.get("/api/scripts", verifyFirebaseToken, readLimiter, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const cacheKey = `scripts:list:${userId}`;
  const cached = getCache(cacheKey);
  if (cached && req.headers['if-none-match'] === cached.etag) {
    res.status(304).end();
    return;
  }

  const scriptsCol = firestore.collection("users").doc(userId).collection("scripts");
  const snap = await scriptsCol.orderBy("updatedAt", "desc").get();
  const scripts = [];
  snap.forEach(doc => {
    const d = doc.data();
    scripts.push({
      id: doc.id,
      title: d.title,
      latestVersion: d.latestVersion || 1,
      createdAt: d.createdAt?.toMillis?.() ?? Date.now(),
      updatedAt: d.updatedAt?.toMillis?.() ?? Date.now(),
    });
  });

  const payload = { scripts };
  const etag = jsonETag(payload);
  setCache(cacheKey, { data: payload, etag }, 15); // 15s cache window

  res.set('ETag', etag);
  res.json(payload);
}));

// Alias: /api/projects (Get all projects, ms timestamps)
app.get("/api/projects", verifyFirebaseToken, readLimiter, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const cacheKey = `scripts:list:${userId}`;
  const cached = getCache(cacheKey);
  if (cached && req.headers['if-none-match'] === cached.etag) {
    res.status(304).end();
    return;
  }

  const scriptsCol = firestore.collection("users").doc(userId).collection("scripts");
  const snap = await scriptsCol.orderBy("updatedAt", "desc").get();
  const projects = [];
  snap.forEach(doc => {
    const d = doc.data();
    projects.push({
      id: doc.id,
      title: d.title,
      latestVersion: d.latestVersion || 1,
      createdAt: d.createdAt?.toMillis?.() ?? Date.now(),
      updatedAt: d.updatedAt?.toMillis?.() ?? Date.now(),
    });
  });

  const payload = { projects };
  const etag = jsonETag(payload);
  setCache(cacheKey, { data: payload, etag }, 15); // 15s cache window

  res.set('ETag', etag);
  res.json(payload);
}));

// Get all versions for a script (ms timestamps)
app.get("/api/scripts/:scriptId/versions", verifyFirebaseToken, readLimiter, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { scriptId } = req.params;
  const cacheKey = `versions:list:${userId}:${scriptId}`;
  const cached = getCache(cacheKey);
  if (cached && req.headers['if-none-match'] === cached.etag) {
    res.status(304).end();
    return;
  }

  const versionsCol = firestore.collection("users").doc(userId).collection("scripts").doc(scriptId).collection("versions");
  const snap = await versionsCol.orderBy("version", "desc").get();
  const versions = [];
  snap.forEach(doc => {
    const v = doc.data();
    versions.push({
      id: doc.id,
      version: v.version || 1,                          // legacy
      versionNumber: v.versionNumber || v.version || 1,  // canonical
      title: v.title || undefined,
      explanation: v.explanation || "",
      code: v.code || "",
      createdAt: v.createdAt?.toMillis?.() ?? Date.now(),
    });
  });

  const payload = { versions };
  const etag = jsonETag(payload);
  setCache(cacheKey, { data: payload, etag }, 15); // 15s cache window

  res.set('ETag', etag);
  res.json(payload);
}));

// Alias: /api/projects/:projectId/versions (ms timestamps)
app.get("/api/projects/:projectId/versions", verifyFirebaseToken, readLimiter, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { projectId } = req.params;
  const cacheKey = `versions:list:${userId}:${projectId}`;
  const cached = getCache(cacheKey);
  if (cached && req.headers['if-none-match'] === cached.etag) {
    res.status(304).end();
    return;
  }

  const versionsCol = firestore.collection("users").doc(userId).collection("scripts").doc(projectId).collection("versions");
  const snap = await versionsCol.orderBy("version", "desc").get();
  const versions = [];
  snap.forEach(doc => {
    const v = doc.data();
    versions.push({
      id: doc.id,
      version: v.version || 1,                          // legacy
      versionNumber: v.versionNumber || v.version || 1,  // canonical
      title: v.title || undefined,
      explanation: v.explanation || "",
      code: v.code || "",
      createdAt: v.createdAt?.toMillis?.() ?? Date.now(),
    });
  });

  const payload = { versions };
  const etag = jsonETag(payload);
  setCache(cacheKey, { data: payload, etag }, 15); // 15s cache window

  res.set('ETag', etag);
  res.json(payload);
}));

// Get a specific version (ms timestamps)
app.get("/api/scripts/:scriptId/versions/:versionId", verifyFirebaseToken, readLimiter, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { scriptId, versionId } = req.params;
  const cacheKey = `versions:item:${userId}:${scriptId}:${versionId}`;
  const cached = getCache(cacheKey);
  if (cached && req.headers['if-none-match'] === cached.etag) {
    res.status(304).end();
    return;
  }

  const versionDoc = await firestore
    .collection("users").doc(userId)
    .collection("scripts").doc(scriptId)
    .collection("versions").doc(versionId).get();

  if (!versionDoc.exists) return res.status(404).json({ error: "Version not found" });

  const v = versionDoc.data();
  const payload = {
    ...v,
    id: versionDoc.id,
    versionNumber: v.versionNumber || v.version || 1,
    createdAt: v.createdAt?.toMillis?.() ?? Date.now(),
  };
  const etag = jsonETag(payload);
  setCache(cacheKey, { data: payload, etag }, 30); // 30s cache for individual version

  res.set('ETag', etag);
  res.json(payload);
}));

// Alias: /api/projects/:projectId/versions/:versionId (ms timestamps)
app.get("/api/projects/:projectId/versions/:versionId", verifyFirebaseToken, readLimiter, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { projectId, versionId } = req.params;
  const cacheKey = `versions:item:${userId}:${projectId}:${versionId}`;
  const cached = getCache(cacheKey);
  if (cached && req.headers['if-none-match'] === cached.etag) {
    res.status(304).end();
    return;
  }

  const versionDoc = await firestore
    .collection("users").doc(userId)
    .collection("scripts").doc(projectId)
    .collection("versions").doc(versionId).get();

  if (!versionDoc.exists) return res.status(404).json({ error: "Version not found" });

  const v = versionDoc.data();
  const payload = {
    ...v,
    id: versionDoc.id,
    versionNumber: v.versionNumber || v.version || 1,
    createdAt: v.createdAt?.toMillis?.() ?? Date.now(),
  };
  const etag = jsonETag(payload);
  setCache(cacheKey, { data: payload, etag }, 30); // 30s cache for individual version

  res.set('ETag', etag);
  res.json(payload);
}));

// --- ADMIN DASHBOARD ENDPOINTS (EXAMPLES) ---
app.get('/api/admin/analytics', verifyFirebaseToken, requireAdmin, readLimiter, asyncHandler(async (req, res) => {
  const snapshot = await firestore.collection('analytics').orderBy('timestamp', 'desc').limit(100).get();
  const analytics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json({ analytics });
}));

app.get('/api/admin/openai-usage', verifyFirebaseToken, requireAdmin, readLimiter, asyncHandler(async (req, res) => {
  const snapshot = await firestore.collection('openai_usage').orderBy('timestamp', 'desc').limit(100).get();
  const usage = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json({ usage });
}));

// --- HEALTH CHECK ---
app.get("/", (req, res) => {
  res.send("NexusRBX Backend is running.");
});

// --- ERROR HANDLING ---
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack || err);
  // If this is a 404 from a missing API endpoint, clarify
  if (err.statusCode === 404 && req.originalUrl && req.originalUrl.includes('/api/billing/entitlements')) {
    return res.status(404).json({ error: "Entitlements endpoint not found. Please check your backend deployment and ensure the /api/billing/entitlements route exists." });
  }
  res.status(err.statusCode || 500).json({ error: err.message || "Internal server error" });
});

const http = require('http');
const WebSocket = require('ws');

// Create HTTP server from Express app
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('message', (message) => {
    console.log('Received:', message);
    // Echo the message back
    ws.send(`Echo: ${message}`);
  });
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Start both HTTP and WebSocket server
server.listen(PORT, () => {
  console.log(`NexusRBX Backend (HTTP+WS) listening on port ${PORT}`);
});
// (Do not start app with app.listen again – HTTP server already running)