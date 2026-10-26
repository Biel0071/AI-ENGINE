'use strict';
/**
 * PHASE 54 — FÊNIX AUTONOMOUS EVOLUTION ENGINE & GRG UNIVERSAL ENGINEERING HUB
 * Complete Unit, Edge-Case & HTTP Route Certification Suite (12 Suites)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const { AutonomousMissionQueue } = require('../grg/src/evolution/autonomous-mission-queue');
const { FenixAutonomousLoop } = require('../grg/src/evolution/fenix-autonomous-loop');
const { handleAutonomousLoopRoutes } = require('../grg/src/api/autonomous-loop-routes');
const { globalReaIntelligenceEngine } = require('../grg/src/services/rea-intelligence-engine');
const { handleReaMemoryIndexRoutes } = require('../grg/src/api/rea-memory-index-routes');
const { auditFile } = require('../grg/src/governance/simulation-audit');

async function runCertification() {
  console.log('================================================================');
  console.log('PHASE 54 — AUTONOMOUS EVOLUTION & UNIVERSAL HUB CERTIFICATION');
  console.log('================================================================');

  const tmpDir = path.resolve(__dirname, 'tmp-phase54-cert-' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });
  const queueFile = path.join(tmpDir, 'queue.json');
  const stateFile = path.join(tmpDir, 'state.json');

  const mockApp = {
    controlPlane: { authorize: async () => true },
    reaEngine: globalReaIntelligenceEngine
  };

  const loop = new FenixAutonomousLoop({
    app: mockApp,
    tenantId: 'grg',
    actorId: 'grg-admin',
    statePersistPath: stateFile,
    queuePersistPath: queueFile
  });
  mockApp.autonomousLoop = loop;

  // ── SUITE 1: Universal Bug Tracker Lifecycle, Deduplication & Strict Validation Guards ──
  {
    const r1 = loop.reportBug({
      projectId: 'fenix-os',
      origin: 'TEST_FAILURE',
      title: 'Falha ao serializar payload nulo no endpoint de jobs',
      severity: 'HIGH',
      priority: 'P1',
      affectedFiles: ['grg/src/api/universal-job-routes.js'],
      autoEnqueue: true
    });
    assert.strictEqual(r1.deduplicated, false);
    assert.strictEqual(r1.bug.bugState, 'OPEN');
    assert.ok(r1.bug.missionId, 'Deve enfileirar missão automaticamente');

    // Deduplicação por fingerprint
    const r1Dup = loop.reportBug({
      projectId: 'fenix-os',
      origin: 'TEST_FAILURE',
      title: 'Falha ao serializar payload nulo no endpoint de jobs',
      affectedFiles: ['grg/src/api/universal-job-routes.js']
    });
    assert.strictEqual(r1Dup.deduplicated, true);
    assert.strictEqual(r1Dup.bug.bugId, r1.bug.bugId);

    // Proibição de transição para FIXED sem evidência de correção
    assert.throws(() => {
      loop.transitionBug(r1.bug.bugId, 'FIXED', { note: 'Tentando fechar sem diff/hash' });
    }, /Transição para FIXED bloqueada/);

    // Transição válida OPEN -> REPRODUCED -> IN_PROGRESS -> FIXED
    loop.transitionBug(r1.bug.bugId, 'REPRODUCED', { note: 'Reproduzido em teste' });
    loop.transitionBug(r1.bug.bugId, 'IN_PROGRESS', { note: 'Em correção' });
    loop.transitionBug(r1.bug.bugId, 'FIXED', {
      evidence: { diffSnippet: '+ if (!payload) payload = {};', subjectSha256After: 'abc123def456' }
    });
    assert.strictEqual(loop.getBug(r1.bug.bugId).bugState, 'FIXED');

    // Proibição estrita de transição para VERIFIED sem teste executado e aprovado (exitCode === 0)
    assert.throws(() => {
      loop.transitionBug(r1.bug.bugId, 'VERIFIED', {
        evidence: { testsPassed: false, testExitCode: 1 }
      });
    }, /Transição para VERIFIED bloqueada/);

    // Transição válida para VERIFIED com prova de teste real (exitCode === 0)
    loop.transitionBug(r1.bug.bugId, 'VERIFIED', {
      evidence: { testsPassed: true, testExitCode: 0, testOutput: '1/1 passed' }
    });
    assert.strictEqual(loop.getBug(r1.bug.bugId).bugState, 'VERIFIED');

    // Detecção de regressão reabre o bug automaticamente (VERIFIED -> REOPENED)
    const regressed = loop.reportBug({
      projectId: 'fenix-os',
      title: 'Falha ao serializar payload nulo no endpoint de jobs',
      affectedFiles: ['grg/src/api/universal-job-routes.js'],
      reopenOnRegression: true
    });
    assert.strictEqual(regressed.reopened, true);
    assert.strictEqual(regressed.bug.bugState, 'REOPENED');
    assert.strictEqual(regressed.bug.regressionCount, 1);

    console.log('   ✅ [Suite 1] Universal Bug Tracker (Lifecycle, Deduplication, Strict VERIFIED Guard & Regression Reopen) certified');
  }

  // ── SUITE 2: Worker Leases/Locks, File-Level Conflict Lock, Exponential Backoff Retries & Mission Controls ──
  {
    const q = loop.missionQueue;
    const { mission } = q.enqueue({
      projectId: 'api-platform',
      priority: 'P2',
      problem: 'Sincronizar timeout de gateway em chamadas longas',
      targetFiles: ['grg/src/api/gateway-timeout.js'],
      maxRetries: 2
    });

    // Lease exclusivo pelo worker-A bloqueia worker-B na mesma missão
    const leaseA = q.acquireLease(mission.id, 'worker-A', 30000);
    assert.strictEqual(leaseA.acquired, true);
    const leaseB = q.acquireLease(mission.id, 'worker-B', 30000);
    assert.strictEqual(leaseB.acquired, false);
    assert.strictEqual(leaseB.reason, 'LEASE_HELD_BY_OTHER_WORKER');

    // Conflito de lock por arquivo (File-Level Lock Conflict): outra missão tentando editar o mesmo arquivo
    const { mission: fileConflictMission } = q.enqueue({
      projectId: 'api-platform',
      priority: 'P0',
      problem: 'Refatorar headers no mesmo arquivo de gateway',
      targetFiles: ['grg/src/api/gateway-timeout.js']
    });
    const leaseFileConflict = q.acquireLease(fileConflictMission.id, 'worker-C', 30000);
    assert.strictEqual(leaseFileConflict.acquired, false);
    assert.strictEqual(leaseFileConflict.reason, 'FILE_LOCK_CONFLICT');
    assert.strictEqual(leaseFileConflict.conflictingMissionId, mission.id);

    // getNext para worker-C deve pular a missão com arquivo bloqueado pelo worker-A
    const nextForWorkerC = q.getNext('worker-C');
    assert.notStrictEqual(nextForWorkerC?.id, fileConflictMission.id, 'getNext não deve selecionar missão com arquivo em lock por outro worker');
    q.cancelMission(fileConflictMission.id, 'Limpeza de teste de conflito de arquivo');

    // Retry com backoff exponencial até bloquear após maxRetries
    const rTry1 = q.scheduleRetry(mission.id, 'Timeout transitório #1', 50);
    assert.strictEqual(rTry1.state, 'RETRY_SCHEDULED');
    assert.strictEqual(rTry1.attempts, 1);

    const rTry2 = q.scheduleRetry(mission.id, 'Timeout transitório #2', 50);
    assert.strictEqual(rTry2.state, 'RETRY_SCHEDULED');
    assert.strictEqual(rTry2.attempts, 2);

    const rBlocked = q.scheduleRetry(mission.id, 'Timeout persistente #3', 50);
    assert.strictEqual(rBlocked.state, 'BLOCKED');

    // Controles operacionais: resume -> prioritize P0 -> pause -> resume -> submitForApproval -> approve
    q.resumeMission(mission.id);
    assert.strictEqual(q.getMission(mission.id).state, 'QUEUED');

    q.prioritizeMission(mission.id, 'P0');
    assert.strictEqual(q.getMission(mission.id).priority, 'P0');

    q.pauseMission(mission.id, 'Manutenção programada');
    assert.strictEqual(q.getMission(mission.id).state, 'PAUSED');

    q.resumeMission(mission.id);
    q.submitForApproval(mission.id, { diff: '+ timeout: 30000' });
    assert.strictEqual(q.getMission(mission.id).state, 'AWAITING_APPROVAL');

    q.approveMission(mission.id, 'admin-reviewer', 'Diff revisado e seguro');
    assert.strictEqual(q.getMission(mission.id).state, 'COMPLETED');
    assert.strictEqual(q.getMission(mission.id).approvalState, 'APPROVED');

    console.log('   ✅ [Suite 2] Worker Leases, File-Level Lock Conflict, Exponential Backoff & Human Approval Gate certified');
  }

  // ── SUITE 3: API/Token/Cost Budget Enforcement (Per-Mission, Per-Project, Per-Period), EvolutionMemory Hit & Terminal Skip ──
  {
    loop.configureBudget({
      maxTokensPerPeriod: 500,
      maxTokensPerMission: 300,
      maxTokensPerProject: 400,
      maxCostUsdPerPeriod: 0.05,
      resetUsage: true
    });

    // 3.1: Skip se a missão já estiver concluída/cancelada
    const { mission: completedMis } = loop.missionQueue.enqueue({
      projectId: 'fenix-os',
      problem: 'Missão já encerrada para teste de economia de tokens'
    });
    loop.missionQueue.cancelMission(completedMis.id, 'Cancelada antes de chamar modelo');
    const skippedCall = await loop.invokeModelWithPolicy({
      missionId: completedMis.id,
      projectId: 'fenix-os',
      purpose: 'code-review',
      prompt: 'Não deve gastar tokens em missão cancelada',
      preferExternal: true
    });
    assert.strictEqual(skippedCall.skipped, true);
    assert.strictEqual(skippedCall.telemetry.outcome, 'SKIPPED_MISSION_TERMINAL');
    assert.strictEqual(skippedCall.tokensUsed, 0);

    // 3.2: Hit na EvolutionMemory antes de chamar modelo
    await loop.evolutionMemory.record({
      id: 'mem-seed-1',
      problem: 'Erro de serialização BigInt no payload JSON de telemetria',
      lesson: 'Usar replacer BigInt.prototype.toJSON ou String(v) antes de JSON.stringify',
      pattern: 'BigInt-Safe-JSON'
    });
    const memHitCall = await loop.invokeModelWithPolicy({
      missionId: 'mis-mem-hit',
      projectId: 'fenix-os',
      purpose: 'bug-fix',
      prompt: 'Como resolver Erro de serialização BigInt no payload JSON de telemetria',
      preferExternal: true
    });
    assert.strictEqual(memHitCall.cached, true);
    assert.strictEqual(memHitCall.provider, 'evolution-memory');
    assert.strictEqual(memHitCall.telemetry.outcome, 'MEMORY_HIT');
    assert.strictEqual(memHitCall.tokensUsed, 0);

    // 3.3: Chamada externa normal + SHA-256 Cache Hit
    const call1 = await loop.invokeModelWithPolicy({
      missionId: 'mis-budget-1',
      projectId: 'fenix-os',
      purpose: 'code-review',
      prompt: 'Verificar invariantes de segurança do módulo de autenticação',
      preferExternal: true
    });
    assert.strictEqual(call1.cached, false);
    assert.ok(call1.tokensUsed > 0);

    // Segunda chamada idêntica deve atingir o cache com 0 tokens extras
    const call2 = await loop.invokeModelWithPolicy({
      missionId: 'mis-budget-1',
      projectId: 'fenix-os',
      purpose: 'code-review',
      prompt: 'Verificar invariantes de segurança do módulo de autenticação',
      preferExternal: true
    });
    assert.strictEqual(call2.cached, true);
    assert.strictEqual(call2.telemetry.tokensUsed, 0);

    // 3.4: Limite por projeto (maxTokensPerProject) força fallback local gratuito
    loop.configureBudget({ maxTokensPerProject: 10 });
    const projectCappedCall = await loop.invokeModelWithPolicy({
      missionId: 'mis-budget-proj',
      projectId: 'fenix-os',
      purpose: 'architecture-check',
      prompt: 'Prompt inédito que excede orçamento do projeto fenix-os',
      preferExternal: true,
      useCache: false
    });
    assert.strictEqual(projectCappedCall.provider, 'ollama-local');
    assert.strictEqual(projectCappedCall.costUsd, 0);

    // 3.5: Esgotar orçamento global do período e verificar pausa automática de API externa mantendo execução local
    loop.configureBudget({ maxTokensPerPeriod: 10, maxTokensPerProject: 150000 });
    const budgetAfterExhaust = loop.getBudgetStatus();
    assert.strictEqual(budgetAfterExhaust.externalApiPaused, true);
    assert.strictEqual(budgetAfterExhaust.localExecutionAllowed, true);

    const fallbackLocalCall = await loop.invokeModelWithPolicy({
      missionId: 'mis-budget-2',
      projectId: 'fenix-os',
      purpose: 'local-analysis',
      prompt: 'Nova análise quando orçamento externo está pausado',
      preferExternal: true,
      useCache: false
    });
    assert.strictEqual(fallbackLocalCall.provider, 'ollama-local');
    assert.strictEqual(fallbackLocalCall.costUsd, 0);

    // Restaurar orçamento padrão
    loop.configureBudget({
      maxTokensPerPeriod: 500000,
      maxTokensPerMission: 50000,
      maxTokensPerProject: 150000,
      maxCostUsdPerPeriod: 10.0,
      resetUsage: true
    });
    console.log('   ✅ [Suite 3] Model Policy, Terminal Skip, EvolutionMemory Hit & Multi-Scope Budget Enforcement certified');
  }

  // ── SUITE 4: 7 Engineering Roles & 9 Canonical 3D City States ──
  {
    const statesToVerify = ['SCANNING', 'PLANNING', 'CODING', 'TESTING', 'REVIEWING', 'BLOCKED', 'COMPLETED', 'FAILED', 'IDLE'];
    for (const st of statesToVerify) {
      const updated = loop.setAgentCityState('code-agent', st, {
        missionId: 'mis-city-sync',
        projectId: 'fenix-os',
        targetFile: 'grg/src/server.js',
        thought: `Transição de teste para ${st}`
      });
      assert.strictEqual(updated.engineeringState, st);
    }
    const citySnap = loop.getCityAutonomousState();
    assert.strictEqual(citySnap.rolesCount, 7);
    assert.strictEqual(citySnap.validStates.length, 9);
    console.log('   ✅ [Suite 4] 7 Canonical Engineering Roles & 9 3D City States Synchronization certified');
  }

  // ── SUITE 5: 16-Step End-to-End Autonomous Bug-Fix PoC (Real File, Rollback Guard, Regression Test & Cold Restart) ──
  {
    const pocRes = await loop.runAutonomousBugFixPoC({
      workspaceDir: path.join(tmpDir, 'poc-sandbox')
    });
    assert.strictEqual(pocRes.ok, true);
    assert.strictEqual(pocRes.bugFinalState, 'VERIFIED');
    assert.strictEqual(pocRes.missionFinalState, 'COMPLETED');
    assert.notStrictEqual(pocRes.initialFailingExitCode, 0, 'O código com bug deve falhar antes da correção');
    assert.strictEqual(pocRes.postFixExitCode, 0, 'O código corrigido deve passar nos testes (exitCode === 0)');
    assert.notStrictEqual(pocRes.sha256Before, pocRes.sha256After, 'O hash SHA-256 do arquivo em disco deve mudar após o fix');
    assert.strictEqual(pocRes.rollbackProof.sha256RestoredMatchesOriginal, true, 'Rollback de patch inválido deve restaurar SHA-256 exato');
    assert.strictEqual(pocRes.coldRestartProof.noDuplicateOnReEnqueue, true, 'Cold-restart não pode duplicar missão');
    assert.strictEqual(pocRes.coldRestartProof.automaticallySelectedNextMission, true, 'Scheduler deve puxar a próxima missão elegível');
    console.log('   ✅ [Suite 5] 16-Step Real Autonomous Bug-Fix PoC (Disk Fix + Rollback Proof + Cold-Restart Recovery) certified');
  }

  // ── SUITE 6: Proactive Project Evolution Scanner (7 Criteria Ranking + Auto-Report Bugs) ──
  {
    const scanRes = loop.runProactiveProjectScan({ maxFiles: 15, autoReportBugs: true });
    assert.strictEqual(scanRes.ok, true);
    assert.ok(scanRes.scannedFilesCount > 0);
    assert.ok(scanRes.findingsCount > 0, 'Proactive scanner deve detectar achados reais no código');
    const firstFinding = scanRes.findings[0];
    assert.ok(typeof firstFinding.compositeRank === 'number', 'Achado deve conter compositeRank numérico calculado pelos 7 critérios');
    assert.ok(firstFinding.estimatedImpact && firstFinding.recommendedAction, 'Achado deve incluir impacto estimado e ação recomendada');
    if (scanRes.findings.length >= 2) {
      assert.ok(scanRes.findings[0].compositeRank >= scanRes.findings[1].compositeRank, 'Achados devem estar ordenados por compositeRank decrescente');
    }
    assert.ok(Array.isArray(scanRes.reportedBugs) && scanRes.reportedBugs.length > 0, 'autoReportBugs deve registrar achados no Bug Tracker');
    console.log(`   ✅ [Suite 6] Proactive Project Evolution Scanner certified (${scanRes.scannedFilesCount} files scanned, ${scanRes.findingsCount} real findings, ${scanRes.reportedBugs.length} auto-reported)`);
  }

  // ── SUITE 7: GRG Universal Engineering Hub — Inventory, Adapter Certification Honesty, Permissions & Cross-Project Propagation ──
  {
    const inv = globalReaIntelligenceEngine.getUniversalProjectInventory(mockApp);
    assert.strictEqual(inv.ok, true);
    assert.ok(inv.projectsTotal >= 7);
    assert.ok(inv.dependencyGraph.edges.length >= 5);

    const adaptersReg = globalReaIntelligenceEngine.getUniversalToolAdapterRegistry(mockApp);
    assert.strictEqual(adaptersReg.ok, true);
    assert.ok(adaptersReg.adaptersTotal >= 10);

    // Fase 13 Honesty Check: nenhum adaptador pode ser CONNECTED ou CERTIFIED sem lastTestEvidence real
    for (const ad of adaptersReg.adapters) {
      if (ad.certificationStage === 'CONNECTED' || ad.certificationStage === 'CERTIFIED') {
        assert.ok(ad.lastTestEvidence && ad.lastTestedAt, `Adaptador ${ad.adapterId} marcado como ${ad.certificationStage} sem evidência real de teste`);
      }
    }

    const testNodeRunner = globalReaIntelligenceEngine.testUniversalAdapter('node-test-runner', {}, mockApp);
    assert.strictEqual(testNodeRunner.ok, true);
    assert.strictEqual(testNodeRunner.certificationStage, 'CERTIFIED');

    const testGitAdapter = globalReaIntelligenceEngine.testUniversalAdapter('git-workspace', {}, mockApp);
    assert.strictEqual(testGitAdapter.ok, true);
    assert.strictEqual(testGitAdapter.certificationStage, 'CERTIFIED');

    // Fase 6: Permissão negada para operação fora do escopo do adaptador (ex.: deploy em mcp-memory-brain)
    const deniedDispatch = await globalReaIntelligenceEngine.dispatchUniversalAdapterTask('mcp-memory-brain', {
      projectId: 'fenix-os',
      operation: 'deploy',
      objective: 'Tentativa de deploy via adaptador de memória'
    }, mockApp);
    assert.strictEqual(deniedDispatch.ok, false);
    assert.strictEqual(deniedDispatch.code, 'PERMISSION_DENIED_BY_ADAPTER_SCOPE');

    // Fase 6: Human approval gate obrigatório para operação write/deploy em pm2-deployer
    const approvalDispatch = await globalReaIntelligenceEngine.dispatchUniversalAdapterTask('pm2-deployer', {
      projectId: 'fenix-os',
      operation: 'write',
      objective: 'Alteração de configuração PM2 sensível'
    }, mockApp);
    assert.strictEqual(approvalDispatch.ok, true);
    assert.strictEqual(approvalDispatch.awaitingApproval, true);
    assert.strictEqual(approvalDispatch.mission.state, 'AWAITING_APPROVAL');

    const propRes = globalReaIntelligenceEngine.propagateCrossProjectChange('api-platform', {
      sharedContract: 'contract:api-platform:v1-chat-completions',
      summary: 'Adicionado campo usage.cachedTokens'
    }, mockApp);
    assert.strictEqual(propRes.ok, true);
    assert.ok(propRes.propagation.impactedProjects.includes('fenix-os'));
    assert.ok(propRes.propagation.createdVerificationMissions.length >= 1);

    console.log('   ✅ [Suite 7] Universal Project Inventory, Adapter Honesty, Permission/Approval Gates & Cross-Project Propagation certified');
  }

  // ── SUITE 8: Real Cross-Tool & Cross-Project Communication Proof (2 Tools + 2 Projects + Memory + Bug Tracker + 3D City) ──
  {
    const proof = await globalReaIntelligenceEngine.runCrossToolAndProjectProof({
      sourceProject: 'api-platform',
      consumerProject: 'fenix-os',
      primaryTool: 'git-workspace',
      validatorTool: 'node-test-runner'
    }, mockApp);
    assert.strictEqual(proof.ok, true);
    assert.strictEqual(proof.step2ValidatorExecution.exitCode, 0);
    assert.ok(proof.step2ValidatorExecution.stdout.includes('CROSS_TOOL_AND_PROJECT_CONTRACT_VERIFIED:'));
    assert.ok(proof.memoryPreCheck.sourceMatches > 0, 'Memory pre-check deve retornar matches reais do índice do projeto');
    assert.ok(proof.centralMissionId, 'Prova cross-tool deve registrar missão central na fila autônoma');
    assert.strictEqual(proof.bugTrackerRecord?.bugState, 'VERIFIED', 'Prova cross-tool deve registrar e verificar item no Universal Bug Tracker');
    console.log('   ✅ [Suite 8] Cross-Tool & Cross-Project Proof (with Memory Pre-Check, Central Mission & Bug Tracker VERIFIED) certified');
  }

  // ── SUITE 9: HTTP Routes Governance (/api/v2/autonomous/* & /api/v2/rea/universal-hub/*) ──
  {
    const callAutoRoute = async (method, pathStr, body = {}) => {
      let status = 0;
      let payload = null;
      await handleAutonomousLoopRoutes(
        { method },
        { headersSent: false },
        {
          url: new URL(`http://localhost${pathStr}`),
          sendJson: (_res, code, data) => { status = code; payload = data; return true; },
          readJson: async () => body,
          app: mockApp,
          autonomousLoop: loop,
          identity: { tenantId: 'grg', actorId: 'grg-admin' }
        }
      );
      return { status, payload };
    };

    const dashHttp = await callAutoRoute('GET', '/api/v2/autonomous/dashboard');
    assert.strictEqual(dashHttp.status, 200);
    assert.ok(dashHttp.payload.dashboard.bugs);
    assert.ok(dashHttp.payload.dashboard.cityState);

    const pauseHttp = await callAutoRoute('POST', '/api/v2/autonomous/pause', { reason: 'Teste HTTP' });
    assert.strictEqual(pauseHttp.status, 200);
    assert.strictEqual(pauseHttp.payload.loop.status, 'PAUSED');

    const resumeHttp = await callAutoRoute('POST', '/api/v2/autonomous/resume');
    assert.strictEqual(resumeHttp.status, 200);
    loop.stop();

    const callHubRoute = async (method, pathStr, body = {}) => {
      let status = 0;
      let payload = null;
      await handleReaMemoryIndexRoutes(
        { method },
        { headersSent: false },
        new URL(`http://localhost${pathStr}`),
        (_res, code, data) => { status = code; payload = data; return true; },
        async () => body,
        { tenantId: 'grg', actorId: 'grg-admin' },
        mockApp
      );
      return { status, payload };
    };

    const adHttp = await callHubRoute('GET', '/api/v2/rea/universal-hub/adapters');
    assert.strictEqual(adHttp.status, 200);
    assert.ok(adHttp.payload.adapters.length >= 10);

    const invHttp = await callHubRoute('GET', '/api/v2/rea/universal-hub/inventory');
    assert.strictEqual(invHttp.status, 200);
    assert.ok(invHttp.payload.inventory.length >= 7);

    const forbiddenDispatchHttp = await callHubRoute('POST', '/api/v2/rea/universal-hub/dispatch', {
      adapterId: 'mcp-memory-brain',
      projectId: 'fenix-os',
      operation: 'deploy',
      task: 'Operação não permitida'
    });
    assert.strictEqual(forbiddenDispatchHttp.status, 403);

    console.log('   ✅ [Suite 9] HTTP Route Governance & RBAC/Scope Enforcement (/api/v2/autonomous/* & /api/v2/rea/universal-hub/*) certified');
  }

  // ── SUITE 10: Zero Fake Signals Audit across all Phase 54 files ──
  {
    const filesToAudit = [
      'grg/src/evolution/autonomous-mission-queue.js',
      'grg/src/evolution/fenix-autonomous-loop.js',
      'grg/src/api/autonomous-loop-routes.js',
      'grg/src/services/rea-intelligence-engine.js',
      'grg/src/api/rea-memory-index-routes.js'
    ];
    for (const rel of filesToAudit) {
      const abs = path.resolve(__dirname, '..', rel);
      const res = auditFile(abs, fs.readFileSync(abs, 'utf8'));
      assert.strictEqual(res.fakeSignals.length, 0, `Fake signal detectado em ${rel}: ${JSON.stringify(res.fakeSignals)}`);
    }
    console.log('   ✅ [Suite 10] SimulationAudit Zero-Fake-Signal verification passed (0/5 files with fake signals)');
  }

  // Cleanup tmpDir
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

  console.log('================================================================');
  console.log('🎉 ALL PHASE 54 CERTIFICATIONS PASSED (10/10 SUITES)');
  console.log('================================================================');
  process.exit(0);
}

runCertification().catch((err) => {
  console.error('❌ PHASE 54 CERTIFICATION FAILED:', err);
  process.exit(1);
});
