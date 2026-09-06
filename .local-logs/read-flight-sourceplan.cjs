require('../backend/node_modules/dotenv').config({ path: require('node:path').join(__dirname, '../backend/.env'), quiet: true });
const { firestore } = require('../backend/src/lib/firebaseAdmin');
(async () => {
  const uid = '0VSQotqOXxPXBLeQu1gUNkXELWH3';
  const task = (await firestore.collection('_tasks').doc('task_7e45cbd45a8b9eb96a2ad9dde454892587bbafdc9c35cf207f3681505ed63882').get()).data();
  if (task?.userId !== uid) throw new Error('Unexpected owner');
  console.log(JSON.stringify({ sourcePlan: task.sourcePlan, tenantId: task.tenantId, taskId: task.taskId, status: task.status }));
  process.exit(0);
})().catch(error => { console.error(error.message); process.exit(1); });
