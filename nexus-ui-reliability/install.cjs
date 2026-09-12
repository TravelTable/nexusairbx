#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const ROOT = __dirname;
const MARKER = '// nexus-ui-reliability-v1';

function single(text, needle, replacement, label) {
  const count = text.split(needle).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one known anchor, found ${count}. No files have been written. Review the supplied snippets against your local changes.`);
  return text.replace(needle, replacement);
}
function between(text, first, last, replacement, label) {
  const count = text.split(first).length - 1;
  if (count !== 1) throw new Error(`${label}: missing or ambiguous start anchor. No files have been written.`);
  const start = text.indexOf(first), end = text.indexOf(last, start + first.length);
  if (end < 0) throw new Error(`${label}: missing end anchor. No files have been written.`);
  return text.slice(0, start) + replacement + text.slice(end);
}
function importAfterStrict(text, declaration, label) {
  const match = text.match(/^["']use strict["'];\n/);
  if (!match) throw new Error(`${label}: expected a strict-mode CommonJS source file.`);
  return text.slice(0, match[0].length) + '\n' + MARKER + '\n' + declaration + '\n' + text.slice(match[0].length);
}
function transform(relative, original) {
  let text = original.replace(/\r\n/g, '\n');
  if (text.includes(MARKER)) return original;
  if (relative.endsWith('/UiDesignDirectorService.test.js')) {
    text = single(text, '  assert.equal(calls[0].response_format.json_schema.strict, true);',
      '  assert.equal(calls[0].response_format, undefined);\n  assert.equal(calls[0].requireResponseFormat, false);\n  assert.match(calls[0].messages[0].content, /OUTPUT CONTRACT/);', 'Director wire assertion');
    text = single(text, 'assert.match(calls[1].messages[1].content, /Unrequested product feature: currency/);',
      'assert.match(calls[1].messages.map(message => message.content).join("\\n"), /Unrequested product feature: currency/);', 'Director repair context assertion');
    return importAfterStrict(text, 'process.env.UI_PLANNER_WIRE_MODE = "prompt_json";', relative);
  }
  if (relative.endsWith('/UiVisualReviewService.test.js')) {
    text = single(text, '  assert.equal(request.requireResponseFormat, true);', '  assert.equal(request.requireResponseFormat, false);', 'Review wire assertion');
    text = single(text, "  assert.deepEqual(request.response_format.json_schema.schema.properties.issues.items.properties.previewId.enum, ['actual-image']);",
      '  assert.equal(request.response_format, undefined);\n  assert.ok(request.messages[0].content.includes(JSON.stringify(require("../lib/uiDesignReview").createUiDesignReviewSchema(input.renders))));', 'Review local contract assertion');
    return importAfterStrict(text, 'process.env.UI_PLANNER_WIRE_MODE = "prompt_json";', relative);
  }
  if (relative.endsWith('/uiDesignReview.js')) {
    text = single(text, 'const normalized = reviews.map(review => normalizeUiDesignReview(review,',
      'const normalized = reviews.map(review => normalizeUiDesignReview(reviewProviderFields(review),', 'Validated review aggregation');
    return importAfterStrict(text, 'const { reviewProviderFields } = require("./uiPlannerReliability");', relative);
  }
  if (relative.endsWith('/UiDesignDirectorService.js')) {
    if (!text.includes('normalizeStructuredDesignOutput') || !text.includes('assertSchema')) throw new Error('Director imports no longer match the reviewed contract; merge manually.');
    text = between(text, '  async structured(', '  async plan(', fs.readFileSync(path.join(ROOT, 'snippets/director-method.txt'), 'utf8'), relative);
    return importAfterStrict(text, 'const { runStructured: runUiStructured } = require("../lib/uiPlannerReliability");', relative);
  }
  if (relative.endsWith('/UiVisualReviewService.js')) {
    if (!text.includes('const evidence = context ?') || !text.includes('UI_VISUAL_REVIEW_IMAGES_REQUIRED')) throw new Error('Reviewer evidence guards no longer match; merge manually.');
    const methodStart = text.indexOf('  async reviewImages(');
    const start = text.indexOf('    const response = await this.chat({', methodStart);
    const end = text.indexOf('  /**', start);
    if (methodStart < 0 || start < 0 || end < 0 || !text.slice(start, end).includes('normalizeReview(')) throw new Error('Reviewer method boundaries no longer match; merge manually.');
    text = text.slice(0, start) + fs.readFileSync(path.join(ROOT, 'snippets/review-method-tail.txt'), 'utf8') + text.slice(end);
    return importAfterStrict(text, 'const { runStructured: runUiStructured } = require("../lib/uiPlannerReliability");', relative);
  }
  if (relative.endsWith('/uiDesignIntelligence.js')) {
    text = single(text,
      'if (schema.enum && !schema.enum.includes(value)) errors.push(`${path} is not an allowed value.`);',
      'if (schema.enum && !schema.enum.includes(value)) errors.push(`${path} is not an allowed value. Received ${JSON.stringify(value)}; expected one of ${JSON.stringify(schema.enum)}.`);',
      'Enum diagnostics');
    text = single(text, 'if (!schema.properties[key])', 'if (!Object.hasOwn(schema.properties, key))', 'Property allowlist');
    text = single(text,
      '(!element.evidence.trim() || !String(prompt).toLowerCase().includes(element.evidence.toLowerCase()))',
      '!hasExplicitEvidence(prompt, element.evidence)', 'Requirement evidence');
    const oldAudio = `  if (spec.interactionRequirements.sounds) {\n    const roles = new Set(spec.assetRequirements.filter(asset => asset.required && asset.assetType === "audio").map(asset => asset.semanticRole));\n    if (!roles.has("hover_sound") || !roles.has("click_sound")) issues.push("Requested hover/click sounds require separate required audio asset roles.");\n  }`;
    text = single(text, oldAudio, '  issues.push(...requiredAudioIssues(spec, { prompt, previousMemory }));', 'Required audio roles');
    text = single(text,
      '  if (spec.interactionRequirements.sounds && (!plan.audioSystem.enabled || !plan.audioSystem.hover.trim() || !plan.audioSystem.click.trim())) issues.push("Requested hover/click audio has not been planned.");',
      '  issues.push(...plannedAudioIssues(spec, plan));', 'Planned audio roles');
    text = single(text,
      '  if (changes.has("motion") || changes.has("audio")) result.interactionRequirements = candidate.interactionRequirements;',
      '  if (changes.has("motion") || changes.has("audio")) result.interactionRequirements = candidate.interactionRequirements;\n  if (changes.has("audio")) result.assetRequirements = clone(candidate.assetRequirements);',
      'Targeted audio edit');
    return importAfterStrict(text, 'const { hasExplicitEvidence, requiredAudioIssues, plannedAudioIssues } = require("./uiPlannerReliability");', relative);
  }
  if (relative.endsWith('/ai.js')) {
    text = single(text, '      if (isAbortLike(err) || streamedContent) throw err;',
      '      if (isAbortLike(err) || streamedContent) throw err;\n      // Deterministic grammar failures must reach the UI boundary, not retry the same payload.\n      if (isUiSchemaCompatibilityError(err)) throw err;', 'Gateway retry boundary');
    if (/^["']use strict["'];\n/.test(text)) return importAfterStrict(text, 'const { isUiSchemaCompatibilityError } = require("./uiPlannerReliability");', relative);
    return MARKER + '\nconst { isUiSchemaCompatibilityError } = require("./uiPlannerReliability");\n' + text;
  }
  throw new Error(`No transform for ${relative}`);
}

const TARGETS = ['src/lib/ai.js', 'src/lib/uiDesignIntelligence.js', 'src/lib/uiDesignReview.js',
  'src/services/UiDesignDirectorService.js', 'src/services/UiVisualReviewService.js',
  'src/services/UiDesignDirectorService.test.js', 'src/services/UiVisualReviewService.test.js'];
const ADDITIONS = ['src/lib/uiPlannerReliability.js', 'src/lib/uiPlannerReliability.test.js',
  'src/services/UiPlannerReliability.integration.test.js'];
function digest(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function under(root, relative) {
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(path.resolve(root) + path.sep)) throw new Error(`Unsafe path ${relative}`);
  // Do not overwrite symlinks or write through a symlinked source directory.
  for (let p = absolute; p !== path.resolve(root); p = path.dirname(p)) {
    if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) throw new Error(`Refusing symlink: ${p}`);
  }
  return absolute;
}
function planChanges(repo) {
  const changes = [];
  for (const relative of TARGETS) {
    const filename = under(repo, relative), before = fs.readFileSync(filename, 'utf8');
    const after = transform(relative, before);
    if (before !== after) changes.push({ relative, before, after });
  }
  for (const relative of ADDITIONS) {
    const filename = under(repo, relative), after = fs.readFileSync(path.join(ROOT, 'backend', relative), 'utf8');
    const before = fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : null;
    if (before === after) continue;
    if (before !== null) throw new Error(`Refusing to overwrite a different existing ${relative}. Merge/reconcile this module first.`);
    changes.push({ relative, before, after });
  }
  // Parse every proposed file BEFORE performing any write to the repo.
  for (const change of changes) {
    const checked = spawnSync(process.execPath, ['--check', '--input-type=commonjs'], { input: change.after, encoding: 'utf8' });
    if (checked.status !== 0) throw new Error(`${change.relative} failed syntax validation:\n${checked.stderr}`);
  }
  return changes;
}
function applyChanges(repo, changes) {
  if (!changes.length) return null;
  const backup = path.join(repo, '.nexus-ui-fix-backup', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(backup, { recursive: true });
  const manifest = [];
  for (const change of changes) {
    if (change.before !== null) {
      const copy = under(backup, change.relative); fs.mkdirSync(path.dirname(copy), { recursive: true });
      fs.writeFileSync(copy, change.before);
    }
    manifest.push({ path: change.relative, existed: change.before !== null, before: change.before === null ? null : digest(change.before), after: digest(change.after) });
  }
  fs.writeFileSync(path.join(backup, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const written = [];
  try {
    for (const change of changes) {
      const filename = under(repo, change.relative);
      const now = fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : null;
      if (now !== change.before) throw new Error(`${change.relative} changed during install.`);
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      const temp = `${filename}.nexus-tmp-${process.pid}`;
      try { fs.writeFileSync(temp, change.after, { flag: 'wx' }); fs.renameSync(temp, filename); }
      finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
      written.push(change);
    }
  } catch (error) {
    for (const change of written.reverse()) {
      const filename = under(repo, change.relative);
      if (change.before === null) fs.unlinkSync(filename); else fs.writeFileSync(filename, change.before);
    }
    throw error;
  }
  return backup;
}
function main(argv) {
  const apply = argv.includes('--apply');
  const positional = argv.filter(v => !['--apply', '--check'].includes(v));
  if (positional.length !== 1) throw new Error('Usage: node install.cjs <nexusrbx-backend directory> [--check | --apply]');
  const repo = fs.realpathSync(positional[0]);
  const pkg = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
  if (pkg.name !== 'nexusrbx-backend') throw new Error('Expected the nexusrbx-backend repository, not the frontend.');
  const changes = planChanges(repo);
  for (const item of changes) console.log(`${item.before === null ? 'ADD' : 'EDIT'} ${item.relative}`);
  if (!apply) { console.log(`Preflight passed: ${changes.length} files. No repository files were changed. Run again with --apply.`); return; }
  const backup = applyChanges(repo, changes);
  console.log(backup ? `Applied ${changes.length} files. Backup: ${backup}` : 'Already installed; no changes.');
  console.log('Restart the backend AND workers. Run the supplied integration suite before a new build.');
}
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { transform, planChanges, applyChanges, main, TARGETS, ADDITIONS };
