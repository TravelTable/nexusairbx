import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import UiCreatorWorkspace from "./UiCreatorWorkspace";
import UiCreatorChrome from "./UiCreatorChrome";
import * as designs from "../../../lib/uiDesignApi";
import * as tasks from "../../../lib/taskRuntimeApi";
import * as previews from "../../../lib/uiPreviewApi";
import { getBuildWorkspaceSnapshot } from "../../../lib/buildWorkspaceApi";
jest.mock("../../../lib/uiConversation", () => ({ watchUiConversation: jest.fn(() => () => {}), askUiQuestion: jest.fn(async () => "A useful answer") }));

jest.mock("../../../lib/uiDesignApi", () => Object.fromEntries(["createUiDesign","listUiDesigns","getUiDesign","patchUiDesign","saveUiHooks","compileUiDesign","createUiCheckpoint","listUiCheckpoints","restoreUiCheckpoint","renameUiDesign","deleteUiDesign","recoverUiDesign"].map(name => [name, jest.fn()])));
jest.mock("../../../lib/taskRuntimeApi", () => Object.fromEntries(["createTask","getTask","getTaskEvents","cancelTask","approveTask","streamTaskEvents"].map(name => [name, jest.fn()])));
jest.mock("../../../lib/uiPreviewApi", () => Object.fromEntries(["getUiPreviewManifest","requestUiCapture","readUiCapture"].map(name => [name, jest.fn()])));
jest.mock("../../../lib/buildWorkspaceApi", () => ({ getBuildWorkspaceSnapshot: jest.fn(async () => ({ items: [] })), readBuildWorkspaceFile: jest.fn() }));
jest.mock("@monaco-editor/react", () => () => <div>Monaco hooks editor</div>);
jest.mock("../../../hooks/useChatAttachmentUpload", () => ({ setAttachments }) => ({
  upload: jest.fn((event) => {
    const files = Array.from(event?.target?.files || event?.dataTransfer?.files || []);
    if (!files.length) return;
    setAttachments((previous) => [
      ...previous,
      ...files.map((file) => ({
        localId: file.name,
        name: file.name,
        type: file.type || "image/png",
        isImage: true,
        kind: "image",
        status: "ready",
        id: `att-${file.name}`,
        versionId: "v1",
        contentHash: "hash",
        previewUrl: `blob:${file.name}`,
        width: /mobile/i.test(file.name) ? 390 : 1440,
        height: /mobile/i.test(file.name) ? 844 : 900,
        retryFile: file,
      })),
    ]);
  }),
  retry: jest.fn(),
}));
jest.mock("../../../hooks/useRobloxImageUpload", () => ({
  useRobloxImageUpload: () => ({
    uploading: false,
    uploadImages: jest.fn(async () => ({ ok: true, payload: { results: [{ status: "succeeded", assetId: "9001", contentUri: "rbxassetid://9001" }] } })),
    readiness: { ready: true, message: null },
  }),
}));
jest.mock("motion/react", () => ({
  motion: {
    span: ({ children, initial, animate, transition, ...props }) => <span {...props}>{children}</span>,
    div: ({ children, initial, animate, transition, ...props }) => <div {...props}>{children}</div>,
  },
}));
jest.mock("../../../components/ai/chat/CreationPromptComposer", () => props => <form onSubmit={event => { event.preventDefault(); props.onSubmit(event, props.prompt, { attachments: [] }); }}>
  <textarea aria-label={props.promptAriaLabel || "UI prompt"} value={props.prompt} placeholder={props.placeholder} onChange={e => props.setPrompt(e.target.value)} />
  {props.modeControl}
  {props.onOpenAssetLibrary ? <button type="button" onClick={props.onOpenAssetLibrary}>@asset</button> : null}
  {props.robloxProjectAssets?.map((asset) => <span key={asset.robloxAssetId || asset.id}>{asset.robloxAssetId}</span>)}
  <button type="submit" disabled={props.isGenerating}>{props.submitLabel || "Send prompt"}</button></form>);
jest.mock("../../../components/ai/chat/MessageList", () => ({ messages }) => <div>{messages.map(m => <p key={m.id}>{m.content}</p>)}</div>);
jest.mock("../../../components/ai-elements/conversation", () => ({ Conversation: ({children}) => <div>{children}</div>, ConversationContent: ({children}) => <div>{children}</div>, ConversationScrollButton: () => null }));
jest.mock("./UiLoadingChain", () => ({ busy, task }) => (
  <div data-testid="ui-loading-chain">{busy || task?.uiBuild?.action || task?.uiBuild?.stage || ""}</div>
));
jest.mock("../../../components/ai/workspace/BuildWorkspace", () => () => <div>Saved code workspace</div>);
jest.mock("./UiPreviewPane", () => ({designId, referenceImage, onMatchCloser}) => <div data-testid="preview">
  {designId}
  {referenceImage ? <button type="button" onClick={onMatchCloser}>Match closer</button> : null}
</div>);

const props = { user: { uid: "user-1" }, projectId: "project-1", projectTitle: "Game",
  isStarterOrAbove: true, modelVersion: "auto", studio: { connected: true }, studioSessionId: "session-1" };
const doc = { designId: "design-1", projectId: "project-1", chatId: "chat-1", revision: "rev-1", title: "Shop",
  screens: [{ nodes: [{ id: "panel", name: "Panel", className: "Frame", props: { visible: true, backgroundColor: "#222222" }, interactions: {} }] }], assets: [] };
const record = { designId: doc.designId, chatId: doc.chatId, title: doc.title, revision: doc.revision, document: doc };
const savedTask = (stage = "generating") => ({ taskId: "task-1", chatId: "chat-1", projectId: "project-1", mode: "agent", status: "running",
  intent: { designId: "design-1", workspace: "ui_creator", original: "Build a shop" },
  uiBuild: { stage, sourceRevision: "rev-1" } });
beforeEach(() => {
  jest.resetAllMocks();
  getBuildWorkspaceSnapshot.mockResolvedValue({ items: [] });
  tasks.streamTaskEvents.mockImplementation(() => new Promise(() => {}));
  localStorage.clear();
  localStorage.setItem('nexusrbx:ui:last-open:user-1:project-1', 'design-1');
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  if (!global.crypto) global.crypto = {};
  if (!global.crypto.randomUUID) global.crypto.randomUUID = () => "test-id";
  HTMLDialogElement.prototype.showModal = HTMLDialogElement.prototype.showModal || function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = HTMLDialogElement.prototype.close || function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  designs.listUiDesigns.mockResolvedValue({ designs: [record] });
  designs.getUiDesign.mockResolvedValue({ design: record });
  designs.compileUiDesign.mockResolvedValue({compiled:{generatedLua:"-- Compiled saved UI"}});
  designs.listUiCheckpoints.mockResolvedValue({ checkpoints: [] });
  previews.getUiPreviewManifest.mockResolvedValue({ capture: null, states: [], viewports: [] });
  tasks.createTask.mockResolvedValue({ task: savedTask() });
  tasks.getTaskEvents.mockImplementation(async () => ({ task: savedTask(), events: [], lastSequence: 0 }));
  tasks.cancelTask.mockResolvedValue({});
});
async function open() {
  const mounted = render(<UiCreatorWorkspace {...props} />);
  await screen.findByLabelText("UI prompt");
  await waitFor(() => expect(screen.getByRole("button", {name:"Send prompt"})).toBeEnabled());
  return mounted;
}
test("Agent starts one durable UI task and cancellation uses the task action", async () => {
  await open();
  fireEvent.change(screen.getByLabelText("UI prompt"), { target: { value: "Build a shop" } });
  fireEvent.click(screen.getByRole("button", {name:"Send prompt"}));
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalledTimes(1));
  expect(tasks.createTask.mock.calls[0][0]).toMatchObject({ mode:"agent", workspace:"ui_creator", designId:"design-1", baseRevision:"rev-1",
    executionInput: { applyMode: 'manual_review', studioEnabled: false } });
  expect(designs.createUiDesign).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole("button", {name:"Stop build"}));
  await waitFor(() => expect(tasks.cancelTask).toHaveBeenCalledWith("task-1"));
});
test('source retry action sends the exact saved request and prior job identity', async () => {
  const emptyDoc = { ...doc, screens: [{ nodes: [] }], sourceFiles: [] };
  const emptyRecord = { ...record, document: emptyDoc, activeUiTaskId: 'latest-task' };
  designs.listUiDesigns.mockResolvedValue({ designs: [emptyRecord] });
  designs.getUiDesign.mockResolvedValue({ design: emptyRecord });
  const latest = { ...savedTask('failed'), taskId: 'latest-task', status: 'failed', uiBuild: { stage: 'failed', sourceRevision: 'rev-1' } };
  const previous = { ...savedTask('generating'), taskId: 'old-task', status: 'cancelled',
    intent: { ...savedTask().intent, original: 'Exact original assembled request', uiIntent: 'create', attachments: [] },
    uiBuild: { stage: 'generating', action: 'writing_ui', jobId: 'prior-job', sourceRevision: 'rev-1' } };
  tasks.getTask.mockImplementation(async id => ({ task: id === 'old-task' ? previous : latest }));
  tasks.getTaskEvents.mockResolvedValue({ task: latest, events: [], lastSequence: 0 });
  require('../../../lib/uiConversation').watchUiConversation.mockImplementation((_uid, _chatId, onMessages) => {
    onMessages([{ id: 'old-prompt', role: 'user', taskId: 'old-task', content: previous.intent.original }]);
    return () => {};
  });
  await open();
  fireEvent.click(await screen.findByRole('button', { name: 'Retry source with saved plan' }));
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalledTimes(1));
  expect(tasks.createTask.mock.calls[0][0]).toMatchObject({ message: previous.intent.original,
    retryFromJobId: 'prior-job', designId: 'design-1', baseRevision: 'rev-1', uiIntent: 'create' });
});
test.each(["generating","awaiting_studio","awaiting_capture","awaiting_renders","repairing"])("reload reconnects to saved %s without another build", async stage => {
  designs.getUiDesign.mockResolvedValue({ design: { ...record, activeUiTaskId: "task-1" } });
  tasks.getTask.mockResolvedValue({ task: savedTask(stage) });
  tasks.getTaskEvents.mockResolvedValue({ task: savedTask(stage), events: [], lastSequence: 0 });
  render(<UiCreatorWorkspace {...props} />);
  await screen.findByRole("button", {name:"Stop build"});
  expect(tasks.getTask).toHaveBeenCalledWith("task-1");
  expect(tasks.createTask).not.toHaveBeenCalled();
});
test("the dedicated UI composer stays focused on Build mode", async () => {
  await open();
  expect(screen.queryByLabelText("Conversation mode")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("UI prompt"), {target:{value:"Build a shop"}});
  fireEvent.click(screen.getByRole("button", {name:"Send prompt"}));
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalledTimes(1));
  expect(tasks.createTask.mock.calls[0][0].mode).toBe("agent");
});
test("saved revisions apply without generating again", async () => {
  await open();
  fireEvent.click(screen.getByRole("button", {name:"Apply to Studio", exact:true}));
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalledTimes(1));
  expect(tasks.createTask.mock.calls[0][0]).toMatchObject({uiIntent:"apply",baseRevision:"rev-1", executionInput:{applyMode:"auto_after_approval"}});
});

test("shared header drawer retains focus during streamed updates and restores its trigger", async () => {
  const slot = document.createElement('div');
  document.body.appendChild(slot);
  const close = jest.fn();
  const base = { sharedHeader: true, headerActionTarget: slot, onDrawer: jest.fn(), onCloseDrawer: close };
  const mounted = render(<UiCreatorChrome {...base} />);
  const trigger = screen.getByRole('button', { name: 'Inspect' });
  trigger.focus();
  mounted.rerender(<UiCreatorChrome {...base} drawer="luau" working status="Writing controller" />);
  expect(screen.getByLabelText('Close drawer')).toHaveFocus();
  mounted.rerender(<UiCreatorChrome {...base} drawer="luau" working status="Saving revision" onCloseDrawer={() => close()} />);
  expect(screen.getByLabelText('Close drawer')).toHaveFocus();
  mounted.rerender(<UiCreatorChrome {...base} />);
  await waitFor(() => expect(trigger).toHaveFocus());
  mounted.unmount();
  slot.remove();
});

test("the files drawer stays inspectable during generation and restores focus", async () => {
  await open();
  fireEvent.change(screen.getByLabelText("UI prompt"), {target:{value:"Build a shop"}});
  fireEvent.click(screen.getByRole("button", {name:"Send prompt"}));
  await screen.findByRole("button", {name:"Stop build"});
  const opener=screen.getByRole("button",{name:"Inspect"});
  await act(async () => { opener.focus(); fireEvent.click(opener); });
  expect(screen.getByRole("dialog",{name:"Inspect UI"})).toBeVisible();
  expect(screen.getByText("Writing your implementation")).toBeVisible();
  expect(screen.getByLabelText("AI build conversation")).toBeVisible();
  fireEvent.keyDown(screen.getByRole("dialog"),{key:"Escape"});
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});

test("a generated UI with preview limitations stops the composer", async () => {
  tasks.createTask.mockResolvedValue({task:savedTask("renderer_limited")});
  tasks.getTaskEvents.mockResolvedValue({task:{...savedTask("renderer_limited"), status:"verifying", uiBuild:{stage:"renderer_limited", outcome:"renderer_limited", sourceRevision:"rev-1"}}, events:[], lastSequence:0});
  render(<UiCreatorWorkspace {...props} studio={{connected:false}} studioSessionId={null}/>);
  await waitFor(() => expect(screen.getByRole("button",{name:"Send prompt"})).toBeEnabled());
  fireEvent.change(screen.getByLabelText("UI prompt"),{target:{value:"Build offline"}});
  fireEvent.click(screen.getByRole("button",{name:"Send prompt"}));
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole("button",{name:"Send prompt"})).toBeEnabled());
  expect(screen.queryByRole("button",{name:"Stop build"})).not.toBeInTheDocument();
  expect(screen.getByTestId("ui-loading-chain")).toHaveTextContent("renderer_limited");
});

test("Studio is not required to generate and Saved does not keep the composer busy", async () => {
  tasks.createTask.mockResolvedValue({task:savedTask("saved")});
  tasks.getTaskEvents.mockResolvedValue({task:savedTask("saved"), events:[], lastSequence:0});
  render(<UiCreatorWorkspace {...props} studio={{connected:false}} studioSessionId={null}/>);
  await waitFor(() => expect(screen.getByRole("button",{name:"Send prompt"})).toBeEnabled());
  fireEvent.change(screen.getByLabelText("UI prompt"),{target:{value:"Build offline"}});
  fireEvent.click(screen.getByRole("button",{name:"Send prompt"}));
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalledTimes(1));
  expect(tasks.createTask.mock.calls[0][0].executionInput.studioEnabled).toBe(false);
  await waitFor(() => expect(screen.getByRole("button",{name:"Send prompt"})).toBeEnabled());
  const offlineStatus = screen.getByLabelText("UI status");
  expect(offlineStatus).toHaveTextContent("Saved");
  expect(offlineStatus).toHaveTextContent("Not applied");
  expect(offlineStatus).toHaveTextContent("Runtime untested");
});

test("a pending Studio application is acknowledged but never presented as applied", async () => {
  designs.getUiDesign.mockResolvedValue({ design: { ...record, pendingApplication: { revision: 'rev-1', commandId: 'command-1' } } });
  await open();
  const pendingStatus = screen.getByLabelText("UI status");
  expect(pendingStatus).toHaveTextContent("Saved");
  expect(pendingStatus).toHaveTextContent("Not applied");
  expect(pendingStatus).toHaveTextContent("Runtime untested");
  expect(screen.queryByText(/^Applied$/)).not.toBeInTheDocument();
  expect(screen.queryByText("Studio applied")).not.toBeInTheDocument();
});

test("Applied is scoped to the matching revision and connected Studio session", async () => {
  designs.getUiDesign.mockResolvedValue({ design: { ...record, appliedRevision: 'rev-1', appliedSessionId: 'session-1' } });
  await open();
  const appliedStatus = screen.getByLabelText("UI status");
  expect(appliedStatus).toHaveTextContent("Saved");
  expect(appliedStatus).toHaveTextContent("Studio applied");
  expect(appliedStatus).toHaveTextContent("Runtime untested");
});

test("empty project creates no sample design, and a template immediately builds a fresh design", async () => {
  designs.listUiDesigns.mockResolvedValue({designs:[]});
  const fresh={...record,designId:"fresh",document:{...doc,designId:"fresh",screens:[{nodes:[]}]}};
  designs.createUiDesign.mockResolvedValue({design:fresh});
  tasks.createTask.mockResolvedValue({task:{...savedTask(),intent:{designId:"fresh",workspace:"ui_creator"}}});
  tasks.getTaskEvents.mockImplementation(() => new Promise(() => {}));
  await open();
  expect(designs.createUiDesign).not.toHaveBeenCalled();
  expect(screen.queryByText("Template scaffold")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"New UI"}));
  fireEvent.click(within(screen.getByLabelText("Choose or create a UI")).getByRole("button",{name:"Shop Menu",exact:true}));
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalledTimes(1));
  expect(designs.createUiDesign).toHaveBeenCalledWith({projectId:"project-1",title:"Shop Menu"});
  expect(tasks.createTask.mock.calls[0][0]).toMatchObject({designId:"fresh",uiIntent:"create",mode:"agent"});
});

test("live actions use readable labels, never raw backend payloads", async () => {
  let deliver;
  tasks.streamTaskEvents.mockImplementation((_id,options) => {deliver=options.onEvent;return new Promise(() => {});});
  await open();
  fireEvent.change(screen.getByLabelText("UI prompt"),{target:{value:"Build a shop"}});
  fireEvent.click(screen.getByRole("button",{name:"Send prompt"}));
  await waitFor(() => expect(deliver).toBeDefined());
  const {act}=require("@testing-library/react");
  await act(async()=>deliver({eventId:"stream-1",sequence:1,eventType:"ui_build_progress",payload:{designId:"design-1",stage:"preparing",message:'RAW_BACKEND_PAYLOAD',sourceRevision:"rev-1"}}));
  expect(screen.queryByLabelText("Build actions")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "History" }));
  expect(screen.getByLabelText("Build actions")).toHaveTextContent("Saving files");
  expect(screen.queryByText("RAW_BACKEND_PAYLOAD")).not.toBeInTheDocument();
});

test("connecting later applies the saved revision in the same conversation", async () => {
  const onOpenStudio=jest.fn();
  const view=render(<UiCreatorWorkspace {...props} studio={{connected:false}} studioSessionId={null} onOpenStudio={onOpenStudio}/>);
  fireEvent.click(await screen.findByRole("button",{name:"Connect Studio"}));
  expect(onOpenStudio).toHaveBeenCalledTimes(1);
  expect(tasks.createTask).not.toHaveBeenCalled();
  view.rerender(<UiCreatorWorkspace {...props} onOpenStudio={onOpenStudio}/>);
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalledTimes(1));
  expect(tasks.createTask.mock.calls[0][0]).toMatchObject({uiIntent:"apply",designId:"design-1",chatId:"chat-1",baseRevision:"rev-1"});
});

test("application retries reuse the request identity after an uncertain network response",async()=>{
  tasks.createTask.mockRejectedValueOnce(new Error("Connection interrupted")).mockResolvedValueOnce({task:savedTask()});
  await open();
  fireEvent.click(screen.getByRole("button",{name:"Apply to Studio",exact:true}));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button",{name:"Apply to Studio",exact:true}));
  await waitFor(()=>expect(tasks.createTask).toHaveBeenCalledTimes(2));
  expect(tasks.createTask.mock.calls[0][1].idempotencyKey).toBe(tasks.createTask.mock.calls[1][1].idempotencyKey);
});

test("application retries rotate a request identity rejected as a duplicate",async()=>{
  const duplicate = Object.assign(new Error("Already submitted"), { status: 409, code: "DUPLICATE_OPERATION" });
  const originalRandomUUID = global.crypto.randomUUID;
  global.crypto.randomUUID = jest.fn().mockReturnValueOnce("apply-one").mockReturnValueOnce("apply-two");
  tasks.createTask.mockRejectedValueOnce(duplicate).mockResolvedValueOnce({task:savedTask()});
  await open();
  fireEvent.click(screen.getByRole("button",{name:"Apply to Studio",exact:true}));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button",{name:"Apply to Studio",exact:true}));
  await waitFor(()=>expect(tasks.createTask).toHaveBeenCalledTimes(2));
  expect(tasks.createTask.mock.calls[0][1].idempotencyKey).toBe("ui-apply:apply-one");
  expect(tasks.createTask.mock.calls[1][1].idempotencyKey).toBe("ui-apply:apply-two");
  global.crypto.randomUUID = originalRandomUUID;
});

test("reconnecting Studio gives the same saved revision a new application identity",async()=>{
  const originalRandomUUID = global.crypto.randomUUID;
  global.crypto.randomUUID = jest.fn().mockReturnValueOnce("session-one").mockReturnValueOnce("session-two");
  tasks.createTask.mockRejectedValueOnce(new Error("Connection interrupted")).mockResolvedValueOnce({task:savedTask()});
  const view = await open();
  fireEvent.click(screen.getByRole("button",{name:"Apply to Studio",exact:true}));
  await screen.findByRole("alert");
  view.rerender(<UiCreatorWorkspace {...props} studioSessionId="session-2" />);
  fireEvent.click(screen.getByRole("button",{name:"Apply to Studio",exact:true}));
  await waitFor(()=>expect(tasks.createTask).toHaveBeenCalledTimes(2));
  expect(tasks.createTask.mock.calls[0][1].idempotencyKey).toBe("ui-apply:session-one");
  expect(tasks.createTask.mock.calls[1][1].idempotencyKey).toBe("ui-apply:session-two");
  global.crypto.randomUUID = originalRandomUUID;
});

test("entering UI mode only restores an explicitly last-opened design", async () => {
  localStorage.removeItem('nexusrbx:ui:last-open:user-1:project-1');
  render(<UiCreatorWorkspace {...props} />);
  await waitFor(() => expect(designs.listUiDesigns).toHaveBeenCalledWith('project-1'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send prompt' })).toBeEnabled());
  expect(designs.getUiDesign).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", { name: /What can I help you ship/i })).toBeVisible();
  expect(screen.getByLabelText("Drop a screenshot to replicate")).toBeVisible();
  expect(screen.queryByLabelText("UI preview")).not.toBeInTheDocument();
});

test("sending a first prompt leaves the landing for the split workspace", async () => {
  localStorage.removeItem("nexusrbx:ui:last-open:user-1:project-1");
  designs.listUiDesigns.mockResolvedValue({ designs: [] });
  const fresh = { ...record, designId: "fresh", document: { ...doc, designId: "fresh", screens: [{ nodes: [] }] } };
  designs.createUiDesign.mockResolvedValue({ design: fresh });
  tasks.createTask.mockResolvedValue({ task: { ...savedTask(), intent: { designId: "fresh", workspace: "ui_creator" } } });
  tasks.getTaskEvents.mockImplementation(() => new Promise(() => {}));
  render(<UiCreatorWorkspace {...props} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Send prompt" })).toBeEnabled());
  expect(screen.getByRole("heading", { name: /What can I help you ship/i })).toBeVisible();
  fireEvent.change(screen.getByLabelText("UI prompt"), { target: { value: "Build a shop" } });
  fireEvent.click(screen.getByRole("button", { name: "Send prompt" }));
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByLabelText("UI preview")).toBeVisible());
  await waitFor(() => expect(screen.queryByRole("heading", { name: /What can I help you ship/i })).not.toBeInTheDocument());
});

test("Blank UI returns to the landing screen", async () => {
  await open();
  expect(screen.getByLabelText("UI preview")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "New UI" }));
  fireEvent.click(screen.getByRole("button", { name: /Blank UI/ }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /What can I help you ship/i })).toBeVisible());
  await waitFor(() => expect(screen.queryByLabelText("UI preview")).not.toBeInTheDocument());
});

test("New UI is an action that opens the library, not a selected navigation item", () => {
  render(<UiCreatorChrome onDrawer={jest.fn()} onNew={jest.fn()} onLoad={jest.fn()} onTemplate={jest.fn()} />);
  const action = screen.getByRole('button', { name: 'New UI' });
  expect(action).not.toHaveClass('is-active');
  fireEvent.click(action);
  expect(screen.getByLabelText('Choose or create a UI')).toBeVisible();
  expect(screen.getByRole('button', { name: /Blank UI/ })).toBeVisible();
});

test("an incomplete visual review retries the saved revision without a generate or apply request", async () => {
  const failed = savedTask('failed');
  failed.uiBuild.errorCode = 'UI_VISUAL_REVIEW_INCOMPLETE';
  designs.getUiDesign.mockResolvedValue({ design: { ...record, activeUiTaskId: failed.taskId } });
  tasks.getTask.mockResolvedValue({ task: failed });
  tasks.getTaskEvents.mockResolvedValue({ task: failed, events: [], lastSequence: 0 });
  render(<UiCreatorWorkspace {...props} studio={{ connected: false }} studioSessionId={null} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Retry review' }));
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalledTimes(1));
  expect(tasks.createTask.mock.calls[0][0]).toMatchObject({ uiIntent: 'review', baseRevision: 'rev-1', designId: 'design-1', executionInput: { studioEnabled: false } });
  expect(designs.compileUiDesign).not.toHaveBeenCalled();
  expect(previews.requestUiCapture).not.toHaveBeenCalled();
});
test.each([
  ['running', savedTask('design_preview')],
  ['transport-complete verifying', { ...savedTask('renderer_limited'), status: 'verifying',
    uiBuild: { ...savedTask('renderer_limited').uiBuild, jobId: 'artifact-job-1', outcome: 'renderer_limited', modelReady: true },
    legacyJobProjection: { jobId: 'artifact-job-1', jobStatus: 'done' } }],
])('reopening a newer saved revision ignores its older %s task activity', async (_label, oldTask) => {
  const newer = { ...doc, revision: 'rev-2' };
  designs.getUiDesign.mockResolvedValue({ design: { ...record, revision: 'rev-2', document: newer, activeUiTaskId: 'task-1' } });
  tasks.getTask.mockResolvedValue({ task: oldTask });
  tasks.getTaskEvents.mockResolvedValue({ task: oldTask, events: [], lastSequence: 0 });
  render(<UiCreatorWorkspace {...props} />);
  await waitFor(() => expect(tasks.getTask).toHaveBeenCalledWith('task-1'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send prompt' })).toBeEnabled());
  expect(screen.queryByRole('button', { name: 'Stop build' })).not.toBeInTheDocument();
  expect(screen.queryByTestId('ui-loading-chain')).not.toBeInTheDocument();
  expect(screen.getByLabelText('UI status')).toHaveTextContent('Saved');
  expect(screen.getByLabelText('UI status')).not.toHaveTextContent('Building');
  expect(tasks.createTask).not.toHaveBeenCalled();
});
test('opening a saved UI shows loading without generation activity or a stop control', async () => {
  let finishManifest;
  previews.getUiPreviewManifest.mockImplementation(() => new Promise(resolve => { finishManifest = resolve; }));
  render(<UiCreatorWorkspace {...props} />);
  const status = await screen.findByLabelText('UI status');
  expect(status).toHaveTextContent('Saved');
  expect(status).not.toHaveTextContent('Building');
  expect(screen.queryByTestId('ui-loading-chain')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Stop build' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Apply to Studio', exact: true })).toBeDisabled();
  expect(tasks.createTask).not.toHaveBeenCalled();
  await act(async () => finishManifest({ capture: null, states: [], viewports: [] }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Apply to Studio', exact: true })).toBeEnabled());
});

test('History review carries a typed repair brief for a source-owned UI', async () => {
  const sourceDoc = { ...doc, screens: [{ nodes: [] }], sourceFiles: [
    { path: 'View.luau', content: 'return {}' },
    { path: 'Controller.client.luau', content: 'local root = script.Parent' },
  ] };
  const sourceRecord = { ...record, document: sourceDoc };
  designs.listUiDesigns.mockResolvedValue({ designs: [sourceRecord] });
  designs.getUiDesign.mockResolvedValue({ design: sourceRecord });
  await open();
  const brief = 'Fix Enum.Font.Montserrat and RequestStateSnapshot as a RemoteEvent.';
  fireEvent.change(screen.getByLabelText('UI prompt'), { target: { value: brief } });
  fireEvent.click(screen.getByRole('button', { name: 'History' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Repair saved UI' }));
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalledTimes(1));
  expect(tasks.createTask.mock.calls[0][0]).toMatchObject({
    uiIntent: 'review', baseRevision: 'rev-1', designId: 'design-1', workspace: 'ui_creator',
  });
  expect(tasks.createTask.mock.calls[0][0].message).toContain(brief);
  expect(screen.getByLabelText('UI prompt')).toHaveValue('');
});

test('History review refreshes a saved UI changed outside the open tab', async () => {
  const failed = savedTask('failed');
  failed.uiBuild.errorCode = 'UI_VISUAL_REVIEW_INCOMPLETE';
  designs.getUiDesign.mockResolvedValueOnce({ design: { ...record, activeUiTaskId: failed.taskId } });
  tasks.getTask.mockResolvedValue({ task: failed });
  tasks.getTaskEvents.mockResolvedValue({ task: failed, events: [], lastSequence: 0 });
  await open();
  const updatedDoc = { ...doc, revision: 'rev-2' };
  designs.getUiDesign.mockResolvedValue({ design: { ...record, revision: 'rev-2', document: updatedDoc } });
  fireEvent.click(screen.getByRole('button', { name: 'Retry review' }));
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalledTimes(1));
  expect(tasks.createTask.mock.calls[0][0]).toMatchObject({ uiIntent: 'review', baseRevision: 'rev-2' });
});

test("generated artwork stays in chat after the artwork turn", async () => {
  let deliver;
  tasks.streamTaskEvents.mockImplementation((_id, options) => { deliver = options.onEvent; return new Promise(() => {}); });
  await open();
  expect(screen.getByRole("button", { name: "Apply this UI to Studio" })).toBeVisible();
  fireEvent.change(screen.getByLabelText("UI prompt"), { target: { value: "Build a shop" } });
  fireEvent.click(screen.getByRole("button", { name: "Send prompt" }));
  await waitFor(() => expect(deliver).toBeDefined());
  await act(async () => deliver({ eventId: "art-1", sequence: 1, eventType: "ui_build_progress", payload: { designId: "design-1", stage: "generating", action: "generating_artwork", sourceRevision: "rev-1", images: [{ id: "sheet-1", action: "generating_artwork", url: "data:image/png;base64,aaa", alt: "Generating matching artwork" }] } }));
  expect(screen.getByLabelText("Generated artwork")).toBeVisible();
  expect(screen.getByRole("img", { name: "Generating matching artwork" })).toHaveAttribute("src", "data:image/png;base64,aaa");
  await act(async () => deliver({ eventId: "code-1", sequence: 2, eventType: "ui_build_progress", payload: { designId: "design-1", stage: "generating", action: "writing_ui", sourceRevision: "rev-1" } }));
  expect(screen.getByLabelText("Generated artwork")).toBeVisible();
  expect(screen.getByRole("img", { name: "Generating matching artwork" })).toHaveAttribute("src", "data:image/png;base64,aaa");
  fireEvent.click(screen.getByRole("button", { name: "Open Generating matching artwork" }));
  expect(screen.getByRole("dialog", { name: "Artwork preview" })).toBeVisible();
  fireEvent.click(screen.getAllByRole("button", { name: "Publish to Roblox" })[0]);
  await waitFor(() => expect(screen.getAllByText("rbxassetid://9001").length).toBeGreaterThan(0));
});

test("UI composer can open the asset library and includes selected assets in the task", async () => {
  const onOpenAssetLibrary = jest.fn();
  render(<UiCreatorWorkspace
    {...props}
    onOpenAssetLibrary={onOpenAssetLibrary}
    robloxProjectAssets={[{ robloxAssetId: "123456", name: "Shop icon" }]}
  />);
  await screen.findByLabelText("UI prompt");
  await waitFor(() => expect(screen.getByRole("button", { name: "Send prompt" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "@asset" }));
  expect(onOpenAssetLibrary).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("UI prompt"), { target: { value: "Build a shop" } });
  fireEvent.click(screen.getByRole("button", { name: "Send prompt" }));
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalled());
  expect(tasks.createTask.mock.calls[0][0].message).toContain("rbxassetid://123456");
});

test("a screenshot alone starts image-only replication and keeps the reference pinned", async () => {
  localStorage.removeItem("nexusrbx:ui:last-open:user-1:project-1");
  designs.listUiDesigns.mockResolvedValue({ designs: [] });
  const fresh = { ...record, designId: "fresh", document: { ...doc, designId: "fresh", screens: [{ nodes: [] }] } };
  designs.createUiDesign.mockResolvedValue({ design: fresh });
  tasks.createTask.mockResolvedValue({ task: { ...savedTask(), intent: { designId: "fresh", workspace: "ui_creator" } } });
  tasks.getTaskEvents.mockImplementation(() => new Promise(() => {}));
  render(<UiCreatorWorkspace {...props} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Send prompt" })).toBeEnabled());
  fireEvent.drop(screen.getByLabelText("Drop a screenshot to replicate"), {
    dataTransfer: { files: [new File(["img"], "shop-desktop.png", { type: "image/png" })] },
  });
  fireEvent.click(await screen.findByRole("button", { name: "Build from reference" }));
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalledTimes(1));
  expect(tasks.createTask.mock.calls[0][0].message).toMatch(/Reproduce this reference as closely as possible/i);
  expect(tasks.createTask.mock.calls[0][0].executionInput.settings.referenceMode).toBe("replicate");
  expect(tasks.createTask.mock.calls[0][0].attachments).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: "shop-desktop.png", isImage: true }),
  ]));
  await waitFor(() => expect(screen.getByLabelText("Pinned reference")).toBeVisible());
  expect(screen.getByLabelText("Pinned reference")).toHaveTextContent("Replicate closely");
});

test("Match closer refines against the pinned screenshot after a preview exists", async () => {
  localStorage.removeItem("nexusrbx:ui:last-open:user-1:project-1");
  designs.listUiDesigns.mockResolvedValue({ designs: [] });
  const fresh = { ...record, designId: "fresh", document: { ...doc, designId: "fresh", screens: [{ nodes: [] }] } };
  const done = { ...savedTask("complete"), status: "succeeded", intent: { designId: "fresh", workspace: "ui_creator" } };
  designs.createUiDesign.mockResolvedValue({ design: fresh });
  tasks.createTask
    .mockResolvedValueOnce({ task: { ...savedTask(), intent: { designId: "fresh", workspace: "ui_creator" } } })
    .mockResolvedValueOnce({ task: done });
  tasks.getTaskEvents.mockResolvedValue({ task: done, events: [], lastSequence: 0 });
  render(<UiCreatorWorkspace {...props} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Send prompt" })).toBeEnabled());
  fireEvent.drop(screen.getByLabelText("Drop a screenshot to replicate"), {
    dataTransfer: { files: [new File(["img"], "shop-desktop.png", { type: "image/png" })] },
  });
  fireEvent.click(await screen.findByRole("button", { name: "Build from reference" }));
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole("button", { name: "Send prompt" })).toBeEnabled());
  fireEvent.click(await screen.findByRole("button", { name: "Match closer" }));
  await waitFor(() => expect(tasks.createTask).toHaveBeenCalledTimes(2));
  expect(tasks.createTask.mock.calls[1][0].message).toMatch(/largest visual discrepancies/i);
  expect(tasks.createTask.mock.calls[1][0].attachments).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: "shop-desktop.png" }),
  ]));
});

test("mock mode plays the shared UI presentation path without API calls", async () => {
  const play = jest.fn(async () => true);
  const mockRuns = {
    enabled: true,
    playing: false,
    frame: {},
    play,
    stop: jest.fn(),
  };
  render(<UiCreatorWorkspace {...props} mockRuns={mockRuns} />);
  await screen.findByLabelText("UI prompt");
  await waitFor(() => expect(screen.getByRole("button", { name: "Send prompt" })).toBeEnabled());
  fireEvent.change(screen.getByLabelText("UI prompt"), { target: { value: "Build a shop" } });
  fireEvent.click(screen.getByRole("button", { name: "Send prompt" }));
  await waitFor(() => expect(play).toHaveBeenCalledWith("ui-happy-path", expect.objectContaining({
    designId: "design-1",
    projectId: "project-1",
    prompt: "Build a shop",
  })));
  expect(tasks.createTask).not.toHaveBeenCalled();
});
