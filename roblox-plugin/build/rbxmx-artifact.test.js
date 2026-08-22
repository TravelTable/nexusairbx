const assert = require("node:assert/strict");
const test = require("node:test");

const { buildRbxmx, deterministicIds } = require("./rbxmx-artifact.js");

test("rbxmx identifiers are deterministic for identical plugin source", () => {
  const source = "print('NexusRBX')\n";
  assert.deepEqual(deterministicIds(source), deterministicIds(source));
  assert.equal(buildRbxmx(source), buildRbxmx(source));
});

test("rbxmx identifiers change when plugin source changes", () => {
  const first = deterministicIds("print('first')\n");
  const second = deterministicIds("print('second')\n");
  assert.notDeepEqual(first, second);
  assert.match(first.referent, /^RBX[0-9a-f]{32}$/);
  assert.match(first.scriptGuid, /^\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}$/);
});

test("rbxmx source preserves CDATA terminators safely", () => {
  const artifact = buildRbxmx("local value = ']]>'\n");
  assert.match(artifact, /\]\]\]\]><!\[CDATA\[>/);
  assert.match(artifact, /NexusRBXStudioBridge/);
});
