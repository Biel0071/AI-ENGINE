'use strict';

/**
 * FÊNIX OS — LIFE & REALITY CERTIFICATION TEST SUITE
 * Complete 10-Step Causal Loop Verification for API Platform Hero Environment:
 * 1. Initial State Ingestion & Hierarchy
 * 2. Real API Event Ingestion
 * 3. Real Agent Task Assignment (Alex Ops -> WORKING)
 * 4. Inter-Agent Communication (Alex -> Lucas)
 * 5. Workstation Movement & Realocation
 * 6. Task Completion & State Transition (WORKING -> AVAILABLE / IDLE)
 * 7. Live Agent Chat Consultation (Episodic Memory Integration)
 * 8. Fast Lane Optical Conduit & Hierarchy Integrity
 * 9. Physical Disk Persistence (world-state.json)
 * 10. Restart Resilience Across Fresh Engine Boot
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { start } = require('../src/server');
const { getWorldStateEngine } = require('../src/world-model/world-state-engine');

async function runLifeRealityTests() {
  console.log('================================================================');
  console.log('FÊNIX OS: LIFE & REALITY CERTIFICATION — API PLATFORM CAUSAL LOOP');
  console.log('================================================================\n');

  process.env.NODE_ENV = 'test';
  process.env.GRG_LLM = '0';
  process.env.FENIX_BOOTSTRAP_TENANT_ID = 'grg';
  process.env.FENIX_BOOTSTRAP_ADMIN_USER = 'grg-admin';
  process.env.FENIX_BOOTSTRAP_ADMIN_PASSWORD = 'admin';

  let server = null;
  let baseUrl = 'http://127.0.0.1:4400';

  try {
    const ping = await fetch(`${baseUrl}/`);
    if (ping.status !== 200) throw new Error('Not running');
    console.log(`[BOOT] Conectando ao servidor existente em: ${baseUrl}`);
  } catch (_) {
    console.log('[BOOT] Iniciando servidor Fênix em porta efêmera...');
    server = await start(0, { operationalActivation: false });
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`[BOOT] Servidor ouvindo em: ${baseUrl}`);
  }

  // Authenticate
  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'admin' })
  });
  const loginData = await loginRes.json();
  assert.ok(loginData.token, 'Token de autenticação retornado');
  const token = loginData.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  console.log('[AUTH] Autenticado com sucesso.\n');

  // ── STEP 1: INITIAL STATE & HIERARCHY ──
  console.log('── STEP 1: Verificando hierarquia e 7 agentes canônicos de API Platform ──');
  const hRes = await fetch(`${baseUrl}/api/v2/living-city/company/api-platform`, { headers: authHeaders });
  assert.strictEqual(hRes.status, 200, 'Hierarchy endpoint must return 200');
  const hData = await hRes.json();
  assert.ok(hData.ok, 'Response ok');
  assert.strictEqual(hData.company.id, 'api-platform');
  assert.strictEqual(hData.building.id, 'bld-api-platform');
  assert.ok(Array.isArray(hData.agents), 'Agents array present');
  assert.ok(hData.agents.length >= 7, `Expected at least 7 agents, got ${hData.agents.length}`);
  const agentIds = hData.agents.map(a => a.id);
  assert.ok(agentIds.includes('agent-api-ops'), 'Alex Ops present');
  assert.ok(agentIds.includes('agent-integration'), 'Elena Integrations present');
  assert.ok(agentIds.includes('agent-infra'), 'Lucas Infra present');
  assert.ok(agentIds.includes('agent-monitor'), 'Maya Observability present');
  assert.ok(agentIds.includes('agent-security'), 'Victor Security present');
  assert.ok(agentIds.includes('agent-ai-core'), 'Sora AI Core present');
  assert.ok(agentIds.includes('agent-support'), 'Gabriel Support present');
  console.log('   ✅ STEP 1 PASS: Empresa, edifício e 7 agentes canônicos verificados.\n');

  // ── STEP 2: REAL API EVENT INGESTION ──
  console.log('── STEP 2: Ingestão de evento real em /api/v2/living-city/company/api-platform/event ──');
  const evRes = await fetch(`${baseUrl}/api/v2/living-city/company/api-platform/event`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      type: 'HIGH_PRIORITY_GATEWAY_TRAFFIC',
      payload: { rps: 5400, endpoint: '/v2/orders/stream', target: 'Fastify 3001' }
    })
  });
  assert.strictEqual(evRes.status, 200, 'Event endpoint must return 200');
  const evData = await evRes.json();
  assert.ok(evData.ok, 'Event response ok');
  assert.ok(evData.event, 'Event object returned');
  assert.strictEqual(evData.event.companyId, 'api-platform');
  console.log(`   ✅ STEP 2 PASS: Evento "${evData.event.type}" ingerido e roteado.\n`);

  // ── STEP 3: REAL AGENT TASK ASSIGNMENT ──
  console.log('── STEP 3: Atribuição de tarefa para Alex Ops (agent-api-ops) ──');
  const assignRes = await fetch(`${baseUrl}/api/v2/living-city/agent/agent-api-ops/assign`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      task: 'Supervisionar pool de conexões HTTP Fastify 3001 sob tráfego de 5.400 req/s',
      job: { id: 'job-fastify-surge-101', name: 'Fastify Connection Pool Balancer' }
    })
  });
  assert.strictEqual(assignRes.status, 200, 'Assign endpoint must return 200');
  const assignData = await assignRes.json();
  assert.ok(assignData.ok, 'Assign response ok');

  // Verify Alex state
  const alexRes = await fetch(`${baseUrl}/api/v2/living-city/agent/agent-api-ops`, { headers: authHeaders });
  const alexData = await alexRes.json();
  assert.strictEqual(alexData.agent.status, 'WORKING', 'Alex must transition to WORKING');
  assert.ok(alexData.agent.episodicMemory.some(m => m.content.includes('Fastify Connection Pool Balancer') || m.content.includes('Supervisionar pool')), 'Memory must log new task');
  console.log(`   ✅ STEP 3 PASS: Alex Ops transicionou para WORKING. Memória registrada: "${alexData.agent.episodicMemory.slice(-1)[0].content}".\n`);

  // ── STEP 4: INTER-AGENT COMMUNICATION ──
  console.log('── STEP 4: Comunicação Inter-Agentes (Alex Ops -> Lucas Infra) ──');
  const msgRes = await fetch(`${baseUrl}/api/v2/living-city/agent/message`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      fromAgentId: 'agent-api-ops',
      toAgentId: 'agent-infra',
      message: 'Lucas, escalar réplica Redis na porta 6380 para aliviar pool de conexões',
      intent: 'INFRASTRUCTURE_SCALING'
    })
  });
  assert.strictEqual(msgRes.status, 200, 'Message endpoint must return 200');
  const msgData = await msgRes.json();
  assert.ok(msgData.ok, 'Message response ok');
  assert.ok(msgData.sender.memory.some(m => m.content.includes('Enviou mensagem para Lucas')), 'Sender memory updated');
  assert.ok(msgData.receiver.memory.some(m => m.content.includes('Recebeu mensagem de Agente API Operations') || m.content.includes('Recebeu mensagem de Alex')), 'Receiver memory updated');
  console.log('   ✅ STEP 4 PASS: Mensagem transmitida e gravada na memória de ambos os agentes.\n');

  // ── STEP 5: WORKSTATION MOVEMENT ──
  console.log('── STEP 5: Deslocamento de Posto / Realocação de Lucas Infra ──');
  const moveRes = await fetch(`${baseUrl}/api/v2/living-city/agent/agent-infra/move-station`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ workstationId: 'st-ap-infra' })
  });
  assert.strictEqual(moveRes.status, 200, 'Move station endpoint must return 200');
  const moveData = await moveRes.json();
  assert.ok(moveData.ok, 'Move response ok');
  assert.strictEqual(moveData.agent.workstationId, 'st-ap-infra', 'WorkstationId updated');
  assert.strictEqual(moveData.agent.state, 'RELOCATED', 'State set to RELOCATED');
  console.log(`   ✅ STEP 5 PASS: Lucas realocado para posto "${moveData.agent.workstationId}".\n`);

  // ── STEP 6: TASK COMPLETION & STATE TRANSITION ──
  console.log('── STEP 6: Conclusão de Tarefa e Transição de Alex Ops (WORKING -> AVAILABLE / IDLE) ──');
  const compRes = await fetch(`${baseUrl}/api/v2/living-city/agent/agent-api-ops/task/complete`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      taskId: 'job-fastify-surge-101',
      result: 'P99 Latência estabilizada em 11ms com 0 erros de conexão'
    })
  });
  assert.strictEqual(compRes.status, 200, 'Complete endpoint must return 200');
  const compData = await compRes.json();
  assert.ok(compData.ok, 'Complete response ok');
  assert.strictEqual(compData.agent.status, 'AVAILABLE', 'Status must return to AVAILABLE');
  assert.strictEqual(compData.agent.state, 'IDLE', 'State must return to IDLE');
  assert.ok(compData.agent.memory.some(m => m.content.includes('P99 Latência estabilizada')), 'Memory records task completion result');
  console.log(`   ✅ STEP 6 PASS: Alex Ops retornou a AVAILABLE / IDLE com prova de conclusão na memória.\n`);

  // ── STEP 7: LIVE AGENT CHAT CONSULTATION ──
  console.log('── STEP 7: Consulta Operacional via Chat com Alex Ops ──');
  const chatRes = await fetch(`${baseUrl}/api/v2/living-city/agent/agent-api-ops/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ message: 'Relatório de integridade do Fastify 3001' })
  });
  assert.strictEqual(chatRes.status, 200, 'Chat endpoint must return 200');
  const chatData = await chatRes.json();
  assert.ok(chatData.ok, 'Chat response ok');
  assert.ok(chatData.reply.includes('Alex') && chatData.reply.includes('Fastify 3001'), 'Authoritative response returned');
  assert.ok(chatData.recentMemories.length >= 2, 'Recent memories returned with chat');
  console.log(`   ✅ STEP 7 PASS: Resposta operacional do agente recebida: "${chatData.reply.slice(0, 100)}..."\n`);

  // ── STEP 8: FAST LANE & HIERARCHY INTEGRITY ──
  console.log('── STEP 8: Verificação de Fast Lane & Conexão de Barramento ──');
  const stateRes = await fetch(`${baseUrl}/api/v2/living-city/state`, { headers: authHeaders });
  assert.strictEqual(stateRes.status, 200, 'Living city state must return 200');
  const stateData = await stateRes.json();
  assert.ok(Array.isArray(stateData.companies), 'Companies list present');
  const apiComp = stateData.companies.find(c => c.id === 'api-platform');
  assert.ok(apiComp, 'api-platform company found');
  assert.ok(apiComp.connections.some(cn => cn.toCompanyId === 'ai-engine' && cn.type === 'FAST_LANE'), 'Fast Lane connection to ai-engine present');
  console.log('   ✅ STEP 8 PASS: Fast Lane ótica conectada e validada entre API Platform e Fênix HQ.\n');

  // ── STEP 9: PHYSICAL DISK PERSISTENCE ──
  console.log('── STEP 9: Persistência em disco físico (world-state.json) ──');
  const engine = getWorldStateEngine();
  await engine.persistState(); // Flush immediate sync

  const stateFile = path.resolve(__dirname, '../src/.data/world-state.json');
  assert.ok(fs.existsSync(stateFile), `Arquivo ${stateFile} deve existir`);
  const rawDisk = fs.readFileSync(stateFile, 'utf8');
  const diskState = JSON.parse(rawDisk);
  assert.ok(diskState.agents['agent-api-ops'], 'Alex must exist on disk');
  const alexDiskMemories = diskState.agents['agent-api-ops'].memory;
  assert.ok(alexDiskMemories.some(m => m.content.includes('P99 Latência estabilizada')), 'Completion result must be on disk');
  assert.ok(alexDiskMemories.some(m => m.content.includes('Enviou mensagem para')), 'Inter-agent message must be on disk');
  console.log(`   ✅ STEP 9 PASS: Estado persistido em disco com ${alexDiskMemories.length} memórias episódicas verificadas.\n`);

  // ── STEP 10: RESTART RESILIENCE ──
  console.log('── STEP 10: Resiliência contra Reinício de Servidor (Fresh Boot Recovery) ──');
  // Initialize a fresh engine instance simulating server reboot
  const { WorldStateEngine } = require('../src/world-model/world-state-engine');
  const freshEngine = new WorldStateEngine();
  const recoveredAlex = freshEngine.findAgent('agent-api-ops');
  assert.ok(recoveredAlex, 'Alex recovered after reboot');
  assert.strictEqual(recoveredAlex.status, 'AVAILABLE', 'Alex status recovered as AVAILABLE');
  assert.ok(recoveredAlex.memory.some(m => m.content.includes('P99 Latência estabilizada')), 'Episodic memory survived reboot');
  const recoveredLucas = freshEngine.findAgent('agent-infra');
  assert.strictEqual(recoveredLucas.workstationId, 'st-ap-infra', 'Workstation relocation survived reboot');
  console.log('   ✅ STEP 10 PASS: Reinício a frio testado. Todas as memórias e postos recuperados 100% intactos.\n');

  console.log('================================================================');
  console.log('🎉 10/10 PASS: LIFE & REALITY GATE CERTIFIED SUCCESSFUL!');
  console.log('================================================================');

  if (server) {
    await new Promise(r => server.close(r));
  }
}

runLifeRealityTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Life & Reality Certification Test Failed:', err);
  process.exit(1);
});
