export const searchLandingPages = [
  {
    slug: "roblox-script-generator",
    category: "roblox_scripting",
    mode: "quick_script",
    modeLabel: "Quick Script",
    title: "Roblox Script Generator | Focused Luau Code with NexusRBX",
    description: "Generate focused Roblox Luau scripts with placement notes, setup steps, test guidance, warnings, and copy-ready output.",
    h1: "Roblox script generator for focused Luau code.",
    eyebrow: "Quick Script",
    intro: "Use this page when you know the Roblox behavior you want and need a clear first script. NexusRBX starts with immediate code, then explains where it belongs and what to test in Studio.",
    cta: "Generate a Roblox script",
    promptPlaceholder: "Create a round timer with intermission, round start, and winner rewards...",
    examples: [
      {
        title: "Round Timer",
        prompt: "Create a server round timer with a 20 second intermission, 90 second round, and a RemoteEvent that updates a timer label.",
        output: "A ServerScriptService Script that owns round state plus a ReplicatedStorage RemoteEvent for UI updates.",
      },
      {
        title: "Checkpoint Reward",
        prompt: "Make a checkpoint script that saves the last touched checkpoint and respawns the player there after death.",
        output: "A Script for ServerScriptService with checkpoint tags, player state, and safe character repositioning.",
      },
      {
        title: "Proximity Door",
        prompt: "Generate a proximity prompt door script that opens for players who have a Keycard bool value.",
        output: "A focused door controller with permission checks and tweened movement notes.",
      },
    ],
    supported: ["Round timers", "Touch triggers", "NPC interactions", "Shop logic", "RemoteEvent handlers", "Basic DataStore patterns"],
    studio: [
      "Put server-authoritative gameplay code in ServerScriptService unless the script must live inside a specific Part or model.",
      "Create RemoteEvents in ReplicatedStorage when a LocalScript needs UI updates from server state.",
      "Test with Start Server and multiple clients when a script changes shared game state.",
    ],
    mistakes: [
      "Trusting a LocalScript for currency, inventory, or rewards.",
      "Forgetting to create the RemoteEvent or folder path referenced by the script.",
      "Pasting code into the wrong script type and then debugging the wrong problem.",
    ],
    debugging: [
      "Read the Output window first and fix the earliest error before changing logic.",
      "Add temporary print statements around player, character, and object lookups.",
      "Check that services and objects exist before assuming the generated path is correct.",
    ],
    limitations: [
      "Generated code needs Studio testing because every place has different object names and gameplay rules.",
      "NexusRBX can provide a focused first version, but complex economies or anti-cheat systems need careful review.",
    ],
    safety: [
      "Keep rewards, purchases, and permissions on the server.",
      "Avoid scripts that harass players, bypass platform rules, or automate abuse.",
    ],
    faqs: [
      {
        question: "Does this guarantee a working Roblox script?",
        answer: "No. It gives you a focused Luau starting point with setup and test notes. You still need to verify object names, placement, and gameplay behavior in Studio.",
      },
      {
        question: "When should I use Agent Build instead?",
        answer: "Use Agent Build when the script touches several systems, needs Studio inspection, or should create multiple files with a plan.",
      },
    ],
    docsLinks: [
      { href: "/docs/script-generation", label: "Generation modes" },
      { href: "/docs/troubleshooting", label: "Safe workflow" },
    ],
    toolLinks: [
      { href: "/roblox-lua-script-generator", label: "Luau generator" },
      { href: "/roblox-studio-script-generator", label: "Studio script generator" },
      { href: "/ai", label: "Open AI workspace" },
    ],
  },
  {
    slug: "roblox-ai-scripter",
    category: "roblox_scripting",
    mode: "agent",
    modeLabel: "Agent Build",
    title: "Roblox AI Scripter | Conversational Script Help",
    description: "Use NexusRBX as a Roblox AI scripter for iterative debugging, script edits, explanations, and multi-step Studio workflows.",
    h1: "Roblox AI scripter for iterative building and debugging.",
    eyebrow: "Conversational assistant",
    intro: "This route is for creators who expect back-and-forth help: explain an error, refine behavior, compare approaches, or expand a simple script into a safer Studio workflow.",
    cta: "Start AI scripting help",
    promptPlaceholder: "My sprint script works once, then stops after respawn. Help me debug and rewrite it...",
    examples: [
      {
        title: "Debug After Respawn",
        prompt: "My sprint LocalScript stops working after the player respawns. Explain likely causes and rewrite it with CharacterAdded handling.",
        output: "A debugging checklist plus a LocalScript pattern that reconnects character references after respawn.",
      },
      {
        title: "Refactor RemoteEvents",
        prompt: "Review this idea for a shop purchase flow and suggest a safer RemoteEvent structure before writing the scripts.",
        output: "A planned client/server split with validation notes before code is generated.",
      },
      {
        title: "Explain An Error",
        prompt: "Explain why attempt to index nil with HumanoidRootPart happens and show a safer wait pattern.",
        output: "A plain-language diagnosis and guarded Luau snippet for character loading.",
      },
    ],
    supported: ["Error explanation", "Conversational rewrites", "Client/server split reviews", "Studio workflow planning", "Debugging checklists"],
    studio: [
      "Open the Output window and copy the exact error line into the prompt when asking for debugging help.",
      "Describe the script type and location, such as StarterPlayerScripts LocalScript or ServerScriptService Script.",
      "For multi-file changes, use Agent Build so NexusRBX can ask questions and create a plan.",
    ],
    mistakes: [
      "Only saying it is broken without sharing where the script runs.",
      "Mixing server-only APIs into LocalScripts.",
      "Debugging the symptom before confirming which object or event is nil.",
    ],
    debugging: [
      "Ask for a hypothesis list before requesting a rewrite if you do not know the cause.",
      "Test one change at a time and keep the previous working version nearby.",
      "Use Play Solo for quick client issues, then Start Server for server/client behavior.",
    ],
    limitations: [
      "The AI cannot see your place unless you provide details or use the paired Studio workflow.",
      "Large systems may need clarifying questions before code is safe to generate.",
    ],
    safety: [
      "Do not paste secrets, private keys, or account tokens into a prompt.",
      "Use server validation for anything that affects other players or persistent value.",
    ],
    faqs: [
      {
        question: "Why does this page default to Agent Build?",
        answer: "Conversational scripting usually needs diagnosis, follow-up, and planning. Agent Build is a better default than immediate code for that workflow.",
      },
      {
        question: "Can I still get a quick script?",
        answer: "Yes. If your request is simple, NexusRBX can produce a focused script or you can use the Roblox Script Generator page.",
      },
    ],
    docsLinks: [
      { href: "/docs", label: "Workspace overview" },
      { href: "/docs/troubleshooting", label: "Debug safely" },
    ],
    toolLinks: [
      { href: "/roblox-script-generator", label: "Quick script generator" },
      { href: "/roblox-studio-script-generator", label: "Studio workflow" },
      { href: "/ai", label: "Continue in AI workspace" },
    ],
  },
  {
    slug: "roblox-lua-script-generator",
    category: "roblox_scripting",
    mode: "quick_script",
    modeLabel: "Quick Script",
    title: "Roblox Lua Script Generator | Luau Syntax and Studio Placement",
    description: "Generate Roblox Luau scripts with syntax notes, Script vs LocalScript placement, setup guidance, and common Lua-to-Luau differences.",
    h1: "Roblox Lua script generator that speaks Luau.",
    eyebrow: "Luau-focused",
    intro: "Roblox developers often say Lua, but modern Roblox scripting uses Luau. This page focuses on Luau patterns, Roblox services, and Studio placement details that plain Lua snippets usually miss.",
    cta: "Generate Luau code",
    promptPlaceholder: "Write a Luau ModuleScript for weighted random loot with typed helper functions...",
    examples: [
      {
        title: "Typed Module",
        prompt: "Create a Luau ModuleScript for weighted random rewards with type annotations and a simple usage example.",
        output: "A ModuleScript API with typed tables, validation, and a short ServerScriptService usage snippet.",
      },
      {
        title: "CollectionService Tags",
        prompt: "Generate a Luau script that uses CollectionService tags to make all tagged bounce pads launch players upward.",
        output: "A ServerScriptService Script using CollectionService, touched handling, and debounce state.",
      },
      {
        title: "RemoteEvent Contract",
        prompt: "Create a Luau RemoteEvent pattern for requesting a daily reward with server-side cooldown checks.",
        output: "A server handler and a minimal client call with validation notes.",
      },
    ],
    supported: ["Typed Luau modules", "Roblox service usage", "RemoteEvent contracts", "CollectionService patterns", "Debounce and cooldown logic"],
    studio: [
      "Use ModuleScripts for reusable functions and require them from Scripts or LocalScripts.",
      "Use type annotations when they make APIs clearer, not as decoration.",
      "Place shared modules in ReplicatedStorage only when both client and server can safely read them.",
    ],
    mistakes: [
      "Using generic Lua APIs that do not match Roblox services or instances.",
      "Putting server secrets or reward authority in a shared ModuleScript.",
      "Assuming a table type makes runtime data safe without validation.",
    ],
    debugging: [
      "Use Luau type warnings as early signals, then verify runtime behavior in Output.",
      "Print module return values when require paths are unclear.",
      "Check whether a module is running on the client, server, or both.",
    ],
    limitations: [
      "Luau types help readability and tooling, but they do not replace runtime checks for player input.",
      "Generated snippets may need object names adjusted to your place hierarchy.",
    ],
    safety: [
      "Keep purchase validation and reward grants in server-only scripts.",
      "Do not use generated code to bypass Roblox platform restrictions or exploit other games.",
    ],
    faqs: [
      {
        question: "Is Roblox Lua different from Luau?",
        answer: "Roblox uses Luau, a Lua-derived language with Roblox APIs, optional typing, and performance-oriented syntax support.",
      },
      {
        question: "Should I ask for types in every script?",
        answer: "Ask for types when a module or API will be reused. Small one-off scripts can stay simpler.",
      },
    ],
    docsLinks: [
      { href: "/docs/script-generation", label: "Quick Script vs Agent Build" },
      { href: "/docs/studio-plugin", label: "Studio bridge" },
    ],
    toolLinks: [
      { href: "/roblox-script-generator", label: "General script generator" },
      { href: "/roblox-ai-scripter", label: "AI debugging help" },
      { href: "/ai", label: "Open workspace" },
    ],
  },
  {
    slug: "roblox-studio-script-generator",
    category: "studio_workflow",
    mode: "agent",
    modeLabel: "Agent Build",
    title: "Roblox Studio Script Generator | Script Placement and Workflow",
    description: "Plan Roblox Studio scripts with clear Script, LocalScript, and ModuleScript placement plus plugin-aware workflow guidance.",
    h1: "Roblox Studio script generator for correct placement and workflow.",
    eyebrow: "Studio workflow",
    intro: "Use this route when the main challenge is not just code, but where that code belongs. NexusRBX can separate server logic, client UI behavior, shared modules, and Studio setup steps.",
    cta: "Plan a Studio script",
    promptPlaceholder: "Build a Studio-ready quest system with server quest state, client UI updates, and reusable module data...",
    examples: [
      {
        title: "Quest System Split",
        prompt: "Plan and generate a quest system with a ServerScriptService controller, ReplicatedStorage remotes, and a StarterGui LocalScript.",
        output: "A file placement map plus code responsibilities for Script, LocalScript, ModuleScript, and RemoteEvents.",
      },
      {
        title: "Tool Ability",
        prompt: "Create a tool ability workflow that plays client effects but validates cooldown and damage on the server.",
        output: "A Studio hierarchy plan with server validation and client feedback scripts.",
      },
      {
        title: "Plugin Pairing",
        prompt: "Explain how to use NexusRBX with a paired Studio place before applying a multi-script change.",
        output: "A Studio connection checklist and a planned Agent Build path.",
      },
    ],
    supported: ["Script placement maps", "Client/server architecture", "ModuleScript boundaries", "RemoteEvent setup", "Studio plugin workflows"],
    studio: [
      "Use Script for server authority in ServerScriptService or Workspace when tied to a physical object.",
      "Use LocalScript for player UI, camera, input, and client-only effects in StarterPlayerScripts or StarterGui.",
      "Use ModuleScript for shared reusable functions, data tables, or service wrappers.",
    ],
    mistakes: [
      "Putting input handling in a server Script and expecting it to read local keyboard state.",
      "Putting reward validation in a LocalScript where exploiters can bypass it.",
      "Creating modules with hidden side effects that run as soon as they are required.",
    ],
    debugging: [
      "Confirm the script is running by printing from its actual Studio location.",
      "Test server/client splits with Start Server, not only Play Solo.",
      "Inspect RemoteEvent names and parent paths before changing generated code.",
    ],
    limitations: [
      "NexusRBX cannot infer your full hierarchy unless you describe it or use the paired Studio workflow.",
      "Plugin-assisted pushes should still be reviewed when they change live place scripts.",
    ],
    safety: [
      "Review Studio mutations before applying them to a production place.",
      "Snapshot or duplicate important scripts before testing larger generated workflows.",
    ],
    faqs: [
      {
        question: "Why does this page use Agent Build?",
        answer: "Studio placement decisions often affect several files. Agent Build can plan the hierarchy before generating scripts.",
      },
      {
        question: "Can NexusRBX push scripts into Studio?",
        answer: "The authenticated workspace can work with the Studio bridge when the plugin is installed and paired.",
      },
    ],
    docsLinks: [
      { href: "/docs/studio-plugin", label: "Studio connection guide" },
      { href: "/docs/troubleshooting", label: "Safe Studio workflow" },
    ],
    toolLinks: [
      { href: "/roblox-ai-scripter", label: "AI scripter" },
      { href: "/roblox-gui-maker", label: "GUI maker" },
      { href: "/ai", label: "Pair Studio in workspace" },
    ],
  },
  {
    slug: "roblox-gui-maker",
    category: "roblox_ui",
    mode: "quick_script",
    modeLabel: "Quick Script",
    title: "Roblox GUI Maker | UI Behaviour and GUI Scripting",
    description: "Create Roblox GUI behavior scripts with responsive layout guidance, LocalScript placement, examples, and a path to Agent Build for larger interfaces.",
    h1: "Roblox GUI maker for interactive UI behavior.",
    eyebrow: "UI scripting",
    intro: "This page focuses on GUI behavior: buttons, HUD updates, menus, responsive layout concerns, and the LocalScripts that connect UI to safe server events.",
    cta: "Generate GUI behavior",
    promptPlaceholder: "Create a responsive shop GUI LocalScript with category tabs and server-validated purchase events...",
    examples: [
      {
        title: "Shop GUI",
        prompt: "Generate a shop GUI behavior script with category tabs, selected item details, and a RemoteEvent purchase request.",
        output: "A StarterGui LocalScript plan with button wiring and server-validation reminders.",
      },
      {
        title: "HUD Update",
        prompt: "Create a HUD LocalScript that listens for timer and coin updates from RemoteEvents and animates label changes.",
        output: "A LocalScript with event listeners, label updates, and tween notes.",
      },
      {
        title: "Menu Flow",
        prompt: "Build a main menu flow with Play, Settings, and Credits panels using visible state and keyboard-friendly buttons.",
        output: "A GUI state pattern with accessible button labels and responsive layout guidance.",
      },
    ],
    supported: ["Shop UI behavior", "HUD updates", "Menu panels", "Button wiring", "Responsive ScreenGui patterns", "Client-to-server purchase requests"],
    studio: [
      "Put GUI behavior in LocalScripts under StarterGui or inside the relevant ScreenGui.",
      "Use constraints, scale-based sizing, and safe-area padding so mobile screens do not overflow.",
      "Use RemoteEvents for server-owned data such as currency, inventory, and purchases.",
    ],
    mistakes: [
      "Making a beautiful GUI that depends on hard-coded pixel positions on mobile.",
      "Changing player currency directly from a LocalScript.",
      "Duplicating the same button logic across many frames instead of using a small helper.",
    ],
    debugging: [
      "Use the emulator sizes in Studio to check phone, tablet, and desktop layouts.",
      "Print button names when connecting handlers so missed references are visible.",
      "Check ZIndex and Visible state before assuming a script did not run.",
    ],
    limitations: [
      "NexusRBX can script behavior and describe layout, but it cannot inspect your exact UI hierarchy unless you provide it or connect Studio.",
      "Large interfaces with many screens are better handled as Agent Build so the system can plan component structure.",
    ],
    safety: [
      "Keep client UI responsive, but keep valuable actions validated on the server.",
      "Avoid deceptive UI patterns that trick players into purchases or unwanted actions.",
    ],
    faqs: [
      {
        question: "Is this different from a Roblox UI generator?",
        answer: "This page focuses on GUI behavior and scripting. A separate UI generator page would need deeper layout templates and visual examples to be useful rather than duplicative.",
      },
      {
        question: "When should I open Agent Build?",
        answer: "Use Agent Build for full interface systems with multiple panels, remotes, modules, and Studio hierarchy changes.",
      },
    ],
    docsLinks: [
      { href: "/docs/script-generation", label: "Mode selection" },
      { href: "/docs/studio-plugin", label: "Studio workflow" },
    ],
    toolLinks: [
      { href: "/tools/icon-generator", label: "Icon generator" },
      { href: "/icons-market", label: "Icon marketplace" },
      { href: "/roblox-studio-script-generator", label: "Studio script generator" },
      { href: "/ai", label: "Open Agent Build" },
    ],
  },
];

export const searchLandingPageMap = new Map(searchLandingPages.map((page) => [page.slug, page]));

export function getSearchLandingPage(slug) {
  return searchLandingPageMap.get(slug) || null;
}

export function getSearchLandingSlugs() {
  return searchLandingPages.map((page) => page.slug);
}
