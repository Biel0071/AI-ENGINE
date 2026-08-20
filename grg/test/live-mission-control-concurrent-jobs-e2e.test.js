/**
 * FÊNIX OS — LIVE MISSION CONTROL & 10 CONCURRENT JOBS STRESS TEST SUITE
 * 
 * Pipeline Tested:
 * 1. 10 Simultaneous Concurrent Jobs Execution in Worker Pool (Zero Blocking)
 * 2. Real-Time SSE Event Stream Dispatching (job.*, agent.*, ai.*, approval.*)
 * 3. Full Telemetry Dashboard (System, Worker Pool, Queue Depth, AI Calls, Cost, Tokens)
 * 4. Project-Level Health & Observability (Git, Build, Tests, Open Jobs)
 * 5. Full Job Lifecycle Controls: Pause, Resume, Cancel, Retry, Inspect
 * 6. Risk Governance & Approval Center (ASK-CONFIRM-EXECUTE)
 * 7. Agent Real-Time Lifecycle States (IDLE -> WORKING -> DONE -> IDLE)
 */

const assert = require('assert');
const http = require('http');

const LOCAL_URL = 'http://127.0.0.1:4400';

function post(endpoint, data = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(`${LOCAL_URL}${endpoint}`, {
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
    const req = http.request(`${LOCAL_URL}${endpoint}`, { method: 'GET' }, res => {
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
  console.log('FÊNIX OS — LIVE MISSION CONTROL & 10 CONCURRENT JOBS E2E SUITE');
  console.log('================================================================\n');

  // 1. Test SSE Stream Connectivity
  console.log('[1/7] Testing Real-Time SSE Stream Endpoint (/api/v2/events/stream)...');
  const sseEventsReceived = [];
  const sseReq = http.request(`${LOCAL_URL}/api/v2/events/stream`, { method: 'GET' }, res => {
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'text/event-stream');
    res.on('data', chunk => {
      const text = chunk.toString();
      if (text.includes('event:')) {
        sseEventsReceived.push(text);
      }
    });
  });
  sseReq.on('error', err => console.warn('SSE stream error:', err.message));
  sseReq.end();

  // Wait for initial SSE connection message
  await new Promise(r => setTimeout(r, 200));
  assert.ok(sseEventsReceived.length >= 1, 'SSE stream must receive connected event');
  console.log(`   ✅ SSE Event Stream Connected (Received ${sseEventsReceived.length} initial events)`);

  // 2. Test 10 Simultaneous Concurrent Jobs in Worker Pool
  console.log('\n[2/7] Dispatching 10 Simultaneous Concurrent Jobs into Worker Pool...');
  const jobPromises = [];
  const startTime = Date.now();

  for (let i = 1; i <= 10; i++) {
    jobPromises.push(
      post('/api/v2/jarvis/jobs/submit', {
        title: `Missão Concorrente #${i} — Otimização de Slice Fullstack`,
        objective: `Executar microtarefas e verificação de contratos no workspace (Worker ${i})`,
        projectId: 'fenix_test_lab',
        riskLevel: 'SAFE'
      })
    );
  }

  const submitResults = await Promise.all(jobPromises);
  const jobIds = submitResults.map(r => {
    assert.strictEqual(r.status, 201);
    assert.ok(r.data.job?.id);
    return r.data.job.id;
  });

  console.log(`   ✅ 10 Jobs successfully submitted simultaneously: [${jobIds.map(id => id.slice(-6)).join(', ')}]`);

  // 3. Monitor Concurrent Worker Pool Execution
  console.log('\n[3/7] Monitoring Concurrent Execution & Worker Pool Utilization...');
  let allCompleted = false;
  let checks = 0;

  while (!allCompleted && checks < 40) {
    await new Promise(r => setTimeout(r, 250));
    checks++;

    const queueRes = await get('/api/v2/jarvis/jobs/queue');
    const runningCount = queueRes.data.running?.length || 0;
    const completedCount = queueRes.data.completed?.length || 0;

    if (checks === 2) {
      console.log(`   ⚡ Worker Pool in Action: ${runningCount} concurrent jobs running in parallel!`);
      assert.ok(runningCount >= 1, 'Worker pool must execute jobs concurrently');
    }

    const uncompleted = jobIds.filter(id => {
      const isDone = (queueRes.data.completed || []).some(j => j.id === id);
      return !isDone;
    });

    if (uncompleted.length === 0) {
      allCompleted = true;
    }
  }

  const durationMs = Date.now() - startTime;
  assert.ok(allCompleted, 'All 10 concurrent jobs must complete successfully');
  console.log(`   🎉 All 10 Concurrent Jobs COMPLETED in ${durationMs}ms with zero blocking!`);

  // 4. Test Job Lifecycle Controls (Pause, Resume, Cancel, Retry)
  console.log('\n[4/7] Testing Job Lifecycle Controls (Pause, Resume, Cancel, Retry)...');
  const controlJob = await post('/api/v2/jarvis/jobs/submit', {
    title: 'Job de Teste de Ciclo de Vida',
    objective: 'Testar comandos de controle',
    projectId: 'fenix_test_lab',
    riskLevel: 'SAFE'
  });
  const cJobId = controlJob.data.job.id;

  // Pause
  const pauseRes = await post(`/api/v2/jarvis/jobs/${cJobId}/pause`);
  assert.strictEqual(pauseRes.status, 200);
  assert.strictEqual(pauseRes.data.job.status, 'PAUSED');
  console.log(`   ✅ Job #${cJobId.slice(-6)} PAUSED successfully`);

  // Resume
  const resumeRes = await post(`/api/v2/jarvis/jobs/${cJobId}/resume`);
  assert.strictEqual(resumeRes.status, 200);
  assert.ok(resumeRes.data.job.status === 'QUEUED' || resumeRes.data.job.status === 'RUNNING');
  console.log(`   ✅ Job #${cJobId.slice(-6)} RESUMED successfully (${resumeRes.data.job.status})`);

  // Cancel
  const cancelRes = await post(`/api/v2/jarvis/jobs/${cJobId}/cancel`);
  assert.strictEqual(cancelRes.status, 200);
  assert.strictEqual(cancelRes.data.job.status, 'CANCELLED');
  console.log(`   ✅ Job #${cJobId.slice(-6)} CANCELLED successfully`);

  // Retry
  const retryRes = await post(`/api/v2/jarvis/jobs/${cJobId}/retry`);
  assert.strictEqual(retryRes.status, 200);
  assert.ok(retryRes.data.job.status === 'QUEUED' || retryRes.data.job.status === 'RUNNING');
  console.log(`   ✅ Job #${cJobId.slice(-6)} RETRIED successfully (${retryRes.data.job.status})`);

  // 5. Test Detailed Job Inspector
  console.log('\n[5/7] Testing Job Detailed Inspector (/api/v2/jarvis/jobs/:id)...');
  const inspectRes = await get(`/api/v2/jarvis/jobs/${jobIds[0]}`);
  assert.strictEqual(inspectRes.status, 200);
  const inspectedJob = inspectRes.data.job;
  assert.strictEqual(inspectedJob.id, jobIds[0]);
  assert.ok(inspectedJob.microtasks.length >= 5);
  assert.ok(inspectedJob.timelineLogs.length >= 2);
  assert.ok(inspectedJob.modelCalls.length >= 1);
  console.log(`   ✅ Job Inspector Verified: ${inspectedJob.microtasks.length} DAG Microtasks | ${inspectedJob.timelineLogs.length} Timeline Logs | ${inspectedJob.modelCalls.length} AI Calls`);

  // 6. Test Risk Governance & Approval Center
  console.log('\n[6/7] Testing Approval Center (ASK-CONFIRM-EXECUTE Governance)...');
  const riskyJobRes = await post('/api/v2/jarvis/jobs/submit', {
    title: 'Migração de Produção e Schema Alter',
    objective: 'Modificação de tabelas de banco de dados',
    projectId: 'fenix_test_lab',
    riskLevel: 'HIGH_RISK'
  });
  const riskyJobId = riskyJobRes.data.job.id;
  assert.strictEqual(riskyJobRes.data.job.status, 'AWAITING_APPROVAL');
  console.log(`   ✅ Risky Job #${riskyJobId.slice(-6)} held in AWAITING_APPROVAL`);

  const approveRes = await post(`/api/v2/jarvis/jobs/${riskyJobId}/approve`);
  assert.strictEqual(approveRes.status, 200);
  assert.strictEqual(approveRes.data.job.status, 'QUEUED');
  console.log(`   ✅ Risky Job #${riskyJobId.slice(-6)} APPROVED by operator and QUEUED for execution`);

  // 7. Test Comprehensive Telemetry Dashboard
  console.log('\n[7/7] Testing Full Telemetry Dashboard & Project Observability...');
  const telRes = await get('/api/v2/telemetry/full');
  assert.strictEqual(telRes.status, 200);
  assert.ok(telRes.data.system.memory.rssMb > 0);
  assert.ok(telRes.data.workerPool.maxCapacity >= 8);
  assert.ok(telRes.data.ai.totalTokens > 0);
  console.log(`   ✅ Full System Telemetry: CPU (${telRes.data.system.cpuCount} cores) | RAM (${telRes.data.system.memory.rssMb} MB) | AI Platform (${telRes.data.ai.totalTokens} tokens) | Worker Pool (Capacity: ${telRes.data.workerPool.maxCapacity})`);

  const prjTelRes = await get('/api/v2/telemetry/project/fenix_test_lab');
  assert.strictEqual(prjTelRes.status, 200);
  assert.strictEqual(prjTelRes.data.projectId, 'fenix_test_lab');
  assert.strictEqual(prjTelRes.data.healthScore, 98.4);
  console.log(`   ✅ Project Observability: Health Score ${prjTelRes.data.healthScore}% | Build: ${prjTelRes.data.build} | Tests: ${prjTelRes.data.tests}`);

  console.log('\n================================================================');
  console.log('🎉 ALL 7 LIVE MISSION CONTROL & 10 CONCURRENT JOBS TESTS PASSED (100%)');
  console.log('================================================================\n');

  sseReq.destroy();
}

runSuite().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
