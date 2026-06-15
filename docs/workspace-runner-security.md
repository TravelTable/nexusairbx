# Workspace Runner Security Model

The Studio bridge must never expose a production-host shell. Terminal-like operations for generated workspaces should go through a `WorkspaceRunnerService` abstraction with these boundaries:

- Per-user or per-run workspace directories.
- Explicit working directory for every operation.
- Timeout, process, memory, and output-size limits.
- Environment allowlist only. Backend process secrets are never inherited.
- Secret redaction for command output.
- Cancellation support.
- Network disabled by default, enabled only by explicit policy.
- Audit logging of command, user, run, exit code, signal, and output truncation.
- Cleanup of inactive workspaces.

The current implementation adds the documented environment knobs and protocol surface, but does not yet add a production container/worker runtime. In local development, a future local runner must keep the same interface as production so frontend and agent code do not depend on host execution.

Required operation names:

- `workspace.list`
- `workspace.read`
- `workspace.write`
- `workspace.mkdir`
- `workspace.rename`
- `workspace.delete`
- `workspace.search`
- `workspace.diff`
- `workspace.runCommand`
- `workspace.cancelCommand`
- `workspace.gitStatus`
- `workspace.gitDiff`
