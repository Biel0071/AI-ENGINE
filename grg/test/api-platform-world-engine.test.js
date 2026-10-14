'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('../src/server');

const ADMIN = { tenantId: 'grg', userId: 'test-admin', password: 'test-password-123' };

function withServer(fn) {
  return async () => {
    process.env.FENIX_BOOTSTRAP_TENANT_ID = ADMIN.tenantId;
    process.env.FENIX_BOOTSTRAP_ADMIN_USER = ADMIN.userId;
    process.env.FENIX_BOOTSTRAP_ADMIN_PASSWORD = ADMIN.password;
    process.env.FENIX_ALLOW_DEV_HEADERS = '0';
    process.env.NODE_ENV = 'test';
    process.env.GRG_LLM = '0';
    const server = await start(0, { operationalActivation: false });
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    try {
      await fn(base);
    } finally {
      await new Promise((r) => server.close(r));
    }
  };
}

test('FÊNIX WORLD 3.0: Multi-Company Architecture & API Platform Real Production Integration', withServer(async (base) => {
  // 1. Authenticate with Zero-Trust / RBAC
  const loginRes = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  assert.equal(loginRes.status, 200, 'Login returns 200');
  const loginData = await loginRes.json();
  assert.ok(loginData.token, 'Auth token must be returned');
  const authHeaders = {
    'Authorization': 'Bearer ' + loginData.token,
    'Content-Type': 'application/json'
  };

  // 2. GET /api/v2/living-city/companies - List All Registered Companies
  const compRes = await fetch(`${base}/api/v2/living-city/companies`, { headers: authHeaders });
  assert.equal(compRes.status, 200, 'Companies endpoint returns 200');
  const compData = await compRes.json();
  assert.equal(compData.ok, true, 'Response is ok');
  assert.ok(Array.isArray(compData.companies), 'Companies list must be an array');
  assert.ok(compData.companies.length >= 3, 'Must have at least 3 canonical companies');

  const apiCompany = compData.companies.find(c => c.id === 'api-platform');
  assert.ok(apiCompany, 'api-platform company must exist');
  assert.equal(apiCompany.companyType, 'API_PLATFORM', 'CompanyType must be API_PLATFORM');
  assert.equal(apiCompany.name, 'API Platform Inc.', 'Company name matches');

  // 3. GET /api/v2/living-city/company/api-platform - Full Spatial Hierarchy
  const detailRes = await fetch(`${base}/api/v2/living-city/company/api-platform`, { headers: authHeaders });
  assert.equal(detailRes.status, 200, 'Company detail endpoint returns 200');
  const detailData = await detailRes.json();
  assert.equal(detailData.ok, true, 'Detail response is ok');
  assert.equal(detailData.company.id, 'api-platform', 'Company ID matches');
  assert.equal(detailData.hierarchy.companyId, 'api-platform', 'Hierarchy belongs to api-platform');

  // Verify Buildings & Floors (4 Floors)
  assert.ok(detailData.hierarchy.buildings.length >= 1, 'API Platform building exists');
  const bld = detailData.hierarchy.buildings.find(b => b.id === 'bld-api-platform');
  assert.ok(bld, 'bld-api-platform must exist');
  assert.equal(bld.floors.length, 4, 'API Platform building has exactly 4 floors');
  assert.equal(bld.floors[0].id, 'floor-ground', 'Ground Floor exists (Reception, Lounge)');
  assert.equal(bld.floors[1].id, 'floor-1', 'Floor 1 exists (API Ops, Integrations)');
  assert.equal(bld.floors[2].id, 'floor-2', 'Floor 2 exists (SRE, Security Vault, 42U Server Core)');
  assert.equal(bld.floors[3].id, 'floor-3', 'Floor 3 exists (Cognitive AI Core, Research Lab)');

  // Verify Workstations (7 workstations)
  assert.ok(detailData.hierarchy.workstations.length >= 7, 'Must have at least 7 workstations');
  const wsIds = detailData.hierarchy.workstations.map(w => w.id);
  assert.ok(wsIds.includes('st-ap-ops'), 'st-ap-ops workstation exists');
  assert.ok(wsIds.includes('st-ap-integration'), 'st-ap-integration workstation exists');
  assert.ok(wsIds.includes('st-ap-infra'), 'st-ap-infra workstation exists');
  assert.ok(wsIds.includes('st-ap-monitor'), 'st-ap-monitor workstation exists');
  assert.ok(wsIds.includes('st-ap-security'), 'st-ap-security workstation exists');
  assert.ok(wsIds.includes('st-ap-ai-core'), 'st-ap-ai-core workstation exists');
  assert.ok(wsIds.includes('st-ap-support'), 'st-ap-support workstation exists');

  // Verify 7 Embodied Agents
  assert.ok(detailData.hierarchy.agents.length >= 7, 'Must have at least 7 agents in API Platform');
  const agentIds = detailData.hierarchy.agents.map(a => a.id);
  assert.ok(agentIds.includes('agent-api-ops'), 'Alex (agent-api-ops) exists');
  assert.ok(agentIds.includes('agent-integration'), 'Elena (agent-integration) exists');
  assert.ok(agentIds.includes('agent-infra'), 'Lucas (agent-infra) exists');
  assert.ok(agentIds.includes('agent-monitor'), 'Maya (agent-monitor) exists');
  assert.ok(agentIds.includes('agent-security'), 'Victor (agent-security) exists');
  assert.ok(agentIds.includes('agent-ai-core'), 'Sora (agent-ai-core) exists');
  assert.ok(agentIds.includes('agent-support'), 'Gabriel (agent-support) exists');

  // 4. POST /api/v2/living-city/company/api-platform/event - Real Operational Event
  const initialEventsCount = apiCompany.telemetry?.totalRequestsProcessed || 0;
  const eventRes = await fetch(`${base}/api/v2/living-city/company/api-platform/event`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      type: 'API_ENDPOINT_DEPLOYED',
      agentId: 'agent-api-ops',
      workstationId: 'st-ap-ops',
      payload: { route: '/api/v2/gateway/checkout', method: 'POST', latencyMs: 12 }
    })
  });
  assert.equal(eventRes.status, 200, 'Company event returns 200');
  const eventData = await eventRes.json();
  assert.equal(eventData.ok, true, 'Event emitted successfully');
  assert.equal(eventData.event.companyId, 'api-platform', 'Event company ID matches');
  assert.equal(eventData.event.agentId, 'agent-api-ops', 'Event agent ID matches');

  // Verify Agent State Updated
  const updatedAlex = eventData.agent;
  assert.ok(updatedAlex, 'Updated agent object returned');
  assert.equal(updatedAlex.status, 'WORKING', 'Alex status changed to WORKING');
  assert.match(updatedAlex.currentTask, /API_ENDPOINT_DEPLOYED/, 'Task updated');

  // Verify Telemetry Incremented
  assert.equal(eventData.company.telemetry.totalRequestsProcessed, initialEventsCount + 1, 'Telemetry counter incremented');

  // 5. POST /api/v2/living-city/company/api-platform/chat - Agent Spatial Interaction
  const chatRes = await fetch(`${base}/api/v2/living-city/company/api-platform/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      agentId: 'agent-api-ops',
      message: 'Alex, como está o throughput do gateway Fastify?'
    })
  });
  assert.equal(chatRes.status, 200, 'Company agent chat returns 200');
  const chatData = await chatRes.json();
  assert.equal(chatData.ok, true, 'Chat response is ok');
  assert.equal(chatData.agentId, 'agent-api-ops', 'Agent ID matches');
  assert.ok(chatData.reply, 'Agent reply must be non-empty');
  assert.match(chatData.reply, /Fastify/i, 'Reply contains Fastify context');

  // Test Lucas SRE chat
  const lucasChat = await fetch(`${base}/api/v2/living-city/company/api-platform/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      agentId: 'agent-infra',
      message: 'Lucas, qual a temperatura dos racks de servidores no 2º andar?'
    })
  });
  assert.equal(lucasChat.status, 200, 'Lucas chat returns 200');
  const lucasData = await lucasChat.json();
  assert.ok(lucasData.reply, 'Lucas reply returned');
  assert.match(lucasData.reply, /Rack|SRE|Cloud/i, 'Lucas answers with infrastructure context');

  // 6. Test Sora AI Core chat
  const soraChat = await fetch(`${base}/api/v2/living-city/company/api-platform/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      agentId: 'agent-ai-core',
      message: 'Sora, como está a latência dos embeddings e RAG?'
    })
  });
  assert.equal(soraChat.status, 200, 'Sora chat returns 200');
  const soraData = await soraChat.json();
  assert.ok(soraData.reply, 'Sora reply returned');
  assert.match(soraData.reply, /neural|RAG|LLM/i, 'Sora answers with neural context');
}));
