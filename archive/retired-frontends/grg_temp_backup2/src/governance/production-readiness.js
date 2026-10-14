const fs = require('node:fs');
const path = require('node:path');
const { uuid } = require('../kernel/ids');
const { coverage, pendencies } = require('../kernel/measurement');
const { STATES } = require('./readiness-matrix');

// V10 — RELATORIO DE PRONTIDAO PARA PRODUCAO.
//
// Este e o documento que autoriza (ou nao) o Go Live, e por isso e o arquivo em que mentir
// seria mais caro. A disciplina aqui: o relatorio nao TEM veredito proprio. Ele compoe o
// veredito de instrumentos que medem — boot dos componentes, stability report, auditoria de
// simulacao, matriz de objetivos, health dos provedores — e o `status` global e uma
// conjuncao, nao uma sintese editorial.
//
// GO_LIVE_CANDIDATE exige, simultaneamente:
//   readiness READY  +  stability sem blockers  +  0 modulos SIMULATED/STUB  +
//   0 sinais falsos  +  gatekeeper liberando  +  nenhum objetivo CRITICAL abaixo de VALIDATED
//
// Qualquer um deles falhando produz BLOCKED com a lista nominal. Nao existe caminho para
// "quase pronto".
class ProductionReadinessService {
  constructor({ store, bus, controlPlane, operationalActivation, readinessMatrix, gatekeeper, simulationAudit, observabilityCenter, aiGateway, reportPath = path.join(__dirname, '..', '..', 'PRODUCTION_READINESS_REPORT.md') }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.operationalActivation = operationalActivation;
    this.readinessMatrix = readinessMatrix;
    this.gatekeeper = gatekeeper;
    this.simulationAudit = simulationAudit;
    this.observabilityCenter = observabilityCenter;
    this.aiGateway = aiGateway;
    this.reportPath = reportPath;
  }

  // `boot` decide se roda uma ativacao nova (mede tudo agora, custa segundos) ou usa o
  // ultimo estado gravado.
  async generate(tenantId, actorId, { boot = true, write = false } = {}) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');

    let activation = null;
    if (boot) {
      activation = await this.operationalActivation.boot(tenantId, actorId, { trigger: 'production-readiness-report' });
    }
    const stability = await this.operationalActivation.stabilityReport(tenantId, actorId);
    const snapshot = await this.operationalActivation.state(tenantId, actorId);
    const matrix = await this.readinessMatrix.build(tenantId, actorId);
    const gate = await this.gatekeeper.evaluate(tenantId, actorId, 'deploy');
    const audit = await this.simulationAudit.audit(tenantId, actorId);

    // Observabilidade e provedores de IA sao coleta real e podem falhar; a falha entra no
    // relatorio como falha, nao como ausencia silenciosa.
    let observability = null;
    let observabilityError = null;
    try { observability = await this.observabilityCenter.getMetrics(tenantId, actorId); }
    catch (error) { observabilityError = error.message; }

    let providers = null;
    let providersError = null;
    try { providers = await this.aiGateway.providerHealth(); }
    catch (error) { providersError = error.message; }

    const components = snapshot.components || [];
    const criticalNotActive = components.filter((item) => item.critical && item.status !== 'ACTIVE');
    const readiness = snapshot.readiness;

    // ARMADILHA QUE ESTE BLOCO FECHA: `critical` de um componente e calculado como
    // `definition.critical || (production && definition.productionCritical)`. Em modo
    // desenvolvimento, postgres/redis/qdrant/minio/sandbox/workers NAO contam como
    // criticos — entao o gate reporta READY com score 100 enquanto sete componentes
    // estao UNCONFIGURED.
    //
    // Um relatorio de prontidao PARA PRODUCAO que lesse esse READY estaria mentindo por
    // omissao: o numero e verdadeiro, a conclusao seria falsa. Aqui contamos tambem os
    // componentes que SERIAM criticos em producao, e o criterio de readiness exige os
    // dois: READY agora E nenhum componente production-critical fora de ACTIVE.
    const productionMode = this.operationalActivation.production === true;
    const productionCriticalDown = components.filter((item) => item.productionCritical && item.status !== 'ACTIVE');

    // As seis condicoes, cada uma verificavel e cada uma com o dado que a sustenta.
    const criteria = [
      {
        id: 'readiness',
        description: 'Health READY: todo componente critico em producao reporta ACTIVE',
        // Duas condicoes, nao uma. `readiness.status` responde pelo modo atual; a segunda
        // impede que um READY de desenvolvimento seja lido como prontidao de producao.
        met: Boolean(readiness) && readiness.status === 'READY' && productionCriticalDown.length === 0,
        detail: readiness
          ? `readiness=${readiness.status} score=${readiness.score} (modo ${productionMode ? 'production' : 'development'})`
            + (productionCriticalDown.length ? `; ${productionCriticalDown.length} componente(s) production-critical fora de ACTIVE: ${productionCriticalDown.map((item) => item.componentId).join(', ')}` : '')
          : 'no activation run has ever completed',
        evidence: readiness ? `readiness-report:${readiness.id}` : null,
      },
      {
        id: 'stability',
        description: 'Stability report sem blockers (as 7 provas de GA gravadas)',
        met: stability.status === 'GO_LIVE_CANDIDATE',
        detail: `${stability.blockers.length} blocker(s): ${stability.blockers.slice(0, 8).join(', ') || 'none'}`,
        evidence: `stability-report:${stability.id}`,
      },
      {
        id: 'no-simulated-modules',
        description: 'Nenhum modulo classificado SIMULATED ou STUB',
        met: audit.totals.byClassification.simulated === 0 && audit.totals.byClassification.stub === 0,
        detail: `simulated=${audit.totals.byClassification.simulated} stub=${audit.totals.byClassification.stub} de ${audit.totals.modules} modulos`,
        evidence: `simulation-audit:${audit.totals.files} files`,
      },
      {
        id: 'no-fake-metrics',
        description: 'Nenhum arquivo apresenta valor inventado como telemetria',
        met: audit.totals.totalFakeSignals === 0,
        detail: `${audit.totals.totalFakeSignals} sinal(is) falso(s)`,
        evidence: `simulation-audit:${audit.totals.files} files`,
      },
      {
        id: 'critical-objectives',
        description: 'Todo objetivo de risco CRITICAL alcancou pelo menos VALIDATED',
        met: matrix.objectives.every((item) => item.risk?.value !== 'CRITICAL' || (item.state !== STATES.SPECIFIED && item.state !== STATES.IMPLEMENTED)),
        detail: matrix.objectives
          .filter((item) => item.risk?.value === 'CRITICAL' && (item.state === STATES.SPECIFIED || item.state === STATES.IMPLEMENTED))
          .map((item) => `${item.id}=${item.state}`).join(', ') || 'all critical objectives are VALIDATED or better',
        evidence: `readiness-matrix:${matrix.id}`,
      },
      {
        id: 'gatekeeper',
        description: 'Gatekeeper libera a acao de deploy',
        met: gate.allowed,
        detail: `${gate.blockers.length} blocker(s)`,
        evidence: `gatekeeper-decision:${gate.id}`,
      },
    ];

    const unmet = criteria.filter((item) => !item.met);

    const report = {
      id: uuid(),
      tenantId,
      // O status global e a conjuncao. Nao ha estado intermediario que autorize deploy.
      status: unmet.length ? 'BLOCKED' : 'GO_LIVE_CANDIDATE',
      criteria,
      unmetCriteria: unmet.map((item) => item.id),
      blockers: gate.blockers,
      remediation: gate.remediation,
      readiness: readiness ? { id: readiness.id, status: readiness.status, score: readiness.score } : null,
      stability: { id: stability.id, status: stability.status, blockers: stability.blockers, proofs: stability.proofs },
      componentSummary: {
        total: components.length,
        active: components.filter((item) => item.status === 'ACTIVE').length,
        degraded: components.filter((item) => item.status === 'DEGRADED').length,
        unconfigured: components.filter((item) => item.status === 'UNCONFIGURED').length,
        mode: productionMode ? 'production' : 'development',
        criticalNotActive: criticalNotActive.map((item) => ({ componentId: item.componentId, status: item.status, error: item.error || null })),
        // O que bloquearia producao mesmo que o run atual diga READY.
        productionCriticalNotActive: productionCriticalDown.map((item) => ({ componentId: item.componentId, status: item.status, error: item.error || null })),
      },
      audit: {
        modules: audit.totals.modules,
        files: audit.totals.files,
        byClassification: audit.totals.byClassification,
        fakeSignals: audit.totals.totalFakeSignals,
      },
      objectives: matrix.objectives.map((item) => ({
        id: item.id, name: item.name, state: item.state, risk: item.risk?.value || null,
        blockers: item.blockers, evidenceCount: item.evidence.length,
        productionProof: item.productionProof?.state === 'measured' ? item.productionProof.value : null,
        lastValidatedAt: item.lastValidatedAt,
      })),
      objectiveTotals: matrix.totals,
      observability: observability
        ? { coverage: coverage(observability), pendencies: pendencies(observability).slice(0, 20) }
        : { error: observabilityError || 'observability metrics unavailable' },
      aiProviders: providers || { error: providersError || 'provider health unavailable' },
      activationRunId: activation?.run?.id || null,
      generatedBy: actorId,
      generatedAt: new Date().toISOString(),
    };

    if (write) {
      report.reportPath = this.reportPath;
      fs.writeFileSync(this.reportPath, renderMarkdown(report), 'utf8');
    }

    if (this.bus?.emit) {
      await this.bus.emit('governance.production-readiness.generated', {
        tenantId, status: report.status, unmet: report.unmetCriteria.length, blockers: report.blockers.length,
      });
    }

    return report;
  }
}

// O markdown e projecao do objeto, nao um texto paralelo. Se um numero aparece aqui e
// porque esta no relatorio; nenhuma prosa e escrita a mao sobre o estado do sistema.
function renderMarkdown(report) {
  const lines = [];
  const check = (met) => (met ? 'OK' : 'BLOQUEADO');

  lines.push('# PRODUCTION READINESS REPORT — GRG FÊNIX Ω∞ V10');
  lines.push('');
  lines.push(`- **Status:** \`${report.status}\``);
  lines.push(`- **Tenant:** ${report.tenantId}`);
  lines.push(`- **Gerado em:** ${report.generatedAt}`);
  lines.push(`- **Gerado por:** ${report.generatedBy}`);
  if (report.activationRunId) lines.push(`- **Run de ativação:** ${report.activationRunId}`);
  lines.push('');

  if (report.status === 'BLOCKED') {
    lines.push('> Deploy não autorizado. Os critérios abaixo marcados como BLOQUEADO impedem o Go Live.');
    lines.push('> Nenhum commit, tag, push ou deploy deve ser executado enquanto este relatório disser BLOCKED.');
  } else {
    lines.push('> Todos os critérios verificáveis foram atendidos. O Go Live pode ser avaliado por um humano.');
  }
  lines.push('');

  lines.push('## Critérios de aceite');
  lines.push('');
  lines.push('| Critério | Estado | Evidência |');
  lines.push('|---|---|---|');
  for (const item of report.criteria) {
    lines.push(`| ${item.description} | ${check(item.met)} — ${item.detail} | ${item.evidence || '—'} |`);
  }
  lines.push('');

  lines.push('## Componentes operacionais');
  lines.push('');
  const summary = report.componentSummary;
  lines.push(`Modo do run: **${summary.mode}**. Total ${summary.total} — ACTIVE ${summary.active}, DEGRADED ${summary.degraded}, UNCONFIGURED ${summary.unconfigured}.`);
  lines.push('');
  if (summary.criticalNotActive.length) {
    lines.push('Componentes críticos que não estão ACTIVE:');
    lines.push('');
    for (const item of summary.criticalNotActive) {
      lines.push(`- \`${item.componentId}\` — ${item.status}${item.error ? ` (${item.error})` : ''}`);
    }
    lines.push('');
  }
  if (summary.productionCriticalNotActive.length) {
    lines.push(`Componentes que bloqueiam **produção** e não estão ACTIVE (${summary.productionCriticalNotActive.length}):`);
    lines.push('');
    if (summary.mode === 'development') {
      lines.push('> Em modo desenvolvimento estes componentes não contam como críticos, então o `readiness` do run sai READY.');
      lines.push('> Em produção cada um deles é um bloqueador. É esta lista, não o score, que diz o que falta para o Go Live.');
      lines.push('');
    }
    for (const item of summary.productionCriticalNotActive) {
      lines.push(`- \`${item.componentId}\` — ${item.status}${item.error ? ` (${item.error})` : ''}`);
    }
    lines.push('');
  }

  lines.push('## Provas de GA');
  lines.push('');
  lines.push('| Prova | Referência |');
  lines.push('|---|---|');
  for (const [kind, proof] of Object.entries(report.stability.proofs || {})) {
    lines.push(`| ${kind} | ${proof ? proof.reference : 'AUSENTE — nenhuma evidência registrada'} |`);
  }
  lines.push('');

  lines.push('## Matriz de objetivos');
  lines.push('');
  lines.push('Estado derivado de artefatos verificáveis, nunca declarado. `SPECIFIED` significa que o objetivo está registrado e nada mais; `IMPLEMENTED` que os módulos existem e passam o auditor; `VALIDATED` que existe teste exercitando o caminho; `PRODUCTION_PROVEN` que há evidência colhida em produção.');
  lines.push('');
  lines.push('| Objetivo | Estado | Risco | Bloqueadores |');
  lines.push('|---|---|---|---|');
  for (const item of report.objectives) {
    const blockers = item.blockers.length ? item.blockers.slice(0, 2).join('; ') : '—';
    lines.push(`| ${item.name} | \`${item.state}\` | ${item.risk || '—'} | ${blockers} |`);
  }
  lines.push('');

  lines.push('## Auditoria de simulação');
  lines.push('');
  lines.push(`${report.audit.modules} módulos, ${report.audit.files} arquivos, **${report.audit.fakeSignals} sinais falsos**.`);
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(report.audit.byClassification, null, 2));
  lines.push('```');
  lines.push('');

  if (report.observability.coverage) {
    lines.push('## Observabilidade');
    lines.push('');
    const cov = report.observability.coverage;
    lines.push(`Cobertura de medição: ${cov.measured}/${cov.fields} campos medidos (${(cov.ratio * 100).toFixed(1)}%), ${cov.unknown} declarados desconhecidos.`);
    lines.push('');
    if (report.observability.pendencies.length) {
      lines.push('Pendências abertas (o que ainda não é observável):');
      lines.push('');
      for (const item of report.observability.pendencies) {
        lines.push(`- \`${item.field}\` — ${item.reason}${item.pending ? ` → ${item.pending}` : ''}`);
      }
      lines.push('');
    }
  }

  if (report.blockers.length) {
    lines.push('## Bloqueadores');
    lines.push('');
    for (const item of report.blockers) {
      lines.push(`- **${item.source}/${item.code}** — ${item.detail}`);
    }
    lines.push('');
  }

  if (report.remediation.length) {
    lines.push('## Plano de correção');
    lines.push('');
    for (const item of report.remediation) lines.push(`1. ${item}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('Relatório gerado por `src/governance/production-readiness.js`. Cada linha acima é projeção de um valor medido — nenhum número foi escrito à mão.');
  lines.push('');

  return lines.join('\n');
}

module.exports = { ProductionReadinessService, renderMarkdown };
