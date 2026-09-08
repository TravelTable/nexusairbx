const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pluginRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");

const SERIALIZER_SOURCE = "src/studio/uiSnapshotSerializer.lua";
const BEGIN_MARKER = `-- BEGIN ${SERIALIZER_SOURCE}`;
const END_MARKER = `-- END ${SERIALIZER_SOURCE}`;

function bundledSerializerSection() {
  const artifact = read("NexusRBXStudioBridge.plugin.lua");
  const start = artifact.indexOf(BEGIN_MARKER);
  const end = artifact.indexOf(END_MARKER);
  assert.ok(start >= 0 && end > start, "generated bundle must contain the uiSnapshotSerializer section");
  return artifact.slice(start, end);
}

test("read_ui_snapshot is dispatchable from the generated bundle", () => {
  const registry = read("src/commands/registry.lua");
  const artifact = read("NexusRBXStudioBridge.plugin.lua");

  assert.match(registry, /^\tread_ui_snapshot = captureUiSnapshot,$/m);
  // UNAVAILABLE_COMMANDS would strip the command back out of attestation.
  const unavailableStart = registry.indexOf("local UNAVAILABLE_COMMANDS = {");
  const unavailableEnd = registry.indexOf("}", unavailableStart);
  assert.doesNotMatch(registry.slice(unavailableStart, unavailableEnd), /read_ui_snapshot/);

  assert.match(artifact, /^\tread_ui_snapshot = captureUiSnapshot,$/m);
  assert.match(artifact, /^captureUiSnapshot = function\(payload\)$/m);
  // registry.lua promotes TOOL_HANDLERS out of `local`, so match the bundled form.
  const handlerTableAt = artifact.indexOf("\nTOOL_HANDLERS = {");
  assert.ok(handlerTableAt > 0, "generated bundle must build TOOL_HANDLERS");
  assert.ok(
    artifact.indexOf(END_MARKER) < handlerTableAt,
    "the serializer must be bundled before registry.lua builds TOOL_HANDLERS",
  );
});

test("the bundled serializer body is present and exported without a require()", () => {
  const section = bundledSerializerSection();

  assert.match(section, /^UI_SNAPSHOT = \{$/m);
  assert.match(section, /^encodeUiSnapshotValue = function\(value\)$/m);
  assert.match(section, /^captureUiSnapshot = function\(payload\)$/m);
  assert.doesNotMatch(section, /\brequire\s*\(/);

  for (const propertyName of [
    "AnchorPoint", "BackgroundTransparency", "Visible", "AbsoluteSize",
    "FontFace", "TextTransparency", "RichText",
    "ImageRectOffset", "SliceCenter",
    "CanvasPosition", "AutomaticCanvasSize",
    "CornerRadius", "PaddingTop", "FillDirection", "CellSize",
  ]) {
    assert.match(section, new RegExp(`"${propertyName}"`), `${propertyName} must be captured`);
  }

  // Lossless coercion: offsets, channels and sequence keypoints all survive.
  assert.match(section, /kind == "UDim" then\s*\n\s*return \{ scale = value\.Scale, offset = value\.Offset \}/);
  assert.match(section, /kind == "Color3" then\s*\n\s*return \{ r = value\.R, g = value\.G, b = value\.B \}/);
  assert.match(section, /kind == "Vector2"/);
  assert.match(section, /kind == "Rect"/);
  assert.match(section, /family = value\.Family, weight = value\.Weight\.Name, style = value\.Style\.Name/);
  assert.match(section, /kind == "ColorSequence"/);
  assert.match(section, /kind == "NumberSequence"/);
  assert.match(section, /kind == "EnumItem" then\s*\n\s*return value\.Name/);
});

test("the serializer performs no writes and executes no source", () => {
  const source = read(SERIALIZER_SOURCE);
  const section = bundledSerializerSection();

  for (const body of [source, section]) {
    assert.doesNotMatch(body, /:SetAttribute\(/);
    assert.doesNotMatch(body, /loadstring/);
    assert.doesNotMatch(body, /\.Source\s*=/);
    assert.doesNotMatch(body, /Instance\.new/);
    assert.doesNotMatch(body, /:Destroy\(/);
    assert.doesNotMatch(body, /:Clone\(/);
    assert.doesNotMatch(body, /\bgetfenv|\bsetfenv/);
    assert.doesNotMatch(body, /:Run\(|RunScript|:SetPrimaryPartCFrame\(/);
  }
});

test("the plugin advertises readUiSnapshot and nothing more", () => {
  const config = read("src/config.lua");
  const artifact = read("NexusRBXStudioBridge.plugin.lua");

  assert.match(config, /^\treadUiSnapshot = true,$/m);
  assert.match(artifact, /^\treadUiSnapshot = true,$/m);
  assert.doesNotMatch(config, /runtimeUiSnapshot|studioRuntimeCapture/);

  const buildId = config.match(/local PLUGIN_BUILD_ID = "([^"]+)"/);
  assert.ok(buildId, "config must declare PLUGIN_BUILD_ID");
  assert.ok(artifact.includes(`local PLUGIN_BUILD_ID = "${buildId[1]}"`), "bundle build ID must match config");
});

test("studio_runtime capture is refused with a structured error, never invented", () => {
  const section = bundledSerializerSection();

  assert.match(section, /mode == "studio_runtime"/);
  assert.match(section, /"STUDIO_RUNTIME_CAPTURE_UNAVAILABLE"/);
  assert.match(section, /cannot observe the player's PlayerGui/);
  assert.match(section, /structuredUnsupported\("read_ui_snapshot", message\)/);
  assert.match(section, /result\.error\.code = code/);
  assert.match(section, /captureMode = "studio_edit"/);

  // Non-ScreenGui and unresolvable roots are structured refusals too.
  assert.match(section, /"UI_SNAPSHOT_ROOT_NOT_SCREENGUI"/);
  assert.match(section, /"UI_SNAPSHOT_ROOT_NOT_FOUND"/);
  assert.match(section, /"UI_SNAPSHOT_PATH_REQUIRED"/);
  assert.match(section, /root:IsA\("ScreenGui"\)/);
  assert.match(section, /resolvePath\(requestedPath\)/);
});

test("budget exhaustion marks the capture incomplete instead of reporting success", () => {
  const section = bundledSerializerSection();

  assert.match(section, /local complete = true/);
  assert.match(section, /depth > maxDepth or count >= maxNodes/);
  assert.match(section, /complete = false/);
  assert.match(section, /"CAPTURE_TRUNCATED"/);
  assert.match(section, /complete = complete,/);
  assert.match(section, /nodeCount = count,/);
});

test("unknown properties and classes surface as warnings, not silent drops", () => {
  const section = bundledSerializerSection();

  assert.match(section, /"PROPERTY_NOT_CAPTURED"/);
  assert.match(section, /"CLASS_NOT_CAPTURED"/);
  assert.match(section, /"DUPLICATE_NODE_ID"/);
  // The supplied module asserted on duplicate IDs; that must not abort a capture.
  assert.doesNotMatch(section, /assert\(not usedIds/);
  assert.match(section, /child:IsA\("LuaSourceContainer"\)/);
  assert.match(section, /warnings = warnings,/);
});
