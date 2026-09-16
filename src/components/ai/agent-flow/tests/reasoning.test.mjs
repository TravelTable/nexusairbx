import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { defineAgentFlow } from '../dist/agent-flow.js';

const dom = new JSDOM('<!doctype html>', { url: 'http://localhost' });
for (const key of ['window', 'document', 'HTMLElement', 'customElements', 'Text']) globalThis[key] = dom.window[key];
defineAgentFlow();

test('thinking settles, preserves manual toggles, and supports subsequent reasoning', () => {
  const node = document.createElement('agent-flow');
  document.body.append(node);
  const reasoning = { type: 'reasoning', id: 'r1', text: 'A provider summary', streaming: true };
  const update = (events, status = 'streaming') => { node.run = { id: 'run1', events, status }; };
  update([reasoning]);
  const fold = node.shadowRoot.querySelector('.reasoning');
  assert.equal(fold.open, true);
  assert.match(fold.textContent, /Thinking…/);
  fold.open = false;
  update([{ ...reasoning, text: 'A provider summary updated' }]);
  assert.equal(fold.open, false);
  fold.open = true;
  update([{ ...reasoning, streaming: false, durationMs: 8000 }]);
  assert.equal(fold.open, false);
  assert.match(fold.textContent, /Thought for 8s/);
  fold.open = true;
  update([{ ...reasoning, streaming: false, durationMs: 8000 }, { ...reasoning, id: 'r2' }]);
  assert.equal(fold.open, true);
  assert.equal(node.shadowRoot.querySelectorAll('.reasoning')[1].open, true);
  node.remove();
});

test('empty thinking has no invented summary and retains measured completion', () => {
  const node = document.createElement('agent-flow');
  document.body.append(node);
  const part = { type: 'reasoning', id: 'r1', text: '', streaming: true };
  node.run = { id: 'run2', status: 'streaming', events: [part] };
  const fold = node.shadowRoot.querySelector('.reasoning');
  assert.equal(fold.hidden, false);
  assert.equal(fold.querySelector('.reasoning-body').textContent, '');
  assert.equal(fold.querySelector('summary').getAttribute('aria-disabled'), 'true');
  node.run = { id: 'run2', status: 'idle', events: [{ ...part, streaming: false }] };
  assert.equal(fold.hidden, false);
  assert.equal(fold.open, false);
  assert.match(fold.textContent, /Thought for/);
  node.remove();
});
