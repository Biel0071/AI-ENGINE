'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DynamicPoolManager } = require('../src/agents/dynamic-pool-manager');

test('DynamicPoolManager: initializes with default size 10 and assigns roles', () => {
  const manager = new DynamicPoolManager({ currentSize: 10, minSize: 10, maxSize: 100 });
  const state = manager.getPoolState();

  assert.equal(state.size, 10);
  assert.equal(state.agents.length, 10);
  assert.equal(state.idleCount, 10);
  assert.equal(state.busyCount, 0);
  assert.equal(state.utilizationPercentage, 0);

  // Check roles variety
  const roles = state.agents.map(a => a.role);
  assert.ok(roles.includes('ORCHESTRATOR'));
  assert.ok(roles.includes('FRONTEND'));
  assert.ok(roles.includes('BACKEND'));
});

test('DynamicPoolManager: scales up dynamically to 20, 50, and 100 agents', () => {
  const manager = new DynamicPoolManager({ currentSize: 10, minSize: 10, maxSize: 100 });

  // Scale to 20
  let res = manager.scale(20, { reason: 'test_scale_20' });
  assert.equal(res.ok, true);
  assert.equal(res.currentSize, 20);
  assert.equal(manager.getPoolState().size, 20);

  // Scale to 50
  res = manager.scale(50, { reason: 'test_scale_50' });
  assert.equal(res.ok, true);
  assert.equal(res.currentSize, 50);
  assert.equal(manager.getPoolState().size, 50);

  // Scale to 100
  res = manager.scale(100, { reason: 'test_scale_100' });
  assert.equal(res.ok, true);
  assert.equal(res.currentSize, 100);
  assert.equal(manager.getPoolState().size, 100);
});

test('DynamicPoolManager: scales down gracefully preserving busy agents', () => {
  const manager = new DynamicPoolManager({ currentSize: 50, minSize: 10, maxSize: 100 });
  
  // Create a task that makes an agent busy
  const popup = manager.createTaskPopup({
    taskId: 'task-keep-busy',
    title: 'Critical Mission',
    role: 'SECURITY'
  });

  const assignedAgentId = popup.agent.id;
  assert.equal(manager.agents.get(assignedAgentId).status, 'WAITING_APPROVAL');

  // Scale down from 50 to 10
  const res = manager.scale(10, { reason: 'test_scale_down' });
  assert.equal(res.ok, true);
  assert.equal(res.currentSize, 10);

  // The busy agent should NOT have been removed if possible
  assert.ok(manager.agents.has(assignedAgentId));
});

test('DynamicPoolManager: auto-scale triggers based on workload', () => {
  const manager = new DynamicPoolManager({ currentSize: 10, minSize: 10, maxSize: 100, scaleCooldownMs: 0 });

  // High workload -> auto-scale up
  const scaleUpResult = manager.evaluateAutoScaling({ activeTasksCount: 15, queueDepth: 5 });
  assert.ok(scaleUpResult);
  assert.ok(scaleUpResult.currentSize > 10);

  // Low workload -> auto-scale down
  const scaleDownResult = manager.evaluateAutoScaling({ activeTasksCount: 0, queueDepth: 1 });
  assert.ok(scaleDownResult);
  assert.equal(scaleDownResult.currentSize, 10);
});

test('DynamicPoolManager: creates task popup and handles approval / rejection', () => {
  const manager = new DynamicPoolManager({ currentSize: 10, minSize: 10, maxSize: 100 });

  // 1. Create popup
  const popup = manager.createTaskPopup({
    taskId: 'pop-001',
    title: 'Deploy Hotfix',
    objective: 'Deploy security patch to production',
    role: 'DEVOPS'
  });

  assert.equal(popup.taskId, 'pop-001');
  assert.equal(popup.status, 'APPROVAL_PENDING');
  assert.equal(Object.hasOwn(popup, 'tokensEstimated'), false);
  assert.equal(Object.hasOwn(popup, 'costEstimated'), false);
  assert.equal(manager.pendingPopups.size, 1);

  // 2. Approve popup
  const approveRes = manager.approveTask('pop-001', { feedback: 'Approved for deployment', approvedBy: 'lead_operator' });
  assert.equal(approveRes.ok, true);
  assert.equal(approveRes.popup.status, 'APPROVED');
  assert.equal(approveRes.popup.approvedBy, 'lead_operator');

  // 3. Create another popup and reject
  const popup2 = manager.createTaskPopup({
    taskId: 'pop-002',
    title: 'Drop Table Users',
    role: 'DATABASE'
  });

  const rejectRes = manager.rejectTask('pop-002', { reason: 'Destructive operation not allowed' });
  assert.equal(rejectRes.ok, true);
  assert.equal(rejectRes.status, 'REJECTED');
  assert.equal(manager.pendingPopups.has('pop-002'), false);
});

test('DynamicPoolManager: syncs with WorldStateEngine', () => {
  const manager = new DynamicPoolManager({ currentSize: 15, minSize: 10, maxSize: 100 });
  const mockWorldEngine = {
    agents: {}
  };

  const syncedCount = manager.syncWithWorldState(mockWorldEngine);
  assert.equal(syncedCount, 15);
  assert.equal(Object.keys(mockWorldEngine.agents).length, 15);
});

test('handleDynamicPoolRoutes: handles GET /api/v2/agents/pool and POST /scale and /test-task', async () => {
  const { handleDynamicPoolRoutes } = require('../src/api/dynamic-pool-routes');

  let sentCode = null;
  let sentPayload = null;
  const sendJson = (res, code, payload) => {
    sentCode = code;
    sentPayload = payload;
    return true;
  };

  // 1. GET /api/v2/agents/pool
  const handledGet = await handleDynamicPoolRoutes(
    { method: 'GET' },
    {},
    new URL('http://127.0.0.1:4400/api/v2/agents/pool'),
    {},
    sendJson,
    async () => ({})
  );
  assert.equal(handledGet, true);
  assert.equal(sentCode, 200);
  assert.ok(sentPayload.pool);
  assert.ok(Array.isArray(sentPayload.pool.agents));

  // 2. POST /api/v2/agents/pool/scale (targetSize: 20)
  const handledScale = await handleDynamicPoolRoutes(
    { method: 'POST' },
    {},
    new URL('http://127.0.0.1:4400/api/v2/agents/pool/scale'),
    {},
    sendJson,
    async () => ({ targetSize: 20, autoScale: false })
  );
  assert.equal(handledScale, true);
  assert.equal(sentCode, 200);
  assert.equal(sentPayload.pool.size, 20);

  // 3. POST /api/v2/agents/test-task
  const handledTask = await handleDynamicPoolRoutes(
    { method: 'POST' },
    {},
    new URL('http://127.0.0.1:4400/api/v2/agents/test-task'),
    {},
    sendJson,
    async () => ({ title: 'Build UI Widget', role: 'FRONTEND' })
  );
  assert.equal(handledTask, true);
  assert.equal(sentCode, 201);
  assert.ok(sentPayload.popup);
  assert.equal(sentPayload.popup.status, 'APPROVAL_PENDING');

  // 4. POST /api/v2/agents/tasks/:taskId/approve
  const taskId = sentPayload.popup.taskId;
  const handledApprove = await handleDynamicPoolRoutes(
    { method: 'POST' },
    {},
    new URL(`http://127.0.0.1:4400/api/v2/agents/tasks/${encodeURIComponent(taskId)}/approve`),
    {},
    sendJson,
    async () => ({ feedback: 'Approved by test' })
  );
  assert.equal(handledApprove, true);
  assert.equal(sentCode, 200);
  assert.equal(sentPayload.result.popup.status, 'APPROVED');

  // 5. POST /api/v2/agents/parallel-dispatch
  const parallelTasks = [
    { title: 'Parallel Task 1', role: 'FRONTEND' },
    { title: 'Parallel Task 2', role: 'BACKEND' },
    { title: 'Parallel Task 3', role: 'QA' },
    { title: 'Parallel Task 4', role: 'SECURITY' }
  ];
  const handledParallel = await handleDynamicPoolRoutes(
    { method: 'POST' },
    {},
    new URL('http://127.0.0.1:4400/api/v2/agents/parallel-dispatch'),
    {},
    sendJson,
    async () => ({ tasks: parallelTasks })
  );
  assert.equal(handledParallel, true);
  assert.equal(sentCode, 201);
  assert.equal(sentPayload.report.parallelCount, 4);
  assert.equal(sentPayload.report.concurrencyLevel, 4);
});
