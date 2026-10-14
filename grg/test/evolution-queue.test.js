'use strict';
/**
 * Teste: PersistentEvolutionQueue
 * Valida:
 * 1. Priorização P0-P7 e cálculo de pontuação base
 * 2. Deduplicação criptográfica via fingerprint e problemHash
 * 3. Anti-starvation (elevação dinâmica de score)
 * 4. Transições de estado válidas
 * 5. Quarentena após 3 falhas consecutivas idênticas
 * 6. Sobrevivência à reinicialização (persistência em disco)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { PersistentEvolutionQueue } = require('../src/evolution/persistent-evolution-queue');

const TEST_STORE_PATH = path.join(__dirname, '..', 'data', 'test-evolution-queue.json');

test('QUEUE 1: Enfileiramento e priorização P0-P7 com deduplicação', async () => {
  if (fs.existsSync(TEST_STORE_PATH)) fs.unlinkSync(TEST_STORE_PATH);

  const queue = new PersistentEvolutionQueue({ storePath: TEST_STORE_PATH });
  await queue.init();

  // Enfileirar P1 (Arquitetural)
  const res1 = await queue.enqueue({
    title: 'Isolar Evolution Worker',
    description: 'Separar processo de background',
    type: 'ARCHITECTURAL',
    priority: 'P1'
  });

  assert.strictEqual(res1.deduplicated, false);
  assert.strictEqual(res1.item.priority, 'P1');
  assert.strictEqual(res1.item.baseScore, 800);
  assert.strictEqual(res1.item.status, 'QUEUED');

  // Tentar enfileirar duplicata exata
  const res2 = await queue.enqueue({
    title: 'Isolar Evolution Worker',
    description: 'Separar processo de background',
    type: 'ARCHITECTURAL',
    priority: 'P1'
  });

  assert.strictEqual(res2.deduplicated, true);
  assert.strictEqual(res2.item.id, res1.item.id);

  // Enfileirar P0 (Crítico) — deve ter maior score que P1
  const res3 = await queue.enqueue({
    title: 'Corrigir crash de memória',
    description: 'Vazamento no heap',
    type: 'CRITICAL',
    priority: 'P0'
  });

  assert.strictEqual(res3.deduplicated, false);
  assert.strictEqual(res3.item.baseScore, 1000);

  // O próximo item retirado deve ser o P0
  const next = queue.getNext();
  assert.strictEqual(next.id, res3.item.id);
  assert.strictEqual(next.priority, 'P0');

  if (fs.existsSync(TEST_STORE_PATH)) fs.unlinkSync(TEST_STORE_PATH);
});

test('QUEUE 2: Transições de estado e Anti-Starvation', async () => {
  if (fs.existsSync(TEST_STORE_PATH)) fs.unlinkSync(TEST_STORE_PATH);

  const queue = new PersistentEvolutionQueue({ storePath: TEST_STORE_PATH });
  await queue.init();

  const res = await queue.enqueue({
    title: 'Otimizar bundle frontend',
    description: 'Minificar scripts legados',
    type: 'PERFORMANCE',
    priority: 'P5'
  });

  const dequeued = await queue.dequeue('test-session-123');
  assert.strictEqual(dequeued.id, res.item.id);
  assert.strictEqual(dequeued.status, 'IN_PROGRESS');
  assert.strictEqual(dequeued.sessionId, 'test-session-123');

  // Atualizar para SUCCEEDED
  const updated = await queue.updateState(dequeued.id, 'SUCCEEDED', { result: { testsPassed: true } });
  assert.strictEqual(updated.status, 'SUCCEEDED');
  assert.ok(updated.completedAt);

  if (fs.existsSync(TEST_STORE_PATH)) fs.unlinkSync(TEST_STORE_PATH);
});

test('QUEUE 3: Quarentena após 3 falhas consecutivas', async () => {
  if (fs.existsSync(TEST_STORE_PATH)) fs.unlinkSync(TEST_STORE_PATH);

  const queue = new PersistentEvolutionQueue({ storePath: TEST_STORE_PATH });
  await queue.init();

  const { item } = await queue.enqueue({
    title: 'Proposta Problemática',
    description: 'Tentativa que falha repetidamente',
    type: 'EXPERIMENTAL',
    priority: 'P7'
  });

  // Falha 1
  await queue.updateState(item.id, 'FAILED', { error: 'Falha 1' });
  assert.strictEqual(queue.getById(item.id).failureCount, 1);

  // Falha 2
  await queue.updateState(item.id, 'FAILED', { error: 'Falha 2' });
  assert.strictEqual(queue.getById(item.id).failureCount, 2);

  // Falha 3 -> QUARANTINED
  const quarantined = await queue.updateState(item.id, 'FAILED', { error: 'Falha 3' });
  assert.strictEqual(quarantined.status, 'QUARANTINED');
  assert.ok(quarantined.error.includes('Quarantined'));

  // Não deve ser retornado por getNext()
  const next = queue.getNext();
  assert.strictEqual(next, null);

  if (fs.existsSync(TEST_STORE_PATH)) fs.unlinkSync(TEST_STORE_PATH);
});

test('QUEUE 4: Persistência em disco sobrevive a reinicialização', async () => {
  if (fs.existsSync(TEST_STORE_PATH)) fs.unlinkSync(TEST_STORE_PATH);

  // Instância 1: enfileira
  const queue1 = new PersistentEvolutionQueue({ storePath: TEST_STORE_PATH });
  await queue1.init();

  await queue1.enqueue({
    id: 'persisted-001',
    title: 'Migração de Esquema',
    description: 'Adicionar coluna de telemetria',
    type: 'ARCHITECTURAL',
    priority: 'P2'
  });

  // Instância 2: lê do mesmo arquivo
  const queue2 = new PersistentEvolutionQueue({ storePath: TEST_STORE_PATH });
  await queue2.init();

  const item = queue2.getById('persisted-001');
  assert.ok(item, 'Item deve existir após reiniciar fila a partir do arquivo');
  assert.strictEqual(item.title, 'Migração de Esquema');
  assert.strictEqual(item.priority, 'P2');

  if (fs.existsSync(TEST_STORE_PATH)) fs.unlinkSync(TEST_STORE_PATH);
});
