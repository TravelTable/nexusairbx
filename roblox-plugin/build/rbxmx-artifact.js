const { createHash } = require("node:crypto");

function cdataEscape(source) {
  return source.replace(/\]\]>/g, "]]]]><![CDATA[>");
}

function deterministicIds(source) {
  const digest = createHash("sha256").update(source, "utf8").digest("hex");
  const guidHex = digest.slice(0, 32);
  return {
    referent: `RBX${guidHex}`,
    scriptGuid: `{${guidHex.slice(0, 8)}-${guidHex.slice(8, 12)}-${guidHex.slice(12, 16)}-${guidHex.slice(16, 20)}-${guidHex.slice(20)}}`,
  };
}

function buildRbxmx(source) {
  const { referent, scriptGuid } = deterministicIds(source);
  return [
    '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">',
    "\t<External>null</External>",
    "\t<External>nil</External>",
    `\t<Item class="Script" referent="${referent}">`,
    "\t\t<Properties>",
    `\t\t\t<ProtectedString name="Source"><![CDATA[${cdataEscape(source)}]]></ProtectedString>`,
    "\t\t\t<bool name=\"Disabled\">false</bool>",
    "\t\t\t<Content name=\"LinkedSource\"><null></null></Content>",
    "\t\t\t<token name=\"RunContext\">0</token>",
    `\t\t\t<string name="ScriptGuid">${scriptGuid}</string>`,
    "\t\t\t<BinaryString name=\"AttributesSerialize\"></BinaryString>",
    "\t\t\t<SecurityCapabilities name=\"Capabilities\">0</SecurityCapabilities>",
    "\t\t\t<bool name=\"DefinesCapabilities\">false</bool>",
    "\t\t\t<string name=\"Name\">NexusRBXStudioBridge</string>",
    "\t\t\t<int64 name=\"SourceAssetId\">-1</int64>",
    "\t\t\t<SharedString name=\"Tags\">yuZpQdnvvUBOTYh1jqZ2cA==</SharedString>",
    "\t\t</Properties>",
    "\t</Item>",
    "\t<SharedStrings>",
    "\t\t<SharedString md5=\"yuZpQdnvvUBOTYh1jqZ2cA==\"></SharedString>",
    "\t</SharedStrings>",
    "</roblox>",
    "",
  ].join("\n");
}

module.exports = { buildRbxmx, cdataEscape, deterministicIds };
