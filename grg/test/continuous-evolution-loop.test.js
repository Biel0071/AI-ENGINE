'use strict';
/**
 * Teste Canônico: CONTINUOUS AUTONOMOUS EVOLUTION LOOP
 * Valida os contratos reais da Constituição e diretivas do Fênix OS:
 * 1. StorageManager Multi-Tier & Honest Persistence Reporting
 * 2. EvolutionMemory Schema & Persistence
 * 3. AutonomousMissionQueue P0-P7 Prioritization & problemHash Deduplication
 * 4. ExternalChangeDetector Git Sensor
 * 5. FenixAutonomousLoop Dynamic Scoring & Test Timeout Guard
 * 6. SystemKnowledgeGenerator Factual Output
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { StorageManager } = require('../src/storage/storage-manager');
const { EvolutionMemory } = require('../src/evolution/evolution-memory');
const { AutonomousMissionQueue } = require('../src/evolution/autonomous-mission-queue');
const { ExternalChangeDetector } = require('../src/evolution/external-change-detector');
const { FenixAutonomousLoop } = require('../src/evolution/fenix-autonomous-loop');
const { SystemKnowledgeGenerator } = require('../src/evolution/system-knowledge-generator');

test('EVOLUTION 1: StorageManager reports persistence state honestly without mocks', async () => {
  const sm = new StorageManager();
  await sm.boot();
  const stats = sm.getStats();

  assert.ok(stats.missions, 'Deve ter provedor de missões definido');
  assert.ok(stats.cache, 'Deve ter provedor de cache definido');
  assert.ok(stats.vectors, 'Deve ter provedor vetorial definido');
  assert.ok(['HEALTHY', 'PERSISTENCE DEGRADED'].includes(stats.state), 'Estado deve ser HEALTHY ou PERSISTENCE DEGRADED');
  await sm.shutdown();
});

test('EVOLUTION 2: EvolutionMemory stores and lists structured learning records', async () => {
  const em = new EvolutionMemory();
  const record = await em.record({
    missionId: 'mis-test-01',
    problem: 'Rota legada causava colisão',
    hypothesis: 'Isolar rota canônica previne colisão',
    actions: ['audit-router', 'unify-dispatcher'],
    filesChanged: ['src/server.js'],
    testsRun: ['syntax-check'],
    testResults: { status: 'PASSED' },
    lesson: 'Rotas canônicas devem ter precedência absoluta sobre routers legados.',
    pattern: 'Canonical-Shell-Guard',
    confidence: 0.95
  });

  assert.ok(record.id.startsWith('evo-mem-'), 'ID deve ser prefixado com evo-mem-');
  assert.strictEqual(record.pattern, 'Canonical-Shell-Guard');

  const list = await em.list({ limit: 10 });
  assert.ok(list.length >= 1, 'Memória deve ser listável');
  assert.strictEqual(list[0].id, record.id);

  const summary = await em.getSummary();
  assert.ok(summary.distinctPatterns.includes('Canonical-Shell-Guard'));
});

test('EVOLUTION 3: AutonomousMissionQueue orders by P0-P7 and deduplicates via problemHash', async () => {
  const queue = new AutonomousMissionQueue();

  const q1 = queue.enqueue({
    priority: 'P3',
    problem: 'Memória visual com leve atraso'
  });
  assert.strictEqual(q1.deduplicated, false);

  // Tentativa de duplicata equivalente
  const q2 = queue.enqueue({
    priority: 'P3',
    problem: 'memoria visual com leve atraso'
  });
  assert.strictEqual(q2.deduplicated, true, 'Deve deduplicar mesmo problema com variação de caixa');

  // Enfileirar P0 crítico
  queue.enqueue({
    priority: 'P0',
    problem: 'Cluster de persistência desconectado'
  });

  const next = queue.getNext();
  assert.strictEqual(next.priority, 'P0', 'P0 deve ter precedência imediata sobre P3');

  // Transição de estado
  queue.transition(next.id, 'EXECUTING');
  assert.strictEqual(next.state, 'EXECUTING');

  // Registro de falha com failure learning
  await queue.recordFailure(next.id, {
    failureMode: 'TIMEOUT',
    rootCause: 'Socket hangup',
    whatDidntWork: 'Tentativa direta sem retry',
    nextHypothesis: 'Habilitar retry com backoff exponencial'
  });

  assert.strictEqual(next.state, 'FAILED');
  assert.strictEqual(next.failures.length, 1);
});

test('EVOLUTION 4: FenixAutonomousLoop reports only scores supported by measurements', () => {
  const loop = new FenixAutonomousLoop({
    app: {
      storageManager: {
        getStats: () => ({
          missions: 'postgresql',
          cache: 'redis',
          vectors: 'qdrant',
          state: 'HEALTHY'
        })
      }
    }
  });

  const scores = loop.calculateScores();
  assert.equal(scores.realityScore, null, 'Reality score exige uma auditoria factual');
  assert.equal(scores.persistenceScore, null, 'A configuração dos drivers não é um score de persistência');
  assert.equal(scores.stabilityScore, null, 'Estabilidade exige pelo menos um ciclo registrado');
  assert.equal(scores.learningScore, null, 'Quantidade de ciclos não mede aprendizado');
  assert.equal(scores.visualScore, null, 'Score visual exige uma validação visual');
  assert.equal(scores.evolutionScore, null, 'Score agregado não pode ser calculado com entradas não medidas');

  const heartbeat = loop.getHeartbeat();
  assert.strictEqual(heartbeat.system, 'ONLINE');
  assert.strictEqual(heartbeat.persistence, 'HEALTHY');
  assert.strictEqual(heartbeat.evolution, 'IDLE');
  assert.strictEqual(heartbeat.watchers, 'STOPPED');

  loop._history.push(
    { result: 'SUCCESS' },
    { result: 'FAILED' },
    { result: 'NO_FINDINGS' },
  );
  assert.equal(loop.calculateScores().stabilityScore, 0.67);
});

test('EVOLUTION 5: SystemKnowledgeGenerator exports FENIX_SYSTEM_KNOWLEDGE.md', async () => {
  const loop = new FenixAutonomousLoop();
  const testOut = path.join(__dirname, 'temp_knowledge_test.md');
  const gen = new SystemKnowledgeGenerator({
    autonomousLoop: loop,
    outputPath: testOut
  });

  const ok = await gen.generate();
  assert.ok(ok, 'Geração de conhecimento deve retornar true');
  assert.ok(fs.existsSync(testOut), 'Arquivo temp_knowledge_test.md deve existir');

  const content = fs.readFileSync(testOut, 'utf8');
  assert.ok(content.includes('AUTOCONHECIMENTO FACTUAL DO SISTEMA'));
  assert.ok(content.includes('Evolution Score'));

  try { fs.unlinkSync(testOut); } catch (_) {}
});
