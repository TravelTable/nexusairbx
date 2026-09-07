import { projectAssistantMessage } from "./assistantMessageProjection";
import { sanitizeTranscriptMessagePayload } from "./firestorePayloads";

const source = 'local Config = {}\nreturn "🎮"';
test("pending, terminal and replay build messages never expose source or diagnostics", () => {
  for (const message of [
    {responseKind:"build",pending:true,publicPhase:"building"},
    {responseKind:"build",pending:false,publicPhase:"failed"},
    {metadata:{mode:"agent",runState:"succeeded"}},
  ]) {
    const result=projectAssistantMessage({role:"assistant",runId:"run1",content:source,explanation:source,code:source,streamState:{code:source},reasoning:"private",...message});
    expect(JSON.stringify(result)).not.toContain(source);
    expect(result.code).toBeUndefined();
    expect(result.streamState).toBeUndefined();
    expect(result.reasoning).toBeUndefined();
  }
});
test("explicit answers and user input retain their exact content", () => {
  for(const message of [{role:"assistant",responseKind:"code_explanation",content:source},{role:"assistant",responseKind:"answer",metadata:{mode:"agent"},content:source},{role:"user",content:source}]) expect(projectAssistantMessage(message)).toBe(message);
});
test("saved projection retains recovery identity and version references but no embedded file source", () => {
  const result=sanitizeTranscriptMessagePayload({role:"assistant",responseKind:"build",runId:"r1",jobId:"j1",launchOperationId:"o1",pending:true,metadata:{mode:"agent",runState:"background",launchRecoveryVersion:1},content:source,files:[{content:source}],artifactRefs:[{artifactId:"a1",revision:"v1",path:"Workspace/A",source}]});
  expect(result).toMatchObject({runId:"r1",jobId:"j1",launchOperationId:"o1",metadata:{runState:"background",launchRecoveryVersion:1},artifactRefs:[{artifactId:"a1",revision:"v1",path:"Workspace/A"}]});
  expect(result.files).toBeUndefined();
  expect(JSON.stringify(result)).not.toContain(source);
});
test("composer mode changes cannot change a persisted response kind", () => {
  const result=projectAssistantMessage({role:"assistant",responseKind:"answer",content:"Answer",metadata:{mode:"agent"}});
  expect(result.content).toBe("Answer");
});
test("full original user request survives transcript persistence", () => {
  const prompt="a".repeat(35000)+" REQUIRED HUD";
  expect(sanitizeTranscriptMessagePayload({role:"user",content:prompt}).content).toBe(prompt);
});
test("completion proof survives projection for truthful replay", () => {
  const result=projectAssistantMessage({role:"assistant",responseKind:"build",runId:"r1",publicPhase:"succeeded",completion:{canComplete:true,changesApplied:true}});
  expect(projectAssistantMessage(result).content).toBe("Build complete");
});
