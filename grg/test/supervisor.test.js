'use strict';
/**
 * Teste: FenixSupervisor & Circuit Breaker
 * Valida:
 * 1. Inicialização do supervisor e telemetria HTTP
 * 2. Detecção precisa de serviços saudáveis vs. inacessíveis
 * 3. Tentativas de recuperação com registro de histórico
 * 4. Disparo do Circuit Breaker e entrada em QUARANTINED após 5 reinícios
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { FenixSupervisor } = require('../src/ops/fenix-supervisor');

const SUPERVISOR_PORT = 4435;
const DUMMY_TARGET_PORT = 4436;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: SUPERVISOR_PORT,
      path,
      method: options.method || 'GET'
    }, (res) => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: body ? JSON.parse(body) : {} });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

test('SUPERVISOR: Watchdog e Circuit Breaker Anti-Loop', async () => {
  // 1. Criar um servidor falso para simular um serviço saudável
  const dummyServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'HEALTHY' }));
  });
  await new Promise(r => dummyServer.listen(DUMMY_TARGET_PORT, '127.0.0.1', r));

  const supervisor = new FenixSupervisor({
    port: SUPERVISOR_PORT,
    pollIntervalMs: 100_000, // manual polling no teste
    startupGraceMs: 0,
  });

  // Configurar alvos controlados: 1 saudável e 1 inalcançável
  supervisor.targets = [
    {
      id: 'test-healthy',
      pm2Name: 'test-healthy',
      url: `http://127.0.0.1:${DUMMY_TARGET_PORT}/health`,
      enabled: true
    },
    {
      id: 'test-offline',
      pm2Name: 'test-offline',
      url: 'http://127.0.0.1:4499/health', // porta fechada
      enabled: true
    }
  ];

  // Recriar estados para os alvos de teste
  supervisor.states.clear();
  for (const t of supervisor.targets) {
    supervisor.states.set(t.id, {
      id: t.id,
      pm2Name: t.pm2Name,
      url: t.url,
      status: 'UNKNOWN',
      consecutiveFailures: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastLatencyMs: null,
      restartHistory: [],
      quarantinedUntil: null
    });
  }

  await supervisor.startHttpServer();

  try {
    // 2. Executar checagem
    await supervisor.pollAll();

    const healthyState = supervisor.states.get('test-healthy');
    assert.strictEqual(healthyState.status, 'HEALTHY');
    assert.strictEqual(healthyState.consecutiveFailures, 0);

    const offlineState = supervisor.states.get('test-offline');
    assert.strictEqual(offlineState.status, 'UNRESPONSIVE');
    assert.strictEqual(offlineState.consecutiveFailures, 1);

    // 3. Simular falhas repetidas para testar Circuit Breaker
    for (let i = 0; i < 11; i++) {
      await supervisor.checkTarget(supervisor.targets[1]);
    }

    // Deve ter entrado em QUARANTINED
    assert.strictEqual(offlineState.status, 'QUARANTINED');
    assert.ok(offlineState.quarantinedUntil > Date.now());

    // 4. Checar endpoint /health do supervisor
    const health = await request('/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.supervisor, 'fenix-supervisor');
    assert.strictEqual(health.body.status, 'DEGRADED'); // devido ao alvo offline
  } finally {
    await supervisor.stop();
    await new Promise(r => dummyServer.close(r));
  }
});

test('startup failures wait through the grace window and one restart gets a fresh window', async () => {
  const supervisor = new FenixSupervisor({
    startupGraceMs: 60_000,
    logger: { info() {}, warn() {}, error() {} },
  });
  const target = supervisor.targets.find((item) => item.id === 'fenix-backend');
  const state = supervisor.states.get(target.id);
  let restartCount = 0;
  supervisor._pingUrl = async () => ({ ok: false, error: 'ECONNREFUSED', latencyMs: 1 });
  supervisor._restartPm2Service = async () => { restartCount += 1; return { success: true }; };

  await supervisor.checkTarget(target);
  await supervisor.checkTarget(target);

  assert.equal(restartCount, 0, 'a booting backend must not be restarted on its second failed probe');
  assert.equal(state.status, 'STARTING');
  assert.ok(state.firstFailureAt);

  state.firstFailureAt = Date.now() - 60_001;
  await supervisor.checkTarget(target);

  assert.equal(restartCount, 1, 'a service still unavailable after the grace window gets one recovery attempt');
  assert.equal(state.status, 'STARTING');
  assert.ok(state.recoveryGraceUntil > Date.now());

  await supervisor.checkTarget(target);
  assert.equal(restartCount, 1, 'the recovery attempt must not be restarted during its own boot window');

  supervisor._pingUrl = async () => ({ ok: true, statusCode: 200, data: {}, latencyMs: 1 });
  await supervisor.checkTarget(target);
  assert.equal(state.status, 'HEALTHY');
  assert.equal(state.recoveryGraceUntil, null);
});
