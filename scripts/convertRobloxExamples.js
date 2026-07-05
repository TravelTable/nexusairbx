#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");
const { RobloxFile } = require("rbxm-parser");

const SUPPORTED_EXTENSIONS = new Set([".rbxl", ".rbxm", ".rbxlx", ".rbxmx"]);
const MAX_INPUT_BYTES = 100 * 1024 * 1024;
const MAX_SCRIPT_CHARS = 300_000;
const MAX_TOTAL_SCRIPT_CHARS = 1_500_000;
const MAX_PROPERTY_STRING_CHARS = 800;
const MAX_TREE_NODES = 12_000;
const MAX_ASSET_REFERENCES = 250;
const MAX_SUMMARY_ITEMS = 40;

const SCRIPT_CLASSES = new Set(["Script", "LocalScript", "ModuleScript"]);
const REMOTE_CLASSES = new Set([
  "RemoteEvent",
  "RemoteFunction",
  "UnreliableRemoteEvent",
  "BindableEvent",
  "BindableFunction",
]);
const SKIPPED_PROPERTY_PATTERNS = [
  /source/i,
  /binary/i,
  /meshdata/i,
  /sharedstring/i,
  /physicalconfig/i,
  /password/i,
  /secret/i,
  /api[_-]?key/i,
  /auth(orization)?/i,
  /token/i,
];
const SAFE_PROPERTY_NAMES = new Set([
  "Name",
  "Text",
  "PlaceholderText",
  "RichText",
  "Visible",
  "Active",
  "Selectable",
  "Interactable",
  "AutoButtonColor",
  "Position",
  "Size",
  "AnchorPoint",
  "AutomaticSize",
  "LayoutOrder",
  "ZIndex",
  "Rotation",
  "BackgroundColor3",
  "BackgroundTransparency",
  "BorderColor3",
  "BorderSizePixel",
  "Image",
  "ImageColor3",
  "ImageTransparency",
  "ImageRectOffset",
  "ImageRectSize",
  "ScaleType",
  "SliceCenter",
  "SliceScale",
  "TileSize",
  "Font",
  "FontFace",
  "TextColor3",
  "TextSize",
  "TextScaled",
  "TextWrapped",
  "TextXAlignment",
  "TextYAlignment",
  "TextStrokeColor3",
  "TextStrokeTransparency",
  "LineHeight",
  "CanvasSize",
  "ScrollBarThickness",
  "ScrollingDirection",
  "ClipsDescendants",
  "CornerRadius",
  "Thickness",
  "Color",
  "Transparency",
  "ApplyStrokeMode",
  "FillDirection",
  "HorizontalAlignment",
  "VerticalAlignment",
  "Padding",
  "CellSize",
  "CellPadding",
  "SortOrder",
  "SoundId",
  "Volume",
  "PlaybackSpeed",
  "Texture",
  "TextureID",
  "MeshId",
  "AnimationId",
  "Enabled",
  "Disabled",
  "RunContext",
  "LinkedSource",
  "RequiresHandle",
  "CanCollide",
  "Material",
  "BrickColor",
  "Shape",
  "CFrame",
  "Orientation",
  "WorldPosition",
  "Value",
  "SourceAssetId",
  "Tags",
  "AttributesSerialize",
]);

function main() {
  const rawDir = path.resolve(
    process.argv[2] || path.join(process.cwd(), "Roblox examples for Ai", "raw"),
  );
  const outputDir = path.resolve(
    process.argv[3] || path.join(process.cwd(), "Roblox examples for Ai", "converted"),
  );

  if (!fs.existsSync(rawDir) || !fs.statSync(rawDir).isDirectory()) {
    throw new Error(`Raw examples directory does not exist: ${rawDir}`);
  }
  if (isSameOrInside(outputDir, rawDir)) {
    throw new Error(`Output directory must not be inside the raw directory: ${outputDir}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const rawFiles = scanFiles(rawDir)
    .filter((filePath) => SUPPORTED_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const usedNames = new Set();
  const entries = [];

  for (const sourcePath of rawFiles) {
    const sourceFileName = path.basename(sourcePath);
    const exampleName = uniqueExampleName(path.basename(sourcePath, path.extname(sourcePath)), usedNames);
    const exampleDir = path.join(outputDir, exampleName);
    const sourceRelativePath = path.relative(rawDir, sourcePath);
    const outputRelativePath = path.relative(outputDir, exampleDir);
    const size = fs.statSync(sourcePath).size;

    if (size > MAX_INPUT_BYTES) {
      entries.push({
        name: exampleName,
        sourceFileName,
        sourceRelativePath,
        outputRelativePath,
        status: "skipped",
        reason: `Input exceeds ${MAX_INPUT_BYTES} bytes`,
        summaryPath: null,
      });
      continue;
    }

    fs.rmSync(exampleDir, { recursive: true, force: true });
    fs.mkdirSync(path.join(exampleDir, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(exampleDir, "rojo"), { recursive: true });

    try {
      const conversion = convertFile(sourcePath, exampleDir, exampleName);
      const instanceTree = {
        sourceFileName,
        sourceRelativePath,
        parser: conversion.parser,
        generatedAt: new Date().toISOString(),
        limits: {
          maxInputBytes: MAX_INPUT_BYTES,
          maxScriptChars: MAX_SCRIPT_CHARS,
          maxTotalScriptChars: MAX_TOTAL_SCRIPT_CHARS,
          maxPropertyStringChars: MAX_PROPERTY_STRING_CHARS,
          maxTreeNodes: MAX_TREE_NODES,
        },
        warnings: conversion.warnings,
        counts: conversion.counts,
        roots: conversion.roots,
      };

      writeJson(path.join(exampleDir, "instance-tree.json"), instanceTree);
      writeSummary(path.join(exampleDir, "summary.md"), exampleName, sourceFileName, conversion);
      writeRojoProject(path.join(exampleDir, "rojo", "default.project.json"), exampleName, conversion);

      entries.push({
        name: exampleName,
        sourceFileName,
        sourceRelativePath,
        outputRelativePath,
        parser: conversion.parser,
        status: "converted",
        counts: conversion.counts,
        detectedSystems: Array.from(conversion.detectedSystems).sort(),
        summaryPath: path.join(outputRelativePath, "summary.md"),
      });
    } catch (error) {
      entries.push({
        name: exampleName,
        sourceFileName,
        sourceRelativePath,
        outputRelativePath,
        status: "error",
        reason: error instanceof Error ? error.message : String(error),
        summaryPath: null,
      });
    }
  }

  writeJson(path.join(outputDir, "index.json"), {
    rawDir,
    outputDir,
    generatedAt: new Date().toISOString(),
    supportedExtensions: Array.from(SUPPORTED_EXTENSIONS).sort(),
    totals: summarizeIndex(entries),
    examples: entries,
  });

  const converted = entries.filter((entry) => entry.status === "converted").length;
  const skipped = entries.filter((entry) => entry.status === "skipped").length;
  const errored = entries.filter((entry) => entry.status === "error").length;
  console.log(
    `Converted ${converted} Roblox example(s), skipped ${skipped}, errored ${errored}. Output: ${outputDir}`,
  );

  if (errored > 0) {
    process.exitCode = 1;
  }
}

function convertFile(sourcePath, exampleDir, exampleName) {
  const extension = path.extname(sourcePath).toLowerCase();
  if (extension === ".rbxm" || extension === ".rbxl") {
    return convertBinaryFile(sourcePath, exampleDir, exampleName);
  }
  return convertXmlFile(sourcePath, exampleDir, exampleName);
}

function convertBinaryFile(sourcePath, exampleDir, exampleName) {
  const buffer = fs.readFileSync(sourcePath);
  const file = RobloxFile.ReadFromBuffer(buffer);
  if (!file || !Array.isArray(file.Roots)) {
    throw new Error("rbxm-parser could not read this binary Roblox file");
  }

  const context = createConversionContext("rbxm-parser", exampleDir);
  const roots = file.Roots.map((root, index) =>
    convertBinaryNode(root, `/${safePathSegment(root.Name || root.ClassName || `Root${index + 1}`)}`, context),
  ).filter(Boolean);

  finalizeCounts(context);
  return {
    parser: "rbxm-parser",
    roots,
    ...context,
  };
}

function convertBinaryNode(node, nodePath, context) {
  if (context.counts.instances >= MAX_TREE_NODES) {
    context.truncatedTree = true;
    context.warnings.add(`Tree node cap reached at ${MAX_TREE_NODES} instances`);
    return null;
  }

  const className = String(node.ClassName || "Instance");
  const name = String(node.Name || className);
  context.counts.instances += 1;
  trackClass(context, className, name);

  const convertedNode = {
    ClassName: className,
    Name: name,
    path: nodePath,
  };

  const properties = serializeProperties(node.Props, context);
  if (Object.keys(properties).length > 0) {
    convertedNode.properties = properties;
  }

  const sourceProp = node.Props instanceof Map ? node.Props.get("Source") : null;
  const source = sourceProp && typeof sourceProp.value === "string" ? sourceProp.value : null;
  if (SCRIPT_CLASSES.has(className)) {
    convertedNode.scriptFile = writeScriptSource(className, name, nodePath, source || "", context);
  }

  const children = Array.isArray(node.Children) ? node.Children : [];
  const convertedChildren = [];
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    const childPath = `${nodePath}/${safePathSegment(child.Name || `${child.ClassName || "Instance"}${index + 1}`)}`;
    const convertedChild = convertBinaryNode(child, childPath, context);
    if (convertedChild) {
      convertedChildren.push(convertedChild);
    }
  }
  convertedNode.children = convertedChildren;

  return convertedNode;
}

function convertXmlFile(sourcePath, exampleDir, exampleName) {
  const xml = fs.readFileSync(sourcePath, "utf8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    textNodeName: "#text",
    cdataPropName: "#cdata",
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
  });
  const parsed = parser.parse(xml);
  const items = asArray(parsed && parsed.roblox && parsed.roblox.Item);
  if (items.length === 0) {
    throw new Error("No Roblox Item nodes were found in this XML file");
  }

  const context = createConversionContext("fast-xml-parser", exampleDir);
  const roots = items.map((item, index) => {
    const className = item["@class"] || "Instance";
    const properties = collectXmlProperties(item.Properties);
    const name = String(properties.Name || className || `Root${index + 1}`);
    return convertXmlItem(item, `/${safePathSegment(name)}`, context);
  }).filter(Boolean);

  finalizeCounts(context);
  return {
    parser: "fast-xml-parser",
    roots,
    ...context,
  };
}

function convertXmlItem(item, nodePath, context) {
  if (context.counts.instances >= MAX_TREE_NODES) {
    context.truncatedTree = true;
    context.warnings.add(`Tree node cap reached at ${MAX_TREE_NODES} instances`);
    return null;
  }

  const className = String(item["@class"] || "Instance");
  const rawProperties = collectXmlProperties(item.Properties);
  const name = String(rawProperties.Name || className);
  context.counts.instances += 1;
  trackClass(context, className, name);

  const convertedNode = {
    ClassName: className,
    Name: name,
    path: nodePath,
  };

  const properties = {};
  for (const [propertyName, value] of Object.entries(rawProperties)) {
    if (shouldKeepProperty(propertyName)) {
      const normalized = normalizeValue(value, new WeakSet(), context);
      if (normalized !== undefined) {
        properties[propertyName] = normalized;
        trackReferences(propertyName, normalized, context);
      }
    }
  }
  if (Object.keys(properties).length > 0) {
    convertedNode.properties = properties;
  }

  if (SCRIPT_CLASSES.has(className)) {
    convertedNode.scriptFile = writeScriptSource(className, name, nodePath, String(rawProperties.Source || ""), context);
  }

  const children = asArray(item.Item);
  convertedNode.children = children.map((child, index) => {
    const childProperties = collectXmlProperties(child.Properties);
    const childName = String(childProperties.Name || child["@class"] || `Instance${index + 1}`);
    return convertXmlItem(child, `${nodePath}/${safePathSegment(childName)}`, context);
  }).filter(Boolean);

  return convertedNode;
}

function createConversionContext(parser, exampleDir) {
  return {
    parser,
    exampleDir,
    warnings: new Set(),
    detectedSystems: new Set(),
    classes: new Map(),
    scriptSummaries: [],
    assetReferences: new Set(),
    externalReferences: new Set(),
    services: new Set(),
    uiNames: new Set(),
    remoteNames: new Set(),
    totalScriptChars: 0,
    scriptSequence: 0,
    counts: {
      instances: 0,
      scripts: {
        total: 0,
        Script: 0,
        LocalScript: 0,
        ModuleScript: 0,
      },
      ui: 0,
      remotes: 0,
      dataStoreReferences: 0,
      assetReferences: 0,
      externalReferences: 0,
    },
  };
}

function finalizeCounts(context) {
  context.counts.assetReferences = context.assetReferences.size;
  context.counts.externalReferences = context.externalReferences.size;
  context.warnings = Array.from(context.warnings).sort();
}

function trackClass(context, className, name) {
  context.classes.set(className, (context.classes.get(className) || 0) + 1);
  if (isUiClass(className)) {
    context.counts.ui += 1;
    context.uiNames.add(name);
    context.detectedSystems.add("ui");
  }
  if (REMOTE_CLASSES.has(className)) {
    context.counts.remotes += 1;
    context.remoteNames.add(name);
    context.detectedSystems.add("remotes");
  }
  const lower = `${className} ${name}`.toLowerCase();
  if (lower.includes("shop")) context.detectedSystems.add("shop-ui");
  if (lower.includes("trade")) context.detectedSystems.add("trade-ui");
  if (lower.includes("reward")) context.detectedSystems.add("rewards-ui");
  if (lower.includes("upgrade")) context.detectedSystems.add("upgrades-ui");
  if (lower.includes("loadingscreen") || lower.includes("loading")) context.detectedSystems.add("loading-screen");
}

function serializeProperties(props, context) {
  const properties = {};
  if (!(props instanceof Map)) {
    return properties;
  }
  for (const [propertyName, property] of props.entries()) {
    if (!shouldKeepProperty(propertyName)) {
      continue;
    }
    const normalized = normalizeValue(property && Object.hasOwn(property, "value") ? property.value : property, new WeakSet(), context);
    if (normalized !== undefined) {
      properties[propertyName] = normalized;
      trackReferences(propertyName, normalized, context);
    }
  }
  return properties;
}

function shouldKeepProperty(propertyName) {
  if (!SAFE_PROPERTY_NAMES.has(propertyName)) {
    return false;
  }
  return !SKIPPED_PROPERTY_PATTERNS.some((pattern) => pattern.test(propertyName));
}

function normalizeValue(value, seen, context) {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    return safeString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Buffer.isBuffer(value) || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    context.warnings.add("Skipped binary property payloads");
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 80).map((item) => normalizeValue(item, seen, context)).filter((item) => item !== undefined);
  }
  if (value instanceof Map) {
    const output = {};
    let count = 0;
    for (const [key, childValue] of value.entries()) {
      if (count >= 80) break;
      const normalized = normalizeValue(childValue, seen, context);
      if (normalized !== undefined) output[String(key)] = normalized;
      count += 1;
    }
    return output;
  }
  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);
    if (Object.hasOwn(value, "_name")) {
      return String(value._name);
    }
    const output = {};
    const keys = Object.keys(value).filter((key) => !key.startsWith("_")).slice(0, 40);
    for (const key of keys) {
      const normalized = normalizeValue(value[key], seen, context);
      if (normalized !== undefined) {
        output[key] = normalized;
      }
    }
    return Object.keys(output).length > 0 ? output : String(value);
  }
  return undefined;
}

function writeScriptSource(className, scriptName, nodePath, rawSource, context) {
  context.counts.scripts.total += 1;
  context.counts.scripts[className] += 1;
  context.scriptSequence += 1;

  const extension = className === "Script" ? ".server.lua" : className === "LocalScript" ? ".client.lua" : ".lua";
  const fileName = `${String(context.scriptSequence).padStart(3, "0")}-${slugifyPath(nodePath)}${extension}`;
  const scriptRelativePath = path.join("scripts", fileName);
  const fullPath = path.join(context.exampleDir, scriptRelativePath);
  let source = redactSecrets(rawSource || "");

  if (source.length > MAX_SCRIPT_CHARS) {
    source = `${source.slice(0, MAX_SCRIPT_CHARS)}\n\n-- [Truncated by converter: script exceeded ${MAX_SCRIPT_CHARS} characters]\n`;
    context.warnings.add(`Truncated script ${nodePath} at ${MAX_SCRIPT_CHARS} characters`);
  }
  if (context.totalScriptChars + source.length > MAX_TOTAL_SCRIPT_CHARS) {
    source = "-- [Skipped by converter: total script source cap reached for this example]\n";
    context.warnings.add(`Skipped script ${nodePath} because total script source cap was reached`);
  }
  context.totalScriptChars += source.length;
  fs.writeFileSync(fullPath, source, "utf8");

  const summary = summarizeScript(className, scriptName, nodePath, scriptRelativePath, source);
  context.scriptSummaries.push(summary);
  detectScriptSystems(source, context);

  return scriptRelativePath.replaceAll(path.sep, "/");
}

function summarizeScript(className, scriptName, nodePath, scriptRelativePath, source) {
  const lineCount = source.length === 0 ? 0 : source.split(/\r?\n/).length;
  const services = uniqueMatches(source, /game:GetService\(["']([^"']+)["']\)/g);
  const remotes = uniqueMatches(source, /(?:RemoteEvent|RemoteFunction|FireServer|FireClient|FireAllClients|InvokeServer|InvokeClient|OnServerEvent|OnClientEvent)/g);
  return {
    className,
    name: scriptName,
    path: nodePath,
    scriptFile: scriptRelativePath.replaceAll(path.sep, "/"),
    characters: source.length,
    lines: lineCount,
    services,
    remoteMentions: remotes.length,
    usesDataStore: /DataStoreService|GetDataStore|GetOrderedDataStore/.test(source),
  };
}

function detectScriptSystems(source, context) {
  for (const service of uniqueMatches(source, /game:GetService\(["']([^"']+)["']\)/g)) {
    context.services.add(service);
  }
  if (/DataStoreService|GetDataStore|GetOrderedDataStore/.test(source)) {
    context.detectedSystems.add("datastore");
    context.counts.dataStoreReferences += 1;
  }
  if (/TweenService|:Tween|TweenInfo/.test(source)) context.detectedSystems.add("animation");
  if (/MarketplaceService|PromptProductPurchase|PromptGamePassPurchase/.test(source)) context.detectedSystems.add("monetization");
  if (/HttpService|https?:\/\//.test(source)) context.detectedSystems.add("external-http");
  if (/RemoteEvent|RemoteFunction|FireServer|FireClient|FireAllClients|InvokeServer|InvokeClient/.test(source)) {
    context.detectedSystems.add("remotes");
  }
  if (/SoundService|SoundId/.test(source)) context.detectedSystems.add("audio");
  if (/ContentProvider|PreloadAsync/.test(source)) context.detectedSystems.add("asset-preloading");
  trackReferences("ScriptSource", source, context);
}

function collectXmlProperties(propertiesNode) {
  const properties = {};
  if (!propertiesNode || typeof propertiesNode !== "object") {
    return properties;
  }
  for (const [tagName, rawValue] of Object.entries(propertiesNode)) {
    for (const valueNode of asArray(rawValue)) {
      if (!valueNode || typeof valueNode !== "object" || !valueNode["@name"]) {
        continue;
      }
      properties[valueNode["@name"]] = extractXmlPropertyValue(tagName, valueNode);
    }
  }
  return properties;
}

function extractXmlPropertyValue(tagName, valueNode) {
  if (valueNode === null || valueNode === undefined) {
    return valueNode;
  }
  if (typeof valueNode !== "object") {
    return valueNode;
  }
  if (Object.hasOwn(valueNode, "#cdata")) {
    return valueNode["#cdata"];
  }
  if (Object.hasOwn(valueNode, "#text") && Object.keys(valueNode).length <= 2) {
    return valueNode["#text"];
  }
  if (tagName === "bool") {
    return String(valueNode["#text"]).trim() === "true";
  }
  const output = {};
  for (const [key, childValue] of Object.entries(valueNode)) {
    if (key.startsWith("@")) continue;
    output[key] = typeof childValue === "object" ? xmlObjectToPlain(childValue) : childValue;
  }
  return Object.keys(output).length > 0 ? output : "";
}

function xmlObjectToPlain(value) {
  if (Array.isArray(value)) {
    return value.map(xmlObjectToPlain);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  if (Object.hasOwn(value, "#text")) {
    return value["#text"];
  }
  if (Object.hasOwn(value, "#cdata")) {
    return value["#cdata"];
  }
  const output = {};
  for (const [key, childValue] of Object.entries(value)) {
    if (!key.startsWith("@")) {
      output[key] = xmlObjectToPlain(childValue);
    }
  }
  return output;
}

function trackReferences(propertyName, value, context) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return;

  const assetPattern = /(?:rbxassetid:\/\/\d+|rbxasset:\/\/[^\s"')\]}]+)/gi;
  const urlPattern = /https?:\/\/[^\s"')\]}]+/gi;

  for (const match of text.match(assetPattern) || []) {
    if (context.assetReferences.size < MAX_ASSET_REFERENCES) {
      context.assetReferences.add(safeString(match));
    }
  }
  for (const match of text.match(urlPattern) || []) {
    if (context.externalReferences.size < MAX_ASSET_REFERENCES) {
      context.externalReferences.add(safeString(match));
    }
  }

  if (/Id$|Image|Sound|Mesh|Texture|Animation/i.test(propertyName) && typeof value === "string" && /^(?:rbxassetid:\/\/|rbxasset:\/\/|\d{5,}$)/i.test(value)) {
    if (context.assetReferences.size < MAX_ASSET_REFERENCES) {
      context.assetReferences.add(safeString(value));
    }
  }
}

function writeSummary(summaryPath, exampleName, sourceFileName, conversion) {
  const topClasses = Array.from(conversion.classes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([className, count]) => `- ${className}: ${count}`);
  const importantScripts = conversion.scriptSummaries.slice(0, MAX_SUMMARY_ITEMS).map((script) => {
    const details = [
      `${script.lines} lines`,
      script.services.length > 0 ? `services: ${script.services.join(", ")}` : null,
      script.usesDataStore ? "DataStore" : null,
      script.remoteMentions > 0 ? `${script.remoteMentions} remote API mention(s)` : null,
    ].filter(Boolean).join("; ");
    return `- ${script.scriptFile} (${script.className} "${script.name}" at ${script.path})${details ? ` - ${details}` : ""}`;
  });
  const uiNames = Array.from(conversion.uiNames).slice(0, MAX_SUMMARY_ITEMS).map((name) => `- ${name}`);
  const remoteNames = Array.from(conversion.remoteNames).slice(0, MAX_SUMMARY_ITEMS).map((name) => `- ${name}`);
  const assets = Array.from(conversion.assetReferences).slice(0, MAX_SUMMARY_ITEMS).map((asset) => `- ${asset}`);
  const external = Array.from(conversion.externalReferences).slice(0, MAX_SUMMARY_ITEMS).map((reference) => `- ${reference}`);
  const services = Array.from(conversion.services).sort();

  const lines = [
    `# ${exampleName}`,
    "",
    `Source file: \`${sourceFileName}\``,
    "",
    "## Overview",
    "",
    `This converted Roblox example contains ${conversion.counts.instances} instance(s), ${conversion.counts.scripts.total} script(s), ${conversion.counts.ui} UI instance(s), and ${conversion.counts.remotes} remote/bindable object(s). Detected systems: ${Array.from(conversion.detectedSystems).sort().join(", ") || "none detected"}.`,
    "",
    "## Important scripts",
    "",
    importantScripts.length > 0 ? importantScripts.join("\n") : "- No Script, LocalScript, or ModuleScript sources were found.",
    "",
    "## UI structure",
    "",
    uiNames.length > 0 ? uiNames.join("\n") : "- No UI instances were detected.",
    "",
    "## Remotes and events",
    "",
    remoteNames.length > 0 ? remoteNames.join("\n") : "- No RemoteEvent, RemoteFunction, BindableEvent, or BindableFunction instances were detected.",
    "",
    "## DataStore usage",
    "",
    conversion.counts.dataStoreReferences > 0
      ? `- DataStore API usage was detected in ${conversion.counts.dataStoreReferences} script(s).`
      : "- No DataStore API usage was detected.",
    "",
    "## Asset IDs and external references",
    "",
    assets.length > 0 ? assets.join("\n") : "- No asset IDs were detected in safe properties or script source.",
    external.length > 0 ? "\nExternal URLs:\n" + external.join("\n") : "",
    "",
    "## Class mix",
    "",
    topClasses.length > 0 ? topClasses.join("\n") : "- No classes were recorded.",
    "",
    "## What NexusRBX should learn",
    "",
    nexusLearningNotes(conversion, services).map((note) => `- ${note}`).join("\n"),
    "",
  ];

  fs.writeFileSync(summaryPath, `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`, "utf8");
}

function nexusLearningNotes(conversion, services) {
  const notes = [];
  if (conversion.counts.ui > 0) {
    notes.push("Preserve screen hierarchy, layout objects, visual properties, and text/image references when using this as UI context.");
  }
  if (conversion.counts.scripts.total > 0) {
    notes.push("Use extracted scripts as readable Lua context instead of sending raw Roblox binaries to a model.");
  }
  if (conversion.counts.remotes > 0 || conversion.detectedSystems.has("remotes")) {
    notes.push("Model client/server contracts explicitly when recreating remote-driven behavior.");
  }
  if (conversion.detectedSystems.has("datastore")) {
    notes.push("Keep persistence server-owned and inspect DataStore keys before generating migrations or rewrites.");
  }
  if (services.length > 0) {
    notes.push(`Relevant Roblox services referenced by scripts: ${services.join(", ")}.`);
  }
  if (notes.length === 0) {
    notes.push("Use the instance tree to infer naming, grouping, and visual composition patterns.");
  }
  return notes;
}

function writeRojoProject(projectPath, exampleName, conversion) {
  const project = {
    name: exampleName,
    tree: {
      $className: "DataModel",
      ReplicatedStorage: {
        $className: "ReplicatedStorage",
      },
    },
    metadata: {
      generatedBy: "scripts/convertRobloxExamples.js",
      note: "This is an inferred helper project. instance-tree.json remains the source of truth for the full hierarchy.",
      scriptCount: conversion.counts.scripts.total,
    },
  };

  if (conversion.counts.scripts.total > 0) {
    project.tree.ReplicatedStorage[slugifyPath(exampleName)] = {
      $path: "../scripts",
    };
  }

  writeJson(projectPath, project);
}

function scanFiles(rootDir) {
  const files = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function summarizeIndex(entries) {
  const totals = {
    converted: 0,
    skipped: 0,
    errors: 0,
    scripts: 0,
    ui: 0,
    remotes: 0,
    assets: 0,
  };
  for (const entry of entries) {
    if (entry.status === "converted") {
      totals.converted += 1;
      totals.scripts += entry.counts.scripts.total;
      totals.ui += entry.counts.ui;
      totals.remotes += entry.counts.remotes;
      totals.assets += entry.counts.assetReferences;
    } else if (entry.status === "skipped") {
      totals.skipped += 1;
    } else if (entry.status === "error") {
      totals.errors += 1;
    }
  }
  return totals;
}

function isUiClass(className) {
  return /Gui$|Frame$|Button$|Label$|Box$|Layout$|Constraint$|Padding$|Gradient$|Stroke$|Corner$|AspectRatio|ScrollingFrame|CanvasGroup|ViewportFrame/.test(className);
}

function uniqueMatches(text, pattern) {
  const matches = new Set();
  for (const match of text.matchAll(pattern)) {
    matches.add(match[1] || match[0]);
  }
  return Array.from(matches).sort();
}

function redactSecrets(source) {
  return source
    .replace(/\b(api[_-]?key|secret|token|password|private[_-]?key|authorization)\b(\s*[:=]\s*)["'][^"'\r\n]{8,}["']/gi, "$1$2\"[REDACTED]\"")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/g, "Bearer [REDACTED]");
}

function safeString(value) {
  if (value.length <= MAX_PROPERTY_STRING_CHARS) {
    return value;
  }
  return `${value.slice(0, MAX_PROPERTY_STRING_CHARS)} [truncated ${value.length - MAX_PROPERTY_STRING_CHARS} chars]`;
}

function safePathSegment(value) {
  return String(value || "Instance")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90) || "Instance";
}

function slugifyPath(value) {
  return String(value || "example")
    .replace(/^\//, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "example";
}

function uniqueExampleName(baseName, usedNames) {
  const base = safePathSegment(baseName);
  let candidate = base;
  let suffix = 2;
  while (usedNames.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function isSameOrInside(childPath, parentPath) {
  const relative = path.relative(parentPath, childPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
