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
jest.mock("../../../hooks/useChatAttachmentUpload", () => () => ({ upload: jest.fn(), retry: jest.fn() }));
jest.mock("../../../components/ai/chat/CreationPromptComposer", () => props => <form onSubmit={event => props.onSubmit(event, props.prompt, { attachments: [] })}>
  <textarea aria-label="UI prompt" value={props.prompt} onChange={e => props.setPrompt(e.target.value)} />
  {props.modeControl}<button disabled={props.isGenerating}>Send prompt</button></form>);
jest.mock("../../../components/ai/chat/MessageList", () => ({ messages }) => <div>{messages.map(m => <p key={m.id}>{m.content}</p>)}</div>);
jest.mock("../../../components/ai-elements/conversation", () => ({ Conversation: ({children}) => <div>{children}</div>, ConversationContent: ({children}) => <div>{children}</div>, ConversationScrollButton: () => null }));
jest.mock("../../../components/ai/workspace/BuildWorkspace", () => () => <div>Saved code workspace</div>);
jest.mock("./UiPreviewPane", () => ({designId}) => <div data-testid="preview">{designId}</div>);

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
  expect(screen.getByText(/Saved · Not applied to this Studio · Runtime not verified/, { selector: '.uc-design-status' })).toBeVisible();
});

test("a pending Studio application is acknowledged but never presented as applied", async () => {
  designs.getUiDesign.mockResolvedValue({ design: { ...record, pendingApplication: { revision: 'rev-1', commandId: 'command-1' } } });
  await open();
  expect(screen.getByText(/Saved · Not applied to this Studio · Runtime not verified/, { selector: '.uc-design-status' })).toBeVisible();
  expect(screen.queryByText(/^Applied$/)).not.toBeInTheDocument();
});

test("Applied is scoped to the matching revision and connected Studio session", async () => {
  designs.getUiDesign.mockResolvedValue({ design: { ...record, appliedRevision: 'rev-1', appliedSessionId: 'session-1' } });
  await open();
  expect(screen.getByText(/Saved · Applied · Runtime not verified/, { selector: '.uc-design-status' })).toBeVisible();
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
  fireEvent.click(screen.getByRole("button",{name:"Shop Menu",exact:true}));
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
  expect(screen.getByLabelText("Build actions")).toHaveTextContent("Saving files");
  expect(screen.queryByText("RAW_BACKEND_PAYLOAD")).not.toBeInTheDocument();
});

test("connecting later applies the saved revision in the same conversation", async () => {
  const onOpenStudio=jest.fn();
  const view=render(<UiCreatorWorkspace {...props} studio={{connected:false}} studioSessionId={null} onOpenStudio={onOpenStudio}/>);
  fireEvent.click(await screen.findByRole("button",{name:"Apply to Studio"}));
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

test("entering UI mode only restores an explicitly last-opened design", async () => {
  localStorage.removeItem('nexusrbx:ui:last-open:user-1:project-1');
  render(<UiCreatorWorkspace {...props} />);
  await waitFor(() => expect(designs.listUiDesigns).toHaveBeenCalledWith('project-1'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send prompt' })).toBeEnabled());
  expect(designs.getUiDesign).not.toHaveBeenCalled();
  expect(screen.getByTestId('preview')).toBeEmptyDOMElement();
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
