const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const release = JSON.parse(fs.readFileSync(path.join(root, 'public/studio-plugin/latest.json'), 'utf8'));
const bytes = fs.readFileSync(path.join(root, 'public/studio-plugin/NexusRBXStudioBridge.rbxmx'));
if (crypto.createHash('sha256').update(bytes).digest('hex') !== release.sha256 || !bytes.includes(Buffer.from(release.buildId))) {
  throw new Error('Studio plugin download is stale. Run npm run plugin:build before shipping.');
}
console.log(`Verified Studio download: ${release.buildId}`);
