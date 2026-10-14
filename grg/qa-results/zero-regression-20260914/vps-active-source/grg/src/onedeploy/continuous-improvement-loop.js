const { uuid } = require('../kernel/ids');

class ContinuousImprovementLoopService {
  constructor({ store, bus, controlPlane, analyzers, capOs }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.analyzers = analyzers;
    this.capOs = capOs;
  }

  // MEDIDO EM PRODUCAO (2026-07-29): este scan devolvia um backlog FABRICADO com 3 melhorias
  // especificas ("Refactor Express route handlers to zero-copy streaming", "Update 3 outdated
  // minor npm packages"...) que ninguem detectou -- sao invencoes plausiveis, nao achados. Um
  // "backlog gerado" sobre analise que nunca rodou e simulacao.
  //
  // Melhoria real vem do analisador (`this.analyzers`) rodando sobre o codigo, ou das propostas
  // de evolucao ja registradas no store (evolutionProposals/improvementScans). Sem fonte real,
  // o scan devolve backlog VAZIO honesto -- nao 3 itens inventados.
  async runIdleImprovementScan(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    const state = await this.store.read();
    // Fonte real: propostas de evolucao/melhoria ja detectadas e persistidas para este tenant.
    const proposals = (state.evolutionProposals || []).filter((p) => p.tenantId === tenantId);
    const backlog = proposals.map((p) => ({ id: p.id, priority: p.priority || 'UNKNOWN', title: p.title || p.summary || 'proposta de evolucao', source: 'evolutionProposals' }));
    return {
      tenantId,
      idleScanStatus: backlog.length ? 'BACKLOG_FROM_REAL_PROPOSALS' : 'NO_PROPOSALS_YET',
      improvementsCount: backlog.length,
      backlog,
      note: backlog.length ? undefined : 'no real improvement source produced findings; backlog is empty, not fabricated',
      scannedAt: new Date().toISOString(),
    };
  }
}

module.exports = { ContinuousImprovementLoopService };
