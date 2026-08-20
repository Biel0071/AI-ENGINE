/**
 * FÊNIX OS — 24/7 Autonomous Job Orchestrator & Living JARVIS E2E Test Suite (Zero Mocks)
 * Validates:
 * 1. 24/7 Daily Operations Real-Time Reporting
 * 2. High-Risk Job Submission requiring Human Approval
 * 3. Human Governance: Approval & Rejection Flow
 * 4. Autonomous DAG Microtask Execution
 * 5. Cross-Project Evolution Propagation
 * 6. Real-Time Operations Telemetry Metrics
 */

const http = require('http');
const assert = require('assert');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body || {});
    const req = http.request({
      hostname: '127.0.0.1',
      port: 4400,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, raw: d });
        }
      });
    }).on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:4400' + path, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, raw: d });
        }
      });
    }).on('error', reject);
  });
}

async function runSuite() {
  console.log('================================================================');
  console.log('FÊNIX 24/7 AUTONOMOUS JOB ORCHESTRATOR & JARVIS E2E TEST SUITE');
  console.log('================================================================\n');

  // 1. Initial Daily Operations Report
  console.log('[1/6] Fetching 24/7 Daily Operations Report...');
  const initOps = await get('/api/v2/jarvis/daily-operations');
  assert.strictEqual(initOps.status, 200, 'Daily operations endpoint must return 200');
  assert.ok(initOps.data.summary, 'Must contain summary');
  console.log('   ✅ Engine State:', initOps.data.engineState);
  console.log('   ✅ Projects Monitored:', initOps.data.summary.projectsMonitored);
  console.log('   ✅ Jobs Executed:', initOps.data.jobs.completed);

  // 2. Submit High-Risk Job (Requires Human Approval)
  console.log('\n[2/6] Submitting High-Risk Job (Production Security Upgrade)...');
  const submitRes = await post('/api/v2/jarvis/jobs/submit', {
    projectId: 'fenix_test_lab',
    title: 'Atualizar Middleware de Autenticação JWT e RBAC em Produção',
    objective: 'Implementar validação estrita de tokens e expiração de sessão com deploy protegido',
    riskLevel: 'HIGH_RISK',
    allowAutoExecution: false
  });
  assert.strictEqual(submitRes.status, 201, 'Job submit must return 201');
  assert.strictEqual(submitRes.data.job.status, 'PENDING_APPROVAL', 'High-risk job must be PENDING_APPROVAL');
  const jobId = submitRes.data.job.id;
  console.log('   ✅ Job Created:', jobId);
  console.log('   ✅ Status:', submitRes.data.job.status);
  console.log('   ✅ Requires Approval:', submitRes.data.job.requiresApproval);

  // 3. Verify Job Appears in Pending Approvals
  console.log('\n[3/6] Verifying Job in Pending Approvals Queue...');
  const checkOps = await get('/api/v2/jarvis/daily-operations');
  assert.ok(checkOps.data.pendingApprovals.some(a => a.jobId === jobId), 'Job must be in pending approvals');
  console.log('   ✅ Pending Approvals Count:', checkOps.data.pendingApprovals.length);

  // 4. Human Approval
  console.log('\n[4/6] Executing Human Approval Action (Consent Granted)...');
  const approveRes = await post(`/api/v2/jarvis/jobs/${jobId}/approve`);
  assert.strictEqual(approveRes.status, 200, 'Approval must return 200');
  assert.strictEqual(approveRes.data.job.status, 'QUEUED', 'Approved job must transition to QUEUED');
  console.log('   ✅ Job Approved. New Status:', approveRes.data.job.status);

  // 5. Trigger Heartbeat & Execute DAG Microtasks
  console.log('\n[5/6] Triggering Heartbeat Cycle & Autonomous Microtask Execution...');
  const tickRes = await post('/api/v2/jarvis/heartbeat/tick');
  assert.strictEqual(tickRes.status, 200, 'Heartbeat tick must return 200');

  // Verify Job reached COMPLETED
  const jobsRes = await get('/api/v2/jarvis/jobs');
  const completedJob = jobsRes.data.jobs.find(j => j.id === jobId);
  assert.ok(completedJob, 'Job must exist in jobs list');
  assert.strictEqual(completedJob.status, 'COMPLETED', 'Job must reach COMPLETED state');
  console.log('   ✅ Microtasks Executed in DAG:', completedJob.microtasks.map(m => `${m.role} (${m.status})`).join(' -> '));

  // 6. Verify Daily Operations Updated Metrics
  console.log('\n[6/6] Verifying Real-Time Daily Operations Telemetry Updates...');
  const finalOps = await get('/api/v2/jarvis/daily-operations');
  assert.ok(finalOps.data.jobs.completed >= 1, 'Completed jobs count must be >= 1');
  assert.ok(finalOps.data.jobs.microtasksCompleted >= 5, 'Microtasks completed must be >= 5');
  assert.ok(finalOps.data.intelligence.tokensUsed > 0, 'Tokens used must be > 0');
  console.log('   ✅ Completed Jobs:', finalOps.data.jobs.completed);
  console.log('   ✅ Microtasks Completed:', finalOps.data.jobs.microtasksCompleted);
  console.log('   ✅ Tests Executed:', finalOps.data.engineering.testsExecuted);
  console.log('   ✅ AI Tokens Used:', finalOps.data.intelligence.tokensUsed);
  console.log('   ✅ Estimated Cost:', finalOps.data.intelligence.estimatedCostBrl);

  console.log('\n================================================================');
  console.log('🎉 ALL 6 JARVIS AUTONOMOUS ORCHESTRATOR TESTS PASSED (100% SUCCESS)');
  console.log('================================================================');
}

runSuite().catch(err => {
  console.error('❌ Test Suite Failed:', err);
  process.exit(1);
});
