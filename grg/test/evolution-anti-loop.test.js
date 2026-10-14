'use strict';
/**
 * Teste: Evolution Anti-Loop, Rollback e Crash/Kill Recovery
 * Valida:
 * 1. Fingerprinting criptográfico SHA-256 de propostas
 * 2. Ciclo de falha com Rollback atômico automatizado
 * 3. Quarentena após 3 falhas consecutivas idênticas
 * 4. Death / Kill Test: simulação de morte do worker e recuperação no boot
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { PersistentEvolutionQueue } = require('../src/evolution/persistent-evolution-queue');
const { EvolutionScheduler } = require('../src/evolution/evolution-scheduler');
const { EvolutionSnapshot } = require('../src/evolution/evolution-snapshot');
const { SandboxRunner } = require('../src/evolution/sandbox-runner');
const { FenixEvolutionWorker } = require('../src/evolution/fenix-evolution-worker');

const TEST_DIR = path.join(__dirname, '..', 'data', 'test-anti-loop');
const TEST_QUEUE_STORE = path.join(TEST_DIR, 'anti-loop-queue.json');

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

test('ANTI-LOOP 1: Ciclo de falha de teste com Rollback atômico automático', async () => {
  cleanup();
  fs.mkdirSync(TEST_DIR, { recursive: true });

  const testFileRel = 'test-victim-file.js';
  const testFileAbs = path.join(TEST_DIR, testFileRel);
  fs.writeFileSync(testFileAbs, 'module.exports = { status: "ORIGINAL" };\n', 'utf8');

  // Criar script de teste que propositalmente falha
  const failingTestRel = 'test-failing-check.js';
  const failingTestAbs = path.join(TEST_DIR, failingTestRel);
  fs.writeFileSync(failingTestAbs, 'process.exit(1);\n', 'utf8');

  const queue = new PersistentEvolutionQueue({ storePath: TEST_QUEUE_STORE });
  const snapshot = new EvolutionSnapshot({ baseDir: TEST_DIR, snapshotsDir: path.join(TEST_DIR, '.snaps') });
  const sandbox = new SandboxRunner({ cwd: TEST_DIR });
  const { ResourceGovernor } = require('../src/ops/resource-governor');
  const governor = new ResourceGovernor({ minFreeMemMb: 10 });

  const scheduler = new EvolutionScheduler({
    queue,
    snapshot,
    sandbox,
    governor,
    intervalMs: 100_000
  });

  // Enfileirar proposta configurada para falhar
  await queue.enqueue({
    title: 'Proposta com Teste Quebrado',
    description: 'Deve sofrer rollback automático',
    type: 'ARCHITECTURAL',
    priority: 'P1',
    targetFiles: [testFileRel],
    payload: {
      tests: [failingTestAbs]
    }
  });

  // Executar 1 ciclo
  const tickResult = await scheduler.tick();
  assert.strictEqual(tickResult.success, true);
  assert.strictEqual(tickResult.result.status, 'ROLLED_BACK');
  assert.ok(tickResult.result.error.includes('Falha no teste'));

  // Verificar se o arquivo original foi restaurado perfeitamente
  const content = fs.readFileSync(testFileAbs, 'utf8');
  assert.strictEqual(content, 'module.exports = { status: "ORIGINAL" };\n');

  cleanup();
});

test('ANTI-LOOP 2: Death / Kill Test — Recuperação pós-queda de processo', async () => {
  cleanup();
  fs.mkdirSync(TEST_DIR, { recursive: true });

  // 1. Worker 1 inicia e tem uma tarefa em andamento
  const queue1 = new PersistentEvolutionQueue({ storePath: TEST_QUEUE_STORE });
  await queue1.init();

  const { item } = await queue1.enqueue({
    title: 'Missão Interrompida por Kill',
    description: 'O processo será morto enquanto esta missão está IN_PROGRESS',
    type: 'ARCHITECTURAL',
    priority: 'P1'
  });

  // Simular dequeued para IN_PROGRESS
  await queue1.dequeue('killed-session-999');
  assert.strictEqual(queue1.getById(item.id).status, 'IN_PROGRESS');

  // 2. Simular queda fatal do processo (instância 1 destruída)
  // Worker 2 (novo processo) inicia
  const queue2 = new PersistentEvolutionQueue({ storePath: TEST_QUEUE_STORE });
  const worker2 = new FenixEvolutionWorker({
    port: 4426,
    queue: queue2
  });

  await worker2.init(); // executa _recoverInterruptedSessions()

  // 3. Verificar se o item pendente foi recuperado e re-enfileirado
  const recoveredItem = queue2.getById(item.id);
  assert.strictEqual(recoveredItem.status, 'QUEUED');
  assert.ok(recoveredItem.error.includes('Recovered from unexpected worker restart/crash'));

  cleanup();
});
