const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const { CURRENT_STUDIO_PLUGIN_RELEASE } = require('../backend/src/lib/studioPluginReleases');
execFileSync(process.execPath, [path.join(root, 'roblox-plugin/build/verify-plugin-artifact.js')], { stdio: 'inherit' });
const source = path.join(root, 'roblox-plugin/build/NexusRBXStudioBridge.rbxmx');
const bytes = fs.readFileSync(source);
if (!bytes.includes(Buffer.from(CURRENT_STUDIO_PLUGIN_RELEASE.buildId))) throw new Error('Plugin download does not match the backend release.');
const directory = path.join(root, 'public/studio-plugin');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'NexusRBXStudioBridge.rbxmx'), bytes);
fs.writeFileSync(path.join(directory, 'latest.json'), JSON.stringify({
  ...CURRENT_STUDIO_PLUGIN_RELEASE,
  url: '/studio-plugin/NexusRBXStudioBridge.rbxmx',
  sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
}, null, 2) + '\n');
console.log('Studio download matches the backend release.');
