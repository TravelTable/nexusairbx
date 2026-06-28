export const DEFAULT_DOC_SLUG = "overview";
export const DEFAULT_LEGAL_SLUG = "overview";

const DOC_UPDATED = "June 28, 2026";
const LEGAL_UPDATED = "January 12, 2026";
const POLICY_DRAFT_UPDATED = "June 28, 2026";
const COUNSEL_REVIEW_NOTE =
  "This public policy page is a structured NexusRBX draft and should be reviewed by counsel before it is treated as final legal advice.";

export const DOC_CATEGORIES = [
  { id: "start", title: "Start", pages: ["overview", "getting-started"] },
  { id: "generate", title: "Generate", pages: ["script-generation", "ui-generation", "assets"] },
  { id: "studio", title: "Studio", pages: ["studio-plugin", "projects", "api"] },
  { id: "account", title: "Account", pages: ["account"] },
  { id: "support", title: "Support", pages: ["troubleshooting", "faq"] },
];

export const LEGAL_CATEGORIES = [
  { id: "legal-core", title: "Legal", pages: ["overview", "terms", "privacy"] },
  { id: "legal-policies", title: "Policies", pages: ["acceptable-use", "refunds", "cookies"] },
];

export const DOC_PAGES = [
  {
    slug: "overview",
    path: "/docs",
    navTitle: "Overview",
    title: "NexusRBX documentation",
    metaTitle: "NexusRBX Documentation | Studio Bridge and AI Workspace",
    description:
      "Use NexusRBX to generate Luau scripts, Roblox UI, assets, and Studio-aware workflows without losing review control.",
    category: "start",
    updated: DOC_UPDATED,
    readingTime: "6 min read",
    status: "Public guide",
    primaryAction: { label: "Open AI workspace", href: "/ai" },
    secondaryAction: { label: "Start with Script Generator", href: "/roblox-script-generator" },
    sections: [
      {
        id: "what-is-nexusrbx",
        title: "What is NexusRBX?",
        blocks: [
          {
            type: "paragraph",
            text:
              "NexusRBX is an AI workspace for Roblox creators. It turns a prompt into Luau scripts, ScreenGui behavior, asset plans, and Studio-aware build steps while keeping the authenticated work area at /ai.",
          },
          {
            type: "cards",
            items: [
              {
                title: "Quick Script",
                body:
                  "Use Quick Script when you need immediate focused Luau with placement notes, setup steps, warnings, and copy-ready output.",
                href: "/docs/script-generation",
              },
              {
                title: "Agent Build",
                body:
                  "Use Agent Build when NexusRBX needs to plan, ask a clarifying question, inspect Studio context, or coordinate multiple files.",
                href: "/docs/script-generation#quick-script-and-agent-build",
              },
              {
                title: "Studio bridge",
                body:
                  "Pair the browser workspace with the Roblox Studio plugin when a task needs place context, script reads, or reviewed writes.",
                href: "/docs/studio-plugin",
              },
            ],
          },
        ],
      },
      {
        id: "workflow-map",
        title: "Workflow map",
        blocks: [
          {
            type: "path",
            title: "From public prompt to reviewed Studio change",
            items: [
              "Choose a public generator or open the AI workspace.",
              "Describe the behavior, GUI, asset, or Studio change you want.",
              "Let NexusRBX choose Quick Script for focused output or Agent Build for planned work.",
              "Pair Studio only when the build needs place context or plugin-assisted insertion.",
              "Review generated scripts, placement notes, and Studio mutations before accepting them.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            title: "The public docs do not run your project",
            text:
              "Docs pages are static public guidance. Generation, authentication, project memory, and Studio pairing stay inside the /ai workspace and backend-owned workflows.",
          },
        ],
      },
      {
        id: "public-entry-points",
        title: "Public entry points",
        blocks: [
          {
            type: "table",
            columns: ["Page", "Best for", "Default mode"],
            rows: [
              ["/roblox-script-generator", "Focused timers, triggers, shops, rewards, and gameplay logic.", "Quick Script"],
              ["/roblox-ai-scripter", "Debugging, rewrites, explanations, and iterative scripting.", "Agent Build"],
              ["/roblox-gui-maker", "ScreenGui behavior, HUD updates, menu flows, and LocalScripts.", "Quick Script"],
              ["/docs/studio-plugin", "Pairing, safe Studio inspection, reviewed writes, and plugin install steps.", "Guide"],
            ],
          },
        ],
      },
      {
        id: "safety-model",
        title: "Safety model",
        blocks: [
          {
            type: "list",
            style: "checks",
            items: [
              "NexusRBX does not send the full place source to the model by default.",
              "Studio-aware work starts with a project manifest, search, and targeted reads.",
              "Known script edits are guarded by expectedSourceHash so stale writes can fail clearly.",
              "Destructive Studio commands snapshot first and return snapshot IDs in the acknowledgment.",
              "Unsupported Studio runtime actions return structured errors instead of silent no-ops.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "getting-started",
    path: "/docs/getting-started",
    navTitle: "Getting Started",
    title: "Getting started",
    metaTitle: "Getting Started with NexusRBX | Roblox AI Workspace",
    description:
      "Create an account, choose a generation mode, pair Roblox Studio, and ship the first reviewed NexusRBX workflow.",
    category: "start",
    updated: DOC_UPDATED,
    readingTime: "7 min read",
    status: "Beginner",
    primaryAction: { label: "Open AI workspace", href: "/ai" },
    secondaryAction: { label: "Read Studio plugin setup", href: "/docs/studio-plugin" },
    sections: [
      {
        id: "first-run",
        title: "First run",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Create or sign in to your account",
                body:
                  "Open /ai and complete the Firebase-backed sign-in flow. Public generator prompts can hand off into the workspace after authentication.",
              },
              {
                title: "Choose the work shape",
                body:
                  "Use Quick Script for a narrow script request. Use Agent Build when the task needs planning, Studio context, multiple files, or follow-up questions.",
              },
              {
                title: "Add Studio only when it helps",
                body:
                  "If NexusRBX needs place context, install the generated NexusRBX Studio Bridge .plugin.lua file and pair the plugin from the workspace.",
              },
              {
                title: "Review before applying",
                body:
                  "Keep Manual Review enabled for the first Studio mutation. Read the summary, target paths, warnings, and snapshot references before confirming.",
              },
            ],
          },
        ],
      },
      {
        id: "first-prompt",
        title: "A good first prompt",
        blocks: [
          {
            type: "code",
            language: "text",
            title: "Focused Quick Script prompt",
            code:
              "Create a round timer for Roblox with a 20 second intermission, a 90 second active round, and a RemoteEvent that updates a TextLabel in StarterGui. Include the script location, setup steps, and how to test with two players.",
          },
          {
            type: "list",
            items: [
              "Name the Roblox service or object when you know it.",
              "Say whether the script should run on the server or client.",
              "Include the exact error text when debugging.",
              "Ask for test steps when the code affects players, rewards, purchases, or persistent state.",
            ],
          },
        ],
      },
      {
        id: "first-studio-task",
        title: "First Studio-connected task",
        blocks: [
          {
            type: "path",
            title: "Safe Studio workflow",
            items: [
              "Pair the Studio plugin from /ai.",
              "Ask NexusRBX to inspect the project manifest before reading source.",
              "Approve targeted script reads when needed.",
              "Review the planned edit and expected source hash.",
              "Confirm the write only after the summary matches the intended target.",
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Do not skip review on a new project",
            text:
              "The plugin can help insert or edit Studio content, but object names and gameplay rules are still project-specific. Verify the target and test in Studio.",
          },
        ],
      },
    ],
  },
  {
    slug: "studio-plugin",
    path: "/docs/studio-plugin",
    navTitle: "Studio Plugin",
    title: "Studio plugin and bridge",
    metaTitle: "NexusRBX Studio Plugin | Pairing and Safe Roblox Bridge",
    description:
      "Install the NexusRBX Studio Bridge plugin, pair it with the AI workspace, and understand how safe Studio reads and writes work.",
    category: "studio",
    updated: DOC_UPDATED,
    readingTime: "8 min read",
    status: "Studio guide",
    primaryAction: { label: "Open AI workspace", href: "/ai" },
    secondaryAction: { label: "Read protocol API", href: "/docs/api" },
    sections: [
      {
        id: "install-plugin",
        title: "Install the plugin",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Use the generated install target",
                body:
                  "Install roblox-plugin/NexusRBXStudioBridge.plugin.lua when you are working from this repository. The source folder is not the Studio install artifact.",
              },
              {
                title: "Open Roblox Studio",
                body:
                  "Place the .plugin.lua file in the local plugins folder or install it through your normal Studio plugin workflow.",
              },
              {
                title: "Pair from the workspace",
                body:
                  "Open /ai, start Studio pairing, and enter the short-lived code in the plugin panel.",
              },
            ],
          },
          {
            type: "tree",
            title: "Relevant repository files",
            items: [
              "roblox-plugin/NexusRBXStudioBridge.plugin.lua",
              "roblox-plugin/build/bundle-plugin.js",
              "roblox-plugin/src/",
              "backend/src/lib/studioToolProtocol.js",
              "docs/studio-tool-protocol.md",
            ],
          },
        ],
      },
      {
        id: "safe-inspection",
        title: "Safe inspection",
        blocks: [
          {
            type: "paragraph",
            text:
              "NexusRBX should not send the full place source to the model by default. Studio-aware work begins with get_project_manifest, then search_project or search_source, then targeted read_script calls for the specific script that matters.",
          },
          {
            type: "code",
            language: "json",
            title: "Manifest-first command shape",
            code: `{
  "protocolVersion": "2026-06-20-phases1-9",
  "command": "get_project_manifest",
  "reason": "Find likely round-system scripts before reading source"
}`,
          },
        ],
      },
      {
        id: "write-protection",
        title: "Write protection",
        blocks: [
          {
            type: "list",
            style: "checks",
            items: [
              "Known Studio script edits include expectedSourceHash.",
              "Stale edits return source_conflict so the workspace can re-read before retrying.",
              "Destructive commands snapshot first and include snapshot IDs in the acknowledgment.",
              "Unsupported runtime actions return structured errors with a reason instead of pretending to succeed.",
            ],
          },
          {
            type: "code",
            language: "json",
            title: "Hash-guarded edit",
            code: `{
  "operation": "write_script",
  "targetPath": "ServerScriptService/RoundController",
  "expectedSourceHash": "sha256:previous-source-hash",
  "applyMode": "manual_review"
}`,
          },
        ],
      },
      {
        id: "manual-review",
        title: "Manual Review",
        blocks: [
          {
            type: "callout",
            tone: "success",
            title: "Review is a product boundary",
            text:
              "Manual Review keeps generated edits visible before they touch Studio. Treat the summary, target path, object type, warnings, and snapshot ID as part of the change contract.",
          },
          {
            type: "list",
            items: [
              "Confirm the target path is the script or instance you expected.",
              "Check whether the change creates RemoteEvents, ModuleScripts, or GUI objects.",
              "Run Play Solo or Start Server depending on whether the code affects client-only or multiplayer behavior.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "script-generation",
    path: "/docs/script-generation",
    navTitle: "Script Generation",
    title: "Script generation",
    metaTitle: "Roblox Script Generation with NexusRBX | Quick Script and Agent Build",
    description:
      "Generate Luau scripts with placement notes, server authority, client UI boundaries, and a path from Quick Script to Agent Build.",
    category: "generate",
    updated: DOC_UPDATED,
    readingTime: "7 min read",
    status: "Generation guide",
    primaryAction: { label: "Generate a script", href: "/roblox-script-generator" },
    secondaryAction: { label: "Open AI workspace", href: "/ai" },
    sections: [
      {
        id: "quick-script-and-agent-build",
        title: "Quick Script and Agent Build",
        blocks: [
          {
            type: "tabs",
            tabs: [
              {
                label: "Quick Script",
                blocks: [
                  {
                    type: "paragraph",
                    text:
                      "Quick Script is best for a single focused behavior such as a timer, checkpoint, button, shop handler, or small ModuleScript.",
                  },
                  {
                    type: "list",
                    items: [
                      "Immediate code output",
                      "Placement and setup notes",
                      "Warnings for common server/client mistakes",
                      "Copy actions and follow-up path into Agent Build",
                    ],
                  },
                ],
              },
              {
                label: "Agent Build",
                blocks: [
                  {
                    type: "paragraph",
                    text:
                      "Agent Build is best when the system needs multiple scripts, Studio context, migration steps, or an explanation before a safe rewrite.",
                  },
                  {
                    type: "list",
                    items: [
                      "Planning before code",
                      "Clarifying questions when required",
                      "Manifest search and targeted reads for paired Studio projects",
                      "Multi-file summaries and reviewable handoffs",
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "server-authority",
        title: "Server authority",
        blocks: [
          {
            type: "paragraph",
            text:
              "Currency, inventory, rewards, purchases, and permission checks belong on the server. LocalScripts can request actions and render feedback, but they should not be trusted as the source of truth.",
          },
          {
            type: "code",
            language: "lua",
            title: "Server-owned RemoteEvent pattern",
            code: `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local remotes = ReplicatedStorage:WaitForChild("Remotes")
local requestReward = remotes:WaitForChild("RequestDailyReward")

local claimedToday = {}

requestReward.OnServerEvent:Connect(function(player)
  if claimedToday[player.UserId] then
    return
  end

  claimedToday[player.UserId] = true
  local leaderstats = player:FindFirstChild("leaderstats")
  local coins = leaderstats and leaderstats:FindFirstChild("Coins")
  if coins then
    coins.Value += 100
  end
end)

Players.PlayerRemoving:Connect(function(player)
  claimedToday[player.UserId] = nil
end)`,
          },
        ],
      },
      {
        id: "prompt-context",
        title: "Prompt context",
        blocks: [
          {
            type: "list",
            style: "checks",
            items: [
              "Say where the script should live, such as ServerScriptService, StarterPlayerScripts, or StarterGui.",
              "Name existing RemoteEvents, folders, GUI labels, tools, or parts when you know them.",
              "Mention whether the script must support multiple players.",
              "Ask for setup and test steps when the answer will be pasted into Studio.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "ui-generation",
    path: "/docs/ui-generation",
    navTitle: "UI Generation",
    title: "UI generation",
    metaTitle: "Roblox UI Generation with NexusRBX | ScreenGui and LocalScript Patterns",
    description:
      "Generate Roblox ScreenGui behavior, responsive HUDs, menu flows, and LocalScript patterns with server-safe RemoteEvent boundaries.",
    category: "generate",
    updated: DOC_UPDATED,
    readingTime: "6 min read",
    status: "UI guide",
    primaryAction: { label: "Open GUI maker", href: "/roblox-gui-maker" },
    secondaryAction: { label: "Open AI workspace", href: "/ai" },
    sections: [
      {
        id: "gui-responsibilities",
        title: "GUI responsibilities",
        blocks: [
          {
            type: "table",
            columns: ["Layer", "Owns", "Avoid"],
            rows: [
              ["ScreenGui", "Visual hierarchy, labels, buttons, frames, and HUD containers.", "Business rules and reward authority."],
              ["LocalScript", "Input, button clicks, local animation, camera feedback, and RemoteEvent calls.", "Granting currency, inventory, or permissions."],
              ["Server Script", "Validation, state changes, rewards, purchases, and multiplayer truth.", "Client-only animation or camera state."],
            ],
          },
          {
            type: "callout",
            tone: "info",
            title: "Generate UI with the behavior attached",
            text:
              "A useful Roblox UI answer should include the hierarchy, LocalScript location, RemoteEvent names, and the server code that validates any important action.",
          },
        ],
      },
      {
        id: "responsive-ui",
        title: "Responsive UI",
        blocks: [
          {
            type: "list",
            items: [
              "Use scale values and constraints for layouts that must work on phone, tablet, and desktop.",
              "Keep click targets large enough for touch.",
              "Do not rely on color alone for selected, disabled, or error states.",
              "Test with Roblox Studio device emulation before publishing.",
            ],
          },
        ],
      },
      {
        id: "local-script-pattern",
        title: "LocalScript pattern",
        blocks: [
          {
            type: "code",
            language: "lua",
            title: "Button to server request",
            code: `local ReplicatedStorage = game:GetService("ReplicatedStorage")

local button = script.Parent
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local buyItem = remotes:WaitForChild("BuyItem")

button.Activated:Connect(function()
  button.Active = false
  buyItem:FireServer("StarterSword")
  task.delay(0.5, function()
    button.Active = true
  end)
end)`,
          },
        ],
      },
    ],
  },
  {
    slug: "assets",
    path: "/docs/assets",
    navTitle: "Assets",
    title: "Assets and uploads",
    metaTitle: "NexusRBX Assets | Roblox Upload Consent and Retry Workflow",
    description:
      "Understand generated assets, local records, Roblox upload consent, retry behavior, and Studio insertion boundaries.",
    category: "generate",
    updated: DOC_UPDATED,
    readingTime: "6 min read",
    status: "Asset guide",
    primaryAction: { label: "Open AI workspace", href: "/ai" },
    secondaryAction: { label: "Open icon generator", href: "/tools/icon-generator" },
    sections: [
      {
        id: "asset-records",
        title: "Asset records",
        blocks: [
          {
            type: "paragraph",
            text:
              "NexusRBX can generate local asset records for icons, textures, and model-related outputs. A local asset can remain usable in the workspace even when Roblox upload is disabled or still pending moderation.",
          },
          {
            type: "list",
            items: [
              "Keep the local asset preview and metadata available for review.",
              "Track upload state separately from generation state.",
              "Show retry and poll actions when an upload fails or remains pending.",
            ],
          },
        ],
      },
      {
        id: "upload-consent",
        title: "Roblox upload consent",
        blocks: [
          {
            type: "callout",
            tone: "warning",
            title: "Auto Upload Assets is the write-consent switch",
            text:
              "robloxAssetUploadsEnabled controls Roblox writes for generated assets. Enabled means NexusRBX may immediately attempt OAuth-backed Roblox upload. Disabled means no Roblox writes, while the local asset can still be kept and retried later.",
          },
          {
            type: "table",
            columns: ["Setting", "Behavior", "Failure handling"],
            rows: [
              ["Enabled", "Attempt Roblox upload after generation using server-owned OAuth handling.", "Keep the local asset and show retry or poll state."],
              ["Disabled", "Do not write to Roblox.", "Keep the local asset available in the tray."],
              ["Pending moderation", "Do not assume the Roblox asset is immediately usable.", "Poll or retry based on the status returned by the backend."],
            ],
          },
        ],
      },
      {
        id: "studio-insertion",
        title: "Studio insertion",
        blocks: [
          {
            type: "paragraph",
            text:
              "Studio insertion should use trusted records and server-owned orchestration. Browser-supplied metadata is helpful context, but it is not authoritative for privileged writes.",
          },
          {
            type: "list",
            style: "checks",
            items: [
              "Use explicit review or confirmation gates before inserting into Studio.",
              "Keep OAuth and privileged upload handling server-side.",
              "Preserve the local asset when Roblox upload fails.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "projects",
    path: "/docs/projects",
    navTitle: "Projects",
    title: "Projects and continuity",
    metaTitle: "NexusRBX Projects | Continuity, Artifacts, and Handoff",
    description:
      "Keep generated code, artifacts, Studio context, and follow-up work connected across NexusRBX project sessions.",
    category: "studio",
    updated: DOC_UPDATED,
    readingTime: "5 min read",
    status: "Workflow guide",
    primaryAction: { label: "Open AI workspace", href: "/ai" },
    secondaryAction: { label: "Troubleshoot a project", href: "/docs/troubleshooting" },
    sections: [
      {
        id: "project-state",
        title: "Project state",
        blocks: [
          {
            type: "paragraph",
            text:
              "A NexusRBX project should keep enough context to continue a build without forcing the creator to repeat every prompt. That includes generated artifacts, Studio pairing state, summaries, and safe retry information.",
          },
          {
            type: "cards",
            items: [
              {
                title: "Artifacts",
                body: "Generated scripts, setup notes, image assets, validation output, and review summaries.",
              },
              {
                title: "Studio context",
                body: "Manifest matches, target paths, source hashes, snapshot IDs, and structured Studio acknowledgments.",
              },
              {
                title: "Handoff state",
                body: "Public prompt intents and authenticated workspace state should survive auth or refresh interruptions when possible.",
              },
            ],
          },
        ],
      },
      {
        id: "handoff",
        title: "Handoff",
        blocks: [
          {
            type: "path",
            title: "A resilient continuation",
            items: [
              "Capture the generation intent before navigation or authentication.",
              "Restore the intent in /ai after sign-in.",
              "Open the first-run workspace with the prompt still available.",
              "Save useful output as project artifacts so follow-up work can reference it.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "account",
    path: "/docs/account",
    navTitle: "Account",
    title: "Account, billing, and settings",
    metaTitle: "NexusRBX Account Settings | Auth, Billing, and Data Controls",
    description:
      "Manage sign-in, subscription state, upload consent, project data, and account controls in NexusRBX.",
    category: "account",
    updated: DOC_UPDATED,
    readingTime: "5 min read",
    status: "Account guide",
    primaryAction: { label: "Open settings", href: "/settings" },
    secondaryAction: { label: "View pricing", href: "/subscribe" },
    sections: [
      {
        id: "authentication",
        title: "Authentication",
        blocks: [
          {
            type: "paragraph",
            text:
              "NexusRBX uses Firebase-backed authentication for workspace access. Public pages can be read without signing in, but generation history, Studio pairing, project state, settings, and subscriptions belong to an authenticated account.",
          },
          {
            type: "list",
            items: [
              "Use a current email address so account and billing messages can reach you.",
              "Do not share account credentials, API keys, or OAuth tokens in prompts.",
              "Sign out on shared devices after using the AI workspace.",
            ],
          },
        ],
      },
      {
        id: "billing",
        title: "Billing",
        blocks: [
          {
            type: "paragraph",
            text:
              "Subscription and payment details are handled through the billing flow rather than static docs pages. Sensitive card details should be handled by the payment provider, not stored in client code.",
          },
          {
            type: "table",
            columns: ["Area", "Where to manage"],
            rows: [
              ["Subscription", "/billing or /subscribe"],
              ["Workspace settings", "/settings"],
              ["Public legal terms", "/legal/terms"],
            ],
          },
        ],
      },
      {
        id: "data-controls",
        title: "Data controls",
        blocks: [
          {
            type: "list",
            style: "checks",
            items: [
              "Use robloxAssetUploadsEnabled to control whether generated assets are uploaded to Roblox.",
              "Keep Studio mutations behind review when you are unsure about the target or project state.",
              "Contact support@nexusrbx.com for account, privacy, or deletion requests.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "api",
    path: "/docs/api",
    navTitle: "API",
    title: "Studio protocol API",
    metaTitle: "NexusRBX Studio Protocol API | Commands, Hashes, and Structured Errors",
    description:
      "Reference the Studio bridge command model used by backend-owned NexusRBX workflows and the Roblox Studio plugin.",
    category: "studio",
    updated: DOC_UPDATED,
    readingTime: "8 min read",
    status: "Reference",
    primaryAction: { label: "Read Studio setup", href: "/docs/studio-plugin" },
    secondaryAction: { label: "Open AI workspace", href: "/ai" },
    sections: [
      {
        id: "protocol-version",
        title: "Protocol version",
        blocks: [
          {
            type: "api",
            method: "POST",
            endpoint: "/api/studio/tool",
            summary:
              "Backend-owned endpoint shape for queueing Studio tool commands. The active protocol is 2026-06-20-phases1-9 and is validated by backend/src/lib/studioToolProtocol.js.",
          },
          {
            type: "callout",
            tone: "info",
            title: "Public reference, not a browser contract",
            text:
              "Privileged Studio orchestration should stay server-owned. Browser-supplied metadata is context, not authority for Studio writes.",
          },
        ],
      },
      {
        id: "commands",
        title: "Command flow",
        blocks: [
          {
            type: "table",
            columns: ["Command", "Purpose", "Write risk"],
            rows: [
              ["get_project_manifest", "List project structure and candidate scripts before source reads.", "Read-only"],
              ["search_project", "Search manifest paths and object metadata.", "Read-only"],
              ["search_source", "Search known source text for matches.", "Read-only"],
              ["read_script", "Read a targeted script after discovery narrows the scope.", "Read-only"],
              ["write_script", "Edit a known script using expectedSourceHash.", "Write"],
              ["insert_uploaded_roblox_model", "Insert a trusted uploaded asset into Studio after confirmation.", "Write"],
            ],
          },
          {
            type: "path",
            title: "Recommended command order",
            items: [
              "Queue get_project_manifest.",
              "Search the manifest or indexed source.",
              "Read the specific script needed for the task.",
              "Generate an edit with expectedSourceHash.",
              "Snapshot and acknowledge destructive or write operations.",
            ],
          },
        ],
      },
      {
        id: "parameters",
        title: "Important parameters",
        blocks: [
          {
            type: "params",
            items: [
              {
                name: "operation",
                type: "string",
                description: "The Studio command to execute, such as get_project_manifest, read_script, or write_script.",
              },
              {
                name: "targetPath",
                type: "string",
                description: "The Studio hierarchy path for the target instance or script.",
              },
              {
                name: "expectedSourceHash",
                type: "string",
                description: "Required for edits to known scripts so stale writes can return source_conflict.",
              },
              {
                name: "idempotencyKey",
                type: "string",
                description: "A stable key for retryable operations so duplicate submissions can be handled safely.",
              },
              {
                name: "applyMode",
                type: "string",
                description: "Indicates whether a change should be held for manual review or applied by an approved workflow.",
              },
            ],
          },
        ],
      },
      {
        id: "structured-errors",
        title: "Structured errors",
        blocks: [
          {
            type: "code",
            language: "json",
            title: "Source conflict response",
            code: `{
  "ok": false,
  "code": "source_conflict",
  "message": "The script changed after it was read.",
  "targetPath": "ServerScriptService/RoundController",
  "recovery": "Read the script again and retry with the new expectedSourceHash."
}`,
          },
        ],
      },
    ],
  },
  {
    slug: "troubleshooting",
    path: "/docs/troubleshooting",
    navTitle: "Troubleshooting",
    title: "Troubleshooting",
    metaTitle: "NexusRBX Troubleshooting | Studio Pairing, Source Conflicts, and Uploads",
    description:
      "Fix common NexusRBX issues with Studio pairing, authentication, source conflicts, Roblox upload states, and generated scripts.",
    category: "support",
    updated: DOC_UPDATED,
    readingTime: "7 min read",
    status: "Support",
    primaryAction: { label: "Open AI workspace", href: "/ai" },
    secondaryAction: { label: "Contact support", href: "/contact" },
    sections: [
      {
        id: "common-issues",
        title: "Common issues",
        blocks: [
          {
            type: "accordion",
            items: [
              {
                title: "Pairing code expired",
                body:
                  "Return to /ai, generate a new short-lived code, and enter it in the Studio plugin panel before it expires.",
              },
              {
                title: "401 or signed-out workspace",
                body:
                  "Sign in again and reopen the workspace. If a public prompt started the flow, NexusRBX should restore the generation intent after authentication.",
              },
              {
                title: "source_conflict",
                body:
                  "The target script changed after NexusRBX read it. Re-read the script, verify the new source, and retry with the updated expectedSourceHash.",
              },
              {
                title: "Roblox upload pending",
                body:
                  "Keep the local asset. Poll or retry from the asset tray instead of assuming the Roblox asset ID is ready.",
              },
              {
                title: "Generated script errors in Studio",
                body:
                  "Read the first Output error, confirm script type and location, verify object names, and test multiplayer changes with Start Server.",
              },
            ],
          },
        ],
      },
      {
        id: "debugging-checklist",
        title: "Debugging checklist",
        blocks: [
          {
            type: "list",
            style: "checks",
            items: [
              "Paste the exact Output error into NexusRBX.",
              "Name the script type and location.",
              "Confirm whether the issue happens in Play Solo, Start Server, or both.",
              "Mention recently changed scripts or assets.",
              "Use Agent Build when the fix may touch multiple scripts.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "faq",
    path: "/docs/faq",
    navTitle: "FAQ",
    title: "Frequently asked questions",
    metaTitle: "NexusRBX FAQ | Roblox AI Scripting and Studio Bridge Questions",
    description:
      "Answers to common questions about NexusRBX, Roblox script generation, Studio pairing, assets, billing, and safety.",
    category: "support",
    updated: DOC_UPDATED,
    readingTime: "5 min read",
    status: "FAQ",
    primaryAction: { label: "Open AI workspace", href: "/ai" },
    secondaryAction: { label: "Read getting started", href: "/docs/getting-started" },
    sections: [
      {
        id: "questions",
        title: "Questions",
        blocks: [
          {
            type: "accordion",
            items: [
              {
                title: "Is NexusRBX affiliated with Roblox?",
                body:
                  "No. NexusRBX is an independent tool for Roblox creators and is not an official Roblox product.",
              },
              {
                title: "Can NexusRBX see my Studio place?",
                body:
                  "Only when you use the paired Studio workflow and approve the relevant reads. The default pattern is manifest-first discovery followed by targeted source reads.",
              },
              {
                title: "Should I use Quick Script or Agent Build?",
                body:
                  "Use Quick Script for focused output. Use Agent Build for debugging, planning, multiple scripts, Studio context, or workflows that need confirmation.",
              },
              {
                title: "Can NexusRBX upload assets to Roblox automatically?",
                body:
                  "Only when robloxAssetUploadsEnabled is enabled. When it is disabled, NexusRBX should keep generated assets local and avoid Roblox writes.",
              },
              {
                title: "Do generated scripts need review?",
                body:
                  "Yes. Generated code should be tested in Roblox Studio, especially when it affects players, rewards, purchases, data, or moderation-sensitive content.",
              },
            ],
          },
        ],
      },
    ],
  },
];

export const LEGAL_PAGES = [
  {
    slug: "overview",
    path: "/legal",
    navTitle: "Legal Hub",
    title: "Public legal hub",
    metaTitle: "NexusRBX Legal Hub | Terms, Privacy, and Policies",
    description:
      "Read NexusRBX legal terms, privacy information, acceptable use rules, refund notes, and cookie disclosures.",
    category: "legal-core",
    updated: POLICY_DRAFT_UPDATED,
    readingTime: "4 min read",
    status: "Legal index",
    primaryAction: { label: "Read Terms", href: "/legal/terms" },
    secondaryAction: { label: "Read Privacy", href: "/legal/privacy" },
    sections: [
      {
        id: "legal-documents",
        title: "Legal documents",
        blocks: [
          {
            type: "cards",
            items: [
              { title: "Terms of service", body: "The core agreement for using NexusRBX services.", href: "/legal/terms" },
              { title: "Privacy notice", body: "How NexusRBX collects, uses, stores, and shares information.", href: "/legal/privacy" },
              { title: "Acceptable use", body: "Rules for AI-assisted Roblox scripting, uploads, and account behavior.", href: "/legal/acceptable-use" },
              { title: "Refunds", body: "Draft refund and subscription cancellation guidance.", href: "/legal/refunds" },
              { title: "Cookies", body: "Draft cookie and local storage disclosure.", href: "/legal/cookies" },
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Legal review",
            text: COUNSEL_REVIEW_NOTE,
          },
        ],
      },
      {
        id: "legacy-routes",
        title: "Legacy app routes",
        blocks: [
          {
            type: "paragraph",
            text:
              "The existing /terms and /privacy application routes remain available for compatibility. The /legal pages are indexable public pages designed for clearer reading, navigation, and printing.",
          },
        ],
      },
    ],
  },
  {
    slug: "terms",
    path: "/legal/terms",
    navTitle: "Terms",
    title: "Terms of service",
    metaTitle: "NexusRBX Terms of Service | Legal Terms",
    description:
      "Terms governing access to NexusRBX, AI-generated content, subscriptions, acceptable use, liability, disputes, and termination.",
    category: "legal-core",
    updated: LEGAL_UPDATED,
    readingTime: "10 min read",
    status: "Terms",
    primaryAction: { label: "Read Privacy", href: "/legal/privacy" },
    secondaryAction: { label: "Contact support", href: "/contact" },
    sections: [
      {
        id: "introduction",
        title: "Introduction and acceptance",
        blocks: [
          {
            type: "paragraph",
            text:
              "These Terms govern your access to and use of the NexusRBX website, applications, and services. By accessing or using NexusRBX, you agree to these Terms and the Privacy Notice.",
          },
          {
            type: "callout",
            tone: "info",
            title: "Independent product",
            text:
              "NexusRBX is independent and is not affiliated with, endorsed by, or associated with Roblox Corporation. Roblox is a trademark of Roblox Corporation.",
          },
        ],
      },
      {
        id: "accounts",
        title: "Accounts and eligibility",
        blocks: [
          {
            type: "list",
            items: [
              "You must provide accurate, current, and complete account information.",
              "You are responsible for protecting your login credentials and any API keys.",
              "You must be at least 13 years old to create an account, and younger users may need parent or guardian supervision depending on their jurisdiction.",
              "We may suspend or terminate accounts that violate these Terms, misuse the service, or create legal or security risk.",
            ],
          },
        ],
      },
      {
        id: "acceptable-use",
        title: "Acceptable use",
        blocks: [
          {
            type: "list",
            style: "checks",
            items: [
              "Use NexusRBX only for lawful Roblox creation, learning, debugging, and production workflows.",
              "Do not request exploits, malware, credential theft, harassment, privacy violations, or platform abuse.",
              "Do not overload, scrape, reverse engineer, or misuse NexusRBX systems outside approved interfaces.",
              "You are responsible for making sure your Roblox experiences comply with Roblox rules and applicable law.",
            ],
          },
        ],
      },
      {
        id: "content-and-ip",
        title: "Content and intellectual property",
        blocks: [
          {
            type: "paragraph",
            text:
              "You retain ownership of your prompts, project materials, and responsibility for content you submit. NexusRBX and its licensors retain rights to the service, software, design, brand, and platform materials.",
          },
          {
            type: "paragraph",
            text:
              "You may use generated scripts and outputs in your Roblox projects, but you are responsible for review, testing, licensing obligations, platform compliance, and any third-party rights that may apply.",
          },
        ],
      },
      {
        id: "billing-and-ai",
        title: "Payments, billing, and AI output",
        blocks: [
          {
            type: "list",
            items: [
              "Paid subscriptions, credits, or tokens are governed by the checkout and billing terms shown during purchase.",
              "Generated content can be incomplete, incorrect, unsafe for your specific project, or require Studio-specific changes.",
              "You should test generated scripts before publishing and use server authority for rewards, purchases, inventory, and permissions.",
              "NexusRBX may update features, limits, plans, and pricing with notice where required.",
            ],
          },
        ],
      },
      {
        id: "liability-disputes-termination",
        title: "Liability, disputes, and termination",
        blocks: [
          {
            type: "paragraph",
            text:
              "The service is provided without a guarantee that generated code or guidance will be error-free, secure, or suitable for every Roblox experience. To the maximum extent permitted by law, NexusRBX limits liability for indirect, incidental, consequential, special, exemplary, or punitive damages.",
          },
          {
            type: "paragraph",
            text:
              "We may suspend or terminate access for violations, security risk, fraud, non-payment, or service misuse. You may stop using NexusRBX at any time, subject to any active billing or cancellation terms.",
          },
        ],
      },
    ],
  },
  {
    slug: "privacy",
    path: "/legal/privacy",
    navTitle: "Privacy",
    title: "Privacy notice",
    metaTitle: "NexusRBX Privacy Notice | Privacy and Data Use",
    description:
      "How NexusRBX collects, uses, shares, stores, and protects account, usage, billing, generated content, and device information.",
    category: "legal-core",
    updated: LEGAL_UPDATED,
    readingTime: "10 min read",
    status: "Privacy",
    primaryAction: { label: "Read Terms", href: "/legal/terms" },
    secondaryAction: { label: "Contact support", href: "/contact" },
    sections: [
      {
        id: "overview",
        title: "Overview",
        blocks: [
          {
            type: "paragraph",
            text:
              "This Privacy Notice explains what data NexusRBX collects, how it is used and shared, and the choices available to you when using the website, AI workspace, Studio bridge, and related services.",
          },
          {
            type: "paragraph",
            text:
              "We may log basic usage events without sending us your private prompt text, generated code, emails, or project names when those events are only needed for analytics, reliability, or product diagnostics.",
          },
        ],
      },
      {
        id: "information-we-collect",
        title: "Information we collect",
        blocks: [
          {
            type: "table",
            columns: ["Category", "Examples"],
            rows: [
              ["Account information", "Username, email address, authentication provider details, and account settings."],
              ["Content and usage", "Prompts, generated scripts, project artifacts, feature usage, pages visited, request timestamps, and device information."],
              ["Billing information", "Transaction identifiers, subscription status, and payment provider references. Full card data is handled by the payment provider."],
              ["Studio and asset workflow data", "Pairing state, Studio command acknowledgments, source hashes, upload states, asset metadata, and snapshot references."],
            ],
          },
        ],
      },
      {
        id: "how-we-use-information",
        title: "How we use information",
        blocks: [
          {
            type: "list",
            items: [
              "Provide, secure, maintain, and improve NexusRBX.",
              "Authenticate accounts and preserve project continuity.",
              "Generate and store requested outputs, artifacts, and Studio workflow state.",
              "Process billing and subscription status through payment providers.",
              "Detect abuse, fraud, security incidents, and service reliability problems.",
              "Respond to support, privacy, and legal requests.",
            ],
          },
        ],
      },
      {
        id: "sharing-retention-rights",
        title: "Sharing, retention, and rights",
        blocks: [
          {
            type: "paragraph",
            text:
              "We may share information with service providers that help operate NexusRBX, such as hosting, analytics, authentication, payment processing, storage, and AI infrastructure providers. We do not sell personal information in the ordinary meaning of that term.",
          },
          {
            type: "paragraph",
            text:
              "We keep information for as long as needed to provide the service, meet legal obligations, resolve disputes, enforce agreements, and maintain security. You can contact support@nexusrbx.com to request access, correction, deletion, or other privacy assistance.",
          },
        ],
      },
      {
        id: "children-security-changes",
        title: "Children, security, and changes",
        blocks: [
          {
            type: "list",
            items: [
              "NexusRBX is not intended for children under 13.",
              "We use reasonable technical and organizational safeguards, but no online service can guarantee perfect security.",
              "We may update this notice and will revise the effective date when material changes are made.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "acceptable-use",
    path: "/legal/acceptable-use",
    navTitle: "Acceptable Use",
    title: "Acceptable use policy",
    metaTitle: "NexusRBX Acceptable Use Policy | AI Scripting Rules",
    description:
      "Rules for using NexusRBX responsibly with Roblox scripting, Studio workflows, assets, AI output, and account access.",
    category: "legal-policies",
    updated: POLICY_DRAFT_UPDATED,
    readingTime: "6 min read",
    status: "Policy draft",
    primaryAction: { label: "Read Terms", href: "/legal/terms" },
    secondaryAction: { label: "Contact support", href: "/contact" },
    sections: [
      {
        id: "policy-status",
        title: "Policy status",
        blocks: [
          { type: "callout", tone: "warning", title: "Review status", text: COUNSEL_REVIEW_NOTE },
        ],
      },
      {
        id: "allowed-use",
        title: "Allowed use",
        blocks: [
          {
            type: "list",
            style: "checks",
            items: [
              "Generating Roblox Luau scripts, UI behavior, and Studio setup guidance.",
              "Debugging, refactoring, explaining errors, and planning safer client/server boundaries.",
              "Creating original assets and project materials that comply with applicable platform rules.",
              "Using the Studio bridge for reviewed reads and writes in your own projects or projects you are authorized to edit.",
            ],
          },
        ],
      },
      {
        id: "prohibited-use",
        title: "Prohibited use",
        blocks: [
          {
            type: "list",
            items: [
              "Creating exploits, cheats, malware, credential theft tools, or scripts meant to bypass Roblox security.",
              "Harassment, hate, threats, privacy invasion, doxxing, or unauthorized tracking.",
              "Uploading or generating content that infringes intellectual property or violates platform rules.",
              "Attempting to overload, scrape, reverse engineer, or compromise NexusRBX systems.",
              "Using another person's account, project, assets, or Studio connection without permission.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "refunds",
    path: "/legal/refunds",
    navTitle: "Refunds",
    title: "Refund and cancellation policy",
    metaTitle: "NexusRBX Refund Policy | Subscription Cancellation Guidance",
    description:
      "Draft refund and cancellation guidance for NexusRBX subscriptions, credits, billing errors, and account access issues.",
    category: "legal-policies",
    updated: POLICY_DRAFT_UPDATED,
    readingTime: "5 min read",
    status: "Policy draft",
    primaryAction: { label: "Manage billing", href: "/billing" },
    secondaryAction: { label: "Contact support", href: "/contact" },
    sections: [
      {
        id: "policy-status",
        title: "Policy status",
        blocks: [
          { type: "callout", tone: "warning", title: "Review status", text: COUNSEL_REVIEW_NOTE },
        ],
      },
      {
        id: "subscriptions",
        title: "Subscriptions",
        blocks: [
          {
            type: "paragraph",
            text:
              "You can cancel a paid subscription through the billing flow when available. Cancellation typically stops future renewals, but it may not automatically refund past charges unless required by law or approved by NexusRBX support.",
          },
          {
            type: "list",
            items: [
              "Contact support@nexusrbx.com for billing mistakes, duplicate charges, or account access problems.",
              "Include the account email and relevant transaction date when asking for billing help.",
              "Do not include full card numbers or sensitive payment details in support messages.",
            ],
          },
        ],
      },
      {
        id: "credits-and-tokens",
        title: "Credits and tokens",
        blocks: [
          {
            type: "paragraph",
            text:
              "Credits, tokens, or usage-based balances may be non-refundable after use, unless the checkout terms, local law, or a support review provides otherwise.",
          },
        ],
      },
    ],
  },
  {
    slug: "cookies",
    path: "/legal/cookies",
    navTitle: "Cookies",
    title: "Cookie and storage notice",
    metaTitle: "NexusRBX Cookie Notice | Cookies and Local Storage",
    description:
      "Draft disclosure for cookies, local storage, session storage, analytics, authentication, and preference state used by NexusRBX.",
    category: "legal-policies",
    updated: POLICY_DRAFT_UPDATED,
    readingTime: "5 min read",
    status: "Policy draft",
    primaryAction: { label: "Read Privacy", href: "/legal/privacy" },
    secondaryAction: { label: "Contact support", href: "/contact" },
    sections: [
      {
        id: "policy-status",
        title: "Policy status",
        blocks: [
          { type: "callout", tone: "warning", title: "Review status", text: COUNSEL_REVIEW_NOTE },
        ],
      },
      {
        id: "storage-types",
        title: "Storage types",
        blocks: [
          {
            type: "table",
            columns: ["Type", "Purpose"],
            rows: [
              ["Authentication cookies or tokens", "Keep you signed in and protect account access."],
              ["Session storage", "Preserve temporary handoff state such as a public prompt continuing into /ai."],
              ["Local storage", "Remember interface preferences, recent docs searches, and non-sensitive UI state."],
              ["Analytics events", "Measure usage, reliability, and product quality when configured."],
            ],
          },
        ],
      },
      {
        id: "choices",
        title: "Choices",
        blocks: [
          {
            type: "paragraph",
            text:
              "Most browsers let you limit cookies or clear local storage. Blocking required authentication or session storage can prevent sign-in, project continuity, and workspace handoff from working correctly.",
          },
        ],
      },
    ],
  },
];

export const DOC_ROUTE_PATHS = DOC_PAGES.map((page) => page.path);
export const LEGAL_ROUTE_PATHS = LEGAL_PAGES.map((page) => page.path);

export function getDocPage(slug = DEFAULT_DOC_SLUG) {
  const resolvedSlug = slug || DEFAULT_DOC_SLUG;
  return DOC_PAGES.find((page) => page.slug === resolvedSlug) || null;
}

export function getLegalPage(slug = DEFAULT_LEGAL_SLUG) {
  const resolvedSlug = slug || DEFAULT_LEGAL_SLUG;
  return LEGAL_PAGES.find((page) => page.slug === resolvedSlug) || null;
}

export function getAdjacentPage(pages, slug) {
  const index = pages.findIndex((page) => page.slug === slug);
  return {
    previousPage: index > 0 ? pages[index - 1] : null,
    nextPage: index >= 0 && index < pages.length - 1 ? pages[index + 1] : null,
  };
}
