const fs=require('fs'),path=require('path'),Module=require('module');
const {execFileSync}=require('child_process');
const filename=path.resolve('backend/src/lib/uiArtwork.js');
const original=new Module(filename,module);original.filename=filename;original.paths=Module._nodeModulePaths(path.dirname(filename));
original._compile(execFileSync('git',['-C','backend','show','HEAD:src/lib/uiArtwork.js'],{encoding:'utf8'}),filename);
const {reprocess}=require('../../backend/scripts/reprocessUiArtworkSheet.cjs');
const {chromaColor}=require('../../backend/src/lib/imageProviders/vercelFluxSchnell');
(async()=>{
 const reports=[];
 for(const attempt of ['attempt-007','attempt-008']){
  const base=path.resolve('artifacts/ui-one-shot',attempt),p=JSON.parse(fs.readFileSync(path.join(base,'planning.json')));
  const needs=original.exports.planUiArtwork({...p,sheetMode:true});
  for(const file of fs.readdirSync(base).filter(n=>/^sheet-\d+\.json$/.test(n))){
   const saved=JSON.parse(fs.readFileSync(path.join(base,file))),slots=saved.items.map(i=>needs.find(n=>n.fingerprint===i.fingerprint));
   if(slots.some(n=>!n))throw Error('Cannot reconstruct original slots');
   if(!saved.regions){reports.push({attempt,sheet:file,skipped:'No saved locator regions',originalFailures:saved.items.filter(i=>i.error).length});continue;}
   const columns=slots.length>4?3:Math.min(2,slots.length);
   const manifest={sheet:{id:saved.sheetId,kind:'skins',columns,rows:Math.ceil(slots.length/columns),background:chromaColor(Object.values(p.designPlan.visualSystem.palette)),slots},regions:saved.regions};
   const manifestPath=path.join(base,file.replace('.json','-offline-manifest.json'));
   fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2),{flag:'wx'});
   const report=await reprocess(path.join(base,file.replace('.json','.png')),manifestPath,path.join(base,file.replace('.json','-offline-v4')));
   reports.push({attempt,sheet:file,originalFailures:saved.items.filter(i=>i.error).length,failures:report.failures,total:report.items.length,items:report.items.map(i=>({slot:i.slot,error:i.error,blocking:i.blocking}))});
  }
 }
 fs.writeFileSync('artifacts/ui-artwork-supplied-fix-replay.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
