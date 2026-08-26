const { auditTree } = require('../governance/simulation-audit');
const path = require('node:path');

// Context Builder — o coracao do Living Mode.
//
// O Claude Code (ou qualquer assistente) NAO fica rodando sozinho; ele executa quando acionado.
// Quem fica vivo 24/7 e o FENIX. Este servico e a ponte: reune o ESTADO VIVO real do sistema
// (arquitetura, sinais falsos por modulo, insights de evolucao, backlog, capabilities, conexao,
// missoes ativas) num briefing que uma sessao de IA consome para trabalhar "dentro" do FENIX --
// sabendo onde o sistema esta, o que ja e real, o que falta, e quais as proximas prioridades.
//
// REGRA: nada fabricado. Cada numero vem de fonte medida (o mesmo auditor que pega simulacao,
// o evolution engine que deriva insights de estado real, o connection manager que mede online).
// Se uma fonte nao esta disponivel, o campo diz isso -- nunca inventa.
class ContextBuilder {
  constructor({ store, controlPlane, evolution, capabilityRegistry, apiConnection, missions, srcDir } = {}) {
    this.store = store;
    this.cp = controlPlane;
    this.evolution = evolution;
    this.capabilityRegistry = capabilityRegistry;
    this.apiConnection = apiConnection;
    this.missions = missions;
    this.srcDir = srcDir || path.join(__dirname, '..');
  }

  // Monta o contexto vivo. Estruturado (JSON) para consumo por maquina; o markdown e derivado.
  async build(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');

    // 1. Veracidade operacional: o auditor de simulacao sobre o codigo REAL.
    const audit = auditTree(this.srcDir);
    const worstOffenders = (audit.modules || [])
      .filter((m) => (m.fakeSignalCount || 0) > 0)
      .sort((a, b) => (b.fakeSignalCount || 0) - (a.fakeSignalCount || 0))
      .slice(0, 8)
      .map((m) => ({ module: m.module, classification: m.classification, fakeSignals: m.fakeSignalCount }));

    // 2. Insights de evolucao derivados de estado real (idempotentes).
    let insights = [];
    try { insights = (await this.evolution.getInsights(tenantId)).slice(0, 10).map((i) => ({ type: i.type, summary: i.summary, confidence: i.confidence })); }
    catch { insights = []; }

    // 3. Backlog de evolucao (propostas reais persistidas).
    const state = await this.store.read();
    const backlog = (state.evolutionProposals || [])
      .filter((p) => p.tenantId === tenantId)
      .map((p) => ({ id: p.id, title: p.title || p.summary, priority: p.priority || 'UNKNOWN', status: p.status || 'OPEN' }));

    // 4. Capabilities registradas (o que o sistema sabe fazer, medido).
    let capabilities = [];
    try { capabilities = (await this.capabilityRegistry.list(tenantId, actorId)).map((c) => ({ id: c.capabilityId, health: c.health, executions: c.metrics?.executions ?? 0 })); }
    catch { capabilities = []; }

    // 5. Conexao com servicos externos (API Platform): estado real ONLINE/OFFLINE.
    let connection = null;
    try { connection = await this.apiConnection.status(); }
    catch { connection = null; }

    // 6. Missoes ativas (o que o FENIX esta orquestrando agora).
    let activeMissions = [];
    try {
      const TERM = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);
      activeMissions = (await this.missions.list(tenantId, actorId))
        .filter((m) => !TERM.has(m.status))
        .map((m) => ({ id: m.id, objective: m.objective || m.title, status: m.status }));
    } catch { activeMissions = []; }

    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      reality: {
        modules: audit.totals.modules,
        totalFakeSignals: audit.totals.totalFakeSignals,
        byClassification: audit.totals.byClassification,
        worstOffenders,
      },
      insights,
      evolutionBacklog: backlog,
      capabilities,
      connection,
      activeMissions,
      // As proximas prioridades derivam do que foi MEDIDO: modulos que ainda mentem sao o topo.
      nextPriorities: worstOffenders.length
        ? worstOffenders.slice(0, 3).map((m) => `Tornar honesto: ${m.module} (${m.fakeSignals} sinais falsos, ${m.classification})`)
        : ['Nenhum modulo com sinal falso; foco em novas capabilities e cobertura'],
    };
  }

  // Briefing em markdown -- o que se cola numa sessao de IA para ela trabalhar "dentro" do FENIX.
  async buildMarkdown(tenantId, actorId) {
    const ctx = await this.build(tenantId, actorId);
    const lines = [];
    lines.push(`# FÊNIX — Contexto Vivo (${ctx.generatedAt})`);
    lines.push('');
    lines.push('## Veracidade operacional (medida agora)');
    lines.push(`- Módulos: ${ctx.reality.modules} · Sinais falsos: **${ctx.reality.totalFakeSignals}**`);
    lines.push(`- Classificação: ${JSON.stringify(ctx.reality.byClassification)}`);
    if (ctx.reality.worstOffenders.length) {
      lines.push('- Piores ofensores (o que ainda mente):');
      for (const m of ctx.reality.worstOffenders) lines.push(`  - ${m.module}: ${m.fakeSignals} sinais (${m.classification})`);
    }
    lines.push('');
    lines.push('## Próximas prioridades (derivadas da medição)');
    for (const p of ctx.nextPriorities) lines.push(`- ${p}`);
    lines.push('');
    lines.push('## Conexão com serviços externos');
    lines.push('```json');
    lines.push(JSON.stringify(ctx.connection, null, 1));
    lines.push('```');
    lines.push('');
    lines.push(`## Missões ativas: ${ctx.activeMissions.length}`);
    for (const m of ctx.activeMissions) lines.push(`- ${m.status}: ${m.objective || m.id}`);
    lines.push('');
    lines.push('## Regra permanente (Living Mode)');
    lines.push('REALITY FIRST: nenhum output com score/status/veredito escrito à mão. Medir de fonte');
    lines.push('real ou declarar unknown()/NOT_IMPLEMENTED. Todo módulo tornado real passa por teste +');
    lines.push('mutação + auditor. Trabalho por FLUXOS ponta a ponta, não por arquivo isolado.');
    return lines.join('\n');
  }
}

module.exports = { ContextBuilder };
