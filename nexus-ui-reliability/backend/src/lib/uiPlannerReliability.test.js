'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isUiSchemaCompatibilityError, servingSchema, normalizeHex, normalizeContract,
  explicitEvidence, hasExplicitEvidence, requestedAudioRoles, canonicalizeRequirements,
  requiredAudioIssues, plannedAudioIssues, contractIssues, parseObject, runStructured,
} = require('./uiPlannerReliability');
const quiet = { info() {}, warn() {} };
const obj = properties => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const primitiveEnum = ['PrimaryGameCTA', 'MenuButton', 'Title', 'Text', 'Container', 'Custom'];
const schema = obj({ componentSystem: { type: 'array', maxItems: 100, items: obj({
  id: { type: 'string' }, requirementId: { type: 'string' },
  primitive: { type: 'string', enum: primitiveEnum },
}) }, visualSystem: obj({ palette: obj({ primary: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' } }) }) });
const valid = () => ({ componentSystem: [{ id: 'play_button', requirementId: 'play_action', primitive: 'PrimaryGameCTA' }], visualSystem: { palette: { primary: '#AABBCC' } } });
const payload = { requirementSpec: { requiredElements: [{ id: 'play_action', category: 'action', hierarchy: 'primary' }] } };
function options(overrides = {}) {
  return { chat: async () => ({ content: JSON.stringify(valid()) }), name: 'ui_design_plan', schema,
    system: 'Design the requested UI.', payload, model: 'selected/provider-model', maxTokens: 18000,
    validate: value => value, logger: quiet, wireMode: 'prompt_json', ...overrides };
}
for (const [input, output] of [['#aAbBcC', '#AABBCC'], ['#abc', '#AABBCC'], [' #abc ', '#AABBCC'],
  ['rgb(1, 2, 255)', '#0102FF'], ['#AABBCCff', '#AABBCC'], ['#AABBCC80', '#AABBCC80'],
  ['rgb(999, 0, 0)', 'rgb(999, 0, 0)'], ['var(--brand)', 'var(--brand)'], [null, null], [42, 42]]) {
  test(`palette conversion ${JSON.stringify(input)}`, () => assert.equal(normalizeHex(input), output));
}
for (const [input, expected] of [['primary_game_cta', 'PrimaryGameCTA'], ['PRIMARYGAMECTA', 'PrimaryGameCTA'],
  ['textbutton', 'PrimaryGameCTA'], ['ImageButton', 'PrimaryGameCTA'], ['PrimaryButton', 'PrimaryGameCTA'],
  ['Frame', 'Container'], ['TextLabel', 'Text'], ['TitleLabel', 'Title'], ['QuantumWidget', 'QuantumWidget']]) {
  test(`primitive conversion ${input}`, () => {
    const value = valid(); value.componentSystem[0].primitive = input;
    const before = JSON.stringify(value);
    const normalized = normalizeContract(value, schema, payload);
    assert.equal(normalized.value.componentSystem[0].primitive, expected);
    assert.equal(JSON.stringify(value), before, 'normalization must not mutate inputs');
  });
}
test('a secondary TextButton remains a MenuButton', () => {
  const value = valid(); value.componentSystem[0].primitive = 'TextButton';
  const context = { requirementSpec: { requiredElements: [{ id: 'play_action', category: 'action', hierarchy: 'secondary' }] } };
  assert.equal(normalizeContract(value, schema, context).value.componentSystem[0].primitive, 'MenuButton');
});
test('an unknown primitive is never replaced with Custom', () => {
  const value = valid(); value.componentSystem[0].primitive = 'RandomWidget';
  const normalized = normalizeContract(value, schema, payload).value;
  const issues = contractIssues(normalized, schema);
  assert.match(issues.join(' '), /RandomWidget.*allowed values.*PrimaryGameCTA/);
});
test('serving schema keeps nested enum values and field names; source remains unchanged', () => {
  const source = obj({ format: { type: 'string', enum: ['a', 'b'], maxLength: 100 },
    list: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'number', minimum: 0, maximum: 50 } } });
  const before = JSON.stringify(source), wire = servingSchema(source);
  assert.deepEqual(wire.properties.format.enum, ['a', 'b']);
  assert.deepEqual(wire.properties.list.items, { type: 'number' });
  assert.equal(wire.properties.list.maxItems, undefined);
  assert.equal(JSON.stringify(source), before);
});
for (const text of ['400 The specified schema produces a constraint that has too many states for serving.',
  'The compiled grammar is too large, which would cause performance issues.', 'Schema is too complex for compilation.',
  'response_format is not supported for this model']) {
  test('recognizes provider schema incompatibility: ' + text.slice(0, 45), () => assert.equal(isUiSchemaCompatibilityError(Object.assign(new Error(text), { status: 400 })), true));
}
for (const [status, text] of [[400, 'invalid input'], [400, 'schema missing a required property'], [401, 'unauthorized'],
  [402, 'no credit'], [429, 'rate limit'], [503, 'schema compiler unavailable']]) {
  test(`does not classify operational error ${status} ${text}`, () => assert.equal(isUiSchemaCompatibilityError(Object.assign(new Error(text), { status })), false));
}
test('reads bounded nested SDK error envelopes', () => {
  const error = { status: 400, response: { data: { error: { message: 'The compiled grammar is too large' } } } };
  error.cause = error;
  assert.equal(isUiSchemaCompatibilityError(error), true);
});
for (const [input, expected] of [
  ['Add subtle hover and click sounds.', ['hover_sound', 'click_sound']],
  ['Add a sound when the button is clicked.', ['click_sound']],
  ['Use subtle click sounds.', ['click_sound']],
  ['Use hover animations, with background music.', []],
  ['No hover or click sounds.', []],
  ['Make the layout smaller.', []],
]) test(`audio intent ${input}`, () => assert.deepEqual(requestedAudioRoles(input), expected));
function extraction() {
  return { requirementSpec: {
    requiredElements: [{ id: 'play', label: 'Play Button', category: 'action', hierarchy: 'primary', semanticAction: 'play', source: 'explicit', evidence: 'the prominent Play control' }],
    interactionRequirements: { sounds: true }, assetRequirements: [],
  } };
}
test('evidence is a real original prompt slice, not model-authored prose', () => {
  const prompt = 'Make a large Play button with hover and click sounds.';
  const fixed = canonicalizeRequirements(extraction(), { request: prompt });
  assert.equal(fixed.value.requirementSpec.requiredElements[0].evidence, 'Play button');
  assert.equal(prompt.includes(fixed.value.requirementSpec.requiredElements[0].evidence), true);
  assert.deepEqual(fixed.value.requirementSpec.assetRequirements.map(a => a.semanticRole), ['hover_sound', 'click_sound']);
  for (const asset of fixed.value.requirementSpec.assetRequirements) {
    assert.equal(OWN(asset, 'robloxAssetId'), false);
    assert.deepEqual(asset.componentIds, [], 'do not mistake requirement IDs for component IDs');
  }
  assert.equal(fixed.value.requirementSpec.requiredElements.length, 1);
});
function OWN(value, key) { return Object.hasOwn(value, key); }
test('a negative mention never becomes positive requirement evidence', () => {
  assert.equal(explicitEvidence('Do not add a Shop button.', 'Shop button'), '');
  assert.equal(hasExplicitEvidence('Do not add a Shop button.', 'Shop button'), false);
  assert.equal(explicitEvidence('No Shop button, but include Play.', 'Play'), 'Play');
  assert.equal(explicitEvidence('Display the score.', 'play'), '');
});
test('invented explicit feature is left for the grounding validator to reject', () => {
  const value = extraction(); Object.assign(value.requirementSpec.requiredElements[0], { label: 'Shop button', semanticAction: 'shop', evidence: 'prominent Shop control' });
  const result = canonicalizeRequirements(value, { request: 'Make a Play button.' });
  assert.equal(result.value.requirementSpec.requiredElements[0].evidence, 'prominent Shop control');
});
test('previous trusted requirements retain provenance on narrow edits', () => {
  const value = extraction();
  const result = canonicalizeRequirements(value, { request: 'Make it bigger.', previousDesignMemory: { requirementSpec: value.requirementSpec } });
  assert.equal(result.value.requirementSpec.requiredElements[0].evidence, value.requirementSpec.requiredElements[0].evidence);
});
test('audio canonicalization is idempotent', () => {
  const context = { request: 'Add a Play button with hover and click sounds.' };
  const one = canonicalizeRequirements(extraction(), context).value;
  assert.deepEqual(canonicalizeRequirements(one, context).value, one);
});
test('click-only audio passes without inventing a hover role', () => {
  const context = { request: 'Add a Play button with a click sound.' };
  const spec = canonicalizeRequirements(extraction(), context).value.requirementSpec;
  assert.deepEqual(requiredAudioIssues(spec, { prompt: context.request }), []);
  assert.deepEqual(plannedAudioIssues(spec, { audioSystem: { enabled: true, click: 'short click', hover: '' } }), []);
  assert.deepEqual(spec.assetRequirements.map(a => a.semanticRole), ['click_sound']);
});
test('generic requested audio still needs an asset requirement', () => {
  assert.match(requiredAudioIssues(extraction().requirementSpec, { prompt: 'Add UI sounds.' }).join(' '), /at least one/);
});
for (const source of ['{}', '```json\n{}\n```']) test('accepts bounded complete JSON: ' + source.slice(0, 12), () => assert.deepEqual(parseObject(source), {}));
for (const source of ['Here is {}', '[]', 'null', '{"a":1,}', '{"__proto__":{}}', '{"constructor":{}}']) {
  test('rejects invalid/dangerous JSON: ' + source, () => assert.throws(() => parseObject(source)));
}
test('rejects oversized output before attempting JSON repair', () => assert.throws(() => parseObject('{"a":"long"}', 4)));
test('prompt-json mode sends exact contract as text and no response_format or tools', async () => {
  let input;
  const result = await runStructured(options({ chat: async request => { input = request; return { content: JSON.stringify(valid()) }; } }));
  assert.equal(result.contractTransport, 'prompt_json');
  assert.equal(OWN(input, 'response_format'), false);
  assert.equal(OWN(input, 'tools'), false);
  assert.equal(input.requireResponseFormat, false);
  assert.ok(input.messages[0].content.includes(JSON.stringify(schema)));
  assert.equal(input.model, 'selected/provider-model');
});
test('reduced-schema rejection changes the payload exactly once, keeping the model', async () => {
  const calls = [];
  const result = await runStructured(options({ wireMode: 'reduced_schema', chat: async request => {
    calls.push(request);
    if (calls.length === 1) throw Object.assign(new Error('The compiled grammar is too large'), { status: 400 });
    return { content: JSON.stringify(valid()) };
  } }));
  assert.equal(calls.length, 2);
  assert.equal(calls[0].requireResponseFormat, true);
  assert.equal(OWN(calls[1], 'response_format'), false);
  assert.equal(result.contractTransport, 'prompt_json');
  assert.deepEqual(calls.map(c => c.model), ['selected/provider-model', 'selected/provider-model']);
});
test('fallback request errors propagate instead of looping', async () => {
  let calls = 0;
  await assert.rejects(runStructured(options({ wireMode: 'reduced_schema', chat: async () => {
    calls++; throw Object.assign(new Error('The compiled grammar is too large'), { status: 400 });
  } })), /compiled grammar/);
  assert.equal(calls, 2);
});
for (const status of [401, 402, 429, 503]) test(`status ${status} is not a local validation retry`, async () => {
  let calls = 0; const error = Object.assign(new Error('provider unavailable'), { status });
  await assert.rejects(runStructured(options({ chat: async () => { calls++; throw error; } })), error);
  assert.equal(calls, 1);
});
test('primitive alias and short hex normalize before strict validation', async () => {
  const value = valid(); value.componentSystem[0].primitive = 'TextButton'; value.visualSystem.palette.primary = '#abc';
  const result = await runStructured(options({ chat: async () => ({ content: JSON.stringify(value) }) }));
  assert.deepEqual(result.value, valid());
  assert.equal(result.contractAttempts, 1);
  assert.equal(result.normalizationCorrections.length, 2);
});
test('semantic rejection supplies prior candidate and exact defects for bounded repair', async () => {
  const calls = []; let validates = 0;
  const result = await runStructured(options({ chat: async request => { calls.push(request); return { content: JSON.stringify(valid()) }; },
    validate: value => { if (++validates === 1) throw Object.assign(new Error('Semantic failure'), { issues: ['Unrequested product feature: currency'] }); return value; } }));
  assert.equal(result.contractAttempts, 2);
  assert.ok(calls[1].messages.some(m => m.role === 'assistant' && JSON.parse(m.content).componentSystem));
  assert.match(calls[1].messages.at(-1).content, /Unrequested product feature: currency/);
});
test('unknown primitive retries with allowed values and then fails honestly', async () => {
  const value = valid(); value.componentSystem[0].primitive = 'MagicWidget'; let calls = 0, validates = 0;
  await assert.rejects(runStructured(options({ chat: async request => {
    calls++; if (calls === 2) assert.match(request.messages.at(-1).content, /allowed values.*PrimaryGameCTA/);
    return { content: JSON.stringify(value) };
  }, validate: () => { validates++; } })), error => error.code === 'UI_DESIGN_SPEC_INVALID' && /MagicWidget/.test(error.issues.join(' ')));
  assert.equal(calls, 2); assert.equal(validates, 0);
});
test('truncation never becomes success and gets one complete-object repair', async () => {
  let calls = 0;
  const result = await runStructured(options({ chat: async () => ++calls === 1 ? { content: '{', finishReason: 'length' } : { content: JSON.stringify(valid()) } }));
  assert.equal(result.contractAttempts, 2);
});
test('refusals do not cause automatic retry', async () => {
  let calls = 0;
  await assert.rejects(runStructured(options({ chat: async () => { calls++; return { content: '{}', refusal: true }; } })), { code: 'UI_MODEL_REFUSAL' });
  assert.equal(calls, 1);
});
test('parent cancellation prevents calls', async () => {
  const c = new AbortController(); const reason = new Error('cancelled'); c.abort(reason); let calls = 0;
  await assert.rejects(runStructured(options({ signal: c.signal, chat: async () => { calls++; } })), reason);
  assert.equal(calls, 0);
});
test('cancellation during an in-flight call does not reissue it', async () => {
  const controller = new AbortController(); let calls = 0, requestSignal;
  const operation = runStructured(options({ signal: controller.signal, chat: async request => { calls++; requestSignal = request.signal; return new Promise(() => {}); } }));
  await new Promise(r => setImmediate(r)); controller.abort(new Error('stop'));
  await assert.rejects(operation, /stop/);
  assert.equal(requestSignal.aborted, true); assert.equal(calls, 1);
});
test('whole-stage timeout also settles when a faulty adapter ignores abort', async () => {
  let calls = 0, requestSignal;
  await assert.rejects(runStructured(options({ timeoutMs: 20, chat: async request => { calls++; requestSignal = request.signal; return new Promise(() => {}); } })), { code: 'UI_PLANNER_TIMEOUT' });
  assert.equal(calls, 1); assert.equal(requestSignal.aborted, true);
});
test('multimodal image parts are kept and a negative review remains negative', async () => {
  const reviewSchema = obj({ accepted: { type: 'boolean' } }); let input;
  const parts = [{ type: 'text', text: 'previewId=real' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,real' } }];
  const result = await runStructured(options({ name: 'ui_visual_review', normalizeUi: false, schema: reviewSchema,
    messages: [{ role: 'system', content: 'Judge the image.' }, { role: 'user', content: parts }],
    chat: async request => { input = request; return { content: '{"accepted":false}' }; } }));
  assert.deepEqual(input.messages[1].content, parts);
  assert.equal(result.value.accepted, false);
});
test('diagnostic logs contain no prompts, output, credentials or image bytes', async () => {
  const logs = [];
  await runStructured(options({ system: 'SECRET_PROMPT', logger: { info: (...v) => logs.push(v), warn: (...v) => logs.push(v) } }));
  const logged = JSON.stringify(logs);
  assert.match(logged, /schemaHash/); assert.doesNotMatch(logged, /SECRET_PROMPT|componentSystem|AABBCC/);
});


test('trusted review projection removes derived fields without changing provider verdict or evidence', () => {
  const { reviewProviderFields } = require('./uiPlannerReliability');
  const raw = { accepted: false, scores: { composition: 4 }, reviewedPreviewIds: ['actual'], issues: [], criticalIssues: [], repairInstructions: ['Fix spacing'], repairPlan: { preserve: [], modify: ['spacing'], remove: [], add: [] } };
  assert.deepEqual(reviewProviderFields({ ...raw, acceptable: false, acceptanceFailures: ['Low score'] }), raw);
});
