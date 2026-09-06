require('../backend/node_modules/dotenv').config({path:require('node:path').join(__dirname,'../backend/.env'),quiet:true});
const {firestore}=require('../backend/src/lib/firebaseAdmin');
(async()=>{
 const uid='0VSQotqOXxPXBLeQu1gUNkXELWH3';
 const ref=firestore.collection('_studioAgentRuns').doc(process.argv[2] === 'v4' ? 'studio_run_44069af757d59d1be32584f1cad3fd1e037e6196be3b50ea' : 'studio_run_f27bf221dd847c4e5b63bbe880d7b7be4cb1878e1b29f549');
 const run=(await ref.get()).data();if(run?.userId!==uid)throw new Error('Unexpected owner');
 const steps=(await ref.collection('steps').get()).docs.map(s=>s.data());
 console.log(JSON.stringify({approvedPlan:run.approvedPlan,steps:steps.filter(s=>['batch_operations','list_children'].includes(s.type)).map(s=>({status:s.status,operations:s.payload?.operations,result:s.result}))},null,2));process.exit(0);
})().catch(e=>{console.error(e.message);process.exit(1)});

