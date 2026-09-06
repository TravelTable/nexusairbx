require('../backend/node_modules/dotenv').config({ path: require('node:path').join(__dirname, '../backend/.env'), quiet: true });
const { firestore } = require('../backend/src/lib/firebaseAdmin');
(async () => {
  const attempt = process.argv[2] === 'retry' ? (await firestore.collection('_chatAgentRunsV2').doc('agent_run_v2_6dd056e2f1a729b5cdeeec924e57bec7736aaaac1fff95f6d62ff120fc5b6533').get()).data() : null;
  if (attempt && attempt.userId !== '0VSQotqOXxPXBLeQu1gUNkXELWH3') throw new Error('Unexpected test run owner');
  const job = (await firestore.collection('_jobs').doc(attempt?.jobId || 'artifact_job_227ddc55b61c0abd7922ab989a2c0f5e5ab733be8fb37041').get()).data();
  if (job?.userId !== '0VSQotqOXxPXBLeQu1gUNkXELWH3') throw new Error('Unexpected test job owner');
  console.log(JSON.stringify({status:job.status,stage:job.stage,runId:job.result?.runId || job.studioRunId,summary:job.result?.summary,error:job.error,steps:job.result?.steps?.map(s=>({type:s.type,status:s.status,payload:s.payload,result:s.type==='read_instance'?s.result:{code:s.result?.code,summary:s.result?.summary},error:s.error}))}, null, 2));
  process.exit(0);
})().catch(error => { console.error(error.message); process.exit(1); });
