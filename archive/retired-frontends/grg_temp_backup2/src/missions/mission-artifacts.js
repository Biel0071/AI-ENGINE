const { uuid } = require('../kernel/ids');
const { measured, unknown } = require('../kernel/measurement');

// V11 — o que sobra de uma missao concluida.
//
// `mission.completed` era publicado pelo MissionKernel e tinha ZERO assinantes. O
// missionSummary era gravado e morria ali: nenhuma capsule, capability, playbook ou
// benchmark nascia de missao concluida. Sem este assinante, "acumular conhecimento por
// uso real" nao tem para onde acumular — cada missao recomecava do zero.
//
// Este servico nao mede nada de novo: converte o summary QUE JA EXISTE em artefato
// reutilizavel. Tudo que ele grava vem do summary ou dos passos da missao.
//
//   capsule    → conhecimento pesquisavel, confidence = proporcao de passos que
//                deram certo (derivada, nao literal)
//   capability → somente quando houve artefato de codigo (passo `generate`)
//   playbook   → a sequencia que funcionou, indexada pelo hash do objetivo. E o que o
//                MissionPlanner reusa na proxima missao do mesmo objetivo.
//   benchmark  → durationMs / tokens / costUsd que o summary carrega. Sem execucao
//                comparativa nao existe antes/depois: o campo fica unknown() nomeando
//                o que falta, em vez de inventar um ganho percentual.
const CODE_ARTIFACT_TYPES = new Set(['generate', 'orchestrate']);

class MissionArtifactsService {
  constructor({ store, bus, events, controlPlane, knowledgeGenome, capabilityRegistry = null }) {
    this.store = store;
    this.bus = bus;
    this.events = events;
    this.cp = controlPlane;
    this.knowledgeGenome = knowledgeGenome;
    this.capabilityRegistry = capabilityRegistry;
    this.unsubscribe = [];
  }

  attach() {
    if (this.unsubscribe.length || !this.events) return this;
    this.unsubscribe.push(this.events.subscribe('mission.completed', (event) => this.onMissionCompleted(event)));
    return this;
  }

  detach() {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
    return this;
  }

  // O handler do barramento nao pode derrubar o processamento do job que concluiu a
  // missao (o emit percorre os assinantes em serie). Falha aqui fica VISIVEL como
  // evento proprio em vez de virar excecao silenciosa dentro do runtime.
  async onMissionCompleted(event) {
    const missionId = event?.data?.missionId;
    if (!event?.tenantId || !missionId) return null;
    try {
      return await this.record(event.tenantId, missionId);
    } catch (error) {
      if (this.bus?.emit) await this.bus.emit('mission.artifacts.failed', { tenantId: event.tenantId, missionId, error: error.message });
      return { tenantId: event.tenantId, missionId, status: 'FAILED', error: error.message };
    }
  }

  async record(tenantId, missionId) {
    const state = await this.store.read();
    const mission = state.missions.find((item) => item.tenantId === tenantId && item.id === missionId);
    if (!mission) return null;
    const summary = state.missionSummaries.find((item) => item.tenantId === tenantId && item.missionId === missionId);
    // O summary e a unica fonte deste servico. Sem ele nao ha o que converter.
    if (!summary) return { tenantId, missionId, status: 'SKIPPED', reason: 'the mission has no summary to convert' };
    // Idempotencia: o benchmark e gravado uma vez por missao e serve de marca.
    if (state.missionBenchmarks.some((item) => item.missionId === missionId)) {
      return { tenantId, missionId, status: 'ALREADY_RECORDED' };
    }

    const actorId = mission.requestedBy;
    const steps = state.missionSteps.filter((item) => item.missionId === missionId).sort((a, b) => a.order - b.order);
    const succeeded = steps.filter((item) => item.status === 'SUCCEEDED');
    const failed = steps.filter((item) => item.status === 'FAILED');
    const successRate = steps.length ? Number((succeeded.length / steps.length).toFixed(4)) : 0;

    const artifacts = { capsuleId: null, capabilityId: null, playbookId: null, benchmarkId: null };

    // 1. Capsule. A confianca e a proporcao medida de passos bem-sucedidos.
    const capsule = await this.knowledgeGenome.createCapsule(tenantId, actorId, {
      title: `Mission: ${mission.title}`.slice(0, 200),
      summary: `${mission.status} in ${steps.length} step(s): ${steps.map((item) => item.type).join(' -> ')}`,
      content: capsuleContent(mission, steps, summary),
      level: 'MISSION',
      source: 'mission',
      scopeId: mission.scopeId || null,
      // createCapsule aplica `Number(confidence || 0.95)`: zero cairia no default e
      // uma missao totalmente falha apareceria com 95% de confianca.
      confidence: Math.max(0.05, successRate),
      entities: [...new Set(steps.map((item) => item.agent))],
    });
    artifacts.capsuleId = capsule.id;

    // 2. Capability: somente quando a missao produziu artefato de codigo. Sem passo de
    // geracao nao ha capability nova — registrar uma seria inventar entrega.
    const codeSteps = succeeded.filter((item) => CODE_ARTIFACT_TYPES.has(item.type));
    if (codeSteps.length && this.capabilityRegistry) {
      const capability = await this.capabilityRegistry.register(tenantId, actorId, {
        id: `mission-${mission.objectiveHash.slice(0, 12)}`,
        name: mission.title.slice(0, 120),
        description: `Capability produzida pela missao ${mission.id}: ${mission.objective}`.slice(0, 500),
        version: '1.0.0',
        owner: actorId,
        runtimeJobTypes: [...new Set(codeSteps.map((item) => item.jobType))],
        documentation: [`mission:${mission.id}`],
        changelog: `mission ${mission.id} (${mission.status}) produced this capability`,
      });
      artifacts.capabilityId = capability.capabilityId;
    }

    // 3. Playbook: apenas de missao que terminou SUCCEEDED. Uma sequencia que falhou nao
    // e um caminho para repetir. Guarda a forma (key/type/dependsOn), nao o payload: o
    // payload carrega contexto da execucao especifica e sera recomputado no reuso.
    let playbook = null;
    if (mission.status === 'SUCCEEDED' && steps.length) {
      playbook = {
        id: uuid(),
        tenantId,
        objectiveHash: mission.objectiveHash,
        missionId,
        title: mission.title.slice(0, 200),
        steps: steps.map((item, index) => ({ key: item.key, type: item.type, dependsOn: item.dependsOn, order: index })),
        successRate,
        durationMs: summary.metrics.durationMs,
        reuses: 0,
        lastReusedAt: null,
        createdBy: actorId,
        createdAt: new Date().toISOString(),
      };
      artifacts.playbookId = playbook.id;
    }

    // 4. Benchmark. Somente o que o summary mede. A comparacao com uma execucao anterior
    // exigiria rodar a mesma missao duas vezes num runner controlado — nao existe.
    const benchmark = {
      id: uuid(),
      tenantId,
      missionId,
      objectiveHash: mission.objectiveHash,
      status: mission.status,
      stepCount: steps.length,
      successRate,
      failedSteps: failed.map((item) => item.key),
      durationMs: numberOrUnknown(summary.metrics.durationMs, 'store:missionSummaries.metrics.durationMs', 'the mission has no startedAt/completedAt pair'),
      tokens: numberOrUnknown(summary.metrics.tokens, 'store:missionSummaries.metrics.tokens', 'no step reported token usage'),
      costUsd: numberOrUnknown(summary.metrics.costUsd, 'store:missionSummaries.metrics.costUsd', 'no step reported cost'),
      comparison: unknown(
        'a before/after comparison requires executing the same mission again under a controlled runner',
        'Continuous Benchmark (V12) must run the playbook in a sandbox and compare against this record',
      ),
      recordedBy: actorId,
      recordedAt: new Date().toISOString(),
    };
    artifacts.benchmarkId = benchmark.id;

    // Uma escrita: o store e documento unico e cada update reserializa tudo.
    await this.store.update((next) => {
      next.missionBenchmarks.push(benchmark);
      if (playbook) next.missionPlaybooks.push(playbook);
      return next;
    });

    if (this.bus?.emit) await this.bus.emit('mission.artifacts.recorded', { tenantId, missionId, ...artifacts, successRate });
    return { tenantId, missionId, status: 'RECORDED', successRate, ...artifacts };
  }

  async playbooks(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'memory:read');
    const state = await this.store.read();
    return state.missionPlaybooks.filter((item) => item.tenantId === tenantId);
  }

  async benchmarks(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:read');
    const state = await this.store.read();
    return state.missionBenchmarks.filter((item) => item.tenantId === tenantId);
  }

  // Reuso medido: quantas missoes comecaram de um playbook em vez do template padrao.
  async reuseReport(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:read');
    const state = await this.store.read();
    const playbooks = state.missionPlaybooks.filter((item) => item.tenantId === tenantId);
    const plans = state.missionPlans.filter((item) => item.tenantId === tenantId);
    const reusedPlans = plans.filter((item) => item.reusedPlaybookId);
    return {
      playbooks: measured(playbooks.length, 'store:missionPlaybooks'),
      plans: measured(plans.length, 'store:missionPlans'),
      plansFromPlaybook: measured(reusedPlans.length, 'derived:missionPlans.reusedPlaybookId'),
      reuseRate: plans.length
        ? measured(Number((reusedPlans.length / plans.length).toFixed(4)), 'derived:missionPlans.reusedPlaybookId / missionPlans')
        : unknown('no mission plan has been compiled yet'),
      benchmarks: measured(state.missionBenchmarks.filter((item) => item.tenantId === tenantId).length, 'store:missionBenchmarks'),
    };
  }
}

function capsuleContent(mission, steps, summary) {
  const lines = [
    `Objective: ${mission.objective}`,
    `Result: ${mission.status} (${mission.progress}%)`,
    `Steps: ${steps.map((item) => `${item.key}[${item.type}]=${item.status}`).join(', ')}`,
  ];
  if (summary.metrics.durationMs != null) lines.push(`Duration: ${summary.metrics.durationMs}ms`);
  if (summary.metrics.tokens != null) lines.push(`AI units: ${summary.metrics.tokens}`);
  if (summary.metrics.costUsd != null) lines.push(`Cost: ${summary.metrics.costUsd} USD`);
  if (summary.contextRefs.length) lines.push(`Context: ${summary.contextRefs.join(', ')}`);
  return lines.join('\n');
}

function numberOrUnknown(value, source, reason) {
  return Number.isFinite(value) ? measured(value, source) : unknown(reason);
}

// Escolha do playbook para um objetivo: maior taxa de sucesso, e entre iguais o mais
// recente. Exportada para o MissionPlanner usar a MESMA regra que o teste verifica.
function pickPlaybook(playbooks, tenantId, objectiveHash) {
  const candidates = playbooks.filter((item) => item.tenantId === tenantId && item.objectiveHash === objectiveHash);
  if (!candidates.length) return null;
  return candidates.sort((a, b) => (b.successRate - a.successRate) || String(b.createdAt).localeCompare(String(a.createdAt)))[0];
}

module.exports = { MissionArtifactsService, pickPlaybook, capsuleContent, CODE_ARTIFACT_TYPES };
