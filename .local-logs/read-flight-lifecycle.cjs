require('../backend/node_modules/dotenv').config({path:require('node:path').join(__dirname,'../backend/.env'),quiet:true});
const {firestore}=require('../backend/src/lib/firebaseAdmin');
(async()=>{
 const uid='0VSQotqOXxPXBLeQu1gUNkXELWH3';
 const p=firestore.collection('users').doc(uid).collection('workflow_plans').doc('X5dQ8P6LWWLcDUHZDXb3');
 const plan=(await p.get()).data();
 const run=(await p.collection('runs').doc('plan_execution_e9155730d608a04fad56ab4a9df96816f3ca3ee28464659b0b4bf0aab810191f').get()).data();
 const task=(await firestore.collection('_tasks').doc('task_7e45cbd45a8b9eb96a2ad9dde454892587bbafdc9c35cf207f3681505ed63882').get()).data();
 if(run?.userId!==uid||task?.userId!==uid)throw new Error('Unexpected owner');
 console.log(JSON.stringify({plan:{version:plan.currentVersion,hash:plan.currentHash,status:plan.status,activeRunId:plan.activeRunId},run,task:{id:task.id,status:task.status,origin:task.origin,result:task.result,error:task.error,execution:task.execution}},null,2));process.exit(0);
})().catch(e=>{console.error(e.message);process.exit(1)});
