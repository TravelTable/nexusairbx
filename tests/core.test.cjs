'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const b = file => require(path.join(root, 'backend/src/lib', file));
const f = file => require(path.join(root, 'src/lib', file));
const policy = b('interactionPolicy.js');
const { assertExecutableArtifactOutput: guard } = b('artifactOutputContract.js');
const { publicBuildEvent } = b('publicBuildEvents.js');
const { evaluateBuildCompletion: complete } = b('buildCompletionGate.js');
const { collectChatStream } = b('chatStreamCompletion.js');
const { resolveVisibleChatPolicy: modelPolicy } = b('visibleChatPolicy.js');
const { getRunPresentation: present, getRunSpecialists: specialists } = f('runPresentation.js');
const { createBuildWorkspaceState: createState, reduceBuildWorkspace: reduce } = f('buildWorkspaceState.js');
const scope = { chatId: 'chat1', projectId: 'project1', taskId: 'task1', runId: 'run1', planHash: 'p1' };

for (const text of ['mate just start', 'bro, build it', 'Please go ahead', 'okay mate just start now!', 'continue the build', 'resume the build', 'Nexus: finish it', 'build it please']) {
  test(`recognizes execution follow-up: ${text}`, () => assert.equal(policy.isExecutionFollowUp(text), true));
}
for (const text of ['yes', 'do not start', 'never start', 'start over but do not apply anything', 'how do I start?', 'continue explaining that', 'go ahead and delete everything']) {
  test(`does not manufacture approval: ${text}`, () => assert.equal(policy.isExecutionFollowUp(text), false));
}
for (const intent of ['AMBIGUOUS', 'PLAN_APPROVAL', 'CONTINUATION', 'BUILD_REQUEST', 'MODIFICATION_REQUEST']) {
  test(`Agent does not demote ${intent} to Ask`, () => assert.notEqual(policy.resolveTurnRoute({ mode: 'agent', intent, prompt: 'Health bar top left' }), 'answer'));
}
for (const mode of ['agent', 'debug']) {
  test(`${mode} recognizes explicit question`, () => assert.equal(policy.resolveTurnRoute({ mode, intent: 'EXPLANATION_REQUEST', prompt: 'Why is it slow?' }), 'answer'));
  test(`${mode} honors explicit planning request`, () => assert.equal(policy.resolveTurnRoute({ mode, intent: 'PLANNING_REQUEST', prompt: 'Plan an obby' }), 'plan'));
}
for (const prompt of ['mate just start', 'continue', 'build it', 'yes, build', 'create a game']) {
  test(`Ask stays read-only for ${prompt}`, () => assert.equal(policy.resolveTurnRoute({ mode: 'ask', prompt, intent: 'BUILD_REQUEST', hasSavedPlan: true }), 'answer'));
}
test('Plan draft stays a draft without an existing plan', () => assert.equal(policy.resolveTurnRoute({ mode: 'plan', prompt: 'build it', intent: 'BUILD_REQUEST' }), 'plan'));
test('Plan approval is a separate fenced command', () => assert.equal(policy.resolveTurnRoute({ mode: 'plan', prompt: 'mate just start', hasSavedPlan: true }), 'approve_saved_plan'));
test('invalid modes fail rather than default to mutation', () => assert.throws(() => policy.normalizeMode('god-mode'), TypeError));
test('frontend/backend policy copies are identical', () => assert.equal(fs.readFileSync(path.join(root,'src/lib/interactionPolicy.js'),'utf8'),fs.readFileSync(path.join(root,'backend/src/lib/interactionPolicy.js'),'utf8')));

for (const mode of ['act','agent','debug']) {
  test(`${mode} rejects prose-only output`, () => assert.throws(() => guard({mode,operations:[]}), e => e.code==='ARTIFACT_OUTPUT_MISSING'));
  test(`${mode} rejects truncated executable output`, () => assert.throws(() => guard({mode,operations:[{type:'create_script'}],finishReason:'length'}),e=>e.code==='ARTIFACT_OUTPUT_INCOMPLETE'));
}
test('valid parsed operations pass output-presence check', () => assert.doesNotThrow(()=>guard({mode:'agent',operations:[{type:'create_script'}],finishReason:'stop'})));
test('a native model also satisfies output presence', () => assert.doesNotThrow(()=>guard({mode:'act',nativeModelBuild:{ok:true}})));
test('read-only modes do not require mutations', () => {guard({mode:'ask'});guard({mode:'plan'});});

test('activity cannot carry raw executor source or arbitrary status text', () => {
  const e=publicBuildEvent(scope,1,{type:'phase',phase:'building',text:'local x = {}',source:'local x = {}',confidence:39});
  assert.equal(e.text,'Building the project.'); assert.equal(e.source,undefined); assert.equal(e.confidence,undefined);
});
test('raw model delta cannot be treated as a public event', () => assert.throws(()=>publicBuildEvent(scope,1,{type:'content_delta',text:'local x = {}'})));
test('completion cannot be emitted as an arbitrary phase', () => assert.throws(()=>publicBuildEvent(scope,1,{type:'phase',phase:'completed'})));
test('partial build never gets completion receipt', () => assert.equal(publicBuildEvent(scope,1,{type:'result',completion:{changesApplied:true,canComplete:false}}).phase,'incomplete'));
test('failed empty build has no successful receipt', () => assert.equal(publicBuildEvent(scope,1,{type:'result',completion:{canComplete:false}}).phase,'failed'));
test('artifact projection keeps only a versioned reference', () => {
  const e=publicBuildEvent(scope,1,{type:'artifact',artifact:{artifactId:'a',revision:'r',path:'Workspace/A',kind:'native_model',source:'private source'}});
  assert.equal(e.artifact.source,undefined); assert.equal(e.artifact.revision,'r');
});
test('invalid public event sequence rejected',()=>assert.throws(()=>publicBuildEvent(scope,0,{type:'phase',phase:'building'})));

function fixture() {
  const contract={planHash:'p1',deliverables:[{id:'hud',owner:'ui',required:true,checks:['applied','readback','visual']}]};
  const currentOutputs=[{deliverableId:'hud',revision:'v1'}];
  const receipts=['applied','readback','visual'].map((check,i)=>({...scope,receiptId:`r${i}`,evidenceArtifactId:`proof${i}`,deliverableId:'hud',outputRevision:'v1',status:'passed',origin:'studio_command',sequence:i+1,check}));
  return {scope,contract,currentOutputs,receipts};
}
test('gate passes current observed required deliverables',()=>assert.equal(complete(fixture()).canComplete,true));
test('missing UI remains a blocker',()=>{const x=fixture();x.currentOutputs=[];assert.equal(complete(x).canComplete,false);assert.equal(complete(x).blockers[0].reason,'output_missing');});
test('old revision proof does not verify new code',()=>{const x=fixture();x.currentOutputs[0].revision='v2';assert.equal(complete(x).canComplete,false);});
test('wrong project proof rejected',()=>{const x=fixture();x.receipts.forEach(r=>r.projectId='other');assert.equal(complete(x).canComplete,false);});
test('wrong run proof rejected',()=>{const x=fixture();x.receipts.forEach(r=>r.runId='other');assert.equal(complete(x).canComplete,false);});
test('model-written test claims are not evidence',()=>{const x=fixture();x.receipts[2].origin='model';assert.equal(complete(x).canComplete,false);});
test('rolled-back outputs are not applied',()=>{const x=fixture();x.receipts.forEach(r=>r.rolledBack=true);assert.equal(complete(x).changesApplied,false);});
test('pre-write visual proof is stale',()=>{const x=fixture();x.receipts[0].sequence=5;assert.equal(complete(x).canComplete,false);});
test('no contract is not a successful build',()=>assert.throws(()=>complete({scope,contract:{deliverables:[]}})));
test('stale plan contract rejected',()=>{const x=fixture();x.contract.planHash='old';assert.throws(()=>complete(x));});
test('duplicate current output revisions rejected',()=>{const x=fixture();x.currentOutputs.push({...x.currentOutputs[0],revision:'v2'});assert.throws(()=>complete(x));});
test('optional missing art does not block required gameplay',()=>{const x=fixture();x.contract.deliverables.push({id:'marketing',required:false,checks:['asset_usable']});const result=complete(x);assert.equal(result.canComplete,true);assert.equal(result.pendingOptional.length,1);});
test('all-optional empty game cannot complete',()=>{const x=fixture();x.contract.deliverables[0].required=false;assert.throws(()=>complete(x));});
test('visual checks cannot be manufactured by a syntax validator',()=>{const x=fixture();x.receipts[2].origin='deterministic_validator';assert.equal(complete(x).canComplete,false);});

for(const status of ['idle','ready',''])test(`no idle build card for ${status||'empty'}`,()=>assert.equal(present({...scope,status}),null));
test('agent metadata without task/run id is not a build',()=>assert.equal(present({agentId:'agent1',status:'running'}),null));
test('wrong chat build is hidden',()=>assert.equal(present({...scope,status:'running'},{chatId:'different'}),null));
test('applied is not fully complete',()=>assert.equal(present({...scope,status:'applied'}).label,'Applied · testing pending'));
test('completion label requires canonical gate',()=>assert.equal(present({...scope,status:'succeeded'}).label,'Build finished · verification unconfirmed'));
test('verified completion label',()=>assert.equal(present({...scope,status:'succeeded',completion:{canComplete:true}}).label,'Build complete'));
test('one team assignment is not faked from top-level agent metadata',()=>assert.deepEqual(specialists({...scope,status:'running',agents:[{id:'a'}]}),[]));
test('actual team assignments are projected',()=>assert.equal(specialists({...scope,status:'running',teamActivity:{executionMode:'team',assignments:[{stepId:'s1',role:'ui',status:'running'}]}}).length,1));

const wsScope={chatId:'chat1',projectId:'project1',taskId:'task1',runId:'run1'};
const item={id:'f1',revision:'v1',kind:'file',artifactId:'a',path:'ReplicatedStorage/A'};
test('workspace accepts versioned artifacts without exposing code as chat',()=>{const result=reduce(createState(wsScope),{scope:wsScope,sequence:1,type:'upsert',item:{...item,source:'source'}});assert.equal(result.items.f1.source,undefined);assert.equal(result.items.f1.artifactId,'a');});
test('workspace ignores a different chat',()=>{const state=createState(wsScope);assert.equal(reduce(state,{scope:{...wsScope,chatId:'other'},sequence:1,type:'upsert',item}),state);});
test('duplicate events cannot overwrite newer file state',()=>{const a=reduce(createState(wsScope),{scope:wsScope,sequence:1,type:'upsert',item});assert.equal(reduce(a,{scope:wsScope,sequence:1,type:'upsert',item:{...item,revision:'bad'}}),a);});
test('missing event forces reconciliation',()=>assert.equal(reduce(createState(wsScope),{scope:wsScope,sequence:3,type:'upsert',item}).connection,'reconciling'));
test('snapshot resolves gaps without preserving old item copies',()=>{const result=reduce(createState(wsScope),{scope:wsScope,sequence:8,type:'snapshot',items:[item],phase:'building'});assert.equal(result.sequence,8);assert.equal(result.connection,'connected');});
test('snapshot rejects duplicate file identities',()=>assert.throws(()=>reduce(createState(wsScope),{scope:wsScope,sequence:3,type:'snapshot',items:[item,item]})));
test('workspace item id cannot mutate the prototype',()=>{const result=reduce(createState(wsScope),{scope:wsScope,sequence:1,type:'snapshot',items:[{...item,id:'__proto__'}]});assert.equal(Object.getPrototypeOf(result.items),Object.prototype);assert.equal(Object.hasOwn(result.items,'__proto__'),true);});

function stream(chunks) {return{controller:{abort(){}},async *[Symbol.asyncIterator](){yield*chunks;}};}
const delta=content=>({choices:[{index:0,delta:{content},finish_reason:null}]});
const stop={choices:[{index:0,delta:{},finish_reason:'stop'}]};
test('chat collector preserves code newlines/Unicode without formatting mutations',async()=>{const text='local x = {}\nreturn "🎮"';const result=await collectChatStream(stream([delta(text),stop]));assert.equal(result.text,text);});
test('chat collector reads usage-only trailer',async()=>{const usage={prompt_tokens:8,completion_tokens:4};const result=await collectChatStream(stream([delta('Hello'),stop,{choices:[],usage}]));assert.deepEqual(result.usage,usage);});
test('chat length finish is incomplete, with partial text and usage',async()=>{await assert.rejects(()=>collectChatStream(stream([delta('Part'),{choices:[{index:0,delta:{},finish_reason:'length'}],usage:{completion_tokens:2}}])),e=>e.code==='CHAT_OUTPUT_LIMIT'&&e.partial==='Part'&&e.usage.completion_tokens===2);});
test('clean transport EOF without model stop is not success',async()=>await assert.rejects(()=>collectChatStream(stream([delta('half a sentence')])),e=>e.code==='CHAT_INCOMPLETE'));
test('empty model response is not success',async()=>await assert.rejects(()=>collectChatStream(stream([stop])),e=>e.code==='CHAT_EMPTY'));
test('unexpected Ask tool call is not executed',async()=>await assert.rejects(()=>collectChatStream(stream([{choices:[{index:0,delta:{tool_calls:[{id:'call'}]}}]}])),e=>e.code==='CHAT_UNEXPECTED_TOOL_CALL'));
test('stalled stream read is bounded',async()=>{let aborted=false;const stalled={controller:{abort(){aborted=true;}},[Symbol.asyncIterator](){return{next:()=>new Promise(()=>{}),return:()=>Promise.resolve({done:true})};}};await assert.rejects(()=>collectChatStream(stalled,{timeoutMs:10}),e=>e.code==='CHAT_TIMEOUT');assert.equal(aborted,true);});
test('pre-aborted stream stops without reading',async()=>{const controller=new AbortController();controller.abort();await assert.rejects(()=>collectChatStream(stream([delta('never')]),{signal:controller.signal}),e=>e.code==='CHAT_CANCELLED');});
test('character budget is enforced',async()=>await assert.rejects(()=>collectChatStream(stream([delta('too long'),stop]),{maxChars:3}),e=>e.code==='CHAT_OUTPUT_LIMIT'));

function modelFixture() {return{requestedModel:'selected/model',userPlan:'PRO',isFree:false,uid:'u',requestId:'r',resolveModel:input=>input,env:{},modelOutputLimit:16000};}
test('explicit model is honored for visible chat',()=>assert.equal(modelPolicy(modelFixture()).resolvedModel,'selected/model'));
test('auto chat has role-specific configurable model',()=>{const p=modelFixture();p.requestedModel='nexus-free-auto';p.env.NEXUS_CHAT_AUTO_MODEL='approved/chat';assert.equal(modelPolicy(p).resolvedModel,'approved/chat');});
test('chat token budget respects supported model cap',()=>{const p=modelFixture();p.modelOutputLimit=5000;assert.equal(modelPolicy(p).maxOutputTokens,5000);});
test('free gating overrides unauthorized paid selection',()=>{const p=modelFixture();p.isFree=true;p.freeModel='free/model';p.freeOutputLimit=2000;const result=modelPolicy(p);assert.equal(result.resolvedModel,'free/model');assert.equal(result.maxOutputTokens,2000);});
test('free cap cannot be guessed when missing',()=>{const p=modelFixture();p.isFree=true;p.freeModel='free/model';assert.throws(()=>modelPolicy(p));});
test('bad output limit configuration fails visibly',()=>{const p=modelFixture();p.env.NEXUS_CHAT_MAX_OUTPUT_TOKENS='NaN';assert.throws(()=>modelPolicy(p));});

// The existing NativeModelCompiler dependency is intentionally stubbed in these
// isolated tests. Run the repository's real validator/plugin suites separately.
const worldPath=path.join(root,'backend/src/services/gameTeam/worldArtifactExtension.js');
const worldModule={exports:{}};
vm.runInNewContext(fs.readFileSync(worldPath,'utf8'),{module:worldModule,exports:worldModule.exports,require(name){if(name==='../NativeModelCompiler')return{NativeModelCompiler:class{}};throw new Error(`Unexpected dependency ${name}`);},console},{filename:worldPath});
const world=worldModule.exports;
const compiler={compile(spec,{applyMode}={}){return{normalizedSpec:spec,summary:{instances:10,parts:7},specHash:'hash1',command:{type:'build_native_model',payload:{spec,applyMode}}};}};
const assignment={role:'world_assets',ownedPaths:['Workspace/Game','Lighting/Atmosphere']};
const native={id:'arena',spec:{modelId:'arena',targetParentPath:'Workspace/Game',placement:{mode:'origin'},root:{name:'Arena'}}};
test('world extension stages a native model without executing it',()=>{const r=world.validateWorldArtifact({nativeModels:[native]},assignment,{compiler});assert.equal(r.nativeModels[0].rootPath,'Workspace/Game/Arena');assert.equal(r.aggregate.parts,7);});
test('UI worker can have zero native models',()=>assert.equal(world.validateWorldArtifact({}, {role:'ui',ownedPaths:['StarterGui/HUD']},{compiler}).nativeModels.length,0));
test('non-world specialist cannot emit native chunks',()=>assert.throws(()=>world.validateWorldArtifact({nativeModels:[native]},{...assignment,role:'ui'},{compiler})));
test('world output cannot target another subtree',()=>assert.throws(()=>world.validateWorldArtifact({nativeModels:[{...native,spec:{...native.spec,targetParentPath:'Workspace/Other'}}]},assignment,{compiler})));
test('non-deterministic camera placement rejected',()=>assert.throws(()=>world.validateWorldArtifact({nativeModels:[{...native,spec:{...native.spec,placement:{mode:'camera_focus'}}}]},assignment,{compiler})));
test('world compile policy comes from server at integration',()=>{const entry=world.validateWorldArtifact({nativeModels:[native]},assignment,{compiler}).nativeModels[0];assert.equal(world.compileWorldCommand(entry,{compiler,applyMode:'auto_after_approval'}).payload.applyMode,'auto_after_approval');});
test('changed native model hash is not integrated',()=>{const entry=world.validateWorldArtifact({nativeModels:[native]},assignment,{compiler}).nativeModels[0];entry.specHash='stale';assert.throws(()=>world.compileWorldCommand(entry,{compiler,applyMode:'auto_after_approval'}));});
test('duplicate native managed identities rejected',()=>{const two={id:'arena2',spec:{...native.spec,root:{name:'Arena2'}}};assert.throws(()=>world.validateWorldArtifact({nativeModels:[native,two]},assignment,{compiler}));});

const {projectAssistantMessage}=f('assistantMessageProjection.js');
test('build messages never fall back to raw source',()=>{
  const m=projectAssistantMessage({role:'assistant',responseKind:'build',runId:'r1',publicPhase:'building',content:'local Config = {}',explanation:'code',code:'secret',streamState:{code:'secret'},reasoning:'secret'});
  assert.equal(m.content,'Building');assert.equal(m.code,undefined);assert.equal(m.streamState,undefined);assert.equal(m.reasoning,undefined);
});
test('projector uses per-turn kind not composer mode',()=>{
  const ask={role:'assistant',metadata:{responseKind:'answer'},content:'This is an answer.'};assert.equal(projectAssistantMessage(ask),ask);
});
test('user text is never filtered as executor content',()=>{
  const user={role:'user',content:'local Config = {}'};assert.equal(projectAssistantMessage(user),user);
});
test('unknown build state does not claim completion or execution',()=>{
  const m=projectAssistantMessage({role:'assistant',responseKind:'build',content:'Done!'});assert.match(m.content,/check the saved output/);
});
test('artifact ref cannot leak embedded code fields',()=>{
  const m=projectAssistantMessage({role:'assistant',responseKind:'build',artifactRefs:[{artifactId:'a',revision:'r',path:'Workspace/A',source:'source'}]});assert.equal(m.artifactRefs[0].source,undefined);
});

test('native integration accepts only an owned staged artifact',()=>{
  const staged=world.validateWorldArtifact({nativeModels:[native]},assignment,{compiler});
  assert.equal(world.assertStagedWorldCommand({type:'build_native_model',payload:{spec:native.spec}},
    {assignments:[assignment]},[{content:staged}],{compiler}),true);
});
test('native integration rejects a model invented during integration',()=>{
  assert.throws(()=>world.assertStagedWorldCommand({type:'build_native_model',payload:{spec:native.spec}},
    {assignments:[assignment]},[],{compiler}));
});

test('informal emphatic start command still resumes rather than chats',()=>assert.equal(policy.isExecutionFollowUp('mate just fucking start'),true));
test('emphasis does not authorize expanded destructive scope',()=>assert.equal(policy.isExecutionFollowUp('just fucking delete everything'),false));


test('only missing verification is presented as verification pending',()=>{
  const event=publicBuildEvent(scope,1,{type:'result',completion:{changesApplied:true,canComplete:false,blockers:[{reason:'checks_missing',checks:['behavior']}]}});
  assert.equal(event.phase,'verification_pending');
});
test('missing required map is incomplete, not just pending tests',()=>{
  const event=publicBuildEvent(scope,1,{type:'result',completion:{changesApplied:true,canComplete:false,blockers:[{reason:'output_missing',checks:['applied']}]}});
  assert.equal(event.phase,'incomplete');
});
test('new unapplied draft does not erase the fact that previous changes applied',()=>{
  const x=fixture();x.currentOutputs[0].revision='v2';const result=complete(x);
  assert.equal(result.canComplete,false);assert.equal(result.changesApplied,true);
});
