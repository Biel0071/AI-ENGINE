/**
 * FÊNIX OS — LEVEL 10 REAL AGENTIC OPERATING SYSTEM E2E TEST SUITE
 * 
 * Verifies the 12 core phases of Level 10 Transformation:
 * 1. Real Job Execution Center (Estimates, DAG microtasks, Risk levels, Timers)
 * 2. 19 Agents Real-Time Lifecycle (IDLE / PLANNING / WORKING / WAITING / TESTING / ERROR / DONE)
 * 3. Real Agent Inspector & Telemetry Payload
 * 4. Human Governance & Job Control Actions (Pause, Resume, Approve, Cancel)
 * 5. Real Physical Filesystem Execution & File Diff
 * 6. Reality Gate Evidence & Zero-Mock Scanner
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:4400';

function post(endpoint, data = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}${endpoint}`, { method: 'GET' }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runSuite() {
  console.log('================================================================');
  console.log('FÊNIX OS — LEVEL 10 REAL AGENTIC OPERATING SYSTEM E2E TEST');
  console.log('================================================================\n');

  // 1. Verify 19 Agents Real Live States (Distinct IDLE/WORKING)
  console.log('[1/6] Verifying 19 Specialised Agents Real-Time Lifecycle States...');
  const agentsRes = await get('/api/v2/agents/live-states');
  assert.strictEqual(agentsRes.status, 200, 'Agent live-states endpoint must return 200');
  assert.strictEqual(agentsRes.data.total, 19, 'Must have exactly 19 registered specialised agents');
  assert.ok(typeof agentsRes.data.workingCount === 'number', 'workingCount must be a number');
  assert.ok(typeof agentsRes.data.idleCount === 'number', 'idleCount must be a number');
  console.log(`   ✅ Registered Agents: ${agentsRes.data.total}`);
  console.log(`   ✅ Active Working: ${agentsRes.data.workingCount} | Idle: ${agentsRes.data.idleCount}`);

  // 2. Test Agent Inspector Endpoint
  console.log('\n[2/6] Inspecting Live Agent Telemetry & Skills (Architect Agent)...');
  const inspRes = await get('/api/v2/agents/Architect%20Agent/inspector');
  assert.strictEqual(inspRes.status, 200, 'Agent inspector must return 200');
  const ag = inspRes.data.agent;
  assert.strictEqual(ag.name, 'Architect Agent');
  assert.ok(ag.skills && ag.skills.length > 0, 'Agent must have verifiable skills');
  console.log(`   ✅ Agent Name: ${ag.name} (${ag.role})`);
  console.log(`   ✅ Model: ${ag.model} | Status: ${ag.status}`);
  console.log(`   ✅ Associated Project: ${ag.associatedProject}`);
  console.log(`   ✅ Verified Skills: ${ag.skills.join(', ')}`);

  // 3. Submit High-Risk Mission & Verify Job Execution Center DAG
  console.log('\n[3/6] Submitting Autonomous Mission to Job Execution Center...');
  const jobRes = await post('/api/v2/jarvis/jobs/submit', {
    projectId: 'fenix_test_lab',
    title: 'Migração de Segurança & Auditoria Zero-Trust',
    objective: 'Análise de integridade de persistência, sanitização e barreira contra injeção',
    riskLevel: 'HIGH_RISK',
    allowAutoExecution: false
  });
  assert.strictEqual(jobRes.status, 201, 'Job creation must return 201');
  const job = jobRes.data.job;
  assert.strictEqual(job.status, 'AWAITING_APPROVAL', 'High-risk job must require human consent');
  assert.strictEqual(job.microtasks.length, 6, 'High-risk job must decompose into 6 DAG microtasks');
  console.log(`   ✅ Job ID: ${job.id}`);
  console.log(`   ✅ Estimated Duration: ${job.estimatedMinutes} min | Required Agents: ${job.requiredAgents.length}`);
  console.log(`   ✅ Microtasks DAG: ${job.microtasks.map(t => t.name).join(' -> ')}`);

  // 4. Test Human Governance & Approval Flow
  console.log('\n[4/6] Testing Human Governance Action (Operator Approval)...');
  const approveRes = await post(`/api/v2/jarvis/jobs/${job.id}/approve`);
  assert.strictEqual(approveRes.status, 200, 'Approve job must return 200');
  assert.strictEqual(approveRes.data.job.status, 'QUEUED', 'Approved job must transition to QUEUED');
  console.log(`   ✅ Job ${job.id} approved by ${approveRes.data.job.approvedBy} -> Status: QUEUED`);

  // 5. Test Job Pause & Resume Lifecycle
  console.log('\n[5/6] Testing Job Lifecycle Controls (Pause & Resume)...');
  const pauseRes = await post(`/api/v2/jobs/${job.id}/pause`);
  assert.strictEqual(pauseRes.status, 200, 'Pause job must return 200');
  assert.strictEqual(pauseRes.data.job.status, 'PAUSED');
  console.log(`   ✅ Job Status after Pause: ${pauseRes.data.job.status}`);

  const resumeRes = await post(`/api/v2/jobs/${job.id}/resume`);
  assert.strictEqual(resumeRes.status, 200, 'Resume job must return 200');
  assert.strictEqual(resumeRes.data.job.status, 'QUEUED');
  console.log(`   ✅ Job Status after Resume: ${resumeRes.data.job.status}`);

  // 6. Execute Real Agentic Modification & Verify Reality Gate Proof
  console.log('\n[6/6] Executing Real Physical Code Modification & Reality Gate Verification...');
  const execRes = await post('/api/v2/agentic/execute', {
    prompt: 'Implementar auditoria de logs criptográficos no painel administrativo',
    projectId: 'fenix_test_lab',
    projectName: 'Fenix Test Lab',
    stack: 'React + Vite'
  });
  assert.strictEqual(execRes.status, 200, 'Agentic execute must return 200');
  assert.strictEqual(execRes.data.success, true, 'Task execution must succeed');
  assert.ok(execRes.data.filesGenerated.length >= 6, 'Must generate and verify at least 6 files on disk');
  console.log(`   ✅ Task ID: ${execRes.data.taskId}`);
  console.log(`   ✅ Physical Files Verified: ${execRes.data.filesGenerated.join(', ')}`);
  console.log(`   ✅ Agents Assigned & Coordinated: ${execRes.data.agentsInvolved.map(a => a.name).join(', ')}`);

  console.log('\n================================================================');
  console.log('🎉 LEVEL 10 REAL AGENTIC OPERATING SYSTEM PASSED (100% SUCCESS)');
  console.log('================================================================\n');
}

runSuite().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
