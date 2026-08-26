const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const fs = require('fs');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

test('Fênix OS 24/7 Autonomy: Crash & Recovery Test', async ({ page }) => {
  test.setTimeout(60000); 
  
  console.log('Starting Fênix OS Server...');
  let serverProcess = spawn('..\\\\node.exe', ['grg/src/server.js'], { detached: true });
  await sleep(6000); 

  await page.goto('http://127.0.0.1:4400/app');
  await page.evaluate(() => localStorage.setItem('grg_token', 'test-token'));
  await page.evaluate(() => localStorage.setItem('grg_user', 'grg-admin'));
  await page.goto('http://127.0.0.1:4400/app');

  await expect(page.locator('text=DEV COMMAND CENTER')).toBeVisible({ timeout: 10000 });

  fs.writeFileSync('grg/data/queue.json', JSON.stringify({ jobs: [] }));
  
  console.log('Submitting long-running job...');
  await page.evaluate(() => {
    fetch('http://127.0.0.1:4400/api/dev/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
      body: JSON.stringify({ projectId: 'sys-project', prompt: 'TEST_LONG_RUNNING', client: 'Playwright' })
    });
  });

  await sleep(2000); 
  
  let queueData = JSON.parse(fs.readFileSync('grg/data/queue.json', 'utf8'));
  let testJob = queueData.jobs.find(j => j.prompt === 'TEST_LONG_RUNNING');
  testJob.status = 'RUNNING'; 
  fs.writeFileSync('grg/data/queue.json', JSON.stringify(queueData));

  console.log('CRASHING THE SERVER...');
  process.kill(serverProcess.pid, 'SIGKILL'); 
  await sleep(3000);

  console.log('RESTARTING THE SERVER...');
  serverProcess = spawn('..\\\\node.exe', ['grg/src/server.js'], { detached: true });
  await sleep(6000); 

  queueData = JSON.parse(fs.readFileSync('grg/data/queue.json', 'utf8'));
  testJob = queueData.jobs.find(j => j.prompt === 'TEST_LONG_RUNNING');
  expect(testJob.status).toBe('QUEUED');
  console.log('Verified Job Recovery: RUNNING -> QUEUED');

  // Reload page to verify backend is up, or wait for reconnect
  await page.reload();
  await expect(page.locator('text=DEV COMMAND CENTER')).toBeVisible({ timeout: 10000 });
  
  console.log('Passed 24/7 Crash Recovery & Reconnection successfully!');
  
  process.kill(serverProcess.pid, 'SIGKILL');
});
