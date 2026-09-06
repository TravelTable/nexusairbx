# Studio MCP port conflicts (Connector 0.3.6)

Roblox Studio and its StudioMCP helper share local port 13469. Ropilot can occupy
that port with its own proxy. The helper's handshake and window discovery can
succeed through Ropilot while target-bound tools fail with "Client proxy is out
of date, restart to update". Restarting Studio or launching another MCP helper
does not replace the listener. This was reproduced on Windows with Studio
0.737.0.7371584 and resolved by releasing the competing Ropilot proxy.

For the standard Windows Studio installation, Connector 0.3.6 checks the port
before launching the official helper. It automatically stops a conflicting
`%APPDATA%\ropilot\bin\ropilot-infra-helper.exe` belonging to the current Windows
user, including its same-executable supervisor if present. This interrupts
Ropilot's active proxy connections. Studio and place content are left open.
The process identity and port ownership are checked again before termination;
recovery is attempted at most once per connector session. If Ropilot immediately
reclaims the port, the connector pauses and offers Try Again.

Unknown processes, other users' helpers, binaries installed at other paths,
and conflicting owners that cannot be verified are never terminated. The app
reports `MCP_PORT_CONFLICT`, identifies the blocking application, retains sign-in,
and tells the user to close that application's Studio integration. Diagnostics
and rotated connection logs retain this failure without collecting command
lines or credentials. Failed process-inspection commands are logged without
their raw command text, then the normal MCP handshake is attempted.

Set `NEXUSRBX_AUTO_RESOLVE_MCP_CONFLICTS=0` before launching the connector to
disable automatic termination while retaining conflict detection. Custom
launchers, non-default `MCP_PROXY_HTTP_PORT` values, and non-Windows hosts retain
their existing behavior. This release does not add macOS process termination.
Changing the connector's port alone cannot move Studio's existing connection;
the connector does not rewrite Roblox settings, patch third-party software,
disable autostart, or replay Studio mutations during recovery.

Validation includes unknown-owner, other-user, opt-out, respawning-helper,
cancellation, concurrent-connect, and diagnostic-redaction tests. A native
Windows test uses a disposable helper on an ephemeral port to verify both
creation-time rejection and actual process termination without touching Studio
or the user's Ropilot installation.
