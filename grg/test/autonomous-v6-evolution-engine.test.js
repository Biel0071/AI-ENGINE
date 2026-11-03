'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { AutonomousMissionQueue } = require('../src/evolution/autonomous-mission-queue');
const { FenixAutonomousLoop } = require('../src/evolution/fenix-autonomous-loop');
const { getReaIntelligenceEngine } = require('../src/services/rea-intelligence-engine');
const { handleAutonomousLoopRoutes } = require('../src/api/autonomous-loop-routes');

const REQUIRED_19_CONTRACT_FIELDS = [
  'missionId',
  'projectId',
  'objective',
  'scope',
  'acceptanceCriteria',
  'priority',
  'assignedProvider',
  'assignedAgent',
  'branch',
  'worktree',
  'lockedFiles',
  'dependencies',
  'budget',
  'deadline',
  'executionStatus',
  'changedFiles',
  'testResults',
  'evidence',
  'reviewStatus'
];

const REQUIRED_12_SUBSYSTEMS = [
  'EvolutionScheduler',
  'ProjectObserver',
  'CodeQualityScanner',
  'VisualQualityScanner',
  'RuntimeHealthMonitor',
  'ImprovementBacklog',
  'MissionPrioritizer',
  'ProviderExecutionRouter',
  'SharedMissionContract',
  'EvolutionEvidenceRegistry',
  'RegressionMonitor',
  'ResourceBudgetController'
];

test('V6.1 — SharedMissionContract contains all 19 mandatory fields and preserves context across handoff', () => {
  const queue = new AutonomousMissionQueue({ persist: false });
  const { mission } = queue.enqueue({
    projectId: 'fenix-os',
    priority: 'P1',
    objective: 'Sincronizar contrato compartilhado entre API Platform, Antigravity e Codex',
    scope: 'multi-provider-contract',
    assignedProvider: 'api-platform-vps',
    assignedAgent: 'agent-orchestrator',
    targetFiles: ['ai-engine/grg/src/evolution/fenix-autonomous-loop.js'],
    acceptanceCriteria: ['Preservar 19 campos', 'Impedir autoaprovação']
  });

  const contract = queue.toSharedMissionContract(mission.id);
  assert.ok(contract, 'Contrato compartilhado deve existir');
  for (const field of REQUIRED_19_CONTRACT_FIELDS) {
    assert.ok(Object.prototype.hasOwnProperty.call(contract, field), `Campo obrigatório ausente no contrato: ${field}`);
  }
  assert.equal(contract.assignedProvider, 'api-platform-vps');
  assert.deepEqual(contract.lockedFiles, ['ai-engine/grg/src/evolution/fenix-autonomous-loop.js']);

  // Handoff para Antigravity adicionando changedFiles e evidência
  const afterHandoff = queue.handoffMissionProvider(mission.id, 'antigravity', {
    assignedAgent: 'agent-developer',
    reason: 'frontend_and_integration_implementation',
    changedFiles: ['ai-engine/grg/public/operations-live.js'],
    evidence: [{ kind: 'syntax-check', exitCode: 0 }]
  });

  assert.equal(afterHandoff.assignedProvider, 'antigravity');
  assert.equal(afterHandoff.assignedAgent, 'agent-developer');
  assert.deepEqual(afterHandoff.lockedFiles, ['ai-engine/grg/src/evolution/fenix-autonomous-loop.js']);
  assert.deepEqual(afterHandoff.changedFiles, ['ai-engine/grg/public/operations-live.js']);
  assert.equal(afterHandoff.acceptanceCriteria.length, 2);

  // Tentar aprovar com o mesmo agente autor deve falhar (Regra de Revisão Independente)
  assert.throws(() => {
    queue.handoffMissionProvider(mission.id, 'antigravity', {
      assignedAgent: 'agent-developer',
      reviewStatus: {
        status: 'APPROVED',
        authorAgentId: 'agent-developer',
        validatorAgentId: 'agent-developer'
      }
    });
  }, /Violação de revisão independente/);

  // Aprovar com validador independente diferente do autor deve funcionar
  const approvedContract = queue.handoffMissionProvider(mission.id, 'antigravity', {
    assignedAgent: 'agent-verifier-independent',
    reviewStatus: {
      status: 'APPROVED',
      authorAgentId: 'agent-developer',
      validatorAgentId: 'agent-verifier-independent',
      notes: 'Validado por revisor independente'
    }
  });
  assert.equal(approvedContract.reviewStatus.status, 'APPROVED');
  assert.equal(approvedContract.reviewStatus.independentConfirmed, true);
});

test('V6.2 — Real Execution Probes: Antigravity certified via real probe; Codex records UNAVAILABLE and fails over honestly when closed', async () => {
  const rea = getReaIntelligenceEngine();

  const agProbe = rea.testUniversalAdapter('antigravity-gemini');
  assert.equal(agProbe.ok, true, 'Antigravity probe real no workspace deve passar');
  assert.equal(agProbe.certificationStage, 'CERTIFIED');
  assert.ok(agProbe.evidence.includes('ANTIGRAVITY_REAL_PROBE:'));

  const codexProbe = rea.testUniversalAdapter('codex-cli');
  if (!codexProbe.ok) {
    assert.equal(codexProbe.certificationStage, 'UNAVAILABLE', 'Codex fechado não pode fingir estar conectado');
    assert.equal(codexProbe.availabilityStatus, 'UNAVAILABLE_FAILOVER_READY');
  }

  // Dispatch em codex-cli com failover habilitado deve registrar indisponibilidade primária e concluir via failover autorizado
  const dispatchRes = await rea.dispatchUniversalAdapterTask('codex-cli', {
    projectId: 'fenix-os',
    objective: 'Refatorar módulo com failover honesto caso Codex CLI esteja fechado',
    operation: 'execute',
    allowFailover: true
  });
  assert.equal(dispatchRes.ok, true);
  assert.equal(dispatchRes.mission.state, 'COMPLETED');
  if (!codexProbe.ok) {
    assert.equal(dispatchRes.mission.failoverTriggered, true);
    assert.equal(dispatchRes.mission.unavailablePrimaryAdapter, 'codex-cli');
    assert.equal(dispatchRes.mission.executedByAdapterId, 'antigravity-gemini');
  }
});

test('V6.3 — All 12 V6 Subsystems, 3 Configurable Cadences (5m, 30m, 2h) and Evolution Report operate with real data', async () => {
  const tmpState = path.resolve(__dirname, `../../../memory/.tmp-v6-state-${Date.now()}.json`);
  const tmpQueue = path.resolve(__dirname, `../../../memory/.tmp-v6-queue-${Date.now()}.json`);
  const loop = new FenixAutonomousLoop({
    statePersistPath: tmpState,
    queuePersistPath: tmpQueue
  });

  try {
    const subs = loop.getV6SubsystemsStatus();
    assert.equal(subs.totalSubsystems, 12);
    assert.equal(subs.operationalCount, 12);
    const subIds = subs.subsystems.map((s) => s.id);
    for (const reqSub of REQUIRED_12_SUBSYSTEMS) {
      assert.ok(subIds.includes(reqSub), `Subsistema V6 obrigatório ausente: ${reqSub}`);
    }

    const schedules = loop.getSchedulesStatus();
    assert.equal(schedules.cadences.health.intervalMs, 5 * 60 * 1000);
    assert.equal(schedules.cadences.quality.intervalMs, 30 * 60 * 1000);
    assert.equal(schedules.cadences.evolution.intervalMs, 2 * 60 * 60 * 1000);

    // Executar cada uma das 3 cadências
    const hRun = await loop.runCadence('health');
    assert.equal(hRun.cadenceId, 'health');
    const qRun = await loop.runCadence('quality');
    assert.equal(qRun.cadenceId, 'quality');
    const eRun = await loop.runCadence('evolution');
    assert.equal(eRun.cadenceId, 'evolution');

    const report = loop.getEvolutionReport();
    assert.equal(typeof report.headlineCounts.problemsDetected, 'number');
    assert.equal(typeof report.headlineCounts.fixesImplemented, 'number');
    assert.equal(typeof report.headlineCounts.validationsApproved, 'number');
    assert.equal(typeof report.headlineCounts.blockedPending, 'number');
    assert.ok(report.agentsBreakdown.registeredAgents >= 11);
    assert.equal(
      report.agentsBreakdown.availableAgents + report.agentsBreakdown.executingAgents,
      report.agentsBreakdown.registeredAgents
    );
    assert.ok(Array.isArray(report.provenEvolutions) && report.provenEvolutions.length >= 5);
  } finally {
    try { fs.unlinkSync(tmpState); } catch (_) {}
    try { fs.unlinkSync(tmpQueue); } catch (_) {}
  }
});

test('V6.4 — Fase 13 & 14: End-to-End Multi-Environment Mission via HTTP routes and 8 Certification Docs', async () => {
  const tmpState = path.resolve(__dirname, `../../../memory/.tmp-v6-e2e-state-${Date.now()}.json`);
  const tmpQueue = path.resolve(__dirname, `../../../memory/.tmp-v6-e2e-queue-${Date.now()}.json`);
  const loop = new FenixAutonomousLoop({
    statePersistPath: tmpState,
    queuePersistPath: tmpQueue
  });

  try {
    const res = {};
    const sendJson = (_r, status, body) => {
      res.status = status;
      res.body = body;
      return true;
    };

    await handleAutonomousLoopRoutes({ method: 'POST' }, res, {
      url: new URL('http://localhost/api/v2/autonomous/v6/execute-mission'),
      sendJson,
      readJson: async () => ({
        projectId: 'fenix-os',
        targetFile: 'ai-engine/grg/test/autonomous-routes-truth.test.js'
      }),
      app: { controlPlane: { authorize: async () => {} } },
      identity: { tenantId: 'grg', actorId: 'grg-admin' },
      autonomousLoop: loop
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true, 'Missão V6 fim a fim deve passar com exitCode === 0');
    assert.equal(res.body.independentReview.independentConfirmed, true);
    assert.notEqual(res.body.independentReview.authorAgentId, res.body.independentReview.validatorAgentId);
    assert.equal(res.body.independentReview.status, 'APPROVED');
    assert.ok(res.body.evidence.sha256 && res.body.evidence.sha256.length === 64);

    for (const field of REQUIRED_19_CONTRACT_FIELDS) {
      assert.ok(Object.prototype.hasOwnProperty.call(res.body.sharedContract, field), `Campo ausente em sharedContract: ${field}`);
    }

    // Verificar existência dos 8 documentos obrigatórios da Fase 14
    const docsDir = path.resolve(__dirname, '../../docs');
    const requiredDocs = [
      'AUTONOMOUS_EVOLUTION_ARCHITECTURE.md',
      'PROVIDER_INTEGRATION_STATUS.md',
      'SHARED_MISSION_CONTRACT.md',
      'CONTINUOUS_EXECUTION_REPORT.md',
      'PROJECT_EVOLUTION_HISTORY.md',
      'CODE_QUALITY_STANDARD.md',
      'EVOLUTION_BACKLOG.md',
      'VPS_RUNTIME_CERTIFICATION.md'
    ];
    for (const docName of requiredDocs) {
      const fullPath = path.join(docsDir, docName);
      assert.ok(fs.existsSync(fullPath), `Documento obrigatório da Fase 14 ausente: ${docName}`);
    }
  } finally {
    try { fs.unlinkSync(tmpState); } catch (_) {}
    try { fs.unlinkSync(tmpQueue); } catch (_) {}
  }
});
