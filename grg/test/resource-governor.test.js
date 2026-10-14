'use strict';
/**
 * Teste: ResourceGovernor
 * Valida:
 * 1. Telemetria honesta sem mocks de memória e CPU
 * 2. Limite rígido de concorrência = 1 para evoluções
 * 3. Semáforo de concorrência = 1 para chamadas Ollama / LLM
 * 4. Throttling por saturação de memória heap
 * 5. Liberação e reaquisição de slots
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { ResourceGovernor } = require('../src/ops/resource-governor');

test('GOVERNOR 1: Telemetria honesta do sistema', () => {
  const governor = new ResourceGovernor();
  const metrics = governor.getSystemMetrics();

  assert.ok(metrics.heapUsedMb > 0, 'Heap usado deve ser maior que 0');
  assert.ok(metrics.heapTotalMb >= metrics.heapUsedMb, 'Heap total deve ser >= heap usado');
  assert.ok(metrics.totalMemMb > 0, 'Total de memória do sistema deve ser > 0');
  assert.ok(metrics.freeMemMb >= 0, 'Memória livre deve ser >= 0');
  assert.strictEqual(metrics.activeEvolutions, 0);
  assert.strictEqual(metrics.activeOllamaCalls, 0);
});

test('GOVERNOR 2: Concorrência rígida de evolução = 1', () => {
  const governor = new ResourceGovernor({ maxConcurrent: 1 });

  // 1ª aquisição deve passar
  const acquired1 = governor.acquireEvolutionSlot();
  assert.strictEqual(acquired1, true);
  assert.strictEqual(governor.getSystemMetrics().activeEvolutions, 1);

  // 2ª aquisição simultânea deve ser rejeitada
  const check = governor.canExecute();
  assert.strictEqual(check.allowed, false);
  assert.ok(check.reason.includes('Concorrência máxima atingida'));

  const acquired2 = governor.acquireEvolutionSlot();
  assert.strictEqual(acquired2, false);

  // Liberação do slot
  governor.releaseEvolutionSlot();
  assert.strictEqual(governor.getSystemMetrics().activeEvolutions, 0);

  // Nova aquisição após liberação deve passar
  const acquired3 = governor.acquireEvolutionSlot();
  assert.strictEqual(acquired3, true);
  governor.releaseEvolutionSlot();
});

test('GOVERNOR 3: Semáforo de Ollama / LLM Concurrency = 1', async () => {
  const governor = new ResourceGovernor({ ollamaConcurrency: 1 });

  let call1Finished = false;
  let call2Started = false;

  // Chamada 1 adquire slot
  await governor.acquireOllamaSlot();
  assert.strictEqual(governor.getSystemMetrics().activeOllamaCalls, 1);

  // Chamada 2 tenta adquirir (deve aguardar na fila)
  const promise2 = governor.acquireOllamaSlot().then(() => {
    call2Started = true;
    assert.strictEqual(call1Finished, true, 'Chamada 2 só deve iniciar após Chamada 1 finalizar');
  });

  assert.strictEqual(call2Started, false, 'Chamada 2 deve estar suspensa na fila');
  assert.strictEqual(governor.getSystemMetrics().ollamaQueueLength, 1);

  // Finalizar chamada 1
  call1Finished = true;
  governor.releaseOllamaSlot();

  // Aguardar chamada 2 ser liberada
  await promise2;
  assert.strictEqual(call2Started, true);
  governor.releaseOllamaSlot();
  assert.strictEqual(governor.getSystemMetrics().activeOllamaCalls, 0);
});

test('GOVERNOR 4: Throttling de Heap saturado', () => {
  // Configurar limite artificialmente baixo (1 MB) para testar throttling
  const governor = new ResourceGovernor({ maxHeapMb: 1 });
  const check = governor.canExecute();

  assert.strictEqual(check.allowed, false);
  assert.strictEqual(governor.isThrottled(), true);
  assert.ok(check.reason.includes('Heap do processo muito alto'));
});
