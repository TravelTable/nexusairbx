'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { transform, planChanges, applyChanges, TARGETS } = require('../install.cjs');

// These are reduced source fixtures containing the exact reviewed edit anchors.
// They test safe installation, not execution of the user's entire repository.
const fixtures = {
  'src/lib/ai.js': `async function f(err) {\n      if (isAbortLike(err) || streamedContent) throw err;\n return 1; }`,
  'src/lib/uiDesignReview.js': `'use strict';\nfunction aggregate(reviews) {\n  const normalized = reviews.map(review => normalizeUiDesignReview(review,\n    (review.reviewedPreviewIds || []).map(previewId => ({ previewId })))); return normalized;\n}\n`,
  'src/services/UiDesignDirectorService.js': `"use strict";\nconst { normalizeStructuredDesignOutput, assertSchema } = require('../lib/uiDesignIntelligence');\nclass UiDesignDirectorService {\n  async structured(args) { return 'old'; }\n\n  async plan(input) { return input; }\n}\nmodule.exports = { UiDesignDirectorService };`,
  'src/services/UiVisualReviewService.js': `"use strict";\nclass UiVisualReviewService {\n  async reviewImages({context, parts, renders}) {\n    if (!parts.length) throw new Error('UI_VISUAL_REVIEW_IMAGES_REQUIRED');\n    const evidence = context ? [...parts] : parts;\n    const response = await this.chat({});\n    return normalizeReview(response, renders);\n  }\n\n  /** second method must survive */\n  async other() { return 42; }\n}\n`,
  'src/services/UiDesignDirectorService.test.js': `"use strict";\nfunction t() {\n  assert.equal(calls[0].response_format.json_schema.strict, true);\n  assert.match(calls[1].messages[1].content, /Unrequested product feature: currency/);\n}\n`,
  'src/services/UiVisualReviewService.test.js': `"use strict";\nfunction t() {\n  assert.equal(request.requireResponseFormat, true);\n  assert.deepEqual(request.response_format.json_schema.schema.properties.issues.items.properties.previewId.enum, ['actual-image']);\n}\n`,
  'src/lib/uiDesignIntelligence.js': `"use strict";\nfunction f(schema, value, path, errors, spec, plan, prompt, previousMemory, element, changes, result, candidate) {\n  if (schema.enum && !schema.enum.includes(value)) errors.push(\
\`\${path} is not an allowed value.\`);\n  for (const key of Object.keys(value)) if (!schema.properties[key]) errors.push(key);\n  if (element.source === "explicit" && (!element.evidence.trim() || !String(prompt).toLowerCase().includes(element.evidence.toLowerCase()))) errors.push('bad');\n  if (spec.interactionRequirements.sounds) {\n    const roles = new Set(spec.assetRequirements.filter(asset => asset.required && asset.assetType === "audio").map(asset => asset.semanticRole));\n    if (!roles.has("hover_sound") || !roles.has("click_sound")) issues.push("Requested hover/click sounds require separate required audio asset roles.");\n  }\n  if (spec.interactionRequirements.sounds && (!plan.audioSystem.enabled || !plan.audioSystem.hover.trim() || !plan.audioSystem.click.trim())) issues.push("Requested hover/click audio has not been planned.");\n  if (changes.has("motion") || changes.has("audio")) result.interactionRequirements = candidate.interactionRequirements;\n}\n`,
};
function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-ui-install-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [relative, text] of Object.entries(fixtures)) {
    const target = path.join(root, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, text);
  }
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"nexusrbx-backend"}');
  return root;
}
test('installer preflights every transformation without writing repository files', t => {
  const root = temporary(t), changes = planChanges(root);
  assert.equal(changes.length, 10);
  for (const [relative, source] of Object.entries(fixtures)) assert.equal(fs.readFileSync(path.join(root, relative), 'utf8'), source);
  assert.equal(fs.existsSync(path.join(root, 'src/lib/uiPlannerReliability.js')), false);
});
test('installer applies all files, makes backups, and is idempotent', t => {
  const root = temporary(t), changes = planChanges(root), backup = applyChanges(root, changes);
  assert.equal(fs.existsSync(path.join(backup, 'manifest.json')), true);
  assert.equal(planChanges(root).length, 0);
  for (const relative of TARGETS) assert.equal(fs.readFileSync(path.join(backup, relative), 'utf8'), fixtures[relative]);
});
test('unknown local changes refuse installation before any writes', t => {
  const root = temporary(t);
  fs.writeFileSync(path.join(root, 'src/services/UiDesignDirectorService.js'), 'const differentVersion = true;');
  assert.throws(() => planChanges(root), /no longer match/);
  assert.equal(fs.existsSync(path.join(root, 'src/lib/uiPlannerReliability.js')), false);
  assert.equal(fs.readFileSync(path.join(root, 'src/lib/ai.js'), 'utf8'), fixtures['src/lib/ai.js']);
});
test('CRLF sources are accepted and unrelated methods remain intact', () => {
  const source = fixtures['src/services/UiDesignDirectorService.js'].replace(/\n/g, '\r\n');
  const result = transform('src/services/UiDesignDirectorService.js', source);
  assert.match(result, /async plan\(input\) \{ return input; \}/);
  assert.match(result, /runUiStructured/);
});
test('review patch preserves image guards and subsequent methods', () => {
  const result = transform('src/services/UiVisualReviewService.js', fixtures['src/services/UiVisualReviewService.js']);
  assert.match(result, /UI_VISUAL_REVIEW_IMAGES_REQUIRED/);
  assert.match(result, /other\(\) \{ return 42; \}/);
  assert.match(result, /normalizeReview\(value, renders\)/);
});
test('partial write error triggers rollback of previously written files', t => {
  const root = temporary(t), changes = planChanges(root), originalRename = fs.renameSync;
  let renames = 0;
  fs.renameSync = (...args) => { if (++renames === 2) throw new Error('simulated write failure'); return originalRename(...args); };
  try { assert.throws(() => applyChanges(root, changes), /simulated write failure/); }
  finally { fs.renameSync = originalRename; }
  for (const [relative, source] of Object.entries(fixtures)) assert.equal(fs.readFileSync(path.join(root, relative), 'utf8'), source);
});
test('installer does not overwrite a user-modified helper module', t => {
  const root = temporary(t); fs.writeFileSync(path.join(root, 'src/lib/uiPlannerReliability.js'), '// user customization');
  assert.throws(() => planChanges(root), /Refusing to overwrite/);
});
test('ai retry guard precedes all legacy identical-payload retry logic', () => {
  const result = transform('src/lib/ai.js', fixtures['src/lib/ai.js']);
  assert.match(result, /if \(isUiSchemaCompatibilityError\(err\)\) throw err;/);
  assert.match(result, /if \(isAbortLike\(err\) \|\| streamedContent\) throw err;/);
});
