const fs=require('fs'),path=require('path');
if(process.argv.includes('--locate'))require('../../backend/node_modules/dotenv').config({path:path.resolve('backend/.env'),quiet:true});
const base=path.resolve(process.argv[2]);
const p=JSON.parse(fs.readFileSync(path.join(base,'planning.json')));
const artwork=require('../../backend/src/lib/uiArtwork'),sheets=require('../../backend/src/lib/uiArtworkSheets');
const needs=artwork.planUiArtwork({...p,sheetMode:true});
(async()=>{
 const report=[];
 for(const file of fs.readdirSync(base).filter(n=>/^sheet-\d+\.json$/.test(n))){
  const saved=JSON.parse(fs.readFileSync(path.join(base,file)));
  const slots=saved.items.map(item=>needs.find(n=>n.fingerprint===item.fingerprint));
  if(slots.some(n=>!n))throw Error('Saved slot is absent from the plan');
  const sheet={id:saved.sheetId,kind:'skins',background:require('../../backend/src/lib/imageProviders/vercelFluxSchnell').chromaColor(Object.values(p.designPlan.visualSystem.palette)),columns:3,rows:2,slots};
  const raw=fs.readFileSync(path.join(base,file.replace('.json','.png')));
  const regions=process.argv.includes('--locate')?await sheets.locateSheetAssets(raw,sheet):saved.regions;
  const crops=await sheets.extractSheet(raw,sheet,{regions});
  if(process.argv.includes('--locate'))fs.writeFileSync(path.join(base,file.replace('.json','-candidate-regions.json')),JSON.stringify(regions,null,2));
  report.push({sheet:file,originalFailures:saved.items.filter(i=>i.error).length,crops:crops.map(c=>({slot:c.slot,part:c.need.controlPart||c.need.role,error:c.error||null}))});
 }
 fs.writeFileSync(path.join(base,'extraction-regression.json'),JSON.stringify(report,null,2));
 console.log(report.map(r=>({sheet:r.sheet,originalFailures:r.originalFailures,currentFailures:r.crops.filter(c=>c.error).length,errors:r.crops.filter(c=>c.error)})));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
