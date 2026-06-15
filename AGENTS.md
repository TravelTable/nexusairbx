# NexusRBX Engineering Notes

## Repository Structure

- `src/`: React 18 frontend, AI workspace, Monaco editor, Studio controls, streaming clients.
- `roblox-plugin/`: Roblox Studio bridge plugin source.
- `backend/`: Node 22/Express backend, Firebase auth, OpenAI generation, Studio bridge, agent runs, artifacts, and SSE.
- `docs/`: shared contracts and implementation notes.

## Common Commands

- Frontend build: `npm run build`
- Frontend tests: `CI=true npm test -- --watchAll=false`
- Backend syntax/protocol tests: `cd backend && node --test src/lib/studioToolProtocol.test.js`
- Backend startup smoke: `cd backend && node --check server.js`

## Studio Bridge Conventions

- Studio commands are versioned through `backend/src/lib/studioToolProtocol.js`.
- Do not send the full place source to the model by default. Queue `get_project_manifest`, search the manifest/source, then read specific scripts.
- Writes must include `expectedSourceHash` when editing known Studio scripts.
- Destructive commands should snapshot first and return snapshot IDs in the command acknowledgment.
- Unsupported Studio runtime actions must return structured errors, not silent no-ops.

## Validation Requirements

Before shipping Studio protocol changes, run:

1. `node --test backend/src/lib/studioToolProtocol.test.js`
2. `node --check` on changed backend files.
3. `npm run build` for frontend changes.
4. Manual plugin verification from `docs/studio-tool-protocol.md`.
