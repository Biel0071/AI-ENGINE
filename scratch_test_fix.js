const fs = require('fs');
let code = fs.readFileSync('tests/e2e/real-daemon.spec.js', 'utf8');

// Replace the QUEUED check with API call
const badBlock = \queueData = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
  testJob = queueData.jobs.find(j => j.enhancedPrompt?.originalPrompt?.includes('melhoria pequena'));
  expect(testJob.status).toBe('QUEUED');\;
const newBlock = \
  let resp = await request.get('http://127.0.0.1:4400/api/dev/jobs/' + testJob.id, { headers: { 'Authorization': 'Bearer test-token' } });
  let jData = await resp.json();
  if (jData && jData.job) testJob = jData.job;
  expect(testJob.status).toBe('QUEUED');
\;
code = code.replace(badBlock, newBlock);

// Also replace the loop waiting for COMPLETED
const badLoop = \queueData = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
     testJob = queueData.jobs.find(j => j.enhancedPrompt?.originalPrompt?.includes('melhoria pequena'));\;
const newLoop = \
     let r2 = await request.get('http://127.0.0.1:4400/api/dev/jobs/' + testJob.id, { headers: { 'Authorization': 'Bearer test-token' } });
     let d2 = await r2.json();
     if (d2 && d2.job) testJob = d2.job;
\;
code = code.replace(badLoop, newLoop);
fs.writeFileSync('tests/e2e/real-daemon.spec.js', code, 'utf8');
console.log('Fixed test to use API');

