import { build, Platform, Arch } from 'electron-builder';
if (process.platform !== 'win32') throw new Error('Run the Windows preview build on Windows. Use package:mac on macOS.');
await build({ targets: Platform.WINDOWS.createTarget('nsis', Arch.x64), publish: 'never', config: {
  directories: { output: 'release-desktop-preview' },
  artifactName: 'NexusRBX-Desktop-Preview-${version}.${ext}',
} });
