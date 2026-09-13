const fs=require('fs'),path=require('path');
require('../../backend/node_modules/dotenv').config({path:path.resolve('backend/.env'),quiet:true});
const {AssetOperationService}=require('../../backend/src/services/assetPlatform/AssetOperationService');
const {AssetStorageService}=require('../../backend/src/services/assetPlatform/AssetStorageService');
const base=path.resolve(process.argv[2]),request=require(path.join(base,'request.json'));
const uid='0VSQotqOXxPXBLeQu1gUNkXELWH3',ops=new AssetOperationService(),storage=new AssetStorageService();
(async()=>{for(let slot=0;slot<4;slot++){
 const snap=await ops.reference(uid,`ui-sheet:${request.projectId}:${request.requestId}:${slot}`).get(),r=snap.data()?.result;
 if(!r?.source)continue;
 fs.writeFileSync(path.join(base,`sheet-${slot}.json`),JSON.stringify(r,null,2));
 if(!fs.existsSync(path.join(base,`sheet-${slot}.png`))){const saved=await storage.download(uid,{ownerUid:uid,storage:{master:r.source}},'master');fs.writeFileSync(path.join(base,`sheet-${slot}.png`),saved.buffer);}
 console.log({slot,failures:r.items.filter(i=>i.error),regions:r.regions});
}})().catch(e=>{console.error(e.message);process.exitCode=1;});
