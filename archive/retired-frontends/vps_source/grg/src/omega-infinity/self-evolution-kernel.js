const { measured, unknown } = require('../kernel/measurement');

// Self-Evolution Kernel HONESTO — mede o estado do "cristal de inteligencia" a partir das
// capsulas de conhecimento REAIS, nunca de numeros fixos.
//
// MEDIDO EM PRODUCAO (2026-07-29): getIntelligenceCrystalState devolvia nodesCount 1420,
// duplicationRate 0.0, fragmentationScore 0.0, cognitiveDensityFactor 99.9 -- tudo fabricado,
// sem olhar uma unica capsula. Um "cristal hiper-denso" sobre um store possivelmente vazio.
//
// Agora tudo deriva de `state.knowledgeCapsules`:
//   - nodesCount        -> contagem real de capsulas do tenant (measured).
//   - duplicationRate   -> fracao de capsulas cujo hash de conteudo se repete. Sem capsula
//                          com hash, `unknown` (nao 0 fabricado): 0 dividendo != "nao ha o que medir".
//   - fragmentationScore-> fracao de capsulas sem hash/indice (nao indexadas). Sem capsula, unknown.
class SelfEvolutionKernel {
  constructor({ store, bus, controlPlane, knowledgeGenome }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.knowledgeGenome = knowledgeGenome;
  }

  async getIntelligenceCrystalState(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'memory:read');
    const state = await this.store.read();
    const capsules = (state.knowledgeCapsules || []).filter((c) => c.tenantId === tenantId);
    const hashed = capsules.filter((c) => c.hash);

    // Duplicacao: quantas capsulas compartilham um hash ja visto. Sem capsula com hash, unknown.
    let duplicationRate;
    if (hashed.length === 0) {
      duplicationRate = unknown('no hashed capsule to measure duplication');
    } else {
      const seen = new Set();
      let duplicated = 0;
      for (const c of hashed) { if (seen.has(c.hash)) duplicated += 1; else seen.add(c.hash); }
      duplicationRate = { ...measured(Number((duplicated / hashed.length).toFixed(4)), 'store:knowledgeCapsules'), duplicated, hashed: hashed.length };
    }

    // Fragmentacao: fracao de capsulas nao indexadas (sem hash). Sem capsula, unknown.
    let fragmentationScore;
    if (capsules.length === 0) {
      fragmentationScore = unknown('no capsule to measure fragmentation');
    } else {
      const unindexed = capsules.filter((c) => !c.hash).length;
      fragmentationScore = { ...measured(Number((unindexed / capsules.length).toFixed(4)), 'store:knowledgeCapsules'), unindexed, total: capsules.length };
    }

    return {
      tenantId,
      nodesCount: measured(capsules.length, 'store:knowledgeCapsules'),
      duplicationRate,
      fragmentationScore,
      reorganizedAt: new Date().toISOString(),
    };
  }
}

module.exports = { SelfEvolutionKernel };
