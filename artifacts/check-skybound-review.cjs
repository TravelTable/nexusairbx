const path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..');
require(path.join(root,'backend/node_modules/dotenv')).config({path:path.join(root,'backend/.env'),quiet:true});
const {firestore}=require(path.join(root,'backend/src/lib/firebaseAdmin'));
const {UiPreviewService}=require(path.join(root,'backend/src/services/UiPreviewService'));
(async()=>{
 const launch=JSON.parse(fs.readFileSync(path.join(__dirname,'skybound-review-launch.json')));
 const d=(await firestore.collection('_jobs').doc(launch.jobId).get()).data(),b=d.uiBuild||{};
 const summary={status:d.status,stage:b.stage,action:b.action,pass:b.pass,message:b.message,review:b.lastReview,matrix:b.matrix};
 if(process.argv.includes('--status')){console.log(JSON.stringify(summary));process.exit();}
 const previews=new UiPreviewService();
 for(const slot of b.matrix||[]){
  const context={authenticatedUser:{uid:d.userId},designId:d.designId,jobId:slot.jobId};
  const record=await previews.readJob(context);slot.status=record.status;slot.message=record.message;
  if(record.status==='ready'){
   const target=path.join(__dirname,`skybound-${b.sourceRevision}-${slot.viewportId}-${slot.stateId}.png`);
   if(!fs.existsSync(target))fs.writeFileSync(target,(await previews.readImage(context)).png);
   slot.image=target;slot.warnings=record.preview.warnings;
  }
 }
 fs.writeFileSync(path.join(__dirname,'skybound-review-status.json'),JSON.stringify(summary,null,2));
 console.log(JSON.stringify(summary));process.exit();
})().catch(e=>{console.error(e.message);process.exit(1)});
