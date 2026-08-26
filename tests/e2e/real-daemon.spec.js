const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

test('F�NIX 24/7 REAL DAEMON PROOF', async ({ page, request }) => {
  test.setTimeout(120000); 
  
  const queueFile = '.data/job-queue.json';
  fs.writeFileSync(queueFile, JSON.stringify({ jobs: [] }));
  
  console.log('1. Starting F�nix OS Server (Real Process)...');
  let serverProcess = spawn(process.execPath, ['grg/src/server.js'], { detached: true, stdio: 'ignore' });
  await sleep(6000); 

  console.log('2. Visiting Frontend...');
  await page.goto('http://127.0.0.1:4400/app');
  await page.evaluate(() => localStorage.setItem('grg_token', 'test-token'));
  await page.evaluate(() => localStorage.setItem('grg_user', 'grg-admin'));
  await page.goto('http://127.0.0.1:4400/app');

  await expect(page.locator('[title=\"DEV COMMAND CENTER\"]')).toBeVisible({ timeout: 10000 });
  
  console.log('3. Submitting Real Job to DEV PIPELINE...');
  await request.post('http://127.0.0.1:4400/api/dev/tasks', {
    data: { 
      projectId: 'daemon-test', 
      prompt: 'Fa�a uma melhoria pequena e segura neste projeto.', 
      client: 'Playwright' 
    },
    headers: { 'Authorization': 'Bearer test-token' }
  });

  await sleep(6000); 
  
  let queueData = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
  let testJob = queueData.jobs.find(j => j.enhancedPrompt?.originalPrompt?.includes('melhoria pequena'));
  
  if (!testJob || testJob.status !== 'RUNNING') {
     console.log('Job did not reach RUNNING state naturally. Status: ' + (testJob ? testJob.status : 'missing'));
     await sleep(5000);
     queueData = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
     testJob = queueData.jobs.find(j => j.enhancedPrompt?.originalPrompt?.includes('melhoria pequena'));
  }
  
  expect(testJob.status).toBe('RUNNING');
  console.log('4. Verified Job is RUNNING natively by Real Worker.');

  console.log('5. REAL CRASH. Killing process manager abruptly...');
  process.kill(serverProcess.pid, 'SIGKILL'); 
  await sleep(3000);

  console.log('6. STARTUP RECOVERY. Restarting server...');
  serverProcess = spawn(process.execPath, ['grg/src/server.js'], { detached: true, stdio: 'ignore' });
  await sleep(6000); 

  let resp = await request.get('http://127.0.0.1:4400/api/dev/jobs/' + testJob.id, { headers: { 'Authorization': 'Bearer test-token' } });
  let jData = await resp.json();
  if (jData && jData.job) testJob = jData.job;
  
  expect(testJob.status).toBe('QUEUED');
  console.log('7. Verified Job Recovery to QUEUED via API.');

  console.log('8. REAL CONTINUATION. Waiting for Worker to complete pipeline...');
  let completed = false;
  for (let i = 0; i < 20; i++) {
     await sleep(3000);
     let r2 = await request.get('http://127.0.0.1:4400/api/dev/jobs/' + testJob.id, { headers: { 'Authorization': 'Bearer test-token' } });
     let d2 = await r2.json();
     if (d2 && d2.job) testJob = d2.job;
     if (testJob && testJob.status === 'COMPLETED') {
         completed = true;
         break;
     }
  }
  
  expect(completed).toBe(true);
  console.log('9. Verified REAL COMPLETION (Job hit COMPLETED naturally).');

  console.log('10. REAL FILE PROOF.');
  const readmePath = path.join('projects', 'daemon-test', 'README.md');
  const fileExists = fs.existsSync(readmePath);
  expect(fileExists).toBe(true);
  
  const content = fs.readFileSync(readmePath, 'utf8');
  expect(content).toContain('Autonomously improved');
  console.log('Verified physical file change on disk.');

  console.log('11. VERIFY FRONTEND RECONNECTION.');
  await page.evaluate(() => {
    document.querySelector('button[data-view=\"jobs\"]')?.click();
  });
  await expect(page.locator('#jobsListContainer')).toContainText('Fa�a uma melhoria pequena', { timeout: 10000 });
  
  console.log('--- ALL DAEMON PROOFS PASSED ---');
  process.kill(serverProcess.pid, 'SIGKILL');
});
