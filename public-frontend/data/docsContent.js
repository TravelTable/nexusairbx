export const DEFAULT_DOC_SLUG = "overview";
export const DEFAULT_LEGAL_SLUG = "overview";

const DOC_UPDATED = "July 4, 2026";
const LEGAL_UPDATED = "January 12, 2026";
const POLICY_DRAFT_UPDATED = "June 28, 2026";
const COUNSEL_REVIEW_NOTE =
  "This public policy page is a structured NexusRBX draft and should be reviewed by counsel before it is treated as final legal advice.";

export const DOC_CATEGORIES = [
  {
    "id": "start",
    "title": "Start",
    "pages": [
      "overview",
      "installation",
      "getting-started"
    ]
  },
  {
    "id": "studio",
    "title": "Studio",
    "pages": [
      "studio-plugin",
      "basic-workflow",
      "reviewing-and-inserting-generated-code"
    ]
  },
  {
    "id": "create",
    "title": "Create",
    "pages": [
      "generating-your-first-script",
      "prompting-guide",
      "understanding-script-types",
      "common-use-cases"
    ]
  },
  {
    "id": "debug",
    "title": "Debug",
    "pages": [
      "debugging-guide",
      "troubleshooting"
    ]
  },
  {
    "id": "support",
    "title": "Trust & Support",
    "pages": [
      "safety-permissions-privacy",
      "faq",
      "changelog",
      "support-and-bug-reports"
    ]
  }
];

export const LEGAL_CATEGORIES = [
  {
    "id": "legal-core",
    "title": "Legal",
    "pages": [
      "overview",
      "terms",
      "privacy"
    ]
  },
  {
    "id": "legal-policies",
    "title": "Policies",
    "pages": [
      "acceptable-use",
      "refunds",
      "cookies"
    ]
  }
];

export const DOC_PAGES = [
  {
    "slug": "overview",
    "path": "/docs",
    "navTitle": "Overview",
    "title": "NexusRBX AI Documentation",
    "metaTitle": "NexusRBX AI Documentation | NexusRBX AI Docs",
    "description": "Learn how to install NexusRBX AI, connect Roblox Studio, generate Luau scripts, review changes, debug errors, and stay in control of every Studio workflow.",
    "category": "start",
    "updated": DOC_UPDATED,
    "readingTime": "5 min read",
    "status": "Start here",
    "primaryAction": {
      "label": "Open NexusRBX AI",
      "href": "/ai"
    },
    "secondaryAction": {
      "label": "Install the Studio plugin",
      "href": "/docs/installation"
    },
    "sections": [
      {
        "id": "what-nexusrbx-ai-does",
        "title": "What NexusRBX AI does",
        "blocks": [
          {
            "type": "paragraph",
            "text": "NexusRBX AI helps Roblox creators move faster in Studio by turning plain-English instructions into Luau script suggestions, debugging help, explanations, and workflow guidance. Use it to draft common Roblox scripts, understand errors from the Output window, plan gameplay systems, and get help with ServerScripts, LocalScripts, ModuleScripts, UI logic, RemoteEvents, leaderstats, tools, and more. NexusRBX AI is currently in beta. Generated code is a development aid, not a guarantee. Always review suggestions, confirm object names and script locations, and test your game in Roblox Studio Play mode before publishing."
          },
          {
            "type": "cards",
            "items": [
              {
                "title": "Generate Luau starting points",
                "body": "Turn a clear prompt into Roblox Luau suggestions with script placement and setup notes.",
                "href": "/docs/generating-your-first-script"
              },
              {
                "title": "Debug and explain errors",
                "body": "Paste exact Output errors and ask for focused fixes, explanations, and test steps.",
                "href": "/docs/debugging-guide"
              },
              {
                "title": "Connect Studio when needed",
                "body": "Pair the plugin for targeted Studio context and reviewed insertion workflows.",
                "href": "/docs/studio-plugin"
              }
            ]
          }
        ]
      },
      {
        "id": "creator-store-summary",
        "title": "Creator Store summary",
        "blocks": [
          {
            "type": "paragraph",
            "text": "NexusRBX AI is a beta Roblox Studio plugin that helps creators generate Luau script starting points, review code ideas, debug errors, and understand Roblox scripting workflows. It is built for beginner and intermediate Roblox developers who want AI-assisted help while still reviewing, editing, and testing their code before publishing."
          },
          {
            "type": "callout",
            "tone": "info",
            "title": "Listing copy",
            "text": "AI-assisted Luau scripting help for Roblox Studio. Generate starting points, debug errors, and review code suggestions while you stay in control."
          },
          {
            "type": "callout",
            "tone": "warning",
            "title": "Beta review required",
            "text": "Generated code is a development aid, not a guarantee. Review suggestions, confirm object names and script locations, and test in Roblox Studio Play mode before publishing."
          }
        ]
      },
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page explains what NexusRBX AI is, who it is for, what it can help with, and what users should expect while the plugin is in beta."
          }
        ]
      },
      {
        "id": "what-nexusrbx-ai-is",
        "title": "What NexusRBX AI Is",
        "blocks": [
          {
            "type": "paragraph",
            "text": "NexusRBX AI is an AI-assisted development tool for Roblox Studio. It helps Roblox developers turn plain-English instructions into Luau script starting points, debugging help, explanations, and Studio-ready code suggestions."
          },
          {
            "type": "paragraph",
            "text": "It is designed to support Roblox creators while they build, review, and test their own games. It is not a replacement for Roblox Studio knowledge, Luau practice, or careful testing."
          }
        ]
      },
      {
        "id": "who-it-is-for",
        "title": "Who It Is For",
        "blocks": [
          {
            "type": "paragraph",
            "text": "NexusRBX AI is useful for:"
          },
          {
            "type": "list",
            "items": [
              "Beginner Roblox developers learning how scripts are structured.",
              "Intermediate Roblox developers who want to speed up repetitive scripting tasks.",
              "Roblox creators who need help debugging errors and understanding Luau.",
              "Developers building UI logic, gameplay systems, tool behavior, RemoteEvent flows, and script plans."
            ]
          }
        ]
      },
      {
        "id": "what-it-can-help-with",
        "title": "What It Can Help With",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Task",
              "How NexusRBX AI can help"
            ],
            "rows": [
              [
                "Generate Luau starting points",
                "Turn a clear prompt into script suggestions with placement notes."
              ],
              [
                "Debug script errors",
                "Explain error messages and suggest focused fixes."
              ],
              [
                "Explain existing code",
                "Break down what a script does in beginner-friendly language."
              ],
              [
                "Plan a feature",
                "Turn a rough idea into scripts, objects, services, and testing steps."
              ],
              [
                "Review Studio logic",
                "Help identify missing objects, wrong script types, and server/client issues."
              ]
            ]
          }
        ]
      },
      {
        "id": "what-it-cannot-guarantee",
        "title": "What It Cannot Guarantee",
        "blocks": [
          {
            "type": "paragraph",
            "text": "NexusRBX AI cannot guarantee that generated code will be perfect, complete, secure, optimized, or ready to publish without changes."
          },
          {
            "type": "paragraph",
            "text": "Generated code may need adjustments for:"
          },
          {
            "type": "list",
            "items": [
              "Your exact object names.",
              "Your exact script location.",
              "Server-side versus client-side behavior.",
              "Existing game systems.",
              "Security rules for purchases, rewards, player data, and RemoteEvents.",
              "Roblox API changes or project-specific constraints."
            ]
          }
        ]
      },
      {
        "id": "beta-notice",
        "title": "Beta Notice",
        "blocks": [
          {
            "type": "paragraph",
            "text": "NexusRBX AI is currently in beta. Some workflows, UI labels, connection steps, and generated suggestions may change over time."
          },
          {
            "type": "paragraph",
            "text": "Use AI suggestions as a development aid:"
          },
          {
            "type": "steps",
            "items": [
              {
                "title": "Review the generated code",
                "body": "Review the generated code."
              },
              {
                "title": "Check object names and script placement",
                "body": "Check object names and script placement."
              },
              {
                "title": "Test in Roblox Studio Play mode",
                "body": "Test in Roblox Studio Play mode."
              },
              {
                "title": "Watch the Output window for errors",
                "body": "Watch the Output window for errors."
              },
              {
                "title": "Edit and improve the code before publishing",
                "body": "Edit and improve the code before publishing."
              }
            ]
          }
        ]
      },
      {
        "id": "review-before-publishing",
        "title": "Review Before Publishing",
        "blocks": [
          {
            "type": "paragraph",
            "text": "AI-generated code should be treated like code from any other helper: read it, understand what it changes, and test it safely."
          },
          {
            "type": "paragraph",
            "text": "Be especially careful with scripts that affect:"
          },
          {
            "type": "list",
            "items": [
              "Player data.",
              "purchases or rewards.",
              "moderation-sensitive content.",
              "RemoteEvents and RemoteFunctions.",
              "admin commands.",
              "inventory, trading, or economy systems."
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "installation",
    "path": "/docs/installation",
    "navTitle": "Installation",
    "title": "Install NexusRBX AI",
    "metaTitle": "Install NexusRBX AI | NexusRBX AI Docs",
    "description": "Install NexusRBX AI from the Creator Store or from the generated local plugin artifact, then open it inside Roblox Studio.",
    "category": "start",
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "status": "Setup guide",
    "primaryAction": {
      "label": "Open NexusRBX AI",
      "href": "/ai"
    },
    "secondaryAction": {
      "label": "Connect Studio",
      "href": "/docs/studio-plugin"
    },
    "sections": [
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page explains how to install NexusRBX AI from the Roblox Creator Store and open it inside Roblox Studio."
          }
        ]
      },
      {
        "id": "local-repository-install-target",
        "title": "Local repository install target",
        "blocks": [
          {
            "type": "callout",
            "tone": "warning",
            "title": "Install the generated plugin artifact",
            "text": "When installing from this repository, install roblox-plugin/NexusRBXStudioBridge.plugin.lua. The files under roblox-plugin/src are source modules used to build the artifact, not the Studio install target."
          },
          {
            "type": "code",
            "language": "bash",
            "title": "Rebuild the Studio plugin artifact",
            "code": "node roblox-plugin/build/bundle-plugin.js"
          }
        ]
      },
      {
        "id": "before-you-start",
        "title": "Before You Start",
        "blocks": [
          {
            "type": "paragraph",
            "text": "You need:"
          },
          {
            "type": "list",
            "items": [
              "Roblox Studio installed.",
              "A Roblox account.",
              "Access to the NexusRBX AI Creator Store listing.",
              "Permission to install plugins in Roblox Studio."
            ]
          }
        ]
      },
      {
        "id": "install-from-roblox-creator-store",
        "title": "Install From Roblox Creator Store",
        "blocks": [
          {
            "type": "steps",
            "items": [
              {
                "title": "Open the Roblox Creator Store",
                "body": "Open the Roblox Creator Store: the official Roblox Creator Store listing when available."
              },
              {
                "title": "Search for NexusRBX AI if you are not using a direct link",
                "body": "Search for NexusRBX AI if you are not using a direct link."
              },
              {
                "title": "Open the NexusRBX AI plugin listing",
                "body": "Open the NexusRBX AI plugin listing."
              },
              {
                "title": "Click the install, get, or add button shown by Roblox",
                "body": "Click the install, get, or add button shown by Roblox."
              },
              {
                "title": "Wait for Roblox to add the plugin to your account",
                "body": "Wait for Roblox to add the plugin to your account."
              }
            ]
          }
        ]
      },
      {
        "id": "open-the-plugin-in-roblox-studio",
        "title": "Open The Plugin In Roblox Studio",
        "blocks": [
          {
            "type": "steps",
            "items": [
              {
                "title": "Open Roblox Studio",
                "body": "Open Roblox Studio."
              },
              {
                "title": "Open an existing place or create a new baseplate",
                "body": "Open an existing place or create a new baseplate."
              },
              {
                "title": "Select the Plugins tab",
                "body": "Select the Plugins tab."
              },
              {
                "title": "Look for NexusRBX AI",
                "body": "Look for NexusRBX AI."
              },
              {
                "title": "Click the plugin button to open it",
                "body": "Click the plugin button to open it."
              }
            ]
          }
        ]
      },
      {
        "id": "if-the-plugin-does-not-appear",
        "title": "If The Plugin Does Not Appear",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Try these steps:"
          },
          {
            "type": "table",
            "columns": [
              "Check",
              "What to do"
            ],
            "rows": [
              [
                "Studio is already open",
                "Restart Roblox Studio after installing the plugin."
              ],
              [
                "Wrong Roblox account",
                "Make sure Studio is signed in to the same account that installed the plugin."
              ],
              [
                "Plugin disabled",
                "Open Studio plugin management and confirm NexusRBX AI is enabled."
              ],
              [
                "Installation did not complete",
                "Return to the Creator Store listing and confirm the plugin is installed."
              ],
              [
                "Studio cache issue",
                "Close all Studio windows, reopen Studio, and check the Plugins tab again."
              ]
            ]
          },
          {
            "type": "paragraph",
            "text": "If the plugin still does not appear, contact support with your Roblox username, Studio version, and a screenshot of the Plugins tab."
          }
        ]
      }
    ]
  },
  {
    "slug": "getting-started",
    "path": "/docs/getting-started",
    "navTitle": "First-Time Setup",
    "title": "First-Time Setup",
    "metaTitle": "First-Time Setup | NexusRBX AI Docs",
    "description": "Open NexusRBX AI for the first time, sign in, pair Studio when needed, and run a safe setup test.",
    "category": "start",
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "status": "Beginner guide",
    "primaryAction": {
      "label": "Open NexusRBX AI",
      "href": "/ai"
    },
    "secondaryAction": {
      "label": "Read basic workflow",
      "href": "/docs/basic-workflow"
    },
    "sections": [
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page explains what to do the first time you open NexusRBX AI in Roblox Studio."
          }
        ]
      },
      {
        "id": "open-nexusrbx-ai",
        "title": "Open NexusRBX AI",
        "blocks": [
          {
            "type": "steps",
            "items": [
              {
                "title": "Open Roblox Studio",
                "body": "Open Roblox Studio."
              },
              {
                "title": "Open a place",
                "body": "Open a place."
              },
              {
                "title": "Go to the Plugins tab",
                "body": "Go to the Plugins tab."
              },
              {
                "title": "Click NexusRBX AI",
                "body": "Click NexusRBX AI."
              },
              {
                "title": "Wait for the plugin panel or window to load",
                "body": "Wait for the plugin panel or window to load."
              }
            ]
          },
          {
            "type": "paragraph",
            "text": "If the plugin opens but stays blank or loading, see Troubleshooting (/docs/troubleshooting)."
          }
        ]
      },
      {
        "id": "sign-in-or-connect-an-account",
        "title": "Sign In Or Connect An Account",
        "blocks": [
          {
            "type": "paragraph",
            "text": "NexusRBX AI may require a NexusRBX account before generation, Studio connection, or saved history works."
          },
          {
            "type": "paragraph",
            "text": "Use the sign-in flow shown in the plugin or web app:"
          },
          {
            "type": "list",
            "items": [
              "Sign-in method: sign in through the NexusRBX AI workspace",
              "Web app URL: /ai",
              "Account connection requirement: A NexusRBX account is required for authenticated AI workspace features and Studio pairing."
            ]
          },
          {
            "type": "paragraph",
            "text": "Do not share passwords, private tokens, or account recovery codes in prompts."
          }
        ]
      },
      {
        "id": "pair-with-the-nexusrbx-web-app",
        "title": "Pair With The NexusRBX Web App",
        "blocks": [
          {
            "type": "paragraph",
            "text": "If NexusRBX AI uses a web pairing flow, follow the on-screen steps:"
          },
          {
            "type": "steps",
            "items": [
              {
                "title": "Open the NexusRBX web app",
                "body": "Open the NexusRBX web app: /ai."
              },
              {
                "title": "Sign in with the same account used for the plugin",
                "body": "Sign in with the same account used for the plugin."
              },
              {
                "title": "Open the Studio connection or plugin pairing screen",
                "body": "Open the Studio connection or plugin pairing screen: Studio connection."
              },
              {
                "title": "Copy or confirm the pairing code if one is shown",
                "body": "Copy or confirm the pairing code if one is shown by the AI workspace and Studio plugin panel."
              },
              {
                "title": "Return to Roblox Studio and confirm the connection",
                "body": "Return to Roblox Studio and confirm the connection."
              }
            ]
          },
          {
            "type": "paragraph",
            "text": "If the plugin does not use pairing, replace this section with the exact connection behavior."
          }
        ]
      },
      {
        "id": "confirm-setup-is-complete",
        "title": "Confirm Setup Is Complete",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Setup is complete when you can see:"
          },
          {
            "type": "list",
            "items": [
              "The plugin panel is open.",
              "Your account or connection status is shown: Connected.",
              "Studio shows as connected if pairing is required.",
              "You can enter a prompt or start a script request."
            ]
          }
        ]
      },
      {
        "id": "first-safe-test",
        "title": "First Safe Test",
        "blocks": [
          {
            "type": "paragraph",
            "text": "For your first test, ask for a simple script that does not affect player data or purchases."
          },
          {
            "type": "paragraph",
            "text": "Example:"
          },
          {
            "type": "code",
            "language": "text",
            "code": "Create a beginner-friendly ServerScript for ServerScriptService that prints \"NexusRBX AI setup test\" when the game starts. Include where to put it and how to check the Output window."
          },
          {
            "type": "paragraph",
            "text": "Review the result before inserting it."
          }
        ]
      }
    ]
  },
  {
    "slug": "studio-plugin",
    "path": "/docs/studio-plugin",
    "navTitle": "Studio Plugin",
    "title": "Connect NexusRBX AI to Roblox Studio",
    "metaTitle": "Connect NexusRBX AI to Roblox Studio | NexusRBX AI Docs",
    "description": "Pair the web workspace with the Roblox Studio plugin so NexusRBX AI can use targeted Studio context and reviewed plugin actions.",
    "category": "studio",
    "updated": DOC_UPDATED,
    "readingTime": "4 min read",
    "status": "Studio guide",
    "primaryAction": {
      "label": "Open NexusRBX AI",
      "href": "/ai"
    },
    "secondaryAction": {
      "label": "Review insert workflow",
      "href": "/docs/reviewing-and-inserting-generated-code"
    },
    "sections": [
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page explains how the plugin and Roblox Studio connection should work at a user level."
          }
        ]
      },
      {
        "id": "studio-bridge-behavior",
        "title": "Studio bridge behavior",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Area",
              "Expected behavior"
            ],
            "rows": [
              [
                "Project inspection",
                "Request a manifest or targeted source instead of sending the full place source by default."
              ],
              [
                "Source reads",
                "Read specific scripts or objects when the task needs them."
              ],
              [
                "Source edits",
                "Use expected source hashes when editing known Studio scripts so stale writes can be rejected."
              ],
              [
                "Destructive actions",
                "Snapshot first and return snapshot IDs in the command acknowledgment."
              ],
              [
                "Unsupported runtime actions",
                "Return structured errors rather than silent no-ops."
              ]
            ]
          },
          {
            "type": "callout",
            "tone": "warning",
            "title": "Review remains required",
            "text": "Studio connection gives NexusRBX AI useful context, but generated changes still need user review, project-specific testing, and careful handling of rewards, purchases, data, and RemoteEvents."
          }
        ]
      },
      {
        "id": "why-connection-matters",
        "title": "Why Connection Matters",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Some NexusRBX AI workflows may need to know basic Studio context, such as where a script should go or whether Studio is ready for insertion. Connection helps the plugin support Studio-ready workflows while still requiring user review."
          },
          {
            "type": "paragraph",
            "text": "Exact connection behavior depends on the current NexusRBX AI implementation:"
          },
          {
            "type": "list",
            "items": [
              "Studio connection method: use the Studio connection/pairing flow shown in the AI workspace and plugin panel",
              "Web app pairing required: Yes. Pair Studio from the AI workspace when a task needs Studio context or plugin-assisted insertion.",
              "Plugin status label: Connected"
            ]
          }
        ]
      },
      {
        "id": "connection-steps",
        "title": "Connection Steps",
        "blocks": [
          {
            "type": "steps",
            "items": [
              {
                "title": "Open Roblox Studio",
                "body": "Open Roblox Studio."
              },
              {
                "title": "Open the place you want to work on",
                "body": "Open the place you want to work on."
              },
              {
                "title": "Open NexusRBX AI from the Plugins tab",
                "body": "Open NexusRBX AI from the Plugins tab."
              },
              {
                "title": "Sign in or connect your account if prompted",
                "body": "Sign in or connect your account if prompted."
              },
              {
                "title": "Open the NexusRBX web app if pairing is required",
                "body": "Open the NexusRBX web app if pairing is required."
              },
              {
                "title": "Confirm the plugin shows a connected status",
                "body": "Confirm the plugin shows a connected status."
              },
              {
                "title": "Start with a small prompt and review the generated output",
                "body": "Start with a small prompt and review the generated output."
              }
            ]
          }
        ]
      },
      {
        "id": "what-connection-does-not-mean",
        "title": "What Connection Does Not Mean",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Connection does not mean every generated suggestion should be inserted automatically."
          },
          {
            "type": "paragraph",
            "text": "Before accepting a change, check:"
          },
          {
            "type": "list",
            "items": [
              "The target script location.",
              "The script type.",
              "The object names referenced by the code.",
              "Any warnings shown by NexusRBX AI.",
              "Whether the change affects important systems."
            ]
          }
        ]
      },
      {
        "id": "connection-status-checklist",
        "title": "Connection Status Checklist",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Status",
              "Meaning",
              "What to do"
            ],
            "rows": [
              [
                "Connected",
                "Plugin can communicate with NexusRBX flow.",
                "Start with a small prompt."
              ],
              [
                "Not connected",
                "Studio or account connection is incomplete.",
                "Reopen the plugin and repeat setup."
              ],
              [
                "Signing in",
                "Account flow is still in progress.",
                "Finish sign-in in the plugin or web app."
              ],
              [
                "Outdated plugin",
                "Plugin version may not match the current web app.",
                "Update or reinstall from the Creator Store."
              ],
              [
                "Error",
                "Something failed during connection.",
                "Copy the error and send it with a bug report."
              ]
            ]
          }
        ]
      },
      {
        "id": "if-connection-fails",
        "title": "If Connection Fails",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Try one fix at a time:"
          },
          {
            "type": "steps",
            "items": [
              {
                "title": "Restart Roblox Studio",
                "body": "Restart Roblox Studio."
              },
              {
                "title": "Reopen the plugin",
                "body": "Reopen the plugin."
              },
              {
                "title": "Sign out and sign back in if the UI supports it",
                "body": "Sign out and sign back in if the UI supports it."
              },
              {
                "title": "Confirm your internet connection",
                "body": "Confirm your internet connection."
              },
              {
                "title": "Update or reinstall the plugin",
                "body": "Update or reinstall the plugin."
              },
              {
                "title": "Contact support with the exact error message",
                "body": "Contact support with the exact error message."
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "basic-workflow",
    "path": "/docs/basic-workflow",
    "navTitle": "Basic Workflow",
    "title": "Basic Workflow",
    "metaTitle": "Basic Workflow | NexusRBX AI Docs",
    "description": "Follow the normal prompt, review, insert, test, and follow-up loop for NexusRBX AI scripting help.",
    "category": "studio",
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "status": "Workflow guide",
    "primaryAction": {
      "label": "Open NexusRBX AI",
      "href": "/ai"
    },
    "secondaryAction": {
      "label": "Generate first script",
      "href": "/docs/generating-your-first-script"
    },
    "sections": [
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page explains the normal NexusRBX AI workflow from prompt to tested script."
          }
        ]
      },
      {
        "id": "standard-flow",
        "title": "Standard Flow",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Open Roblox Studio.",
              "Open NexusRBX AI.",
              "Describe what you want to build.",
              "Include where the script will go.",
              "Generate a Luau starting point.",
              "Review the code.",
              "Insert or copy the code.",
              "Test in Play mode.",
              "Ask follow-up prompts to improve or debug the result."
            ]
          }
        ]
      },
      {
        "id": "1-describe-the-script",
        "title": "1. Describe the script",
        "blocks": [
          {
            "type": "code",
            "language": "text",
            "code": "Create a LocalScript for a sprint system. The script will go inside StarterPlayerScripts. When the player holds LeftShift, increase WalkSpeed from 16 to 24. Add a stamina value that drains while sprinting and regenerates when not sprinting."
          }
        ]
      },
      {
        "id": "2-review-the-response",
        "title": "2. Review the response",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Check that the response includes:"
          },
          {
            "type": "list",
            "items": [
              "The correct script type.",
              "The correct location.",
              "Any required objects or setup steps.",
              "Notes about testing."
            ]
          }
        ]
      },
      {
        "id": "3-insert-or-copy-the-code",
        "title": "3. Insert or copy the code",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Only insert or copy code after checking it. If object names do not match your game, update them first."
          }
        ]
      },
      {
        "id": "4-test-in-play-mode",
        "title": "4. Test in Play mode",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Use Roblox Studio Play mode and watch the Output window."
          },
          {
            "type": "paragraph",
            "text": "If an error appears, copy the exact error text and ask NexusRBX AI to explain it."
          }
        ]
      },
      {
        "id": "what-to-include-in-most-requests",
        "title": "What To Include In Most Requests",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Include",
              "Example"
            ],
            "rows": [
              [
                "Goal",
                "\"Create a sprint system.\""
              ],
              [
                "Script location",
                "\"Inside StarterPlayerScripts.\""
              ],
              [
                "Script type",
                "\"LocalScript.\""
              ],
              [
                "Object names",
                "\"RemoteEvent named BuyItemEvent.\""
              ],
              [
                "Expected behavior",
                "\"Clicking the button should buy one item.\""
              ],
              [
                "Current problem",
                "\"The button clicks but nothing happens.\""
              ]
            ]
          }
        ]
      },
      {
        "id": "good-follow-up-prompts",
        "title": "Good Follow-Up Prompts",
        "blocks": [
          {
            "type": "code",
            "language": "text",
            "code": "Make this script easier for a beginner to understand and add comments only where they help."
          },
          {
            "type": "code",
            "language": "text",
            "code": "The Output window says: [PASTE ERROR HERE]. Explain the error and show the smallest fix."
          },
          {
            "type": "code",
            "language": "text",
            "code": "Change this to use a RemoteEvent so the server handles the reward securely."
          }
        ]
      }
    ]
  },
  {
    "slug": "reviewing-and-inserting-generated-code",
    "path": "/docs/reviewing-and-inserting-generated-code",
    "navTitle": "Review & Insert",
    "title": "Reviewing and Inserting Generated Code",
    "metaTitle": "Reviewing and Inserting Generated Code | NexusRBX AI Docs",
    "description": "Check generated Luau, object names, script placement, and test behavior before applying code to a Roblox project.",
    "category": "studio",
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "status": "Safety guide",
    "primaryAction": {
      "label": "Open NexusRBX AI",
      "href": "/ai"
    },
    "secondaryAction": {
      "label": "Read safety guide",
      "href": "/docs/safety-permissions-privacy"
    },
    "sections": [
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page explains how to review AI-generated Luau before inserting it into a Roblox project."
          }
        ]
      },
      {
        "id": "generated-code-is-a-suggestion",
        "title": "Generated Code Is A Suggestion",
        "blocks": [
          {
            "type": "paragraph",
            "text": "NexusRBX AI can generate a starting point, but your Roblox game has its own object names, folder structure, scripts, and gameplay rules."
          },
          {
            "type": "paragraph",
            "text": "Do not blindly insert code into important systems. Read the script first and test it in Studio."
          }
        ]
      },
      {
        "id": "review-checklist",
        "title": "Review Checklist",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Check",
              "Ask yourself"
            ],
            "rows": [
              [
                "Script type",
                "Is this a ServerScript, LocalScript, or ModuleScript?"
              ],
              [
                "Script location",
                "Will this script run from the suggested location?"
              ],
              [
                "Object names",
                "Do the names in the code match objects in Explorer?"
              ],
              [
                "Roblox services",
                "Are the services correct for this task?"
              ],
              [
                "RemoteEvents",
                "Are client and server responsibilities separated correctly?"
              ],
              [
                "Player data",
                "Is data handled securely on the server?"
              ],
              [
                "Errors",
                "Does the Output window show any warnings or errors?"
              ]
            ]
          }
        ]
      },
      {
        "id": "before-you-insert",
        "title": "Before You Insert",
        "blocks": [
          {
            "type": "steps",
            "items": [
              {
                "title": "Read the generated code",
                "body": "Read the generated code."
              },
              {
                "title": "Compare object names with Explorer",
                "body": "Compare object names with Explorer."
              },
              {
                "title": "Confirm the script location",
                "body": "Confirm the script location."
              },
              {
                "title": "Check for any setup steps",
                "body": "Check for any setup steps."
              },
              {
                "title": "Save your place or use source control if available",
                "body": "Save your place or use source control if available."
              },
              {
                "title": "Insert the code only after review",
                "body": "Insert the code only after review."
              }
            ]
          }
        ]
      },
      {
        "id": "after-you-insert",
        "title": "After You Insert",
        "blocks": [
          {
            "type": "steps",
            "items": [
              {
                "title": "Run Play mode",
                "body": "Run Play mode."
              },
              {
                "title": "Test the exact behavior",
                "body": "Test the exact behavior."
              },
              {
                "title": "Watch the Output window",
                "body": "Watch the Output window."
              },
              {
                "title": "Test with multiple players if the script affects multiplayer...",
                "body": "Test with multiple players if the script affects multiplayer behavior."
              },
              {
                "title": "Ask NexusRBX AI for a fix if something fails",
                "body": "Ask NexusRBX AI for a fix if something fails."
              }
            ]
          }
        ]
      },
      {
        "id": "extra-care-areas",
        "title": "Extra Care Areas",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Be more careful with code that affects:"
          },
          {
            "type": "list",
            "items": [
              "DataStore saves.",
              "developer products or game passes.",
              "RemoteEvents that grant rewards.",
              "admin commands.",
              "economy, inventory, or trading systems.",
              "moderation-sensitive user content."
            ]
          },
          {
            "type": "paragraph",
            "text": "For these systems, ask NexusRBX AI to explain security risks and testing steps before using the code."
          }
        ]
      }
    ]
  },
  {
    "slug": "generating-your-first-script",
    "path": "/docs/generating-your-first-script",
    "navTitle": "First Script",
    "title": "Generate Your First Script",
    "metaTitle": "Generate Your First Script | NexusRBX AI Docs",
    "description": "Use a simple, safe first prompt to create a Roblox Luau script and test it in Studio Play mode.",
    "category": "create",
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "status": "Beginner guide",
    "primaryAction": {
      "label": "Open script generator",
      "href": "/roblox-script-generator"
    },
    "secondaryAction": {
      "label": "Improve prompts",
      "href": "/docs/prompting-guide"
    },
    "sections": [
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page walks through a simple first script request for new NexusRBX AI users."
          }
        ]
      },
      {
        "id": "choose-a-simple-first-script",
        "title": "Choose A Simple First Script",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Start with something low-risk, such as:"
          },
          {
            "type": "list",
            "items": [
              "Printing a setup message.",
              "Opening or closing a UI frame.",
              "Making a simple sprint script.",
              "Creating leaderstats for testing."
            ]
          },
          {
            "type": "paragraph",
            "text": "Avoid starting with player data, purchases, trading, moderation, or admin commands."
          }
        ]
      },
      {
        "id": "example-first-prompt",
        "title": "Example First Prompt",
        "blocks": [
          {
            "type": "code",
            "language": "text",
            "code": "Create a beginner-friendly ServerScript for ServerScriptService. When a player joins, create leaderstats with Coins and Wins. Coins should start at 0 and Wins should start at 0. Include setup steps and how to test it in Play mode."
          }
        ]
      },
      {
        "id": "review-the-output",
        "title": "Review The Output",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Before inserting the code, confirm:"
          },
          {
            "type": "table",
            "columns": [
              "Check",
              "Why it matters"
            ],
            "rows": [
              [
                "Script type is ServerScript",
                "Leaderstats should be created on the server."
              ],
              [
                "Location is ServerScriptService",
                "This is a normal place for server logic."
              ],
              [
                "Object names match the prompt",
                "Typos can make debugging harder."
              ],
              [
                "The code is understandable",
                "You should know what it does before publishing."
              ],
              [
                "Test steps are included",
                "You need a way to confirm it works."
              ]
            ]
          }
        ]
      },
      {
        "id": "insert-or-copy-the-script",
        "title": "Insert Or Copy The Script",
        "blocks": [
          {
            "type": "paragraph",
            "text": "If NexusRBX AI provides an insert button, review any confirmation screen before accepting."
          },
          {
            "type": "paragraph",
            "text": "If you copy manually:"
          },
          {
            "type": "steps",
            "items": [
              {
                "title": "In Roblox Studio, open ServerScriptService",
                "body": "In Roblox Studio, open ServerScriptService."
              },
              {
                "title": "Insert a Script",
                "body": "Insert a Script."
              },
              {
                "title": "Paste the generated code",
                "body": "Paste the generated code."
              },
              {
                "title": "Name the script clearly, such as LeaderstatsSetup",
                "body": "Name the script clearly, such as LeaderstatsSetup."
              },
              {
                "title": "Save your place",
                "body": "Save your place."
              }
            ]
          }
        ]
      },
      {
        "id": "test-in-play-mode",
        "title": "Test In Play Mode",
        "blocks": [
          {
            "type": "steps",
            "items": [
              {
                "title": "Click Play",
                "body": "Click Play."
              },
              {
                "title": "Wait for your character to load",
                "body": "Wait for your character to load."
              },
              {
                "title": "Check the player list for Coins and Wins",
                "body": "Check the player list for Coins and Wins."
              },
              {
                "title": "Open the Output window",
                "body": "Open the Output window."
              },
              {
                "title": "Look for errors",
                "body": "Look for errors."
              }
            ]
          },
          {
            "type": "paragraph",
            "text": "If the values do not appear, ask:"
          },
          {
            "type": "code",
            "language": "text",
            "code": "Debug this ServerScript. It is inside ServerScriptService. It should create leaderstats with Coins and Wins, but the values are not appearing on the leaderboard. Here is the script and Output error: [PASTE SCRIPT AND ERROR HERE]."
          }
        ]
      }
    ]
  },
  {
    "slug": "prompting-guide",
    "path": "/docs/prompting-guide",
    "navTitle": "Prompting Guide",
    "title": "Prompting Guide",
    "metaTitle": "Prompting Guide | NexusRBX AI Docs",
    "description": "Write better NexusRBX AI prompts for generation, debugging, explanation, and Studio-ready Luau workflows.",
    "category": "create",
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "status": "Prompt guide",
    "primaryAction": {
      "label": "Open script generator",
      "href": "/roblox-script-generator"
    },
    "secondaryAction": {
      "label": "View use cases",
      "href": "/docs/common-use-cases"
    },
    "sections": [
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page teaches users how to write clear prompts that produce more useful Luau suggestions."
          }
        ]
      },
      {
        "id": "what-to-include",
        "title": "What To Include",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Good prompts usually include:"
          },
          {
            "type": "list",
            "items": [
              "What you want the script to do.",
              "Where the script will be placed.",
              "Whether it is a ServerScript, LocalScript, or ModuleScript.",
              "Relevant object names.",
              "Current errors.",
              "Expected behavior.",
              "What is actually happening.",
              "Roblox services being used.",
              "Whether the code should be beginner-friendly, optimized, or modular."
            ]
          }
        ]
      },
      {
        "id": "bad-prompts-and-better-prompts",
        "title": "Bad Prompts And Better Prompts",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Bad prompt",
              "Better prompt"
            ],
            "rows": [
              [
                "\"make a shop\"",
                "\"Create a LocalScript for a shop button inside StarterGui. When the player clicks the button, it should fire a RemoteEvent named BuyItemEvent in ReplicatedStorage.\""
              ],
              [
                "\"fix my script\"",
                "\"Debug this ServerScript. It is inside ServerScriptService. It should create leaderstats with Coins and Wins, but the values are not appearing on the leaderboard. Here is the error: [PASTE ERROR HERE].\""
              ],
              [
                "\"make a game\"",
                "\"Turn this game idea into a script plan for Roblox Studio. The game is a round-based obby. Include needed scripts, RemoteEvents, UI, and testing steps.\""
              ],
              [
                "\"add sprint\"",
                "\"Create a LocalScript for a sprint system. The script will go inside StarterPlayerScripts. When the player holds LeftShift, increase WalkSpeed from 16 to 24. Add stamina that drains and regenerates.\""
              ],
              [
                "\"make it work\"",
                "\"This LocalScript is inside StarterGui. The button should open a Frame, but clicking it does nothing. Explain the issue and show a fixed version. Error: [PASTE ERROR HERE].\""
              ]
            ]
          }
        ]
      },
      {
        "id": "generate-a-script",
        "title": "Generate a script",
        "blocks": [
          {
            "type": "code",
            "language": "text",
            "code": "Create a [ServerScript/LocalScript/ModuleScript] for [feature]. It will go inside [location]. It should [expected behavior]. The important object names are [object names]. Make it beginner-friendly and include setup steps."
          }
        ]
      },
      {
        "id": "debug-a-script",
        "title": "Debug a script",
        "blocks": [
          {
            "type": "code",
            "language": "text",
            "code": "Debug this [script type]. It is inside [location]. It should [expected behavior], but [actual behavior]. The Output window says: [error message]. Explain the issue and show a fixed version."
          }
        ]
      },
      {
        "id": "explain-code",
        "title": "Explain code",
        "blocks": [
          {
            "type": "code",
            "language": "text",
            "code": "Explain this script in beginner-friendly language. Tell me what each main section does, what objects it expects to exist, and what could break."
          }
        ]
      },
      {
        "id": "strong-example-prompts",
        "title": "Strong Example Prompts",
        "blocks": [
          {
            "type": "code",
            "language": "text",
            "code": "Create a LocalScript for a sprint system. The script will go inside StarterPlayerScripts. When the player holds LeftShift, increase WalkSpeed from 16 to 24. Add a stamina value that drains while sprinting and regenerates when not sprinting."
          },
          {
            "type": "code",
            "language": "text",
            "code": "Debug this ServerScript. It is inside ServerScriptService. It should create leaderstats with Coins and Wins, but the values are not appearing on the leaderboard."
          },
          {
            "type": "code",
            "language": "text",
            "code": "Create a LocalScript for a shop button inside StarterGui. When the player clicks the button, it should fire a RemoteEvent named BuyItemEvent in ReplicatedStorage."
          },
          {
            "type": "code",
            "language": "text",
            "code": "Explain this error and show me how to fix it: [PASTE ERROR HERE]. The script is a LocalScript inside StarterGui."
          }
        ]
      }
    ]
  },
  {
    "slug": "understanding-script-types",
    "path": "/docs/understanding-script-types",
    "navTitle": "Script Types",
    "title": "Understanding Script Types",
    "metaTitle": "Understanding Script Types | NexusRBX AI Docs",
    "description": "Choose between ServerScripts, LocalScripts, and ModuleScripts before asking NexusRBX AI to generate Roblox code.",
    "category": "create",
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "status": "Reference",
    "primaryAction": {
      "label": "Open script generator",
      "href": "/roblox-script-generator"
    },
    "secondaryAction": {
      "label": "Review generated code",
      "href": "/docs/reviewing-and-inserting-generated-code"
    },
    "sections": [
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page explains the main Roblox script types in beginner-friendly terms."
          }
        ]
      },
      {
        "id": "serverscript",
        "title": "ServerScript",
        "blocks": [
          {
            "type": "paragraph",
            "text": "ServerScripts run on the Roblox server. They are used for game logic that should be trusted and shared across players."
          },
          {
            "type": "paragraph",
            "text": "Use ServerScripts for:"
          },
          {
            "type": "list",
            "items": [
              "leaderstats.",
              "rewards.",
              "DataStore saving.",
              "server-side combat rules.",
              "secure shop checks.",
              "RemoteEvent handlers."
            ]
          },
          {
            "type": "paragraph",
            "text": "Common locations:"
          },
          {
            "type": "list",
            "items": [
              "ServerScriptService.",
              "Workspace for specific objects when appropriate."
            ]
          },
          {
            "type": "paragraph",
            "text": "Example prompt:"
          },
          {
            "type": "code",
            "language": "text",
            "code": "Create a ServerScript for ServerScriptService that creates leaderstats with Coins and Wins when a player joins."
          }
        ]
      },
      {
        "id": "localscript",
        "title": "LocalScript",
        "blocks": [
          {
            "type": "paragraph",
            "text": "LocalScripts run for an individual player. They are used for player-specific behavior such as UI, camera, input, and local effects."
          },
          {
            "type": "paragraph",
            "text": "Use LocalScripts for:"
          },
          {
            "type": "list",
            "items": [
              "UI buttons.",
              "player input.",
              "camera effects.",
              "local animations and effects.",
              "client-side RemoteEvent requests."
            ]
          },
          {
            "type": "paragraph",
            "text": "Common locations:"
          },
          {
            "type": "list",
            "items": [
              "StarterPlayerScripts.",
              "StarterGui.",
              "StarterCharacterScripts.",
              "Tools."
            ]
          },
          {
            "type": "paragraph",
            "text": "Example prompt:"
          },
          {
            "type": "code",
            "language": "text",
            "code": "Create a LocalScript inside StarterGui that opens ShopFrame when OpenShopButton is clicked."
          }
        ]
      },
      {
        "id": "modulescript",
        "title": "ModuleScript",
        "blocks": [
          {
            "type": "paragraph",
            "text": "ModuleScripts store reusable code that other scripts can require."
          },
          {
            "type": "paragraph",
            "text": "Use ModuleScripts for:"
          },
          {
            "type": "list",
            "items": [
              "shared configuration.",
              "reusable functions.",
              "item data.",
              "ability definitions.",
              "utility code used by multiple scripts."
            ]
          },
          {
            "type": "paragraph",
            "text": "Common locations:"
          },
          {
            "type": "list",
            "items": [
              "ReplicatedStorage for shared client/server modules.",
              "ServerScriptService for server-only modules."
            ]
          },
          {
            "type": "paragraph",
            "text": "Example prompt:"
          },
          {
            "type": "code",
            "language": "text",
            "code": "Create a ModuleScript named ItemConfig in ReplicatedStorage that stores item prices and display names. Also show how a ServerScript can require it."
          }
        ]
      },
      {
        "id": "quick-comparison",
        "title": "Quick Comparison",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Script type",
              "Runs where",
              "Best for",
              "Common mistake"
            ],
            "rows": [
              [
                "ServerScript",
                "Server",
                "Secure game logic and shared systems",
                "Trying to control player UI directly."
              ],
              [
                "LocalScript",
                "Player client",
                "UI, input, camera, local effects",
                "Placing it somewhere it will not run."
              ],
              [
                "ModuleScript",
                "Required by other scripts",
                "Reusable code and data",
                "Expecting it to run by itself."
              ]
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "common-use-cases",
    "path": "/docs/common-use-cases",
    "navTitle": "Use Cases",
    "title": "Common Use Cases",
    "metaTitle": "Common Use Cases | NexusRBX AI Docs",
    "description": "Prompt patterns for sprint systems, leaderstats, shops, UI buttons, tools, RemoteEvents, NPCs, debugging, and feature plans.",
    "category": "create",
    "updated": DOC_UPDATED,
    "readingTime": "4 min read",
    "status": "Examples",
    "primaryAction": {
      "label": "Open script generator",
      "href": "/roblox-script-generator"
    },
    "secondaryAction": {
      "label": "Understand script types",
      "href": "/docs/understanding-script-types"
    },
    "sections": [
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page gives practical prompt patterns for common Roblox scripting tasks."
          }
        ]
      },
      {
        "id": "sprint-system",
        "title": "Sprint System",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Field",
              "Guidance"
            ],
            "rows": [
              [
                "What to ask",
                "Create a sprint system with keybind, speed change, and stamina."
              ],
              [
                "Context to include",
                "LocalScript, StarterPlayerScripts, speed values, keybind, stamina rules."
              ],
              [
                "Example prompt",
                "\"Create a LocalScript for StarterPlayerScripts. Holding LeftShift should increase WalkSpeed from 16 to 24. Add stamina that drains while sprinting and regenerates when not sprinting.\""
              ],
              [
                "Check after generation",
                "Character movement, stamina limits, mobile support needs, Output errors."
              ]
            ]
          }
        ]
      },
      {
        "id": "leaderstats",
        "title": "Leaderstats",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Field",
              "Guidance"
            ],
            "rows": [
              [
                "What to ask",
                "Create leaderboard values for players."
              ],
              [
                "Context to include",
                "ServerScript, ServerScriptService, value names, starting values."
              ],
              [
                "Example prompt",
                "\"Create a ServerScript for ServerScriptService that creates leaderstats with Coins and Wins when a player joins. Both values should start at 0.\""
              ],
              [
                "Check after generation",
                "Player list values, server placement, no duplicate leaderstats."
              ]
            ]
          }
        ]
      },
      {
        "id": "shop-button",
        "title": "Shop Button",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Field",
              "Guidance"
            ],
            "rows": [
              [
                "What to ask",
                "Connect a UI button to a purchase request."
              ],
              [
                "Context to include",
                "LocalScript location, button name, RemoteEvent name, server validation needs."
              ],
              [
                "Example prompt",
                "\"Create a LocalScript for a shop button inside StarterGui. When clicked, it fires a RemoteEvent named BuyItemEvent in ReplicatedStorage with the item id Sword01.\""
              ],
              [
                "Check after generation",
                "Button path, RemoteEvent exists, server validates the purchase."
              ]
            ]
          }
        ]
      },
      {
        "id": "ui-open-and-close-button",
        "title": "UI Open And Close Button",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Field",
              "Guidance"
            ],
            "rows": [
              [
                "What to ask",
                "Toggle a Frame when buttons are clicked."
              ],
              [
                "Context to include",
                "ScreenGui name, button names, frame name."
              ],
              [
                "Example prompt",
                "\"Create a LocalScript inside StarterGui for a ScreenGui named ShopGui. Clicking OpenShopButton should show ShopFrame, and clicking CloseButton should hide it.\""
              ],
              [
                "Check after generation",
                "UI object names, frame visibility, script location."
              ]
            ]
          }
        ]
      },
      {
        "id": "tool-script",
        "title": "Tool Script",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Field",
              "Guidance"
            ],
            "rows": [
              [
                "What to ask",
                "Add behavior when a player uses a Tool."
              ],
              [
                "Context to include",
                "Tool name, Script or LocalScript, activated behavior, RemoteEvent if needed."
              ],
              [
                "Example prompt",
                "\"Create a Script for a Tool named SpeedPotion. When activated, it increases the player's WalkSpeed for 10 seconds, then returns it to normal.\""
              ],
              [
                "Check after generation",
                "Tool placement, cooldown needs, exploit-sensitive logic."
              ]
            ]
          }
        ]
      },
      {
        "id": "remoteevent-connection",
        "title": "RemoteEvent Connection",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Field",
              "Guidance"
            ],
            "rows": [
              [
                "What to ask",
                "Connect client UI to secure server logic."
              ],
              [
                "Context to include",
                "RemoteEvent name, ReplicatedStorage location, client action, server validation."
              ],
              [
                "Example prompt",
                "\"Show me a LocalScript and ServerScript that use a RemoteEvent named ClaimRewardEvent in ReplicatedStorage. The client asks to claim a reward, and the server checks whether the player can receive it.\""
              ],
              [
                "Check after generation",
                "Server validates rewards, no trusting client-only values."
              ]
            ]
          }
        ]
      },
      {
        "id": "npc-interaction",
        "title": "NPC Interaction",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Field",
              "Guidance"
            ],
            "rows": [
              [
                "What to ask",
                "Add prompt or click interaction for an NPC."
              ],
              [
                "Context to include",
                "NPC model name, ProximityPrompt or ClickDetector, desired action."
              ],
              [
                "Example prompt",
                "\"Create a ServerScript for an NPC named QuestGiver. When a player triggers a ProximityPrompt, print the player's name and show where to add quest logic later.\""
              ],
              [
                "Check after generation",
                "Prompt location, NPC object path, multiplayer behavior."
              ]
            ]
          }
        ]
      },
      {
        "id": "debugging-an-error-message",
        "title": "Debugging An Error Message",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Field",
              "Guidance"
            ],
            "rows": [
              [
                "What to ask",
                "Explain and fix a Studio Output error."
              ],
              [
                "Context to include",
                "Full error, script type, script location, current code."
              ],
              [
                "Example prompt",
                "\"Explain this error and show me how to fix it: [PASTE ERROR HERE]. The script is a LocalScript inside StarterGui.\""
              ],
              [
                "Check after generation",
                "Fix matches line number, no unrelated rewrite, Play mode passes."
              ]
            ]
          }
        ]
      },
      {
        "id": "explaining-an-existing-script",
        "title": "Explaining An Existing Script",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Field",
              "Guidance"
            ],
            "rows": [
              [
                "What to ask",
                "Explain what the script does and what objects it needs."
              ],
              [
                "Context to include",
                "Script type, location, code."
              ],
              [
                "Example prompt",
                "\"Explain this script for a beginner. Tell me what each section does, what objects it expects, and what could break.\""
              ],
              [
                "Check after generation",
                "Explanation matches the code and helps you edit safely."
              ]
            ]
          }
        ]
      },
      {
        "id": "turning-rough-game-ideas-into-script-plans",
        "title": "Turning Rough Game Ideas Into Script Plans",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Field",
              "Guidance"
            ],
            "rows": [
              [
                "What to ask",
                "Break an idea into scripts, UI, objects, and testing steps."
              ],
              [
                "Context to include",
                "Game genre, main loop, player actions, data needs."
              ],
              [
                "Example prompt",
                "\"Turn this idea into a Roblox scripting plan: a round-based obby where players race for coins. Include scripts, RemoteEvents, UI, and testing steps.\""
              ],
              [
                "Check after generation",
                "Plan is realistic, split into steps, and avoids claiming the full game is finished."
              ]
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "debugging-guide",
    "path": "/docs/debugging-guide",
    "navTitle": "Debugging Guide",
    "title": "Debugging Guide",
    "metaTitle": "Debugging Guide | NexusRBX AI Docs",
    "description": "Use exact Output errors, clear reproduction steps, and one-change-at-a-time testing to debug Roblox scripts with NexusRBX AI.",
    "category": "debug",
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "status": "Debug guide",
    "primaryAction": {
      "label": "Open AI scripter",
      "href": "/roblox-ai-scripter"
    },
    "secondaryAction": {
      "label": "Troubleshooting",
      "href": "/docs/troubleshooting"
    },
    "sections": [
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page explains how to use NexusRBX AI to understand and fix Roblox script problems."
          }
        ]
      },
      {
        "id": "start-with-the-exact-error",
        "title": "Start With The Exact Error",
        "blocks": [
          {
            "type": "paragraph",
            "text": "When Roblox Studio shows an error, copy the full line from the Output window."
          },
          {
            "type": "paragraph",
            "text": "Include:"
          },
          {
            "type": "list",
            "items": [
              "The error message.",
              "The script name.",
              "The line number.",
              "The script type.",
              "Where the script is located.",
              "What should happen.",
              "What actually happens."
            ]
          }
        ]
      },
      {
        "id": "debug-prompt-template",
        "title": "Debug Prompt Template",
        "blocks": [
          {
            "type": "code",
            "language": "text",
            "code": "Debug this [ServerScript/LocalScript/ModuleScript]. It is inside [location]. It should [expected behavior], but [actual behavior]. The Output window says: [PASTE ERROR HERE]. Explain the cause and show the smallest safe fix."
          }
        ]
      },
      {
        "id": "test-one-fix-at-a-time",
        "title": "Test One Fix At A Time",
        "blocks": [
          {
            "type": "steps",
            "items": [
              {
                "title": "Change one thing",
                "body": "Change one thing."
              },
              {
                "title": "Run Play mode",
                "body": "Run Play mode."
              },
              {
                "title": "Check Output",
                "body": "Check Output."
              },
              {
                "title": "Confirm whether the behavior changed",
                "body": "Confirm whether the behavior changed."
              },
              {
                "title": "Save the working version before making another change",
                "body": "Save the working version before making another change."
              }
            ]
          },
          {
            "type": "paragraph",
            "text": "Testing one fix at a time makes it easier to know what solved the problem."
          }
        ]
      },
      {
        "id": "common-roblox-debugging-issues",
        "title": "Common Roblox Debugging Issues",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Issue",
              "What it usually means",
              "What to check"
            ],
            "rows": [
              [
                "Object not found",
                "The script path or object name is wrong.",
                "Explorer names, capitalization, and WaitForChild usage."
              ],
              [
                "Wrong script type",
                "The script is running in the wrong environment.",
                "ServerScript versus LocalScript."
              ],
              [
                "RemoteEvent missing",
                "The code expects a RemoteEvent that does not exist.",
                "ReplicatedStorage and exact object names."
              ],
              [
                "LocalScript will not run",
                "LocalScripts only run from certain locations.",
                "StarterPlayerScripts, StarterGui, StarterCharacterScripts, tools, or player-owned containers."
              ],
              [
                "Server/client mismatch",
                "Client code is trying to do server work, or the reverse.",
                "Move secure logic to the server and use RemoteEvents carefully."
              ],
              [
                "Misspelled object names",
                "Roblox paths are case-sensitive.",
                "Compare every name in code with Explorer."
              ],
              [
                "Code runs before objects load",
                "The script starts before objects exist.",
                "Use WaitForChild where appropriate."
              ]
            ]
          }
        ]
      },
      {
        "id": "ask-for-an-explanation",
        "title": "Ask For An Explanation",
        "blocks": [
          {
            "type": "paragraph",
            "text": "If you do not understand the fix, ask:"
          },
          {
            "type": "code",
            "language": "text",
            "code": "Explain why this fix works in beginner-friendly language. Also explain what I should test in Roblox Studio."
          },
          {
            "type": "paragraph",
            "text": "Understanding the fix helps you avoid the same issue later."
          }
        ]
      }
    ]
  },
  {
    "slug": "troubleshooting",
    "path": "/docs/troubleshooting",
    "navTitle": "Troubleshooting",
    "title": "Troubleshooting",
    "metaTitle": "Troubleshooting | NexusRBX AI Docs",
    "description": "Fix common NexusRBX AI plugin, account, connection, generated-code, and update problems.",
    "category": "debug",
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "status": "Support guide",
    "primaryAction": {
      "label": "Contact support",
      "href": "/contact"
    },
    "secondaryAction": {
      "label": "Debugging guide",
      "href": "/docs/debugging-guide"
    },
    "sections": [
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page lists common NexusRBX AI problems, possible causes, and practical fixes."
          },
          {
            "type": "table",
            "columns": [
              "Problem",
              "Possible Cause",
              "Fix"
            ],
            "rows": [
              [
                "Plugin does not appear in Roblox Studio",
                "Studio was open during install, wrong account, or plugin disabled.",
                "Restart Studio, confirm the same Roblox account installed it, and check plugin management."
              ],
              [
                "Plugin opens but does not load",
                "Network issue, temporary service issue, outdated plugin, or blocked sign-in flow.",
                "Reopen the plugin, check internet connection, update the plugin, and try again later."
              ],
              [
                "User cannot sign in",
                "Account flow is incomplete or browser/plugin sign-in failed.",
                "Confirm the sign-in method: sign in through the NexusRBX AI workspace. Retry in the plugin or web app."
              ],
              [
                "Studio does not connect to NexusRBX",
                "Pairing code expired, wrong account, or Studio session not active.",
                "Reopen the plugin, generate a new pairing flow if needed, and confirm both sides use the same account."
              ],
              [
                "Generated script has errors",
                "Prompt missed object names, script type, or placement details.",
                "Paste the exact Output error and ask NexusRBX AI to debug it."
              ],
              [
                "Script does not run",
                "Wrong script type or wrong location.",
                "Check whether it should be a ServerScript, LocalScript, or ModuleScript."
              ],
              [
                "RemoteEvent is not found",
                "The RemoteEvent does not exist or has a different name.",
                "Create the RemoteEvent in ReplicatedStorage or update the script to match the real name."
              ],
              [
                "UI button does nothing",
                "LocalScript path, button name, or event connection is wrong.",
                "Confirm the LocalScript is under StarterGui or another valid local location and object names match."
              ],
              [
                "Leaderstats do not appear",
                "Script is not server-side or leaderstats folder is incorrect.",
                "Use a ServerScript in ServerScriptService and check Output for errors."
              ],
              [
                "AI response is too vague",
                "Prompt did not include enough context.",
                "Include script type, location, object names, expected behavior, and current error."
              ],
              [
                "AI generates code for the wrong script type",
                "Prompt did not specify ServerScript, LocalScript, or ModuleScript.",
                "Ask for the exact script type and explain where it will be placed."
              ],
              [
                "Plugin is outdated",
                "Creator Store version is older than current service behavior.",
                "Update or reinstall the plugin from the Creator Store."
              ],
              [
                "User needs to reinstall or update plugin",
                "Local install is broken or outdated.",
                "Remove the plugin from Studio plugin management, reinstall from the official Roblox Creator Store listing when available, then restart Studio."
              ]
            ]
          }
        ]
      },
      {
        "id": "what-to-send-support",
        "title": "What To Send Support",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Include:"
          },
          {
            "type": "list",
            "items": [
              "Roblox username.",
              "Plugin version: the plugin panel or the installed plugin details in Roblox Studio.",
              "Roblox Studio version.",
              "Exact error message.",
              "Screenshot or video.",
              "Steps to reproduce."
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "safety-permissions-privacy",
    "path": "/docs/safety-permissions-privacy",
    "navTitle": "Safety & Privacy",
    "title": "Safety, Permissions, and Privacy",
    "metaTitle": "Safety, Permissions, and Privacy | NexusRBX AI Docs",
    "description": "Understand what NexusRBX AI may inspect, how review gates work, what not to paste into prompts, and where to find privacy terms.",
    "category": "support",
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "status": "Trust guide",
    "primaryAction": {
      "label": "Read privacy notice",
      "href": "/legal/privacy"
    },
    "secondaryAction": {
      "label": "Contact support",
      "href": "/contact"
    },
    "sections": [
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page explains how users should think about safety, permissions, privacy, and generated code review. ## Beta Safety Notice"
          },
          {
            "type": "paragraph",
            "text": "NexusRBX AI is currently in beta. Generated code should be reviewed and tested before it is used in a live Roblox game."
          },
          {
            "type": "paragraph",
            "text": "The plugin can speed up development, but it does not replace developer judgment."
          }
        ]
      },
      {
        "id": "what-nexusrbx-ai-needs-access-to",
        "title": "What NexusRBX AI Needs Access To",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Area",
              "Details"
            ],
            "rows": [
              [
                "Roblox Studio plugin access",
                "The plugin can inspect targeted Studio hierarchy and scripts for the current task, and can apply reviewed changes through supported commands."
              ],
              [
                "NexusRBX account",
                "A NexusRBX account is required for authenticated AI workspace features and Studio pairing."
              ],
              [
                "Script content",
                "Script content can be sent to NexusRBX services when needed to generate, review, debug, or edit code."
              ],
              [
                "Prompts",
                "Prompts may be processed and retained according to the Privacy Policy and account settings."
              ],
              [
                "Project data",
                "Only task-relevant project context should be shared; retention is governed by the Privacy Policy."
              ],
              [
                "Billing",
                "Billing details are shown in the NexusRBX account or checkout flow when billing is available."
              ]
            ]
          }
        ]
      },
      {
        "id": "user-review-before-changes",
        "title": "User Review Before Changes",
        "blocks": [
          {
            "type": "paragraph",
            "text": "NexusRBX AI should clearly show when the user needs to approve generated code before it is inserted or applied."
          },
          {
            "type": "paragraph",
            "text": "Before approving code, users should check:"
          },
          {
            "type": "list",
            "items": [
              "What script will be created or changed.",
              "Where the script will go.",
              "Whether the script type is correct.",
              "Whether object names match the project.",
              "Whether the code affects important systems."
            ]
          }
        ]
      },
      {
        "id": "what-is-not-automatically-changed",
        "title": "What Is Not Automatically Changed",
        "blocks": [
          {
            "type": "list",
            "items": [
              "The plugin should not publish your experience or silently rewrite unrelated scripts.",
              "Insertion should happen through explicit review or confirmation in the supported workflow.",
              "Existing scripts should be edited only when the action targets that script and the user reviews or confirms the change.",
              "Destructive changes should be confirmed, blocked, or snapshotted depending on the supported command."
            ]
          }
        ]
      },
      {
        "id": "privacy-and-data-handling",
        "title": "Privacy And Data Handling",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Privacy Policy: /legal/privacy",
              "Terms of Service: /legal/terms",
              "Support contact: support@nexusrbx.com",
              "Data retention: See the Privacy Policy for prompt, script, and project data retention.",
              "Account deletion: Use /contact or support@nexusrbx.com for account deletion or data requests."
            ]
          },
          {
            "type": "paragraph",
            "text": "Do not paste secrets, private API keys, Roblox account credentials, billing details, or personal information into prompts."
          }
        ]
      },
      {
        "id": "report-suspicious-behavior-or-bugs",
        "title": "Report Suspicious Behavior Or Bugs",
        "blocks": [
          {
            "type": "paragraph",
            "text": "If the plugin inserts unexpected code, shows a suspicious permission request, or behaves differently from the documentation:"
          },
          {
            "type": "steps",
            "items": [
              {
                "title": "Stop using the affected workflow",
                "body": "Stop using the affected workflow."
              },
              {
                "title": "Save a copy of the script or error message",
                "body": "Save a copy of the script or error message."
              },
              {
                "title": "Take a screenshot or short video if possible",
                "body": "Take a screenshot or short video if possible."
              },
              {
                "title": "Report the issue through /contact or support@nexusrbx.com",
                "body": "Report the issue through /contact or support@nexusrbx.com."
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "faq",
    "path": "/docs/faq",
    "navTitle": "FAQ",
    "title": "Frequently Asked Questions",
    "metaTitle": "Frequently Asked Questions | NexusRBX AI Docs",
    "description": "Answers about beta status, billing, learning Luau, full-game generation, existing projects, script types, debugging, prompts, and support.",
    "category": "support",
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "status": "Reference",
    "primaryAction": {
      "label": "Open NexusRBX AI",
      "href": "/ai"
    },
    "secondaryAction": {
      "label": "Contact support",
      "href": "/contact"
    },
    "sections": [
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page answers common questions about NexusRBX AI."
          }
        ]
      },
      {
        "id": "is-nexusrbx-ai-free",
        "title": "Is NexusRBX AI free?",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Billing details are shown in the NexusRBX account or checkout flow when billing is available."
          },
          {
            "type": "paragraph",
            "text": "If there is a free beta, trial, subscription, credit limit, or paid plan, explain it here."
          }
        ]
      },
      {
        "id": "is-nexusrbx-ai-still-in-beta",
        "title": "Is NexusRBX AI still in beta?",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Yes. NexusRBX AI is currently in beta. Features, UI labels, connection steps, and generated suggestions may change."
          }
        ]
      },
      {
        "id": "does-nexusrbx-ai-replace-learning-luau",
        "title": "Does NexusRBX AI replace learning Luau?",
        "blocks": [
          {
            "type": "paragraph",
            "text": "No. NexusRBX AI helps you generate starting points, understand scripts, and debug issues, but learning Luau is still important. You should understand and test code before publishing it."
          }
        ]
      },
      {
        "id": "can-nexusrbx-ai-make-a-full-game",
        "title": "Can NexusRBX AI make a full game?",
        "blocks": [
          {
            "type": "paragraph",
            "text": "NexusRBX AI can help plan and generate parts of a Roblox game, such as scripts, UI logic, debugging help, and feature starting points. It does not guarantee a complete, polished, production-ready game automatically."
          }
        ]
      },
      {
        "id": "can-i-use-it-with-existing-roblox-games",
        "title": "Can I use it with existing Roblox games?",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Yes, if your workflow supports opening the existing place in Roblox Studio and using the plugin there. Review any generated code carefully before inserting it into an existing project."
          }
        ]
      },
      {
        "id": "does-it-work-with-serverscripts-localscripts-and-modulescripts",
        "title": "Does it work with ServerScripts, LocalScripts, and ModuleScripts?",
        "blocks": [
          {
            "type": "paragraph",
            "text": "NexusRBX AI can help explain and generate suggestions for ServerScripts, LocalScripts, and ModuleScripts. Include the script type and placement in your prompt for better results."
          }
        ]
      },
      {
        "id": "why-does-generated-code-sometimes-have-errors",
        "title": "Why does generated code sometimes have errors?",
        "blocks": [
          {
            "type": "paragraph",
            "text": "AI suggestions may not know your exact object names, hierarchy, script location, or existing systems. Roblox projects are specific, so generated code often needs review, edits, and testing."
          }
        ]
      },
      {
        "id": "should-i-test-code-before-publishing",
        "title": "Should I test code before publishing?",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Yes. Always test generated scripts in Roblox Studio Play mode before publishing your game."
          }
        ]
      },
      {
        "id": "can-nexusrbx-ai-debug-my-script",
        "title": "Can NexusRBX AI debug my script?",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Yes. Paste the script, the exact Output error, the script type, and where the script is located. Ask for the cause and the smallest safe fix."
          }
        ]
      },
      {
        "id": "what-should-i-include-in-a-good-prompt",
        "title": "What should I include in a good prompt?",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Include what you want, where the script goes, script type, object names, expected behavior, actual behavior, and any error messages."
          }
        ]
      },
      {
        "id": "how-do-i-report-a-bug",
        "title": "How do I report a bug?",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Use /contact or support@nexusrbx.com."
          },
          {
            "type": "paragraph",
            "text": "Include your Roblox username, plugin version, Studio version, what happened, what you expected, and steps to reproduce."
          }
        ]
      },
      {
        "id": "where-can-i-get-support",
        "title": "Where can I get support?",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Email: support@nexusrbx.com",
              "Website: https://www.nexusrbx.com",
              "Support form: /contact"
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "changelog",
    "path": "/docs/changelog",
    "navTitle": "Changelog",
    "title": "Changelog and Release Notes",
    "metaTitle": "Changelog and Release Notes | NexusRBX AI Docs",
    "description": "A readable release-note format for NexusRBX AI updates, known issues, fixes, and beta changes.",
    "category": "support",
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "status": "Release guide",
    "primaryAction": {
      "label": "Open NexusRBX AI",
      "href": "/ai"
    },
    "secondaryAction": {
      "label": "Contact support",
      "href": "/contact"
    },
    "sections": [
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page provides a consistent format for NexusRBX AI release notes."
          },
          {
            "type": "paragraph",
            "text": "Use one entry per release. Keep notes specific, clear, and honest about known issues."
          }
        ]
      },
      {
        "id": "added",
        "title": "Added",
        "blocks": [
          {
            "type": "list",
            "items": [
              "[New feature]"
            ]
          }
        ]
      },
      {
        "id": "changed",
        "title": "Changed",
        "blocks": [
          {
            "type": "list",
            "items": [
              "[Updated behavior]"
            ]
          }
        ]
      },
      {
        "id": "fixed",
        "title": "Fixed",
        "blocks": [
          {
            "type": "list",
            "items": [
              "[Bug fix]"
            ]
          }
        ]
      },
      {
        "id": "known-issues",
        "title": "Known Issues",
        "blocks": [
          {
            "type": "list",
            "items": [
              "[Known issue]"
            ]
          }
        ]
      },
      {
        "id": "added-2",
        "title": "Added",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Added [feature name]."
            ]
          }
        ]
      },
      {
        "id": "changed-2",
        "title": "Changed",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Updated [workflow or UI area] to make setup clearer."
            ]
          }
        ]
      },
      {
        "id": "fixed-2",
        "title": "Fixed",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Fixed [bug description]."
            ]
          }
        ]
      },
      {
        "id": "known-issues-2",
        "title": "Known Issues",
        "blocks": [
          {
            "type": "list",
            "items": [
              "[Known issue and workaround]."
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "support-and-bug-reports",
    "path": "/docs/support-and-bug-reports",
    "navTitle": "Support & Bug Reports",
    "title": "Support and Bug Reports",
    "metaTitle": "Support and Bug Reports | NexusRBX AI Docs",
    "description": "Send useful bug reports and feature requests with environment details, reproduction steps, expected behavior, and screenshots.",
    "category": "support",
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "status": "Support guide",
    "primaryAction": {
      "label": "Contact support",
      "href": "/contact"
    },
    "secondaryAction": {
      "label": "Read troubleshooting",
      "href": "/docs/troubleshooting"
    },
    "sections": [
      {
        "id": "guide",
        "title": "Guide",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page explains how users can report bugs, request features, and get help with NexusRBX AI."
          }
        ]
      },
      {
        "id": "support-channels",
        "title": "Support Channels",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Use the official channels below:"
          },
          {
            "type": "list",
            "items": [
              "Email: support@nexusrbx.com",
              "Website: https://www.nexusrbx.com",
              "Support form: /contact"
            ]
          }
        ]
      },
      {
        "id": "before-reporting-a-bug",
        "title": "Before Reporting A Bug",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Try these steps first:"
          },
          {
            "type": "steps",
            "items": [
              {
                "title": "Restart Roblox Studio",
                "body": "Restart Roblox Studio."
              },
              {
                "title": "Reopen NexusRBX AI",
                "body": "Reopen NexusRBX AI."
              },
              {
                "title": "Check whether the plugin needs an update",
                "body": "Check whether the plugin needs an update."
              },
              {
                "title": "Copy the exact error message",
                "body": "Copy the exact error message."
              },
              {
                "title": "Test whether the problem happens in a new baseplate",
                "body": "Test whether the problem happens in a new baseplate."
              }
            ]
          }
        ]
      },
      {
        "id": "bug-report-template",
        "title": "Bug Report Template",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Roblox username:",
              "Plugin version:",
              "Roblox Studio version:",
              "What were you trying to do?",
              "What happened?",
              "What did you expect to happen?",
              "Error message:",
              "Screenshot or video:",
              "Steps to reproduce:"
            ]
          }
        ]
      },
      {
        "id": "example-bug-report",
        "title": "Example Bug Report",
        "blocks": [
          {
            "type": "code",
            "language": "text",
            "code": "Roblox username: [Your username]\nPlugin version: [Plugin version]\nRoblox Studio version: [Studio version]\nWhat were you trying to do? Generate and insert a LocalScript for a shop button.\nWhat happened? The plugin showed an error after I clicked insert.\nWhat did you expect to happen? The script should be inserted into StarterGui.\nError message: [Paste exact error]\nScreenshot or video: [Attach if available]\nSteps to reproduce:\n1. Open Studio.\n2. Open NexusRBX AI.\n3. Ask for a shop button LocalScript.\n4. Click insert."
          }
        ]
      },
      {
        "id": "feature-request-template",
        "title": "Feature Request Template",
        "blocks": [
          {
            "type": "list",
            "items": [
              "Feature name:",
              "What problem would this solve?",
              "Who would use it?",
              "Example workflow:",
              "Why is the current workflow difficult?",
              "Any screenshots or examples:"
            ]
          }
        ]
      },
      {
        "id": "reporting-generated-code-issues",
        "title": "Reporting Generated Code Issues",
        "blocks": [
          {
            "type": "paragraph",
            "text": "If generated code does not work, include:"
          },
          {
            "type": "list",
            "items": [
              "The original prompt.",
              "The generated code.",
              "The script type.",
              "The script location.",
              "The Output error.",
              "What you expected to happen.",
              "What actually happened."
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "script-generation",
    "path": "/docs/script-generation",
    "navTitle": "Script Generation",
    "title": "Script Generation",
    "description": "Use the current NexusRBX AI script-generation guides for first scripts, stronger prompts, script types, and common Luau use cases.",
    "category": "create",
    "status": "Compatibility guide",
    "primaryAction": {
      "label": "Open script generator",
      "href": "/roblox-script-generator"
    },
    "secondaryAction": {
      "label": "Generate first script",
      "href": "/docs/generating-your-first-script"
    },
    "sections": [
      {
        "id": "where-to-start",
        "title": "Where to start",
        "blocks": [
          {
            "type": "paragraph",
            "text": "This page keeps the older script-generation docs URL working while pointing to the newer, more detailed NexusRBX AI guides."
          },
          {
            "type": "cards",
            "items": [
              {
                "title": "Generate your first script",
                "body": "Start with a small, safe Roblox Luau script and test it in Play mode.",
                "href": "/docs/generating-your-first-script"
              },
              {
                "title": "Prompting guide",
                "body": "Add script type, placement, object names, expected behavior, and error text for better output.",
                "href": "/docs/prompting-guide"
              },
              {
                "title": "Script types",
                "body": "Choose ServerScript, LocalScript, or ModuleScript before generation.",
                "href": "/docs/understanding-script-types"
              }
            ]
          }
        ]
      },
      {
        "id": "quick-script-and-agent-build",
        "title": "Quick and Agent Build",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Mode",
              "Use it when",
              "Next guide"
            ],
            "rows": [
              [
                "Quick",
                "You need focused Luau with placement notes and setup steps.",
                "/docs/generating-your-first-script"
              ],
              [
                "Agent Build",
                "The task needs planning, debugging, Studio context, multiple files, or follow-up questions.",
                "/docs/basic-workflow"
              ]
            ]
          }
        ]
      }
    ],
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "metaTitle": "Script Generation | NexusRBX AI Docs"
  },
  {
    "slug": "ui-generation",
    "path": "/docs/ui-generation",
    "navTitle": "UI Generation",
    "title": "Roblox UI Generation",
    "description": "Plan ScreenGui behavior, LocalScript placement, RemoteEvent boundaries, and safe UI testing with NexusRBX AI.",
    "category": "create",
    "status": "Compatibility guide",
    "primaryAction": {
      "label": "Open GUI maker",
      "href": "/roblox-gui-maker"
    },
    "secondaryAction": {
      "label": "View prompt patterns",
      "href": "/docs/common-use-cases"
    },
    "sections": [
      {
        "id": "ui-workflow",
        "title": "UI workflow",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Use NexusRBX AI to draft ScreenGui LocalScripts, button behavior, menu toggles, shop flows, HUD updates, and RemoteEvent connections. Describe the visible UI objects and where they live before asking for code."
          },
          {
            "type": "list",
            "style": "checks",
            "items": [
              "Name the ScreenGui, Frame, Button, TextLabel, or other objects involved.",
              "Say whether the UI is created manually in Studio or generated by code.",
              "Keep client-only display logic in LocalScripts and validate purchases or rewards on the server.",
              "Test UI behavior at multiple screen sizes before publishing."
            ]
          }
        ]
      },
      {
        "id": "related-guides",
        "title": "Related guides",
        "blocks": [
          {
            "type": "cards",
            "items": [
              {
                "title": "Common use cases",
                "body": "Includes shop button and UI open/close prompt patterns.",
                "href": "/docs/common-use-cases"
              },
              {
                "title": "Script types",
                "body": "Explains when UI logic belongs in a LocalScript.",
                "href": "/docs/understanding-script-types"
              },
              {
                "title": "Review and insert",
                "body": "Check object names and placement before using generated UI code.",
                "href": "/docs/reviewing-and-inserting-generated-code"
              }
            ]
          }
        ]
      }
    ],
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "metaTitle": "Roblox UI Generation | NexusRBX AI Docs"
  },
  {
    "slug": "assets",
    "path": "/docs/assets",
    "navTitle": "Assets",
    "title": "Assets and Generated Content",
    "description": "Use NexusRBX AI output as a reviewed development aid for scripts, UI behavior, and asset-related workflow planning.",
    "category": "create",
    "status": "Compatibility guide",
    "primaryAction": {
      "label": "Open NexusRBX AI",
      "href": "/ai"
    },
    "secondaryAction": {
      "label": "Read safety guide",
      "href": "/docs/safety-permissions-privacy"
    },
    "sections": [
      {
        "id": "asset-workflow",
        "title": "Asset workflow",
        "blocks": [
          {
            "type": "paragraph",
            "text": "For asset-adjacent tasks, use NexusRBX AI to plan folders, references, UI usage, scripts, and testing steps. Confirm generated names, IDs, permissions, and moderation-sensitive content before using anything in a live experience."
          },
          {
            "type": "callout",
            "tone": "warning",
            "title": "Review before publishing",
            "text": "Generated suggestions are development aids. Always check ownership, licensing, object names, Roblox policy requirements, and in-game behavior before publishing."
          }
        ]
      },
      {
        "id": "related-guides",
        "title": "Related guides",
        "blocks": [
          {
            "type": "cards",
            "items": [
              {
                "title": "Prompting guide",
                "body": "Describe the desired behavior, object placement, and constraints clearly.",
                "href": "/docs/prompting-guide"
              },
              {
                "title": "Safety and privacy",
                "body": "Understand review gates and sensitive information rules.",
                "href": "/docs/safety-permissions-privacy"
              },
              {
                "title": "Support",
                "body": "Report generated-content issues with screenshots and reproduction steps.",
                "href": "/docs/support-and-bug-reports"
              }
            ]
          }
        ]
      }
    ],
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "metaTitle": "Assets and Generated Content | NexusRBX AI Docs"
  },
  {
    "slug": "projects",
    "path": "/docs/projects",
    "navTitle": "Projects",
    "title": "Projects and Studio Context",
    "description": "Understand how NexusRBX AI should use targeted Studio context without sending full place source by default.",
    "category": "studio",
    "status": "Compatibility guide",
    "primaryAction": {
      "label": "Connect Studio",
      "href": "/docs/studio-plugin"
    },
    "secondaryAction": {
      "label": "Review insert workflow",
      "href": "/docs/reviewing-and-inserting-generated-code"
    },
    "sections": [
      {
        "id": "project-context",
        "title": "Project context",
        "blocks": [
          {
            "type": "paragraph",
            "text": "When a Studio-connected task needs project context, NexusRBX AI should start with a project manifest, search or targeted reads, and then request only the scripts or objects needed for the task."
          },
          {
            "type": "path",
            "title": "Context flow",
            "items": [
              "Pair the Studio plugin from the AI workspace.",
              "Inspect a project manifest instead of sending the full place by default.",
              "Read specific scripts or objects only when needed.",
              "Review proposed edits, target paths, and expected source hashes.",
              "Confirm the change and test it in Studio Play mode."
            ]
          }
        ]
      }
    ],
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "metaTitle": "Projects and Studio Context | NexusRBX AI Docs"
  },
  {
    "slug": "account",
    "path": "/docs/account",
    "navTitle": "Account",
    "title": "Account and Workspace Access",
    "description": "Sign in to use authenticated NexusRBX AI workspace features, saved context, and Studio pairing.",
    "category": "support",
    "status": "Compatibility guide",
    "primaryAction": {
      "label": "Open NexusRBX AI",
      "href": "/ai"
    },
    "secondaryAction": {
      "label": "Contact support",
      "href": "/contact"
    },
    "sections": [
      {
        "id": "account-requirements",
        "title": "Account requirements",
        "blocks": [
          {
            "type": "paragraph",
            "text": "A NexusRBX account is required for authenticated AI workspace features and Studio pairing. Public pages can explain and start a prompt, but account-owned generation and Studio workflows happen inside /ai."
          },
          {
            "type": "list",
            "style": "checks",
            "items": [
              "Use the sign-in flow shown in the NexusRBX AI workspace.",
              "Keep Roblox, billing, and account credentials out of prompts.",
              "Use /contact or support@nexusrbx.com for account deletion or data requests."
            ]
          }
        ]
      }
    ],
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "metaTitle": "Account and Workspace Access | NexusRBX AI Docs"
  },
  {
    "slug": "api",
    "path": "/docs/api",
    "navTitle": "API & Protocol",
    "title": "Studio Bridge API and Protocol",
    "description": "Reference the high-level Studio bridge behavior used by NexusRBX AI for manifests, targeted reads, reviewed writes, and structured errors.",
    "category": "studio",
    "status": "Compatibility guide",
    "primaryAction": {
      "label": "Connect Studio",
      "href": "/docs/studio-plugin"
    },
    "secondaryAction": {
      "label": "Read safety guide",
      "href": "/docs/safety-permissions-privacy"
    },
    "sections": [
      {
        "id": "protocol-guardrails",
        "title": "Protocol guardrails",
        "blocks": [
          {
            "type": "table",
            "columns": [
              "Capability",
              "Expected behavior"
            ],
            "rows": [
              [
                "Manifest",
                "Queue get_project_manifest before broad source inspection."
              ],
              [
                "Targeted reads",
                "Search the manifest or source, then read specific scripts."
              ],
              [
                "Known script edits",
                "Include expectedSourceHash so stale writes can be rejected."
              ],
              [
                "Destructive actions",
                "Snapshot first and return snapshot IDs in the acknowledgment."
              ],
              [
                "Unsupported actions",
                "Return structured errors rather than silent no-ops."
              ]
            ]
          }
        ]
      }
    ],
    "updated": DOC_UPDATED,
    "readingTime": "3 min read",
    "metaTitle": "Studio Bridge API and Protocol | NexusRBX AI Docs"
  }
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
