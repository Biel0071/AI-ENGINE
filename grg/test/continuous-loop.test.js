'use strict';
/**
 * Teste: Continuous Loop Engine (Fase 12.14 & 12.23)
 * Valida o ciclo completo contínuo de ponta a ponta:
 * WAKE -> HEALTH CHECK -> OBSERVE -> QUEUE -> SELECT -> SESSION ->
 * SNAPSHOT -> SANDBOX -> EXECUTE -> VERIFY -> PROMOTE -> LEARN -> MEMORY
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const { PersistentEvolutionQueue } = require('../src/evolution/persistent-evolution-queue');
const { EvolutionScheduler } = require('../src/evolution/evolution-scheduler');
const { EvolutionSnapshot } = require('../src/evolution/evolution-snapshot');
const { SandboxRunner } = require('../src/evolution/sandbox-runner');
const { ResourceGovernor } = require('../src/ops/resource-governor');
const { EvolutionMemory } = require('../src/evolution/evolution-memory');

const TEST_DIR = path.join(__dirname, '..', 'data', 'test-continuous-loop');
const TEST_QUEUE = path.join(TEST_DIR, 'queue.json');

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

test('CONTINUOUS LOOP: Ciclo autônomo completo com promoção e gravação na memória', async () => {
  cleanup();
  fs.mkdirSync(TEST_DIR, { recursive: true });

  // 1. Criar arquivo alvo para evolução
  const targetRel = 'calc-module.js';
  const targetAbs = path.join(TEST_DIR, targetRel);
  fs.writeFileSync(targetAbs, 'module.exports = { add: (a, b) => a + b };\n', 'utf8');

  // 2. Criar teste de verificação que passa com sucesso
  const testRel = 'verify-calc.js';
  const testAbs = path.join(TEST_DIR, testRel);
  fs.writeFileSync(testAbs, 'const calc = require("./calc-module"); if (calc.add(2, 3) !== 5) process.exit(1);\n', 'utf8');

  const queue = new PersistentEvolutionQueue({ storePath: TEST_QUEUE });
  const snapshot = new EvolutionSnapshot({ baseDir: TEST_DIR, snapshotsDir: path.join(TEST_DIR, '.snaps') });
  const sandbox = new SandboxRunner({ cwd: TEST_DIR });
  const governor = new ResourceGovernor({ minFreeMemMb: 10 });
  const memory = new EvolutionMemory();

  const scheduler = new EvolutionScheduler({
    queue,
    snapshot,
    sandbox,
    governor,
    memory,
    intervalMs: 100_000
  });

  // 3. Enfileirar proposta
  await queue.enqueue({
    title: 'Adicionar validação determinística de cálculo',
    description: 'Comprovar que o módulo de cálculo executa e passa em testes em sandbox',
    type: 'ARCHITECTURAL',
    priority: 'P1',
    targetFiles: [targetRel],
    payload: {
      tests: [testAbs]
    }
  });

  // 4. Executar ciclo contínuo
  const tickResult = await scheduler.tick();
  assert.strictEqual(tickResult.success, true);
  assert.strictEqual(tickResult.processed, true);
  assert.strictEqual(tickResult.result.status, 'SUCCEEDED');

  // 5. Verificar que a sessão foi registrada como COMPLETED
  assert.strictEqual(tickResult.result.session.status, 'COMPLETED');
  assert.ok(tickResult.result.session.evidenceHash);

  // 6. Verificar que a fila foi atualizada para SUCCEEDED
  const item = queue.getById(tickResult.result.session.proposalId);
  assert.strictEqual(item.status, 'SUCCEEDED');

  // 7. Verificar que o aprendizado foi registrado na EvolutionMemory
  const memList = await memory.list({ limit: 1 });
  assert.strictEqual(memList.length, 1);
  assert.ok(memList[0].lesson.includes('100% de sucesso'));

  cleanup();
});
