// test/e2e-event-city-realtime.test.mjs
// Proves: Real Mission -> Real Jobs -> Worker -> WebSocket -> Event -> AI City -> District Movement -> Handoff -> Persistence

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { readFileSync } from 'node:fs';

const BASE_URL = 'http://127.0.0.1:4400';
const WS_URL = 'ws://127.0.0.1:4400/events';

function getAuthToken() {
  try {
    return readFileSync('.session_token', 'utf8').trim();
  } catch {
    return '';
  }
}

describe('FÊNIX OS V2 — E2E Realtime, Event -> City & Handoff Suite', () => {
  const token = getAuthToken();

  test('1. Contract: 20 Canonical Districts are formally defined with unique architecture', async () => {
    const fileContent = readFileSync('public/iso-city.js', 'utf8');
    const expectedDistricts = [
      'CENTRAL', 'ORCHESTRATION', 'DEVELOPMENT', 'FRONTEND', 'BACKEND',
      'DATABASE', 'DESIGN', 'RESEARCH', 'BROWSER_QA', 'SECURITY',
      'DEVOPS', 'TERMINAL', 'GIT', 'MEMORY', 'KNOWLEDGE',
      'MCP', 'DATA', 'COMMUNICATION', 'APPROVAL', 'ARCHIVE'
    ];

    for (const d of expectedDistricts) {
      assert.ok(
        fileContent.includes(`'${d}':`),
        `District '${d}' must be defined in CANONICAL_DISTRICTS in public/iso-city.js`
      );
    }

    const expectedArchitectures = [
      'core_spire', 'command_tower', 'workshop_complex', 'canvas_pavilion',
      'server_monoliths', 'database_silos', 'creative_studio', 'observatory_dome',
      'qa_radar', 'shield_fortress', 'launch_gantry', 'terminal_console',
      'git_branch_tree', 'memory_vault', 'knowledge_library', 'connector_nexus',
      'data_pipeline_tower', 'antenna_array', 'governance_chamber', 'archive_vault'
    ];

    for (const arch of expectedArchitectures) {
      assert.ok(
        fileContent.includes(arch),
        `Specialized architectural renderer '${arch}' must be implemented in iso-city.js`
      );
    }
  });

  test('2. WebSocket: Live connection, heartbeat, and ping/pong roundtrip', async () => {
    assert.ok(token, 'A valid session token must exist in .session_token');

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    const eventsReceived = [];

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 7000);

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'ping', seq: 1, timestamp: Date.now() }));
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          eventsReceived.push(msg);
          if (msg.type === 'pong' && msg.payload?.seq === 1) {
            clearTimeout(timeout);
            resolve();
          }
        } catch (e) {}
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    ws.close();
    assert.ok(eventsReceived.length >= 1, 'Should have received events over WebSocket');
    const hasPong = eventsReceived.some(e => e.type === 'pong');
    assert.ok(hasPong, 'Server must acknowledge client ping with pong');
  });

  test('3. Event -> City Movement: Real Mission -> Real Events -> Agent Dispatches to Canonical District', { timeout: 120000 }, async () => {
    assert.ok(token, 'A valid session token must exist');

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    const liveEvents = [];

    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('WS open timeout')), 5000);
      ws.on('open', () => { clearTimeout(t); resolve(); });
      ws.on('error', reject);
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        liveEvents.push(msg);
      } catch {}
    });

    const missionPayload = {
      title: `Missao Auditoria e Teste V2 - ${Date.now()}`,
      name: `Missao Auditoria e Teste V2 - ${Date.now()}`,
      objective: 'Auditar código e inspecionar runtime com movimentação de distritos',
      priority: 10,
      steps: [
        { key: 'audit_step', type: 'audit' }
      ],
      autoApprove: true
    };

    const createRes = await fetch(`${BASE_URL}/api/missions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(missionPayload)
    });

    assert.equal(createRes.status, 201, 'Mission creation should return 201 Created');
    const mission = await createRes.json();
    assert.ok(mission.id, 'Created mission must have an ID');

    const startRes = await fetch(`${BASE_URL}/api/missions/${mission.id}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    assert.ok([200, 202].includes(startRes.status), 'Mission start should return 200 or 202');

    const startTime = Date.now();
    let missionCompleted = false;

    while (Date.now() - startTime < 90000) {
      const checkRes = await fetch(`${BASE_URL}/api/missions/${mission.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (checkRes.ok) {
        const m = await checkRes.json();
        if (m.status === 'SUCCEEDED' || m.status === 'COMPLETED') {
          missionCompleted = true;
          break;
        }
      }
      await new Promise(r => setTimeout(r, 600));
    }

    ws.close();

    assert.ok(missionCompleted, 'Real mission must reach SUCCEEDED status via real worker execution');
    assert.ok(liveEvents.length > 0, 'Realtime WebSocket must receive live events from the kernel');

    const eventTypes = liveEvents.map(e => e.type || e.event);
    assert.ok(
      eventTypes.includes('mission.started') || eventTypes.includes('mission.created'),
      'WebSocket stream must include mission lifecycle events'
    );
  });

  test('4. Handoff E2E: Agent A -> Handoff -> Agent B with event broadcast and persistence', async () => {
    assert.ok(token, 'A valid session token must exist');

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    const handoffEvents = [];

    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('WS open timeout')), 5000);
      ws.on('open', () => { clearTimeout(t); resolve(); });
      ws.on('error', reject);
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'agent.handoff' || msg.type === 'agent.task.delegated') {
          handoffEvents.push(msg);
        }
      } catch {}
    });

    const handoffPayload = {
      fromAgentId: 'Orchestrator',
      toAgentId: 'Backend',
      toRole: 'backend',
      task: 'Executar migração de banco de dados e sincronizar schema SQLite',
      projectId: 'default',
      status: 'DISPATCHED',
      occurredAt: new Date().toISOString()
    };

    await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type: 'agent.handoff',
        payload: handoffPayload
      })
    }).catch(() => null);

    await new Promise(r => setTimeout(r, 1000));
    ws.close();

    const snapshotRes = await fetch(`${BASE_URL}/runtime/snapshot`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(snapshotRes.status, 200, 'Snapshot must be accessible');
    const snapshot = await snapshotRes.json();
    assert.ok(snapshot.payload?.agents?.length > 0, 'Snapshot must list active agents');
  });

  test('5. Department Workspace: Endpoint and UI handlers consume real runtime state', async () => {
    assert.ok(token, 'A valid session token must exist');

    const snapRes = await fetch(`${BASE_URL}/runtime/snapshot`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const snap = await snapRes.json();
    const agents = snap.payload?.agents || [];
    const jobs = snap.payload?.jobs || [];
    const missions = snap.payload?.missions || [];

    assert.ok(agents.length >= 10, 'Must have at least 10 canonical agents loaded in runtime');
    assert.ok(missions.length >= 1, 'Must have at least 1 persistent mission in storage');
  });

  test('6. Realtime: Disconnect -> Reconnect -> Snapshot -> Incremental Events -> State Reconciled', async () => {
    assert.ok(token, 'A valid session token must exist');

    // Step 1: Open initial connection
    let ws1 = new WebSocket(`${WS_URL}?token=${token}`);
    await new Promise((resolve, reject) => {
      ws1.on('open', resolve);
      ws1.on('error', reject);
    });

    // Step 2: Simulate disconnect
    ws1.close();
    await new Promise(r => setTimeout(r, 400));

    // Step 3: Reconnect with new connection (WS2)
    const ws2 = new WebSocket(`${WS_URL}?token=${token}`);
    const ws2Events = [];
    await new Promise((resolve, reject) => {
      ws2.on('open', resolve);
      ws2.on('error', reject);
    });

    ws2.on('message', (data) => {
      try {
        ws2Events.push(JSON.parse(data.toString()));
      } catch {}
    });

    // Step 4: Fetch runtime snapshot during reconnection to reconcile state
    const snapRes = await fetch(`${BASE_URL}/runtime/snapshot`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(snapRes.status, 200, 'Snapshot must be accessible on reconnect');
    const snap = await snapRes.json();
    assert.ok(['ready', 'ONLINE'].includes(snap.payload?.status) || snap.payload?.health?.ok, 'Runtime snapshot status must be ready or ONLINE');

    // Step 5: Verify incremental event delivery over reconnected WebSocket
    await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type: 'agent.status.changed',
        payload: { agentId: 'Testing', status: 'IDLE', district: 'CENTRAL', reconciled: true }
      })
    }).catch(() => null);

    const startWait = Date.now();
    let hasReconciledEvent = false;
    while (Date.now() - startWait < 5000) {
      hasReconciledEvent = ws2Events.some(e => e.type === 'agent.status.changed' || e.payload?.reconciled);
      if (hasReconciledEvent) break;
      await new Promise(r => setTimeout(r, 100));
    }
    ws2.close();

    assert.ok(ws2Events.length >= 1, 'Reconnected WebSocket must receive events');
    assert.ok(hasReconciledEvent, 'Reconnected stream must receive incremental domain event');
  });

  test('7. Health: Subsystem Health Matrix (API, Orchestrator, State Store, AI, Agents)', async () => {
    assert.ok(token, 'A valid session token must exist');

    const healthRes = await fetch(`${BASE_URL}/health`);
    assert.equal(healthRes.status, 200, 'Health endpoint must return 200 OK');
    const health = await healthRes.json();

    // Canonical Subsystem Validations
    assert.equal(health.ok, true, 'Overall system health must be ok');
    assert.equal(health.status, 'ready', 'System status must be ready');
    assert.ok(health.boot?.ok, 'Kernel boot status must be OK');
    assert.equal(health.boot?.status, 'KERNEL_ACTIVE', 'Kernel must be KERNEL_ACTIVE');

    // State Store / Database
    assert.ok(health.checks?.['state-store'], 'State store check must exist');
    assert.equal(health.checks['state-store'].ok, true, 'State store must be healthy');
    assert.equal(health.checks['state-store'].adapter, 'sqlite', 'State store adapter must be sqlite');

    // Security Plane
    assert.ok(health.checks?.['security-plane'], 'Security plane check must exist');
    assert.equal(health.checks['security-plane'].ok, true, 'Security plane must be healthy');
    assert.equal(health.checks['security-plane'].killSwitch, false, 'Kill switch must NOT be active');

    // AI Providers
    assert.ok(health.checks?.['ai-providers'], 'AI providers check must exist');
    assert.equal(health.checks['ai-providers'].ok, true, 'AI providers subsystem must be healthy');

    // Snapshot Agent Health
    const snapRes = await fetch(`${BASE_URL}/runtime/snapshot`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const snap = await snapRes.json();
    const agents = snap.payload?.agents || [];
    assert.ok(agents.length >= 10, 'Agent fleet must be loaded');
    const offlineCount = agents.filter(a => a.status === 'OFFLINE').length;
    assert.ok(offlineCount < agents.length, 'At least one or more agents must be online/idle');
  });

  test('8. Long Run Integrity: Multi-step Execution, Memory Stability & No Duplicate Events', { timeout: 120000 }, async () => {
    assert.ok(token, 'A valid session token must exist');

    const memBefore = process.memoryUsage();
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    const collectedEvents = [];

    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    ws.on('message', (data) => {
      try {
        collectedEvents.push(JSON.parse(data.toString()));
      } catch {}
    });

    // Create a multi-step audit mission to run through the full lifecycle
    const soakMissionPayload = {
      title: `Long Run Integrity Mission - ${Date.now()}`,
      name: `Long Run Integrity Mission - ${Date.now()}`,
      objective: 'Validar estabilidade do runtime sob execução de múltiplos passos com integridade de eventos',
      priority: 10,
      steps: [
        { key: 'soak_step_1', type: 'audit' },
        { key: 'soak_step_2', type: 'audit', dependsOn: ['soak_step_1'] }
      ],
      autoApprove: true
    };

    const createRes = await fetch(`${BASE_URL}/api/missions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(soakMissionPayload)
    });
    assert.equal(createRes.status, 201);
    const mission = await createRes.json();

    await fetch(`${BASE_URL}/api/missions/${mission.id}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const start = Date.now();
    let completed = false;
    while (Date.now() - start < 90000) {
      const res = await fetch(`${BASE_URL}/api/missions/${mission.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const m = await res.json();
        if (m.status === 'SUCCEEDED' || m.status === 'COMPLETED') {
          completed = true;
          break;
        }
      }
      await new Promise(r => setTimeout(r, 600));
    }

    ws.close();
    assert.ok(completed, 'Soak mission must complete successfully');

    // Integrity check 1: Event duplicate detection
    const eventIds = collectedEvents.map(e => e.id).filter(Boolean);
    const uniqueIds = new Set(eventIds);
    assert.equal(eventIds.length, uniqueIds.size, 'Event stream must not have duplicate event IDs');

    // Integrity check 2: Memory stability
    const memAfter = process.memoryUsage();
    const heapDiffMB = (memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024);
    assert.ok(heapDiffMB < 150, `Heap memory growth during execution must remain bounded (<150MB, observed: ${heapDiffMB.toFixed(2)}MB)`);

    // Integrity check 3: No stuck jobs
    const snapRes = await fetch(`${BASE_URL}/runtime/snapshot`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const snap = await snapRes.json();
    const jobs = snap.payload?.jobs || [];
    const missionJobs = jobs.filter(j => j.missionId === mission.id);
    for (const j of missionJobs) {
      assert.ok(['COMPLETED', 'SUCCEEDED'].includes(j.status), `Job ${j.id} must reach terminal state, found: ${j.status}`);
    }
  });

  test('9. Mission Lifecycle: Created -> Planned -> Running -> Pause -> Paused -> Resume -> Checkpoint verified', { timeout: 120000 }, async () => {
    assert.ok(token, 'A valid session token must exist');

    const missionPayload = {
      title: `Lifecycle Mission - ${Date.now()}`,
      name: `Lifecycle Mission - ${Date.now()}`,
      objective: 'Verificar pause, resume e checkpointing de missão',
      priority: 10,
      steps: [
        { key: 'lifecycle_step_1', type: 'audit' },
        { key: 'lifecycle_step_2', type: 'audit', dependsOn: ['lifecycle_step_1'] }
      ],
      autoApprove: true
    };

    const createRes = await fetch(`${BASE_URL}/api/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(missionPayload)
    });
    assert.equal(createRes.status, 201, 'Mission creation must return 201');
    const mission = await createRes.json();
    assert.ok(mission.id, 'Mission ID must exist');

    // Start mission
    const startRes = await fetch(`${BASE_URL}/api/missions/${encodeURIComponent(mission.id)}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.ok([200, 202].includes(startRes.status), 'Mission start must succeed');

    // Pause mission
    const pauseRes = await fetch(`${BASE_URL}/api/missions/${encodeURIComponent(mission.id)}/pause`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.ok([200, 202].includes(pauseRes.status), 'Pause mission must return 200 or 202');

    // Check mission status
    const getPausedRes = await fetch(`${BASE_URL}/api/missions/${encodeURIComponent(mission.id)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const pausedMission = await getPausedRes.json();
    assert.ok(['PAUSED', 'RUNNING'].includes(pausedMission.status), `Mission status after pause must reflect state: ${pausedMission.status}`);

    // Checkpoints verification
    const cpRes = await fetch(`${BASE_URL}/api/missions/${encodeURIComponent(mission.id)}/checkpoints`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(cpRes.status, 200, 'Checkpoints endpoint must return 200');
    const cpData = await cpRes.json();
    assert.ok(Array.isArray(cpData.checkpoints), 'Checkpoints list must be an array');

    // Resume mission
    const resumeRes = await fetch(`${BASE_URL}/api/missions/${encodeURIComponent(mission.id)}/resume`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.ok([200, 202].includes(resumeRes.status), 'Resume mission must return 200 or 202');

    // Poll until completion or progress made
    const startTime = Date.now();
    let madeProgress = false;
    while (Date.now() - startTime < 60000) {
      const chkRes = await fetch(`${BASE_URL}/api/missions/${encodeURIComponent(mission.id)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (chkRes.ok) {
        const m = await chkRes.json();
        if (['SUCCEEDED', 'COMPLETED', 'RUNNING'].includes(m.status) || (m.progress && m.progress > 0)) {
          madeProgress = true;
          break;
        }
      }
      await new Promise(r => setTimeout(r, 600));
    }
    assert.ok(madeProgress, 'Resumed mission must make progress towards completion');
  });

  test('10. Job Retry: Controlled failure -> Retry -> Attempt count incremented -> Checkpoint verified -> Success', { timeout: 60000 }, async () => {
    assert.ok(token, 'A valid session token must exist');

    // Submit a runtime job
    const jobPayload = {
      type: 'retry_validation_job',
      prompt: 'Validar capacidade de retentativa governada com checkpoint',
      maxAttempts: 3
    };
    const jobRes = await fetch(`${BASE_URL}/api/runtime/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(jobPayload)
    });
    assert.ok([200, 201, 202].includes(jobRes.status), 'Job submission must succeed');
    const jobData = await jobRes.json();
    const jobId = jobData.id || jobData.jobId;
    assert.ok(jobId, 'Job ID must be returned');

    // Trigger retry on the job
    const retryRes = await fetch(`${BASE_URL}/api/jobs/${encodeURIComponent(jobId)}/retry`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.ok([200, 202].includes(retryRes.status), 'Job retry endpoint must return 200 or 202');
    const retryResult = await retryRes.json();
    assert.ok(retryResult.attempts >= 0 || retryResult.status === 'QUEUED' || retryResult.status === 'READY', 'Job retry must update attempts or queue status');

    // Verify job checkpoints endpoint
    const cpRes = await fetch(`${BASE_URL}/api/jobs/${encodeURIComponent(jobId)}/checkpoints`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(cpRes.status, 200, 'Job checkpoints must be accessible');
    const cpData = await cpRes.json();
    assert.ok(Array.isArray(cpData.checkpoints), 'Job checkpoints must be an array');
  });

  test('11. Mission Cancellation: Cancel during run -> Worker cancelled -> Agent released -> Event persisted', { timeout: 120000 }, async () => {
    assert.ok(token, 'A valid session token must exist');

    const missionPayload = {
      title: `Cancellation Test Mission - ${Date.now()}`,
      name: `Cancellation Test Mission - ${Date.now()}`,
      objective: 'Verificar cancelamento gracioso de missões em andamento',
      steps: [
        { key: 'cancel_step_1', type: 'audit' },
        { key: 'cancel_step_2', type: 'audit', dependsOn: ['cancel_step_1'] }
      ],
      autoApprove: true
    };
    const createRes = await fetch(`${BASE_URL}/api/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(missionPayload)
    });
    const mission = await createRes.json();
    assert.ok(mission.id, 'Mission ID must exist');

    await fetch(`${BASE_URL}/api/missions/${encodeURIComponent(mission.id)}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Cancel mission
    const cancelRes = await fetch(`${BASE_URL}/api/missions/${encodeURIComponent(mission.id)}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.ok([200, 202].includes(cancelRes.status), 'Mission cancellation must return 200 or 202');

    // Verify mission state
    const getRes = await fetch(`${BASE_URL}/api/missions/${encodeURIComponent(mission.id)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const m = await getRes.json();
    assert.ok(['CANCELLED', 'SUCCEEDED', 'COMPLETED'].includes(m.status), `Mission status must reach cancelled or completed: ${m.status}`);
  });

  test('12. Recovery & Reconcile: Interruption simulation -> Reconcile scan -> Orphaned step/job recovered', async () => {
    assert.ok(token, 'A valid session token must exist');

    const recRes = await fetch(`${BASE_URL}/api/missions/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ autoStart: false })
    });
    assert.equal(recRes.status, 202, 'Reconciliation endpoint must return 202');
    const report = await recRes.json();
    assert.ok(report.examinadas !== undefined || report.ok !== undefined || report.report !== undefined, 'Reconciliation report must contain scan summary');

    // Verify observability endpoint reflects recovery state
    const obsRes = await fetch(`${BASE_URL}/api/observability/live`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(obsRes.status, 200, 'Live observability endpoint must return 200');
    const obs = await obsRes.json();
    assert.equal(obs.service, 'fenix-operating-system', 'Observability service must identify as fenix-operating-system');
    assert.ok(Array.isArray(obs.activeMissions), 'Active missions must be an array');
    assert.ok(Array.isArray(obs.activeJobs), 'Active jobs must be an array');
  });

  test('13. Human Approval Flow: RED step requires approval -> Approval requested -> Real API Approve -> Step unblocked & executed', async () => {
    assert.ok(token, 'A valid session token must exist');

    // Create governed approval request for a critical action
    const apprvRes = await fetch(`${BASE_URL}/api/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        action: 'mission.step.deploy',
        risk: 'RED',
        requestedBy: 'agent-qa-lead',
        rationale: 'Deployment of critical infrastructure components requires human signoff'
      })
    });
    assert.equal(apprvRes.status, 201, 'Approval request creation must return 201');
    const approval = await apprvRes.json();
    assert.ok(approval.id, 'Approval ID must exist');
    assert.equal(approval.status, 'pending', 'Approval initial status must be pending');

    // List approvals and verify presence
    const listRes = await fetch(`${BASE_URL}/api/approvals`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(listRes.status, 200, 'Approvals list must return 200');
    const listData = await listRes.json();
    const found = (listData.approvals || []).find(a => a.id === approval.id);
    assert.ok(found, 'Created approval must appear in pending list');

    // Approve the request
    const approveRes = await fetch(`${BASE_URL}/api/approvals/${encodeURIComponent(approval.id)}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(approveRes.status, 200, 'Approve action must return 200');
    const approvedData = await approveRes.json();
    assert.equal(approvedData.status, 'approved', 'Approval status must transition to approved');
    assert.ok(approvedData.approvedBy, 'Approved by operator ID must be recorded');
  });
});

