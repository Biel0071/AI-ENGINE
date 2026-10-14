'use strict';
/**
 * Teste: FenixEvolutionWorker
 * Valida:
 * 1. Inicialização do worker e servidor HTTP nativo
 * 2. Endpoint /health com status HEALTHY e zero mocks
 * 3. Endpoint /status com telemetria detalhada
 * 4. Enfileiramento via HTTP /queue/enqueue e listagem via /queue
 * 5. Ciclo de encerramento gracioso
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { FenixEvolutionWorker } = require('../src/evolution/fenix-evolution-worker');
const { PersistentEvolutionQueue } = require('../src/evolution/persistent-evolution-queue');

const TEST_PORT = 4425;
const TEST_STORE_PATH = path.join(__dirname, '..', 'data', 'test-worker-queue.json');

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' }
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
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

test('WORKER: Ciclo de vida completo do processo dedicado', async () => {
  if (fs.existsSync(TEST_STORE_PATH)) fs.unlinkSync(TEST_STORE_PATH);

  const queue = new PersistentEvolutionQueue({ storePath: TEST_STORE_PATH });
  const worker = new FenixEvolutionWorker({
    port: TEST_PORT,
    queue,
    intervalMs: 100_000 // intervalo longo para não disparar no meio do teste
  });

  await worker.start();

  try {
    // 1. Health check
    const health = await request('/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.status, 'HEALTHY');
    assert.strictEqual(health.body.worker, 'fenix-evolution-worker');
    assert.ok(health.body.pid > 0);
    assert.ok(health.body.uptimeSec >= 0);

    // 2. Status check
    const status = await request('/status');
    assert.strictEqual(status.status, 200);
    assert.strictEqual(status.body.worker, 'fenix-evolution-worker');
    assert.strictEqual(status.body.scheduler.state, 'IDLE');

    // 3. Enfileirar proposta via HTTP
    const enq = await request('/queue/enqueue', {
      method: 'POST',
      body: {
        title: 'Verificação Contínua de Integridade',
        description: 'Verificar integridade do repositório a cada 60s',
        type: 'ARCHITECTURAL',
        priority: 'P2'
      }
    });

    assert.strictEqual(enq.status, 201);
    assert.strictEqual(enq.body.deduplicated, false);
    assert.strictEqual(enq.body.item.title, 'Verificação Contínua de Integridade');

    // 4. Listar fila
    const qList = await request('/queue');
    assert.strictEqual(qList.status, 200);
    assert.strictEqual(qList.body.snapshot.queued, 1);
  } finally {
    await worker.stop();
    if (fs.existsSync(TEST_STORE_PATH)) fs.unlinkSync(TEST_STORE_PATH);
  }
});
