'use strict';
/**
 * Teste: EvolutionSession
 * Valida:
 * 1. Ciclo de vida e progressão de passos
 * 2. Cadeia criptográfica de evidência (evidenceHash)
 * 3. Operações de controle: pause, resume e abort
 * 4. Finalização com sucesso e com rollback
 * 5. Persistência em disco e reconstituição estática
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { EvolutionSession } = require('../src/evolution/evolution-session');

const TEST_SESSIONS_DIR = path.join(__dirname, '..', 'data', 'test-sessions');

test('SESSION 1: Progressão de passos e cadeia de evidência SHA-256', () => {
  const session = new EvolutionSession({
    proposalId: 'EVO-PROP-TEST-01',
    sessionsDir: TEST_SESSIONS_DIR
  });

  const initHash = session.evidenceHash;
  assert.ok(initHash && initHash.length === 64, 'Hash inicial deve ter 64 caracteres hex');

  // Passo 1: Iniciar e completar SNAPSHOT_CREATED
  session.startStep('SNAPSHOT_CREATED', { targetFiles: ['grg/src/server.js'] });
  assert.strictEqual(session.currentStep, 'SNAPSHOT_CREATED');
  assert.strictEqual(session.status, 'SNAPSHOT_CREATED');

  session.completeStep('SNAPSHOT_CREATED', { snapshotId: 'snap-001' });
  assert.notStrictEqual(session.evidenceHash, initHash, 'Evidence hash deve evoluir após completar passo');
  const step1Hash = session.evidenceHash;

  // Passo 2: Iniciar e completar TESTING
  session.startStep('TESTING', { tests: ['grg/test/architecture-guard.test.js'] });
  session.completeStep('TESTING', { exitCode: 0, passed: true });
  assert.notStrictEqual(session.evidenceHash, step1Hash, 'Evidence hash deve evoluir no segundo passo');

  // Concluir sessão
  session.markCompleted({ status: 'SUCCEEDED' });
  assert.strictEqual(session.status, 'COMPLETED');
  assert.ok(session.completedAt);
  assert.ok(session.metrics.durationMs >= 0);

  if (fs.existsSync(TEST_SESSIONS_DIR)) {
    fs.rmSync(TEST_SESSIONS_DIR, { recursive: true, force: true });
  }
});

test('SESSION 2: Operações de controle Pause, Resume e Abort', () => {
  const session = new EvolutionSession({
    proposalId: 'EVO-PROP-TEST-02',
    sessionsDir: TEST_SESSIONS_DIR
  });

  session.startStep('GENERATING_PATCH');

  // Pausar
  session.pause('Aguardando liberação de CPU');
  assert.strictEqual(session.status, 'PAUSED');
  assert.strictEqual(session.pauseReason, 'Aguardando liberação de CPU');

  // Tentar iniciar passo enquanto pausado deve falhar
  assert.throws(() => {
    session.startStep('TESTING');
  }, /Não é possível iniciar passo/);

  // Retomar
  session.resume();
  assert.strictEqual(session.status, 'GENERATING_PATCH');
  assert.strictEqual(session.pauseReason, null);

  // Abortar
  session.abort('Cancelado pelo operador');
  assert.strictEqual(session.status, 'ABORTED');
  assert.strictEqual(session.error, 'Cancelado pelo operador');

  if (fs.existsSync(TEST_SESSIONS_DIR)) {
    fs.rmSync(TEST_SESSIONS_DIR, { recursive: true, force: true });
  }
});

test('SESSION 3: Falha de passo, Rollback e Reconstituição via disco', () => {
  const session = new EvolutionSession({
    proposalId: 'EVO-PROP-TEST-03',
    sessionsDir: TEST_SESSIONS_DIR
  });

  session.startStep('TESTING');
  session.failStep('TESTING', new Error('Falha no teste de regressão'));

  assert.strictEqual(session.status, 'FAILED');
  assert.ok(session.error.includes('Falha no teste de regressão'));

  // Registrar rollback
  session.markRolledBack({ filesRestored: ['src/server.js'], verified: true });
  assert.strictEqual(session.status, 'ROLLED_BACK');

  // Reconstituir sessão do disco
  const loaded = EvolutionSession.load(session.sessionId, { sessionsDir: TEST_SESSIONS_DIR });
  assert.ok(loaded, 'Sessão deve ser carregada do disco');
  assert.strictEqual(loaded.sessionId, session.sessionId);
  assert.strictEqual(loaded.status, 'ROLLED_BACK');
  assert.strictEqual(loaded.evidenceHash, session.evidenceHash);

  if (fs.existsSync(TEST_SESSIONS_DIR)) {
    fs.rmSync(TEST_SESSIONS_DIR, { recursive: true, force: true });
  }
});
