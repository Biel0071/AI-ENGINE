const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const fs = require('fs');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

test('FÊNIX OS AUTONOMOUS SOFTWARE FACTORY - MULTI-JOB DAG DAG', async ({ request }) => {
  test.setTimeout(90000); 
  
  const queueFile = '.data/job-queue.json';
  fs.writeFileSync(queueFile, JSON.stringify({ jobs: [] }));
  
  console.log('1. Starting Fênix OS Server (Real Process)...');
  let serverProcess = spawn(process.execPath, ['grg/src/server.js'], { detached: true, stdio: 'ignore' });
  await sleep(6000); 
  
  console.log('2. Submitting Real Job to DEV PIPELINE...');
  await request.post('http://127.0.0.1:4400/api/dev/tasks', {
    data: { 
      projectId: 'daemon-test', 
      prompt: 'Melhore uma funcionalidade do proprio FENIX.', 
      client: 'Playwright' 
    }
  });

  console.log('3. Waiting for MISSION_PLANNER to spawn SUBJOBS...');
  let missionJob, analysisJob, frontendJob;
  for (let i = 0; i < 15; i++) {
     await sleep(2000);
     let queueData = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
     
     if (!missionJob) missionJob = queueData.jobs.find(j => j.type === 'MISSION_PLANNER');
     if (!analysisJob) analysisJob = queueData.jobs.find(j => j.type === 'ANALYSIS');
     if (!frontendJob) frontendJob = queueData.jobs.find(j => j.type === 'FRONTEND');
     
     if (missionJob && analysisJob && frontendJob) {
        break;
     }
  }

  expect(missionJob).toBeDefined();
  expect(analysisJob).toBeDefined();
  expect(frontendJob).toBeDefined();
  
  // Verify Dependency Graph Structure
  expect(analysisJob.dependencies.length).toBe(0);
  expect(frontendJob.dependencies).toContain(analysisJob.id);

  console.log('4. DAG Spawning Validated. Waiting for Concurrency/Completion...');
  let completed = false;
  for (let i = 0; i < 20; i++) {
     await sleep(2000);
     let queueData = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
     const frontend = queueData.jobs.find(j => j.id === frontendJob.id);
     if (frontend && frontend.status === 'COMPLETED') {
         completed = true;
         break;
     }
  }
  
  expect(completed).toBe(true);
  console.log('5. Verified Frontend Job Completed after Analysis Job.');

  console.log('--- ALL MISSION DAG PROOFS PASSED ---');
  process.kill(serverProcess.pid, 'SIGKILL');
});
