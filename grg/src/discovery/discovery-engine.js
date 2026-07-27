const { uuid } = require('../kernel/ids');

// Discovery Engine: analisa um sistema (repo autorizado) e CLASSIFICA cada capacidade detectada
// contra o que a GRG City OS já oferece — existente / parcial / inexistente / superior — gerando
// um mapa funcional, relatório de lacunas e sugestões de novos módulos. Alimenta o knowledge graph.
// NÃO copia código: compreende padrões e produz especificação original.

// Módulos que a plataforma GRG já oferece nativamente (capacidades de primeira classe).
const GRG_MODULES = {
  'whatsapp-crm': { name: 'CRM WhatsApp', maturity: 'stable' },
  'ai-gateway': { name: 'AI Gateway', maturity: 'stable' },
  analytics: { name: 'Analytics', maturity: 'stable' },
  'auth-rbac': { name: 'Auth/RBAC', maturity: 'stable' },
  dashboard: { name: 'Dashboard', maturity: 'stable' },
  'payments-pix': { name: 'Pagamentos PIX', maturity: 'beta' },
  'payments-stripe': { name: 'Pagamentos cartão/assinatura', maturity: 'beta' },
  ecommerce: { name: 'E-commerce', maturity: 'partial' },  // GRG tem parcial
  realtime: { name: 'Tempo real', maturity: 'partial' },
};

// capabilities de mercado que a GRG ainda NÃO tem módulo — viram sugestão quando detectadas.
const KNOWN_MARKET = ['seo', 'email-marketing', 'kanban', 'ocr', 'voice', 'maps', 'inventory', 'crm-pipeline'];

class DiscoveryEngine {
  constructor({ store, bus, controlPlane, repoIntel }) {
    this.store = store; this.bus = bus; this.cp = controlPlane; this.repoIntel = repoIntel;
  }

  // Analisa um repo já conectado (ou conecta+analisa) e classifica as capacidades.
  async discover(tenantId, actorId, projectId) {
    await this.cp.authorize(tenantId, actorId, 'project:analyze');
    const state = await this.store.read();
    const snapshot = state.snapshots.filter((s) => s.tenantId === tenantId && s.repoId === projectId).slice(-1)[0];
    if (!snapshot) { const err = new Error(`Sem análise para ${projectId} — analise o repo primeiro`); err.code = 'NOT_FOUND'; throw err; }
    const repo = state.repositories.find((r) => r.tenantId === tenantId && r.id === projectId);

    const detected = snapshot.capabilities.map((c) => c.id);
    const classification = detected.map((cap) => this.classify(cap, snapshot));
    const suggestions = classification
      .filter((c) => c.status === 'inexistent' || c.status === 'partial')
      .map((c) => this.spec(c, repo));

    const functionalMap = {
      revision: snapshot.revision,
      primaryLanguage: snapshot.primaryLanguage,
      modules: detected,
      endpoints: snapshot.endpoints.length,
      components: snapshot.components.length,
      dataEntities: snapshot.tables,
    };

    const report = {
      id: uuid(), tenantId, projectId,
      revision: snapshot.revision,
      functionalMap,
      classification,
      suggestions,
      summary: {
        total: classification.length,
        existing: classification.filter((c) => c.status === 'existing').length,
        partial: classification.filter((c) => c.status === 'partial').length,
        inexistent: classification.filter((c) => c.status === 'inexistent').length,
        superior: classification.filter((c) => c.status === 'superior').length,
      },
      createdAt: now(),
    };

    await this.store.update((s) => {
      // alimenta o grafo: cada capacidade classificada vira aresta com o veredito
      for (const c of classification) {
        s.graphEdges.push({ tenantId, source: `repo:${projectId}`, target: `module:${c.capability}`, type: 'DISCOVERED', evidence: c.status });
      }
      s.memoryEvents.push({
        id: uuid(), tenantId, projectId, actorId, kind: 'discovery',
        summary: `Discovery de ${repo ? repo.name : projectId}: ${report.summary.existing} existentes, ${report.summary.inexistent} inexistentes, ${report.summary.partial} parciais → ${suggestions.length} sugestão(ões)`,
        evidence: [`revision:${snapshot.revision}`], confidence: 0.85, createdAt: now(),
      });
      return s;
    });
    await this.bus.emit('discovery.completed', { tenantId, projectId, suggestions: suggestions.length });
    return report;
  }

  classify(cap, snapshot) {
    const grg = GRG_MODULES[cap];
    if (!grg) {
      // GRG não tem esse módulo. Se é conhecido do mercado, é gap claro; senão, capacidade nova.
      return { capability: cap, status: 'inexistent', rationale: `GRG não possui módulo "${cap}"`, marketKnown: KNOWN_MARKET.includes(cap) };
    }
    if (grg.maturity === 'partial') {
      return { capability: cap, status: 'partial', rationale: `GRG tem "${grg.name}" parcial; repo pode ter cobertura maior` };
    }
    // GRG tem estável. Heurística de "superior": repo com muitos endpoints/tabelas nesse domínio.
    const rich = snapshot.endpoints.length > 100 || snapshot.tables.length > 30;
    if (rich) return { capability: cap, status: 'superior', rationale: `GRG tem "${grg.name}"; repo demonstra implementação mais rica (heurística: ${snapshot.endpoints.length} endpoints, ${snapshot.tables.length} tabelas)` };
    return { capability: cap, status: 'existing', rationale: `GRG já cobre "${grg.name}" (${grg.maturity})` };
  }

  // Gera uma especificação técnica original para o módulo faltante/parcial (não copia código).
  spec(classified, repo) {
    const cap = classified.capability;
    return {
      capability: cap,
      priority: classified.status === 'inexistent' ? (classified.marketKnown ? 'alta' : 'média') : 'média',
      title: `Módulo GRG: ${cap}`,
      goal: classified.status === 'partial' ? `Ampliar cobertura de ${cap}` : `Implementar módulo original de ${cap}`,
      inspiredBy: repo ? { repo: repo.name, note: 'padrão observado; implementação original' } : null,
      proposal: {
        ports: [`${cap}Port (interface de domínio)`],
        adapters: [`adapter local + adapter real quando houver integração`],
        endpoints: [`GET /v1/${cap}`, `POST /v1/${cap}`],
        tests: ['unit do domínio', 'integração do adapter'],
      },
    };
  }

  async listReports(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'memory:read');
    const state = await this.store.read();
    return state.memoryEvents.filter((m) => m.tenantId === tenantId && m.kind === 'discovery');
  }
}

function now() { return new Date().toISOString(); }

module.exports = { DiscoveryEngine, GRG_MODULES };
