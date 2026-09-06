require('../backend/node_modules/dotenv').config({ path: require('node:path').join(__dirname, '../backend/.env'), quiet: true });
const { firestore } = require('../backend/src/lib/firebaseAdmin');
const runId = process.argv[2] === 'v4' ? 'studio_run_44069af757d59d1be32584f1cad3fd1e037e6196be3b50ea' : process.argv[2] === 'v3' ? 'studio_run_f27bf221dd847c4e5b63bbe880d7b7be4cb1878e1b29f549' : process.argv[2] === 'revised' ? 'studio_run_308725ff5fa6fabcee26eeffaf0c0ce6e4748ec997c1c4d9' : process.argv[2] === 'part' ? 'studio_run_1565e0d73b08748c7c751db5d1272f3d10bf62ca0751832a' : 'studio_run_fce362f2ec4ed31fa39dbc7229b3142ecb577f8677e9e159';
(async () => {
  const ref = firestore.collection('_studioAgentRuns').doc(runId);
  const run = (await ref.get()).data();
  if (run?.userId !== '0VSQotqOXxPXBLeQu1gUNkXELWH3') throw new Error('Unexpected test run owner');
  console.log(JSON.stringify(Object.fromEntries(Object.entries(run).filter(([k])=>/error|decision|fallback|warning/i.test(k)).map(([k,v])=>[k,JSON.stringify(v)?.slice(0,1800)])))); console.log(JSON.stringify({mode:run.mode,buildBehavior:run.buildBehavior,approvedPlan:run.approvedPlan?{trusted:run.approvedPlan.trusted,version:run.approvedPlan.version,implementationCount:run.approvedPlan.implementationSteps?.length,verificationCount:run.approvedPlan.verificationSteps?.length}:null}));
  const steps = (await ref.collection('steps').get()).docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => Number(a.index ?? a.sequence ?? 0) - Number(b.index ?? b.sequence ?? 0));
  console.log(JSON.stringify({ status: run.status, iteration: run.iteration, summary: run.summary, error: run.error, currentStepId: run.currentStepId, result: run.structuredResult, steps: steps.map(s => ({ id:s.id, type:s.type, status:s.status, label:s.label, path:s.payload?.path, properties:s.payload?.properties, sourceChars:s.payload?.source?.length, failureCode:s.failureCode, error:s.error, resultSummary:s.result?.summary, resultError:s.result?.error, readback:s.type === 'read_instance' ? s.result : undefined, paths:s.affectedPaths, createdAt:s.createdAt?.toDate?.()?.toISOString() })) }, null, 2));
  process.exit(0);
})().catch(error => { console.error(error.message); process.exit(1); });



