// Replay an interrupted localhost task launch with its original idempotency key.
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
const dotenv = require(path.join(root, 'backend/node_modules/dotenv'));
dotenv.config({ path: path.join(root, 'backend/.env'), quiet: true });
const { firestore } = require(path.join(root, 'backend/src/lib/firebaseAdmin'));
(async () => {
  const task = (await firestore.collection('_tasks').doc('task_417f09330fb8954c6d083d356e16c363ff65d6297c2094d611def62bf5e6b61e').get()).data();
  const session = await (await fetch('http://localhost:5001/api/auth/local-dev-session', {method:'POST'})).json();
  if (session.uid !== task.userId || session.email !== 'jackt1263@gmail.com') throw new Error('Unexpected local identity');
  const apiKey = dotenv.parse(fs.readFileSync(path.join(root, '.env'))).REACT_APP_FIREBASE_API_KEY;
  const auth = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({token:session.token,returnSecureToken:true}),
  })).json();
  if (!auth.idToken) throw new Error('Local authentication failed');
  const body = JSON.parse(fs.readFileSync(path.join(__dirname, 'skybound-retry-input.json')));
  const response = await fetch('http://localhost:5001/api/tasks', {method:'POST',
    headers:{Authorization:`Bearer ${auth.idToken}`,'Content-Type':'application/json','Idempotency-Key':task.rootIdempotencyKey},
    body:JSON.stringify(body)});
  const result = await response.json();
  console.log(JSON.stringify({status:response.status,taskId:result.task?.taskId,jobId:result.jobId,message:result.message,error:result.error}));
  process.exit(response.ok ? 0 : 1);
})().catch(error=>{console.error(error.message);process.exit(1);});
