const { uuid } = require('../kernel/ids');
const { ForbiddenError } = require('../kernel/errors');
const { auditTree, CLASSES } = require('./simulation-audit');
const { STATES } = require('./readiness-matrix');

// V10 — PRODUCTION LOCK.
//
// Enquanto houver NOT_READY, BLOCKER, CRITICAL ou FAILED_VALIDATION, e proibido executar
// commit, push, merge, tag, release, deploy ou migracao.
//
// Este modulo nao mede nada por conta propria: compoe os instrumentos que ja existem e
// que ja foram provados (Regra 1 — nao criar motor novo, usar a arquitetura existente).
// Duas decisoes de projeto importam:
//
// 1. O padrao e NEGAR. Se um dos instrumentos falha ao responder, a acao e bloqueada com
//    o erro como blocker. Um gatekeeper que libera quando nao consegue verificar e pior
//    que nenhum, porque da a impressao de que houve verificacao.
//
// 2. `evaluate()` nunca lanca — devolve o veredito com evidencias, para o chamador poder
//    exibir o motivo. `assertAllowed()` lanca. Quem esta no caminho de uma acao critica
//    usa assertAllowed; quem esta montando um relatorio usa evaluate.
const CRITICAL_ACTIONS = new Set(['commit', 'push', 'merge', 'tag', 'release', 'deploy', 'migration', 'production']);

// Estados que caracterizam blocker segundo o V10.
const BLOCKING_READINESS = new Set(['NOT_READY', 'DEGRADED', 'FAILED_VALIDATION']);

class Gatekeeper {
  constructor({ store, bus, controlPlane, operationalActivation, readinessMatrix, srcDir = require('node:path').join(__dirname, '..') }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.operationalActivation = operationalActivation;
    this.readinessMatrix = readinessMatrix;
    this.srcDir = srcDir;
  }

  // Reune os blockers de todas as fontes. Nao decide nada sozinho — so junta evidencia.
  async #collect(tenantId, actorId) {
    const blockers = [];
    const evidence = [];

    // 1. Readiness dos componentes. Usa o ultimo run gravado em vez de disparar um novo:
    // um boot completo leva segundos e o gatekeeper roda no caminho de uma acao.
    let readiness = null;
    let stability = null;
    try {
      const snapshot = await this.operationalActivation.state(tenantId, actorId);
      readiness = snapshot.readiness;
      stability = snapshot.latestStability;

      if (!readiness) {
        blockers.push({ source: 'readiness', code: 'NEVER_ACTIVATED', detail: 'no activation run has ever completed for this tenant' });
      } else {
        evidence.push({ kind: 'readiness-report', reference: readiness.id, status: readiness.status, score: readiness.score });
        if (BLOCKING_READINESS.has(readiness.status) || readiness.status !== 'READY') {
          blockers.push({ source: 'readiness', code: readiness.status, detail: `readiness is ${readiness.status} (score ${readiness.score})` });
        }
        for (const blocker of readiness.blockers || []) {
          blockers.push({ source: 'component', code: blocker.status, detail: `critical component ${blocker.componentId} is ${blocker.status}`, componentId: blocker.componentId, investigationId: blocker.investigationId || null });
        }
      }

      for (const investigation of snapshot.investigations || []) {
        blockers.push({ source: 'investigation', code: investigation.severity, detail: `${investigation.title} (open since ${investigation.openedAt})`, investigationId: investigation.id });
      }
    } catch (error) {
      // Falha ao verificar e blocker, nao passe livre.
      blockers.push({ source: 'readiness', code: 'PROBE_FAILED', detail: `could not read operational state: ${error.message}` });
    }

    // 2. Provas de GA. `stabilityReport` ja as valida; aqui so refletimos o resultado.
    if (stability) {
      evidence.push({ kind: 'stability-report', reference: stability.id, status: stability.status });
      for (const blocker of stability.blockers || []) {
        if (String(blocker).startsWith('proof:')) {
          blockers.push({ source: 'proof', code: 'MISSING_EVIDENCE', detail: `${blocker} has no recorded assurance` });
        }
      }
    } else {
      blockers.push({ source: 'proof', code: 'NO_STABILITY_REPORT', detail: 'no stability report exists; the 7 GA proofs were never evaluated' });
    }

    // 3. Verdade do codigo. Qualquer modulo simulado ou arquivo com metrica inventada
    // bloqueia: uma plataforma que mente sobre si mesma nao pode autorizar seu proprio
    // deploy.
    try {
      if (!this.cachedAudit) {
        this.cachedAudit = auditTree(this.srcDir);
      }
      const audit = this.cachedAudit;
      evidence.push({ kind: 'simulation-audit', reference: `${audit.totals.modules} modules / ${audit.totals.files} files`, fakeSignals: audit.totals.totalFakeSignals });
      const offending = audit.modules.filter((item) => item.classification === CLASSES.SIMULATED || item.classification === CLASSES.STUB);
      for (const module of offending) {
        blockers.push({ source: 'simulation-audit', code: module.classification.toUpperCase(), detail: `module ${module.module} is ${module.classification}` });
      }
      if (audit.totals.totalFakeSignals > 0) {
        const dirty = audit.modules.flatMap((item) => item.dirtyFiles).slice(0, 10);
        blockers.push({
          source: 'simulation-audit',
          code: 'FAKE_METRICS',
          detail: `${audit.totals.totalFakeSignals} invented metric signals across ${dirty.length} files`,
          files: dirty.map((item) => item.file),
        });
      }
    } catch (error) {
      blockers.push({ source: 'simulation-audit', code: 'AUDIT_FAILED', detail: `could not audit the source tree: ${error.message}` });
    }

    // 4. Objetivos. Um objetivo de risco CRITICAL que nao chegou a VALIDATED bloqueia.
    // Os demais entram como aviso: nao travam a acao, mas aparecem no relatorio.
    const warnings = [];
    try {
      const matrix = await this.readinessMatrix.build(tenantId, actorId);
      evidence.push({ kind: 'readiness-matrix', reference: matrix.id, productionProven: matrix.totals.productionProven, objectives: matrix.totals.objectives });
      for (const objective of matrix.objectives) {
        const criticalRisk = objective.risk?.value === 'CRITICAL';
        const insufficient = objective.state === STATES.SPECIFIED || objective.state === STATES.IMPLEMENTED;
        if (criticalRisk && insufficient) {
          blockers.push({ source: 'objective', code: objective.state, detail: `critical objective '${objective.id}' is only ${objective.state}`, objectiveId: objective.id, objectiveBlockers: objective.blockers });
        } else if (insufficient) {
          warnings.push({ source: 'objective', code: objective.state, detail: `objective '${objective.id}' is ${objective.state}`, objectiveId: objective.id });
        }
      }
    } catch (error) {
      blockers.push({ source: 'objective', code: 'MATRIX_FAILED', detail: `could not build the readiness matrix: ${error.message}` });
    }

    return { blockers, warnings, evidence };
  }

  // Veredito sem lancar. `allowed` so e true com zero blockers.
  async evaluate(tenantId, actorId, action = 'deploy') {
    await this.cp.authorize(tenantId, actorId, 'runtime:read');
    const normalized = String(action).toLowerCase();
    const { blockers, warnings, evidence } = await this.#collect(tenantId, actorId);

    const critical = CRITICAL_ACTIONS.has(normalized);
    const decision = {
      id: uuid(),
      tenantId,
      action: normalized,
      criticalAction: critical,
      // Acao nao-critica passa: o lock existe para proteger producao, nao para travar
      // leitura. Acao critica passa somente com zero blockers.
      allowed: critical ? blockers.length === 0 : true,
      status: blockers.length ? 'PRODUCTION_LOCK' : 'CLEAR',
      blockers,
      warnings,
      evidence,
      // O plano de correcao nao e conselho generico: e derivado dos blockers presentes.
      remediation: remediationFor(blockers),
      evaluatedBy: actorId,
      evaluatedAt: new Date().toISOString(),
    };

    await this.store.update((state) => {
      state.gatekeeperDecisions = state.gatekeeperDecisions || [];
      state.gatekeeperDecisions.push({
        id: decision.id, tenantId, action: normalized, allowed: decision.allowed,
        blockerCount: blockers.length, evaluatedBy: actorId, evaluatedAt: decision.evaluatedAt,
      });
      return state;
    });

    if (this.bus?.emit) {
      await this.bus.emit(decision.allowed ? 'gatekeeper.action.cleared' : 'gatekeeper.action.blocked', {
        tenantId, action: normalized, blockerCount: blockers.length,
      });
    }

    return decision;
  }

  // Para o caminho de execucao. Lanca com a lista de blockers no corpo do erro, para a
  // recusa ser acionavel em vez de opaca.
  async assertAllowed(tenantId, actorId, action = 'deploy') {
    const decision = await this.evaluate(tenantId, actorId, action);
    if (decision.allowed) return decision;
    const summary = decision.blockers.slice(0, 5).map((item) => `${item.source}/${item.code}: ${item.detail}`).join('; ');
    const error = new ForbiddenError(
      `PRODUCTION_LOCK: ${decision.blockers.length} blocker(s) prevent '${action}'. ${summary}`,
    );
    error.decision = decision;
    throw error;
  }
}

// Cada tipo de blocker sabe o que o destrava. Sem isto o gatekeeper diria "nao" sem dizer
// como sair do "nao" — o que empurra as pessoas a desligar o gate.
function remediationFor(blockers) {
  const steps = new Map();
  for (const blocker of blockers) {
    if (blocker.source === 'component') {
      steps.set(`component:${blocker.componentId}`, `Configure and activate ${blocker.componentId}, then run POST /api/operations/activate and confirm the probe reports ACTIVE.`);
    } else if (blocker.source === 'proof') {
      steps.set('proof', 'Run the ops scripts (backup.sh, restore.sh, rollback.sh) and record each result with scripts/record-assurance.js so the GA proofs carry evidence.');
    } else if (blocker.source === 'simulation-audit') {
      steps.set('simulation-audit', 'Convert the flagged modules to the measured/unknown contract in src/kernel/measurement.js; node --test test/simulation-audit.test.js must pass.');
    } else if (blocker.source === 'investigation') {
      steps.set('investigation', 'Resolve the open operational investigations; a component returning to ACTIVE closes its investigation automatically.');
    } else if (blocker.source === 'objective') {
      steps.set(`objective:${blocker.objectiveId}`, `Objective '${blocker.objectiveId}' needs: ${(blocker.objectiveBlockers || []).slice(0, 3).join('; ') || 'implementation and a test that exercises it'}.`);
    } else if (blocker.source === 'readiness') {
      steps.set('readiness', 'Run POST /api/operations/activate and resolve every critical component that does not report ACTIVE.');
    }
  }
  return [...steps.values()];
}

module.exports = { Gatekeeper, CRITICAL_ACTIONS, remediationFor };
