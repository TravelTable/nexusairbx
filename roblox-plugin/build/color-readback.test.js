const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const luaparse = require("../../backend/node_modules/luaparse");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function matchers(source) {
  const start = source.indexOf("local function valuesMatch(expected, actual)");
  const end = source.indexOf("local function instanceProperty(", start);
  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
}

// Execute the actual Lua arithmetic expression trees, rather than copying the
// implementation into a JavaScript reference function. The full matcher also
// has a Luau regression below for environments with the official CLI installed.
function arithmetic(node, bindings) {
  if (node.type === "NumericLiteral") return node.value;
  if (node.type === "Identifier") return bindings[node.name];
  if (node.type === "BinaryExpression") {
    const left = arithmetic(node.left, bindings);
    const right = arithmetic(node.right, bindings);
    if (node.operator === "+") return left + right;
    if (node.operator === "-") return left - right;
    if (node.operator === "*") return left * right;
    if (node.operator === "/") return left / right;
    if (node.operator === ">") return left > right;
  }
  if (node.type === "CallExpression" && node.base.base?.name === "math") {
    const name = node.base.identifier.name;
    assert.ok(["floor", "abs"].includes(name));
    return Math[name](...node.arguments.map((argument) => arithmetic(argument, bindings)));
  }
  throw new Error(`Unsupported color test expression: ${node.type}`);
}

for (const file of ["src/commands/registry.lua", "NexusRBXStudioBridge.plugin.lua"]) {
  test(`${file}: only BasePart.Color accepts its exact quantized channel readback`, () => {
    const source = read(file);
    const matcher = matchers(source);
    assert.doesNotThrow(() => luaparse.parse(matcher));
    assert.match(matcher, /not inst:IsA\("BasePart"\) or key ~= "Color"/);
    assert.match(matcher, /\(expected.type or expected\["\$type"\]\) ~= "Color3"/);
    assert.match(matcher, /\(actual.type or actual\["\$type"\]\) ~= "Color3"/);
    assert.match(matcher, /requested ~= requested or observed ~= observed/);
    assert.match(matcher, /requested < 0 or requested > 1 or observed < 0 or observed > 1/);
    assert.match(source, /addCheck\(kind, path, propertyValuesMatch\(inst, key, expected, actual\)/);
    assert.match(matcher, /math.abs\(expected - actual\) <= 0\.00001/);

    const assignment = matcher.match(/local storedChannel = ([^\r\n]+)/)[1];
    const rejection = matcher.match(/if (math.abs\(storedChannel - observed\) > [\d.]+) then/)[1];
    const expression = (text) => luaparse.parse(`return ${text}`).body[0].arguments[0];
    const accepts = (requested, observed) => !arithmetic(expression(rejection), {
      storedChannel: arithmetic(expression(assignment), { requested }), observed,
    });
    assert.equal(accepts(0.8, 0.800000011920929), true);
    assert.equal(accepts(0.15, 0.14901961386203766), true);
    assert.equal(accepts(0.15, 39 / 255), false, "a neighboring stored color must fail");
    assert.equal(accepts(0.15, 0.15), false, "this branch proves quantization, not a loose tolerance");
    assert.equal(accepts(0, 0), true);
    assert.equal(accepts(1, 1), true);
    for (let channel = 0; channel <= 255; channel += 1) {
      assert.equal(accepts(channel / 255, Math.fround(channel / 255)), true);
    }
  });
}

const luau = process.env.LUAU_BIN || "luau";
const runtimeAvailable = !spawnSync(luau, ["--help"], { encoding: "utf8", windowsHide: true }).error;
test("complete Color3 matcher rejects wrong classes, properties, types, and actual colors", {
  skip: runtimeAvailable ? false : "Set LUAU_BIN to run the complete Luau matcher regression",
}, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nexusrbx-color-test-"));
  try {
    const file = path.join(directory, "color.luau");
    fs.writeFileSync(file, matchers(read("src/commands/registry.lua")) + `
local part = { IsA = function(_, class) return class == "BasePart" end }
local folder = { IsA = function() return false end }
local expected = { type = "Color3", r = 0.8, g = 0.15, b = 0.15 }
local actual = { type = "Color3", r = 0.800000011920929, g = 0.14901961386203766, b = 0.14901961386203766 }
assert(propertyValuesMatch(part, "Color", expected, actual))
assert(not propertyValuesMatch(folder, "Color", expected, actual))
assert(not propertyValuesMatch(nil, "Color", expected, actual))
assert(not propertyValuesMatch(part, "Position", expected, actual))
assert(not propertyValuesMatch(part, "Transparency", 0.15, 0.14901961386203766))
actual.g = 39 / 255
assert(not propertyValuesMatch(part, "Color", expected, actual))
actual.g = 0.14901961386203766
actual.type = "Vector3"
assert(not propertyValuesMatch(part, "Color", expected, actual))
actual.type = nil
actual["$type"] = "Color3"
assert(propertyValuesMatch(part, "Color", expected, actual))
expected.g = 0 / 0
assert(not propertyValuesMatch(part, "Color", expected, actual))
print("Color3 matcher regression passed")
`);
    const run = spawnSync(luau, [file], { encoding: "utf8", windowsHide: true, timeout: 15000 });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /Color3 matcher regression passed/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
