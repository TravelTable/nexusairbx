# NexusRBX Local Connector

The NexusRBX Local Connector is the advanced Studio connection option. It runs
on the same computer as Roblox Studio, connects outward to NexusRBX, and starts
Roblox Studio's built-in MCP server as a local `stdio` subprocess. It is not a
Roblox plugin and it is not required for the recommended plugin workflow.

## Prerequisites

- A current Roblox Studio build with Studio MCP available.
- Node.js 22 or newer.
- A NexusRBX account with a pairing code created from **Connect Roblox Studio →
  Advanced → Roblox Studio MCP**.
- The experience you intend to inspect or edit open in Studio.

In Roblox Studio, open **Assistant → … → Manage MCP Servers** and enable Studio
as an MCP server. If that option is missing, update Studio before continuing.

Roblox documents these local launch commands:

- macOS: `/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP`
- Windows: `cmd.exe /d /s /c %LOCALAPPDATA%\Roblox\mcp.bat`

The connector selects the platform default unless a documented CLI option or
environment variable overrides it.

## Run from this repository

Install and verify the connector package:

```sh
npm --prefix local-connector install
npm --prefix local-connector run typecheck
npm --prefix local-connector test
npm --prefix local-connector run build
```

Start the built CLI with the backend URL for the environment you are using:

```sh
npm --prefix local-connector start -- --backend-url https://YOUR-NEXUSRBX-HOST
```

The CLI prompts for the short-lived pairing code. The pairing code and connector
session token must not be passed in shell history unless the user deliberately
uses a documented non-interactive mode.

The intended terminal flow is:

```text
NexusRBX Local Connector
Open Roblox Studio and enable Studio MCP.
Enter the connector pairing code shown on the website:
> ABC123
Connecting to NexusRBX...
NexusRBX connected.
Detecting Roblox Studio MCP...
Roblox Studio MCP connected.
Capabilities:
  Project inspection    Supported
  Read scripts          Supported
  Edit scripts          Supported when the discovered schema is compatible
  Output logs           Supported
  Playtest control      Unavailable unless safely mapped
NexusRBX is connected to Roblox Studio.
Press Ctrl+C to disconnect.
```

Tokens and raw MCP configuration are never printed.

## What the connector does

1. Claims a one-time NexusRBX MCP pairing code.
2. Retains the returned connector token only for the running process unless an
   explicitly documented secure persistence mechanism is enabled.
3. Launches the local Studio MCP subprocess and completes the MCP initialize
   handshake.
4. Discovers every tools page with `tools/list` and follows `nextCursor`.
5. Validates recognized tool names and input schemas, builds the safe Nexus
   capability map, and registers it with the backend.
6. Sends connector and Studio MCP health heartbeats.
7. Long-polls commands for its exact session, executes supported mappings, and
   acknowledges a structured result.
8. Rediscovers tools after an MCP reconnect or a negotiated
   `notifications/tools/list_changed` event.
9. Closes the MCP process and marks the connector unavailable on shutdown. The
   website disconnect action separately revokes the connector token.

MCP protocol output is newline-delimited JSON-RPC on the subprocess's standard
input and standard output. Standard output is reserved for MCP messages. Studio
MCP diagnostic text on standard error may be logged after redaction and is not,
by itself, a failed connection.

## Safety and command behavior

Runtime discovery is authoritative. The connector does not infer support from a
similar-sounding tool. It registers a Nexus operation only when both the exact
tool name and its required JSON Schema match a tested mapping.

The current connector can advertise these exact Nexus commands when the named
Studio MCP tool and its schema pass discovery:

| Nexus command | Studio MCP tool | Additional guard |
| --- | --- | --- |
| `read_script`, `read_scripts` | `script_read` | Bounded path and result size |
| `search_project` | `script_search` | Bounded query and result size |
| `search_source` | `script_grep` | Bounded query and result size |
| `get_studio_context` | `get_studio_state` | Structured, bounded output |
| `get_output_logs`, `collect_output` | `get_console_output` | Bounded output |
| `inspect_instances`, `read_instance`, `read_properties` | `inspect_instance` | Edit datamodel, no children/tags, at most 20 paths |
| `create_script` | `script_read` + `multi_edit` | Direct source only, conflict check, post-read verification |
| `write_script`, `patch_script` | `script_read` + `multi_edit` | Required source hash, conflict check, post-read verification |
| `get_selection` | audited `execute_luau` routine | Bounded descriptors; no source or arbitrary code |
| instance create/edit/delete/batch commands | audited `execute_luau` routines | Input allowlists, pre-snapshot, nonce, state verification |
| `create_snapshot`, `restore_snapshot`, `undo_last_batch` | audited `execute_luau` routines | Pre/post hashes and intervening-edit conflict checks |
| `insert_creator_store_asset` | `insert_asset` + audited quarantine routines | Server-owned asset identity, sanitization, placement policy, receipt |
| `run_play_test`, `stop_play_test` | `start_stop_play` + `get_studio_state` | Explicit confirmation, bounded polling, cleanup |
| `run_test_service` | named audited profile + `start_stop_play` | No request accepts executable source |

Commands outside the compiled mapping remain unavailable. Generic
`execute_luau` is never advertised: dynamic behavior uses connector-owned,
versioned constant templates with bounded serialized input and validated
nonce-bearing output. The connector never guesses a Studio target.

For script edits, the connector reads the current source first and checks
`expectedSourceHash`. A mismatch returns:

```json
{
  "code": "source_conflict",
  "message": "The script changed after NexusRBX read it.",
  "retryable": true
}
```

For an allowed mutation, the connector records feasible pre-change state,
executes once, rereads the affected content, and returns `verified: true` only
after observing the intended state. A failed reread or mismatch returns
`apply_unverified`; it is never converted to success.

Mutation retries are conservative. A network timeout after a mutation means the
outcome may be unknown, so the connector does not blindly execute the mutation
again. Read-only network operations use bounded retry and backoff.

Capabilities are command-group truthful. The website turns a badge green only
after every command in its group has a compiled dependency and the session
self-check has passed. A failed or drifted schema disables only the affected
group and is reported through `capabilityDetails` with a reason code.

## Connection states

The website distinguishes these conditions:

- **Connected via Roblox Studio MCP**: connector authenticated, Studio MCP
  initialized, tools discovered, and heartbeats current.
- **Connector connected, Roblox Studio MCP not detected**: backend connection is
  healthy but Studio MCP is missing, disabled, closed, or failed to initialize.
- **Roblox Studio disconnected**: the connector session exists but its heartbeat
  is stale.
- **Connection degraded**: part of the path is reachable but capability
  discovery, target selection, or a recent health test failed.

Starting the connector alone must never produce a green Studio-connected state.

## Troubleshooting

### Studio MCP option is missing

Update Roblox Studio, reopen it, and check **Assistant → … → Manage MCP
Servers**. MCP support can vary by installed Studio version or account rollout.

### Connector is detected but Studio MCP is not

Confirm Studio is open, Studio MCP is enabled, and the local launch path exists.
Use **Test connection** on the website after Studio is ready. The connector will
retry a bounded number of times and continue heartbeating a degraded state.

### Wrong Studio window is active

Choose the intended target in the connection panel. With exactly one Studio the
connector selects it automatically; with multiple Studios, mutation and
playtest commands remain blocked until an enumerated target is explicitly
selected and confirmed. If the window closes, select again after rediscovery.

### A command reports `MCP_TOOL_UNAVAILABLE`

The installed Studio MCP tool set or schema does not provide a safe mapping for
that operation. Use the NexusRBX Studio plugin for the command if the UI suggests
it. The connector does not guess or silently reroute.

### A write reports `source_conflict`

Studio source changed after NexusRBX read it. Refresh or reread the script,
review the newer content, and issue a new edit. Do not remove the hash guard.

### A write reports `apply_unverified`

The requested mutation may have been attempted, but the connector could not
prove the final state. Inspect the target in Studio before retrying.

## Disconnect and uninstall

Use **Disconnect MCP** in the NexusRBX Studio connection panel to revoke the
current connector token immediately. Stop the local process with **Ctrl+C**. The
plugin, when installed, remains connected independently.

To remove the connector from a repository checkout, stop it and delete the
`local-connector/node_modules` and `local-connector/dist` directories. No Roblox
plugin is installed by this connector. If a process is still running, revoking
the session on the website is the authoritative way to end its backend access.

## Known limitations

- A real Studio MCP session is required to prove the installed tool schemas and
  end-to-end behavior; mocked tests cannot do that.
- Supported mappings are deliberately smaller than the complete Studio MCP tool
  list. The first release advertises only exact, schema-compatible mappings.
- Multi-window target selection is not advertised. Close unrelated Studio
  windows before a mutation.
- Nexus snapshot, restore, artifact, native-model, trusted asset insertion, and
  undo workflows remain plugin-only.
- If a mutation response is lost, the connector reports an unknown or
  unverified outcome and does not blindly retry it.

## Live verification checklist

This checklist requires a real current Studio installation and cannot be
completed with mocked MCP responses alone:

1. Open a disposable test place in Studio and enable Studio MCP.
2. Create an MCP code on the NexusRBX website and claim it in the connector.
3. Confirm the website first shows the connector, then only shows Studio MCP as
   connected after initialization and discovery succeed.
4. Confirm Studio's MCP client indicator is active and the website shows the
   expected place and current server/connector versions.
5. Queue each advertised read command and compare its bounded result with the
   open place.
6. Read a disposable script, write it with the returned source hash, and confirm
   the connector reports `verified: true` after rereading it.
7. Change that script manually, send an edit with the old hash, and confirm a
   `source_conflict` with no overwrite.
8. Exercise every advertised mutation only on disposable content and confirm
   affected paths and post-change verification.
9. Request a plugin-only command on the MCP session and confirm
   `MCP_TOOL_UNAVAILABLE` with no plugin command silently queued.
10. Disconnect/restart Studio MCP and confirm degraded status, bounded recovery,
    rediscovery, and capability re-registration.
11. Run plugin and MCP sessions together for the same user/place and confirm the
    plugin stays the default when no transport is selected.
12. Disconnect MCP from the website and confirm its token immediately stops
    authenticating while the plugin continues working.

See [Studio MCP security](./studio-mcp-security.md) before changing authentication
or command mappings.

## Primary references

- [Roblox Studio MCP](https://create.roblox.com/docs/studio/mcp)
- [MCP lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
- [MCP transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [Official MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
