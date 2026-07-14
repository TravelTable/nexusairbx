# NexusRBX Local Connector

The NexusRBX Local Connector is an optional bridge between NexusRBX and the official Roblox Studio MCP server. It runs as a separate Node.js process on the same computer as Roblox Studio.

For most creators, the NexusRBX Studio plugin remains the recommended connection method. The connector is the advanced path for users who have enabled Roblox Studio MCP. Installing or running it is not required for the plugin bridge, and it does not replace the plugin's NexusRBX-specific model, validation, snapshot, or recovery workflows.

## Requirements

- Node.js 22 or later
- A current Roblox Studio installation
- Roblox Studio MCP enabled in Studio
- A short-lived pairing code from **NexusRBX → Connect Roblox Studio → Advanced → Roblox MCP**

In Roblox Studio, open **Assistant → ⋯ → Manage MCP Servers**, then enable Studio MCP. Keep the intended experience open while connecting. See the [official Roblox Studio MCP documentation](https://create.roblox.com/docs/studio/mcp) for the current Studio setup.

## Install and run

From this directory:

```sh
npm ci
npm run build
npm start
```

Enter the pairing code when prompted. The code is claimed once, and the resulting connector token is retained only in process memory. Stopping or restarting the connector requires a new pairing code.

For local development, `npm run dev` runs the TypeScript entry point directly. A packaged release can expose the same CLI as `nexusrbx-local-connector`.

The connector uses the official Studio MCP launch locations by default:

- macOS: `/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP`
- Windows: `cmd.exe /d /s /c %LOCALAPPDATA%\Roblox\mcp.bat`

For a non-standard installation, pass `--mcp-command` and repeat `--mcp-arg` for each argument. Linux and other platforms require an explicit command because Roblox does not document a default there.

```sh
npm start -- --mcp-command /custom/path/StudioMCP
```

Use `npm start -- --help` for all flags. Environment equivalents are shown in [.env.example](./.env.example). Configuration flags take precedence over environment variables. The API must use HTTPS; plain HTTP is accepted only for localhost development.

Never place a connector token in an environment file, command line, issue, screenshot, or log. Pairing codes are short-lived but should still be treated as secrets. Verbose mode emits bounded, sanitized diagnostics and redacts tokens, bearer credentials, and configured secret values.

## Runtime capability discovery

The connector initializes the official Model Context Protocol SDK over stdio and discovers the Studio server's tools at runtime. It follows every `tools/list` page, rejects duplicate or ambiguous definitions, and validates exact case-sensitive tool names and input schemas before advertising a NexusRBX command.

Capabilities are rediscovered after an MCP reconnect and whenever the server sends `notifications/tools/list_changed`. The connector then re-registers the complete supported-command list with NexusRBX. A missing, renamed, or incompatible MCP tool fails closed as `MCP_TOOL_UNAVAILABLE`; it is never guessed from a similar name.

### Conditional command mapping

No command in this table is advertised unless every required MCP tool and schema validates for the active Studio connection.

| NexusRBX command | Official Studio MCP dependency | Connector behavior |
| --- | --- | --- |
| `read_script`, `read_scripts` | `script_read` | Reads one script or a bounded batch. |
| `search_project` | `script_search` | Searches script names/project results using the discovered query field. |
| `search_source` | `script_grep` | Searches script source using the discovered pattern/query field. |
| `get_studio_context` | `get_studio_state` | Returns the current Studio state exposed by MCP. |
| `get_output_logs`, `collect_output` | `get_console_output` | Returns bounded Studio console output. |
| `inspect_instances`, `read_instance`, `read_properties` | `inspect_instance` | Performs a bounded set of read-only instance inspections when the discovered path/Edit-mode schema validates. Tags, exact child records, and source hashes must be disabled unless Roblox documents compatible output parity. |
| `write_script`, `patch_script` | `script_read` and safely validated `multi_edit` | Pre-reads, checks `expectedSourceHash`, applies exactly once, then rereads and verifies exact source. |
| `create_script` | `script_read` and a direct-source `multi_edit` schema | Applies exactly once and advertises support only when the server accepts a complete source body. |

The connector deliberately does **not** advertise these NexusRBX commands because the currently documented Studio MCP tools do not preserve the required NexusRBX contract or safety guarantees:

- Project/instance inspection: `get_project_manifest`, `list_children`, `inspect_place`, `get_selection`, `get_change_history`
- Script and instance mutation: `rename_script`, `move_script`, `duplicate_script`, `delete_script`, `format_script`, `replace_in_files`, `create_instance`, `update_properties`, `update_attributes`, `update_tags`, `rename_instance`, `move_instance`, `duplicate_instance`, `delete_instance`, `batch_operations`
- Validation/runtime execution: `parse_luau`, `run_smoke_check`, `run_project_validation`, `run_test_service`, `run_play_test`, `stop_play_test`, `collect_diagnostics`
- NexusRBX-specialized workflows: `apply_artifact`, `build_native_model`, `insert_creator_store_asset`, `insert_uploaded_roblox_model`, `inspect_native_model`, `apply_native_model_patch`, `create_snapshot`, `restore_snapshot`, `undo_last_batch`

This is an intentional parity boundary, not an allowlist lag:

- `search_game_tree` does not document NexusRBX's canonical manifest pagination, revision, managed-ID, property-hash, and source-hash contract. It therefore cannot back `get_project_manifest`, `inspect_place`, or cursor-safe `list_children`.
- `inspect_instance` documents readable properties and attributes, so it can back the three bounded inspection commands above. The connector returns `MCP_TOOL_UNAVAILABLE` before calling MCP when a request requires CollectionService tags, exact child rows, or NexusRBX source hashes that the official contract does not guarantee.
- `get_studio_state` does not document the current Studio selection or change history, so it is not treated as `get_selection` or `get_change_history`.
- `execute_luau` can run arbitrary Edit/Client/Server code and is not documented as read-only. The connector never forwards browser-supplied Luau to it. No bounded, server-owned template currently guarantees parity with `parse_luau`, `run_smoke_check`, `run_project_validation`, or `collect_diagnostics`, so those commands fail closed.
- `start_stop_play` does not provide NexusRBX's bounded test plan, automatic stop, and structured validation result contract. `list_roblox_studios` and `set_active_studio` are also not mapped because NexusRBX commands do not carry a trusted official-MCP Studio identifier; the connector never guesses or silently switches the active Studio session.

Use the NexusRBX Studio plugin for an unavailable command. The connector never silently reroutes a command to another Studio session or bridge.

## Safety and failure behavior

- Script writes and patches require `expectedSourceHash`. The connector accepts the NexusRBX stable source hash or SHA-256 and rejects stale edits before mutation.
- A mutation tool call is attempted exactly once. Network errors and timeouts after dispatch have an unknown outcome, so the connector does not retry them.
- Every advertised mutation is reread and compared with the intended complete source. The acknowledgment is successful only when `verified: true`; otherwise it returns `APPLY_UNVERIFIED`.
- Read and backend requests use bounded timeouts, retries, response sizes, batch sizes, source sizes, and log output.
- Pairing-code claim is never retried automatically. Transient backend reads can retry within a small bounded policy; authorization failures are terminal.
- MCP disconnects immediately mark Studio unavailable and trigger bounded exponential reconnection; failed reconnect attempts publish an empty capability set. Commands cannot execute against a stale MCP client.
- Command results and outbound JSON bodies are byte-bounded below the backend's 2 MiB request limit; oversized multi-script reads fail with a structured error.
- `SIGINT` and `SIGTERM` stop polling, publish a final unavailable heartbeat when possible, close the MCP transport, and erase the in-memory connector token.
- The connector executes only commands already queued by the NexusRBX approval workflow. It does not grant approval or bypass destructive-action gates.

## Verification

Run the automated suite:

```sh
npm run check
```

This performs a strict TypeScript check, tests the backend lifecycle and retry policy, exercises MCP initialization/pagination/change notifications through the official SDK against a local mock server, verifies capability fail-closed behavior, tests script conflicts and post-write verification, and builds the distributable CLI.

The final Studio check requires a running graphical Roblox Studio session and cannot be replaced by the mock server:

1. Create or open a disposable unpublished experience in Studio.
2. Enable Studio MCP and leave the experience open in edit mode.
3. Start the connector and claim a fresh pairing code.
4. Confirm NexusRBX reports MCP connected and shows only the discovered capabilities.
5. Run `get_studio_context`, `search_project`, `read_script`, and `get_output_logs` where advertised. If `inspect_instance` is discovered with a compatible schema, also run `inspect_instances` with `includeTags=false`, `includeChildren=false`, and `includeSourceHash=false`.
6. Read a disposable script, capture its source hash, then run a guarded write and confirm the acknowledgment has `verified: true`.
7. Change the script manually and submit the old hash; confirm a structured source-conflict failure and no overwrite.
8. Stop or restart Studio; confirm NexusRBX reports MCP unavailable, then reconnects and re-registers capabilities after Studio returns.
9. Press Ctrl+C; confirm the connector exits cleanly and the website session becomes unavailable.

Do not publish the disposable experience as part of this test.

## Troubleshooting

- **MCP request times out:** make sure Studio is running, the intended experience is open, and Studio MCP is enabled. Restart Studio after enabling it if the server does not respond.
- **MCP executable not found:** update Roblox Studio or provide `--mcp-command` for a custom installation.
- **A command is unavailable:** this is expected when the active Studio MCP version does not expose the exact required tool/schema. Use the plugin bridge for that operation.
- **Source conflict:** reread the script and resubmit the change with its new source hash. Do not bypass the guard.
- **Connection repeatedly drops:** close duplicate connector processes, verify the pairing session is current, and run with `--verbose` for sanitized status codes.

Protocol behavior follows the [Model Context Protocol lifecycle](https://modelcontextprotocol.io/specification/latest/basic/lifecycle) and [tool discovery specification](https://modelcontextprotocol.io/specification/latest/server/tools). The SDK is pinned to an exact version in `package.json` so connector behavior changes only through an intentional dependency update.
