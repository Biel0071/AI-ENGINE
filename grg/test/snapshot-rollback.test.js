'use strict';
/**
 * Teste: EvolutionSnapshot & Rollback Engine
 * Valida:
 * 1. Captura de snapshot com hashes SHA-256 e git info
 * 2. Detecção de drift de arquivos
 * 3. Rollback atômico com verificação 100% dos hashes originais
 * 4. Remoção de arquivos temporários criados durante a evolução em caso de rollback
 * 5. Limpeza de snapshots
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { EvolutionSnapshot } = require('../src/evolution/evolution-snapshot');

const TEST_BASE_DIR = path.join(__dirname, '..', 'data', 'test-snapshot-workspace');
const TEST_SNAPS_DIR = path.join(TEST_BASE_DIR, '.test-snapshots');

function setupWorkspace() {
  if (fs.existsSync(TEST_BASE_DIR)) {
    fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_BASE_DIR, { recursive: true });

  // Criar arquivo inicial
  const fileA = path.join(TEST_BASE_DIR, 'service-a.js');
  fs.writeFileSync(fileA, 'module.exports = { version: "1.0.0" };\n', 'utf8');

  return { fileA };
}

test('SNAPSHOT 1: Captura e verificação de hashes', async () => {
  const { fileA } = setupWorkspace();
  const engine = new EvolutionSnapshot({ baseDir: TEST_BASE_DIR, snapshotsDir: TEST_SNAPS_DIR });

  const snapshot = await engine.createSnapshot({
    sessionId: 'ses-snap-01',
    proposalId: 'EVO-01',
    targetFiles: ['service-a.js']
  });

  assert.ok(snapshot.snapshotId.startsWith('snap-'));
  assert.strictEqual(snapshot.files.length, 1);
  assert.strictEqual(snapshot.files[0].relativePath, 'service-a.js');
  assert.ok(snapshot.files[0].originalHash);
  assert.strictEqual(snapshot.files[0].existed, true);

  // Sem alteração -> hasDrift() deve ser false
  assert.strictEqual(engine.hasDrift(snapshot.snapshotId), false);

  fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true });
});

test('SNAPSHOT 2: Detecção de drift e Rollback atômico com verificação SHA-256', async () => {
  const { fileA } = setupWorkspace();
  const engine = new EvolutionSnapshot({ baseDir: TEST_BASE_DIR, snapshotsDir: TEST_SNAPS_DIR });

  const initialContent = fs.readFileSync(fileA, 'utf8');
  const initialHash = crypto.createHash('sha256').update(initialContent).digest('hex');

  const snapshot = await engine.createSnapshot({
    sessionId: 'ses-snap-02',
    proposalId: 'EVO-02',
    targetFiles: ['service-a.js']
  });

  // Modificar arquivo
  fs.writeFileSync(fileA, 'module.exports = { version: "2.0.0-BROKEN", corrupted: true };\n', 'utf8');
  assert.strictEqual(engine.hasDrift(snapshot.snapshotId), true, 'Deve detectar alteração no arquivo');

  // Executar Rollback
  const rollbackResult = await engine.rollback(snapshot.snapshotId);
  assert.strictEqual(rollbackResult.success, true);
  assert.strictEqual(rollbackResult.verified, true);
  assert.strictEqual(rollbackResult.filesRestored.length, 1);

  // Verificar se o conteúdo foi restaurado de forma idêntica
  const restoredContent = fs.readFileSync(fileA, 'utf8');
  const restoredHash = crypto.createHash('sha256').update(restoredContent).digest('hex');
  assert.strictEqual(restoredHash, initialHash, 'Hash restaurado deve ser 100% idêntico ao original');
  assert.strictEqual(restoredContent, initialContent);

  // Limpeza
  engine.cleanup(snapshot.snapshotId);
  assert.strictEqual(fs.existsSync(path.join(TEST_SNAPS_DIR, snapshot.snapshotId)), false);

  fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true });
});

test('SNAPSHOT 3: Rollback remove arquivos criados durante a tentativa', async () => {
  setupWorkspace();
  const engine = new EvolutionSnapshot({ baseDir: TEST_BASE_DIR, snapshotsDir: TEST_SNAPS_DIR });

  // Arquivo B não existe antes
  const fileBRel = 'temp-patch-b.js';
  const fileBAbs = path.join(TEST_BASE_DIR, fileBRel);

  const snapshot = await engine.createSnapshot({
    sessionId: 'ses-snap-03',
    proposalId: 'EVO-03',
    targetFiles: [fileBRel]
  });

  assert.strictEqual(snapshot.files[0].existed, false);

  // Criar arquivo temporário durante a tentativa
  fs.writeFileSync(fileBAbs, 'const rogueCode = true;\n', 'utf8');
  assert.strictEqual(fs.existsSync(fileBAbs), true);

  // Rollback deve remover o arquivo criado
  const rollbackResult = await engine.rollback(snapshot.snapshotId);
  assert.strictEqual(rollbackResult.success, true);
  assert.strictEqual(rollbackResult.filesRemoved.includes(fileBRel), true);
  assert.strictEqual(fs.existsSync(fileBAbs), false, 'Arquivo criado deve ser removido após rollback');

  fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true });
});
