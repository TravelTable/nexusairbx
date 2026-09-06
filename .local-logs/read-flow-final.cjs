require('../backend/node_modules/dotenv').config({ path: require('node:path').join(__dirname, '../backend/.env'), quiet: true });
const { firestore } = require('../backend/src/lib/firebaseAdmin');
(async () => {
  const attempt = (await firestore.collection('_chatAgentRunsV2').doc('agent_run_v2_8ecaba83aaec157e5b9e015ad12bf52e028e6f3b85262653351046c918cc4609').get()).data();
  if (attempt?.userId !== '0VSQotqOXxPXBLeQu1gUNkXELWH3') throw new Error('Unexpected test owner');
  const job = attempt.jobId ? (await firestore.collection('_jobs').doc(attempt.jobId).get()).data() : null;
  if (job && job.userId !== attempt.userId) throw new Error('Unexpected job owner');
  const runId = job?.result?.runId || job?.studioRunId || job?.runId;
  const run = runId ? (await firestore.collection('_studioAgentRuns').doc(runId).get()).data() : null;
  const steps = runId ? (await firestore.collection('_studioAgentRuns').doc(runId).collection('steps').get()).docs.map(doc=>doc.data()) : [];
  console.log(JSON.stringify({attemptStatus:attempt.status,jobId:attempt.jobId,jobStatus:job?.status,runId,runStatus:run?.status,summary:job?.result?.summary,error:job?.error,steps:steps.map(s=>({type:s.type,status:s.status,payload:s.payload,result:s.type==='read_instance'?s.result:{code:s.result?.code,summary:s.result?.summary},error:s.error}))},null,2));
  process.exit(0);
})().catch(error=>{console.error(error.message);process.exit(1);});
