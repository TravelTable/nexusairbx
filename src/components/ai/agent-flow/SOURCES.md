# Source notes

Reviewed 14 September 2026. The visual reference is the two Cursor screenshots supplied in the conversation. Code is independently written. No Cursor source was copied, and this package is not affiliated with Cursor.

## Actual implementation contracts

**Vercel AI SDK, UI message types**
https://github.com/vercel/ai/blob/main/packages/ai/src/ui/ui-messages.ts
https://raw.githubusercontent.com/vercel/ai/main/packages/ai/src/ui/ui-messages.ts

The adapter follows the real ordered `parts` representation: text, reasoning, named and dynamic tools, files and sources. It preserves `toolCallId`, approval IDs, the input/output state distinctions and `preliminary`. Unknown tool states are shown as unknown instead of being called successful. Custom data parts require a caller-provided mapping.

**Vercel AI SDK, actual chat implementation and React hook**
https://github.com/vercel/ai/blob/main/packages/ai/src/ui/chat.ts
https://github.com/vercel/ai/blob/main/packages/react/src/use-chat.ts
https://github.com/vercel/ai/blob/main/packages/ai/src/ui/default-chat-transport.ts
https://github.com/vercel/ai/blob/main/packages/ai/src/ui/last-assistant-message-is-complete-with-approval-responses.ts

The integration uses `DefaultChatTransport`, `useChat`, `addToolApprovalResponse`, the approval-continuation helper and `onFinish` abort/error information. The component does not replace the SDK's streaming parser with a made-up event transport. A ready transport is not itself evidence that each tool completed.

**Vercel AI Elements, tool and reasoning component source**
https://github.com/vercel/ai-elements/blob/main/packages/elements/src/tool.tsx
https://github.com/vercel/ai-elements/blob/main/packages/elements/src/reasoning.tsx

These are concrete open-source implementation references for tool-state rendering and disclosure behavior. This implementation deliberately does not copy their badge-heavy styling, icon palette, shimmer or timed auto-collapse. The UI follows the user's provided Cursor chat reference instead.

**Reported edge cases in the component library**
https://github.com/vercel/ai-elements/issues/73
https://github.com/vercel/ai-elements/issues/120

One issue discusses reasoning duration missing from persisted messages; another discusses reasoning tokens without visible reasoning text. Consequently, this component does not invent elapsed seconds and does not leave an empty completed reasoning disclosure.

## Reddit feedback checked

**Collapsing Thinking prevents reopening during a run**
https://www.reddit.com/r/cursor/comments/1rk0zy8/clicking_the_wrong_location_while_the_model_is/

The author describes losing visibility into an expensive active run when the thinking section becomes inaccessible. This is a self-reported experience, not a verified statement about every Cursor version. Design response: stable keyed disclosure nodes, a toggle confined to the summary, no timer that changes the user's open/closed choice, and a browser test that reopens the section during streaming.

**Getting tired of the UI changes**
https://www.reddit.com/r/cursor/comments/1pmwmp2/getting_tired_of_the_ui_changes/

The post and several replies object to moved panes, imposed agent layouts and repeatedly relearning their workspace. Other replies point out that some layouts can be restored or changes reverted. These anecdotes are not a representative usability survey. Design response: no sidebar, dashboard, outer agent card, progress rail, animation spectacle or extra navigation—only inline activity inside the existing message column.

## Native interaction references

**W3C disclosure pattern**
https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/

**MDN native details, dialog and custom elements**
https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details
https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements

Native `<details>/<summary>` and modal `<dialog>` are used rather than click-only divs. Keyboard toggling and image-dialog Escape/focus behavior are exercised in Chromium tests. Streaming adds a small status indicator only when a live part exists; reduced-motion preferences disable its animation.

## Scope of the evidence

Sources establish API shapes and inform interaction decisions. They do not establish that this code is Cursor's own implementation, that all Reddit users agree, or that an unconnected production backend was tested. Core compilation and local native browser tests are recorded in the package; live React/provider integration remains application-specific.

## Thinking presentation update

Live reasoning opens once and shows elapsed time with a reduced-motion-aware shimmer. Manual disclosure changes remain stable while tokens arrive. The transition out of thinking collapses the section once; users can reopen summaries afterward. Each reasoning part has its own timer, cleared on completion or disconnection. Provider durations take precedence over locally observed elapsed time. Historical parts without duration metadata do not invent a duration.

The UI build pipeline supplies no scripted reasoning summary. An empty active reasoning part displays only its status and elapsed time. This presentation change does not select a different backend model.

`dist/styles.js` mirrors `dist/agent-flow.css` for the React bundle's shadow root. Keep it and the embedded styles in the standalone bundle/preview synchronized when changing styles; loading the CSS through `new URL` conflicts with this application's CSS bundler.

Behavior checks: `node --test src/components/ai/agent-flow/tests/reasoning.test.mjs` from the repository root.
