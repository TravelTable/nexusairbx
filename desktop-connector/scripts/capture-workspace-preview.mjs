// Local visual fixture. It uses the production renderer with a simulated,
// clearly labelled account and makes no network calls or Studio changes.
import { appendFile, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
if (!process.versions.electron) {
  const executable = createRequire(import.meta.url)('electron');
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const result = spawnSync(executable, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], { env, windowsHide: true, encoding: 'utf8', timeout: 60000 });
  process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
  if (result.error) process.stderr.write(`${result.error.message}\n`);
  process.exitCode = result.status ?? 1;
} else {
  const { app, BrowserWindow } = await import('electron');
  const temporary = await mkdtemp(join(tmpdir(), 'nexus-visual-'));
  const trace = message => appendFile(join(temporary, 'trace.log'), `${message}\n`);
  await trace('starting');
  app.setPath('userData', temporary); app.disableHardwareAcceleration();
  const entity = (id, kind, data) => ({ id, kind, data, revision: 1, deleted: false });
  const snapshot = {
    accountId: 'visual-test-account', conversations: [entity('chat', 'conversation', { title: 'Round system · visual fixture' })],
    messages: [entity('m1', 'message', { conversationId: 'chat', role: 'user', content: 'Build a round system with a lobby countdown and team scoring.' }), entity('m2', 'message', { conversationId: 'chat', role: 'assistant', content: 'The plan is saved on this device.\n\n1. Inspect the existing round scripts and remotes.\n2. Add a server round manager with a shared round state.\n3. Connect the lobby countdown and team score display.\n4. Verify transitions, respawns, and cleanup in Studio.\n\nThis is simulated content for the visual test.' })],
    plans: [entity('plan', 'plan', { conversationId: 'chat', version: 1, content: 'Inspect the existing scripts, build the round manager, then verify transitions in Studio.' })], runs: [], artifacts: [entity('script', 'artifact', { conversationId: 'chat', name: 'RoundManager', code: '-- Simulated visual fixture\nlocal round = {}\nfunction round.start()\n  print("Round started")\nend\nreturn round' })], activeRunId: null, error: null, sync: 'Saved on this device · visual fixture',
  };
  const preload = join(temporary, 'preload.cjs');
  await writeFile(preload, `const {contextBridge}=require('electron'); const snapshot=${JSON.stringify(snapshot)};
    contextBridge.exposeInMainWorld('nexusConnector',{getState:async()=>({state:'stopped',message:'Desktop workspace',updatedAt:1,preferences:{theme:'dark',workspaceEnabled:true}}),onState:()=>()=>{},onNavigate:()=>()=>{},reportReady:()=>{}});
    contextBridge.exposeInMainWorld('nexusWorkspace',{open:async()=>snapshot,snapshot:async()=>snapshot,getEntity:async()=>null,list:async()=>({entities:[],nextCursor:null}),request:async(input)=>({status:200,body:JSON.stringify(input.path.includes('models')?{models:[{id:'nexus-free',name:'Nexus Auto',provider:'nexus',availableToFree:true}]}:{plan:'FREE',identity:{uid:'visual-test-account'},dailyUsage:{percentUsed:0}}),headers:{'content-type':'application/json'}}),onChange:()=>()=>{}});`);
  // Electron delays readiness until the ESM entry module has finished loading.
  // Do not top-level-await app.whenReady() here.
  void app.whenReady().then(async () => { try {
    await trace('app ready');
    const window = new BrowserWindow({ width: 1180, height: 800, show: false, frame: false, webPreferences: { preload, sandbox: true, contextIsolation: true, nodeIntegration: false, offscreen: true } });
    const errors = []; window.webContents.on('console-message', (_event, level, message) => { if (level === 3) errors.push(message); });
    const externalRequests = [];
    window.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => { externalRequests.push(details.url); callback({ cancel: true }); });
    const waitFor = async expression => {
      for (let attempt = 0; attempt < 60; attempt++) {
        if (await window.webContents.executeJavaScript(expression)) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('Renderer did not become ready: ' + expression);
    };
    await trace('window created');
    const renderer = resolve(import.meta.dirname, process.argv.includes('--packaged') ? '../release-desktop-preview/win-unpacked/resources/app.asar/dist/renderer/index.html' : '../dist/renderer/index.html');
    await window.loadFile(renderer);
    await trace('loaded');
    await waitFor('document.body.innerText.includes("Plan · version 1")');
    const text = await window.webContents.executeJavaScript('document.body.innerText');
    await trace('text read');
    
    if (!text.includes('Round system') || !text.includes('Plan · version 1') ) throw new Error('Workspace controls did not render.');
    
    if (errors.length) throw new Error(errors.join('\n'));
    const output = resolve(import.meta.dirname, '../../artifacts/desktop-workspace-preview.png');
    await mkdir(resolve(import.meta.dirname, '../../artifacts'), { recursive: true });
    await writeFile(output, (await window.webContents.capturePage()).toPNG());
    await trace('captured');
    await window.webContents.executeJavaScript(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Assets').click()`);
    await waitFor('document.body.innerText.includes("Saved creations and files")');
    await window.webContents.executeJavaScript(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'RoundManager').click()`);
    await waitFor('!!document.querySelector(".monaco-editor")');
    await waitFor('/Round.started/.test(document.querySelector(".monaco-editor .view-lines")?.textContent || "")');
    await writeFile(resolve(import.meta.dirname, '../../artifacts/desktop-shared-editor.png'), (await window.webContents.capturePage()).toPNG());
    const workers = await window.webContents.executeJavaScript(`Promise.all(['editor','json','css','html','typescript'].map(label => new Promise((resolve,reject) => { const worker=globalThis.MonacoEnvironment.getWorker('',label); worker.onerror=event=>{worker.terminate();reject(new Error(event.message || label+' worker failed'));}; setTimeout(()=>{worker.terminate();resolve(label);},300); })))`);
    console.log(JSON.stringify({ editor: true, bundledWorkers: workers }));
    for (const [destination, expected] of [['/billing', 'Billing and credits'], ['/settings', 'Settings'], ['/support', 'Support']]) {
      await window.webContents.executeJavaScript(`document.querySelector('a[href="${destination}"]').click()`);
      await waitFor(`document.body.innerText.includes(${JSON.stringify(expected)})`);
      const body = await window.webContents.executeJavaScript('document.body.innerText');
      console.log(JSON.stringify({ destination, text: body.slice(0, 1500) }));
      if (!body.includes(expected)) throw new Error('Desktop route failed: ' + destination);
      await writeFile(resolve(import.meta.dirname, '../../artifacts/desktop-shared-' + destination.slice(1) + '.png'), (await window.webContents.capturePage()).toPNG());
    }
    if (errors.length) throw new Error(errors.join('\n'));
    if (externalRequests.length) throw new Error('Renderer attempted external network requests: ' + externalRequests.join(', '));

    console.log(JSON.stringify({ ok: true, output, errors, externalRequests }));
    window.destroy(); app.quit();
  } catch (error) { console.error(error.message); app.exit(1); } });
}
