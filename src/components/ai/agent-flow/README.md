# Inline Agent Flow

A framework-neutral, typed component matched to the **inline chat layout in the supplied Cursor screenshots**. This is an independent implementation, not Cursor's proprietary source or an exact copy of every Cursor release.

The runtime has no third-party dependencies. React integration is included, but React is not required. Compiled JavaScript, declaration files and CSS are already in `dist/`.

## Existing React + AI SDK application

Copy this directory into your project. Import `react/AgentFlow.tsx`, then pass the **actual assistant UIMessage** from `useChat`:

```tsx
import { AgentFlow } from './agent-flow/react/AgentFlow';

<AgentFlow
  message={message}
  status={isStreaming ? 'streaming' : wasAborted ? 'interrupted' : error ? 'error' : 'idle'}
  error={error?.message}
  onApproval={decision => addToolApprovalResponse(decision)}
/>
```

Use `examples/Chat.tsx` for the complete `useChat` connection, real stop handling, message-level completion state, and approval continuation. It calls your authenticated `/api/chat` endpoint through `DefaultChatTransport`. It does not create or simulate a backend. The example requires your application's `react`, `react-dom`, `ai`, and `@ai-sdk/react` packages with the UIMessage/approval APIs referenced in `SOURCES.md`.

Only pass the active assistant the streaming/error state. A global streaming flag applied to the entire history incorrectly animates old tool calls. Aborts are tracked separately: transport `ready` does not distinguish a successful finish from a stop.

## Plain JavaScript

```html
<script src="./agent-flow/dist/agent-flow.standalone.js"></script>
<agent-flow id="activity"></agent-flow>
<script>
  const { defineAgentFlow, fromUIMessage } = AgentFlowUI;
  defineAgentFlow();
  const activity = document.getElementById('activity');

  // Call this from your existing message subscription with each real SDK snapshot.
  function updateAssistant(message, status) {
    activity.run = fromUIMessage(message, { status });
  }
</script>
```

ES modules can import `defineAgentFlow` and `fromUIMessage` from `dist/agent-flow.js`. Keep `model.js` and `agent-flow.css` beside it. The ESM build loads the stylesheet as a same-origin resource; the standalone build embeds it and supports a host `nonce` attribute for a compatible CSP.

Any other agent framework can supply `AgentRun` directly. Its event types are exported in `dist/model.d.ts`. Append/update stable event IDs in execution order and assign a new snapshot to `element.run`. Consecutive tool calls group together; text and step boundaries preserve chronology. No speculative future steps are added.

## Tool labels and actual images

Set `options.tools` using **the exact keys in your server tool registry**. See `examples/tool-presentations.ts` for typed mappings of tool inputs, terminal output, and an explicit image-output schema. Those mappings consume real results; they contain no preset responses.

Image `file` parts render directly. Tool output is otherwise arbitrary JSON, so images inside tool output require your `assets(tool)` mapper. Use durable or appropriately expiring image URLs. Same-origin images, raster data URLs and same-origin blob URLs work by default. Add trusted storage origins to `assetOrigins` to permit remote previews. The component does not fetch arbitrary URLs discovered in tool output.

Durations are optional server measurements keyed by `toolCallId` or `part:INDEX`. Missing timings stay missing. Empty completed reasoning is hidden. Supply only provider-approved, user-visible reasoning summaries.

## Interaction and host responsibilities

Disclosures retain the user's choices throughout token streaming and completion. Only the actual disclosure header toggles. Tool failures, denials, preliminary outputs and incomplete calls are distinct. Approval buttons invoke your handler only after an explicit click and block duplicate submissions while pending. Images open in a native keyboard-dismissable dialog.

The component never forces the chat scroll position. Your conversation container owns any follow-bottom behavior. Text is rendered as inert plaintext; use your existing message renderer when rich Markdown is required. Custom SDK data parts are opt-in through `mapDataPart`.

Keep model credentials, authentication, authorization, rate limits, persisted history, redaction, cancellation of server-side work and tool execution on your backend. The server must revalidate approval IDs and tool permissions; a disabled UI button is not an authorization boundary. Field-name redaction is only a display aid, not comprehensive secret detection.

## Verification

The TypeScript core was compiled with strict checking (TypeScript 5.8.3). `tests/model.test.mjs` passed **25 tests**. The standalone component passed **33 Chromium integration checks**, including disclosure persistence, keyboard/focus behavior, partial tool outputs, stops, approval failure/retry, inert HTML, image origin restrictions, image preview dismissal, reduced motion and narrow-screen layout. Browser tests use isolated fixtures; production entry points do not populate demo events.

The React adapter and example were syntax-transpiled but were **not executed against a live React application or paid model endpoint here**. This is a tested UI component ready for integration, not a claim that your backend has been verified.

```sh
npm install
npm run build
npm test
# Optional browser suite:
python -m pip install playwright
python -m playwright install chromium
npm run test:browser
```

Open `preview.html` to inspect a real exported assistant UIMessage or AgentRun JSON locally. It starts empty; it does not replay a fabricated conversation.
