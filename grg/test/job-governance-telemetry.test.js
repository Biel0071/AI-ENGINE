/**
 * ai-engine/grg/test/job-governance-telemetry.test.js
 *
 * Test suite to validate:
 * 1. Job Approval & Full Runtime Control (Approve, Pause, Resume, Cancel).
 * 2. Mascot Sidebar Job Card DOM contracts (Background running badge, Token usage bar, Progress bar with ETA, Action buttons).
 * 3. Command Center Zero-Mock compliance (no stale ZapAI mock fallback, active background job prioritization, live sync timestamp).
 */

process.env.FENIX_TEST_MODE = 'true';
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const SRC_DIR = path.resolve(__dirname, '../src');

test('Job Governance: JobQueueManager supports pauseJob, resumeJob, and cancelJob', async () => {
  const { JobQueueManager } = require('../src/execution/job-queue-manager');
  const qm = new JobQueueManager();

  const job = qm.createJob({
    title: 'Teste de Governança Autônoma',
    type: 'analysis',
    projectId: 'fenix-os',
    model: 'qwen2.5:3b',
    estimatedTokens: 800,
    estimatedTimeSec: 25,
    requiresConfirmation: false
  });

  assert.ok(job.id, 'Job deve ter um ID gerado');
  assert.equal(job.status, 'QUEUED', 'Job inicial sem confirmação deve ser QUEUED');

  // Test pause
  const paused = await qm.pauseJob(job.id);
  assert.equal(paused.status, 'PAUSED', 'Job deve estar em estado PAUSED');

  // Test resume
  const resumed = await qm.resumeJob(job.id);
  assert.equal(resumed.status, 'QUEUED', 'Job retomado deve voltar para QUEUED');

  // Test cancel
  const cancelled = await qm.cancelJob(job.id);
  assert.equal(cancelled.status, 'CANCELLED', 'Job cancelado deve estar em estado CANCELLED');
  await qm.stop();
});

test('Job Governance: Conversation Routes support pause, resume, approve, and cancel endpoints', () => {
  const routesContent = fs.readFileSync(path.join(SRC_DIR, 'api/conversation-routes.js'), 'utf8');

  assert.ok(routesContent.includes('/pause'), 'Deve existir rota de pause para jobs');
  assert.ok(routesContent.includes('/resume'), 'Deve existir rota de resume para jobs');
  assert.ok(routesContent.includes('/approve'), 'Deve existir rota de approve para jobs');
  assert.ok(routesContent.includes('/cancel'), 'Deve existir rota de cancel para jobs');
  assert.ok(routesContent.includes('pauseMatch'), 'Deve existir handler pauseMatch');
  assert.ok(routesContent.includes('resumeMatch'), 'Deve existir handler resumeMatch');
});

test('Mascot Sidebar: DOM & CSS contain background badge, token bar, progress bar, and controls', () => {
  const css = fs.readFileSync(path.join(PUBLIC_DIR, 'fenix-mascot-sidebar.css'), 'utf8');
  const js = fs.readFileSync(path.join(PUBLIC_DIR, 'fenix-mascot-sidebar.js'), 'utf8');

  // CSS contracts
  assert.ok(css.includes('.fsb-pulse-dot'), 'CSS deve conter indicador pulsante fsb-pulse-dot');
  assert.ok(css.includes('.fsb-job-progress-section'), 'CSS deve conter seção de progresso do job');
  assert.ok(css.includes('.fsb-job-token-section'), 'CSS deve conter seção de tokens do job');
  assert.ok(css.includes('.fsb-job-btn.approve'), 'CSS deve conter botão de aprovação');
  assert.ok(css.includes('.fsb-job-btn.pause'), 'CSS deve conter botão de pausa');
  assert.ok(css.includes('.fsb-job-btn.resume'), 'CSS deve conter botão de retomada');
  assert.ok(css.includes('.fsb-job-btn.cancel'), 'CSS deve conter botão de cancelamento');

  // JS contracts
  assert.ok(js.includes('EXECUTANDO EM SEGUNDO PLANO'), 'JS deve renderizar badge de segundo plano');
  assert.ok(js.includes('AGUARDANDO APROVAÇÃO'), 'JS deve renderizar badge de aguardando aprovação');
  assert.ok(js.includes('getJobProgressDetails'), 'JS deve calcular progresso e ETA');
  assert.ok(js.includes('getJobTokenDetails'), 'JS deve calcular consumo de tokens');
  assert.ok(js.includes('approveJob'), 'JS deve ter método approveJob');
  assert.ok(js.includes('pauseJob'), 'JS deve ter método pauseJob');
  assert.ok(js.includes('resumeJob'), 'JS deve ter método resumeJob');
  assert.ok(js.includes('cancelJob'), 'JS deve ter método cancelJob');
  assert.ok(js.includes('pollTrackedJobs'), 'JS deve ter poller em segundo plano');
});

test('Command Center: Zero-Mock compliance and real sync telemetry', () => {
  const html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  const interactions = fs.readFileSync(path.join(PUBLIC_DIR, 'fenix-v11-interactions.js'), 'utf8');

  // Sync element contract in HTML
  assert.ok(html.includes('id="fenixCmdSyncStatus"'), 'index.html deve conter span fenixCmdSyncStatus');

  // Interactions logic checks: stale ZapAI CRM fallback eliminated
  assert.ok(!interactions.includes('|| missions[0]'), 'Não deve existir fallback cego para missions[0]');
  assert.ok(interactions.includes('activeJob'), 'Command Center deve inspecionar jobs ativos para o Hero Card');
  assert.ok(interactions.includes('fenixCmdSyncStatus'), 'Command Center deve atualizar fenixCmdSyncStatus');
  assert.ok(interactions.includes('fenixKpiMemoryLive'), 'Command Center deve sincronizar fenixKpiMemoryLive com dados reais');
  assert.ok(interactions.includes('fenixKpiKnowledgeLive'), 'Command Center deve sincronizar fenixKpiKnowledgeLive com dados reais');
});
