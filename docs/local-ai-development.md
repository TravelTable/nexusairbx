# Local AI, Studio plugin, and MCP development

This setup runs the NexusRBX website, API, and AI worker locally while using
the configured real AI Gateway, Roblox OAuth application, and hosted Firebase
project. It does not use Firebase emulators or mock AI responses.

## One-time Roblox OAuth setup

Keep the production callback and add this second redirect URL to the Roblox
OAuth application:

```text
http://localhost:5001/api/roblox/oauth/callback
```

The value must match exactly. The local launcher supplies the same value as
`ROBLOX_OAUTH_REDIRECT_URI` to the backend. Start OAuth from
`http://localhost:3000`; do not switch between `localhost` and `127.0.0.1`
during the flow because the OAuth state cookie is host-bound.

## Start the real local AI flow

The existing `backend/.env` must contain working Firebase service-account,
AI Gateway, and Roblox OAuth credentials. Then run from the repository root:

```powershell
npm run dev:local
```

Open `http://localhost:3000/ai`. Local development automatically signs in the
verified `local-dev@nexusrbx.test` developer identity through hosted Firebase.
The local backend starts its job worker, so AI artifact and Studio-agent jobs
are executed rather than remaining queued. That worker is restricted to the
local developer UID and global reconciliation/projection sweeps are disabled,
so it cannot claim another user's hosted production jobs.

The launcher also selects the canonical task runtime with its single local
legacy execution adapter. This is required for Agent requests to reach the live
Studio command runtime; the backend's safe default is legacy-only when these
flags are absent. The task outbox dispatcher remains disabled because it is a
global worker and is not needed by the local adapter path.

The launcher overrides runtime values only. It does not edit either `.env`
file or change production deployment configuration.

## Test the NexusRBX Studio plugin

Install a development build that points to the local API:

```powershell
npm run plugin:install:local
```

Restart Roblox Studio, allow HTTP requests when prompted, open the NexusRBX
plugin, and create a plugin pairing code from the local AI page. The installed
development copy uses `http://localhost:5001`; the checked-in release bundle
continues to use `https://api.nexusrbx.com`.

## Test Roblox Studio MCP

Enable Roblox Studio MCP and keep the intended place open. From the local AI
page choose **Connect Roblox Studio → Advanced → Roblox MCP** and create a
pairing code. In a second terminal run:

```powershell
npm run mcp:local
```

Enter the pairing code when prompted. The connector talks to the local API and
starts the official Studio MCP process on this computer.

## Production boundary

A local Git commit does not deploy. Production deployment should occur only
after changes are pushed or merged into `main`. The frontend and backend are
separate Git repositories, so their production deployments and commits remain
independent.
