'use strict';
// Run AFTER installing, in the actual backend checkout. No provider/API keys are used.
const test = require('node:test');
const assert = require('node:assert/strict');
process.env.UI_PLANNER_WIRE_MODE = 'prompt_json';
const { UiDesignDirectorService } = require('./UiDesignDirectorService');
const { brainrotPlanning, brainrotPrompt } = require('../test/uiDesignFixtures');
const { validateRequirementGrounding, validateUiDesignPlan, normalizeUiDesignMemory } = require('../lib/uiDesignIntelligence');
const { UiVisualReviewService } = require('./UiVisualReviewService');
const { SCORE_THRESHOLDS, normalizeUiDesignReview, aggregateUiDesignReviews } = require('../lib/uiDesignReview');
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const extraction = p => ({ requirementSpec: p.requirementSpec, editIntent: p.editIntent });
const callPlan = (service, extra = {}) => service.plan({ document: { designId: 'regression' }, prompt: brainrotPrompt,
  intent: 'create', userId: 'test-user', userPlan: 'PRO', model: 'test/provider-model', ...extra });
function serviceFrom(outputs, calls = []) {
  return new UiDesignDirectorService({ resolveModel: () => 'test/provider-model', chat: async input => {
    calls.push(input);
    const next = outputs.shift();
    if (next instanceof Error) throw next;
    assert.notEqual(next, undefined, 'unexpected additional paid/model attempt');
    return { content: JSON.stringify(next), finishReason: 'stop', resolvedModel: input.model };
  } });
}
function review(previewId, accepted = true) {
  return { accepted, scores: { ...SCORE_THRESHOLDS }, reviewedPreviewIds: [previewId], issues: [], criticalIssues: [],
    repairInstructions: accepted ? [] : ['Fix the cited layout.'],
    repairPlan: { preserve: ['Requested behavior'], modify: accepted ? [] : ['Improve layout'], remove: [], add: [] } };
}

test('one request recovers quotation, audio roles, all four primitives and palette syntax together', async () => {
  const p = brainrotPlanning();
  for (const r of p.requirementSpec.requiredElements) r.evidence = `the prominent ${r.semanticAction} control`;
  p.requirementSpec.assetRequirements = p.requirementSpec.assetRequirements.filter(a => a.assetType !== 'audio');
  for (const c of p.designPlan.componentSystem) c.primitive = 'TextButton';
  p.designPlan.visualSystem.palette.primary = 'rgb(255, 43, 135)';
  p.designPlan.visualSystem.palette.textPrimary = '#fff';
  const calls = [];
  const result = await callPlan(serviceFrom([extraction(p), p.designPlan], calls));
  assert.equal(calls.length, 2);
  assert.deepEqual(validateRequirementGrounding(result.requirementSpec, { prompt: brainrotPrompt }), { valid: true, issues: [] });
  assert.deepEqual(validateUiDesignPlan(result.requirementSpec, result.designPlan), { valid: true, issues: [] });
  assert.ok(normalizeUiDesignMemory(result.designMemory));
  assert.deepEqual(result.designPlan.componentSystem.map(c => c.primitive), ['PrimaryGameCTA', 'MenuButton', 'MenuButton', 'MenuButton']);
  assert.ok(calls.every(c => !Object.hasOwn(c, 'response_format')));
  assert.ok(calls.every(c => c.messages[0].content.includes('"enum"')));
  assert.equal(result.runtimeVerified, undefined, 'a valid plan is not a gameplay pass');
});

test('an unknown primitive gets a repair request containing its value and the permitted enum', async () => {
  const p = brainrotPlanning(), broken = structuredClone(p.designPlan), calls = [];
  broken.componentSystem[0].primitive = 'QuantumNavigationSystem';
  const result = await callPlan(serviceFrom([extraction(p), broken, p.designPlan], calls));
  assert.equal(calls.length, 3);
  assert.match(calls[2].messages.at(-1).content, /QuantumNavigationSystem/);
  assert.match(calls[2].messages.at(-1).content, /PrimaryGameCTA/);
  assert.ok(calls[2].messages.some(m => m.role === 'assistant'));
  assert.equal(result.designPlan.componentSystem[0].primitive, 'PrimaryGameCTA');
});

test('persistent malformed output is bounded and does not report a plan or runtime success', async () => {
  const p = brainrotPlanning(), broken = structuredClone(p.designPlan), calls = [];
  broken.componentSystem[0].primitive = 'QuantumNavigationSystem';
  await assert.rejects(callPlan(serviceFrom([extraction(p), broken, broken], calls)), { code: 'UI_DESIGN_SPEC_INVALID' });
  assert.equal(calls.length, 3);
});

test('targeted edits still preserve unrelated buttons, palette, motion and requirements', async () => {
  const previous = brainrotPlanning(), changed = structuredClone(previous.designPlan), calls = [];
  changed.componentSystem[0].size.desktop = '460x132';
  changed.componentSystem[1].label = 'Invented shop replacement';
  changed.visualSystem.palette.primary = '#000000';
  const editIntent = { scope: 'redesign', targetIds: ['play_button'], permittedChanges: ['size', 'palette', 'features'],
    changeInstructions: ['Make Play bigger'], preserve: [], removeElementIds: [] };
  const service = serviceFrom([{ requirementSpec: previous.requirementSpec, editIntent }, changed], calls);
  const result = await callPlan(service, { document: { designId: 'regression', designMemory: previous.designMemory },
    prompt: 'Make the Play button bigger.', intent: 'edit' });
  assert.equal(result.designPlan.componentSystem[0].size.desktop, '460x132');
  assert.equal(result.designPlan.componentSystem[1].label, 'Shop');
  assert.deepEqual(result.designPlan.visualSystem.palette, previous.designPlan.visualSystem.palette);
  assert.deepEqual(result.designPlan.motionSystem, previous.designPlan.motionSystem);
  assert.deepEqual(result.requirementSpec, previous.requirementSpec);
});

test('strict schema and semantic grounding still reject an invented currency system', async () => {
  const p = brainrotPlanning(), bad = structuredClone(extraction(p));
  bad.requirementSpec.requiredElements.push({ id: 'currency', label: 'Currency HUD', semanticAction: 'currency',
    category: 'system', hierarchy: 'tertiary', source: 'explicit', evidence: 'colorful' });
  await assert.rejects(callPlan(serviceFrom([bad, bad])), error => error.code === 'UI_DESIGN_SPEC_INVALID' && error.issues.some(issue => /Unrequested product feature: currency/.test(issue)));
});

test('the actual reviewer is schema-free on the wire, retains PNGs, and remains image-bound', async () => {
  const calls = [];
  const service = new UiVisualReviewService({ previewService: {}, chat: async input => {
    calls.push(input); return { content: JSON.stringify(review('actual-image')) };
  } });
  const renders = [{ previewId: 'actual-image', viewportId: 'desktop' }];
  const parts = [{ type: 'image_url', image_url: { url: 'data:image/png;base64,' + PNG } }];
  const result = await service.reviewImages({ model: 'test/vision-model', renders, parts });
  assert.equal(result.acceptable, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].response_format, undefined);
  assert.deepEqual(calls[0].messages[1].content, parts);
  await assert.rejects(service.reviewImages({ model: 'test/vision-model', renders, parts: [] }), { code: 'UI_VISUAL_REVIEW_IMAGES_REQUIRED' });
  assert.equal(calls.length, 1);
});

test('a fabricated preview identifier never becomes a visual success', async () => {
  const service = new UiVisualReviewService({ previewService: {}, chat: async () => ({ content: JSON.stringify(review('fabricated')) }) });
  await assert.rejects(service.reviewImages({ model: 'test/vision-model', renders: [{ previewId: 'actual-image' }],
    parts: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,' + PNG } }] }), { code: 'UI_VISUAL_REVIEW_INCOMPLETE' });
});

test('durable aggregation accepts normalized reviews without loosening raw review validation', () => {
  const raw = review('desktop'), normalized = normalizeUiDesignReview(raw, [{ previewId: 'desktop' }]);
  assert.ok(Object.hasOwn(normalized, 'acceptable'));
  assert.equal(aggregateUiDesignReviews([normalized]).accepted, true);
  assert.throws(() => normalizeUiDesignReview({ ...raw, unexpected: true }, [{ previewId: 'desktop' }]));
});

test('a normalized rejected review stays rejected during aggregation', () => {
  const raw = review('phone', false);
  const normalized = normalizeUiDesignReview(raw, [{ previewId: 'phone' }]);
  assert.equal(aggregateUiDesignReviews([normalized]).accepted, false);
});
