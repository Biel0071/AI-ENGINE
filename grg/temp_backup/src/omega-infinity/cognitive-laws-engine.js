const { ValidationError } = require('../kernel/errors');

// Cognitive Law 001 HONESTA — "nenhuma evolucao sem melhoria medida e sem regressao".
//
// MEDIDO EM PRODUCAO (2026-07-29): verifyLaw001 devolvia law001Compliant: true INCONDICIONAL,
// com 9 deltas fabricados ('+14.2%', '-40.0%'...). Era o pior tipo de simulacao de governanca:
// a lei que existe para impedir aprovacao sem evidencia era ela mesma uma aprovacao sem
// evidencia. O auditor marcava ~19 sinais (hardcoded-verdict + hardcoded-percent-string+delta).
//
// Agora o veredito e DERIVADO das medicoes reais do proposal:
//   - sem measurements                    -> UNVERIFIED (nunca compliant; a pendencia diz o que falta)
//   - qualquer metrica regrediu            -> NON_COMPLIANT (lista as que regrediram)
//   - melhoria medida e nenhuma regressao  -> COMPLIANT
// Convencao de direcao: metricas de "quanto menos melhor" (latency, cost, tokens, memory,
// complexity, dependencies, duration) melhoram quando after<before; as demais (speed, precision,
// autonomy, throughput...) melhoram quando after>before.
const LOWER_IS_BETTER = /^(latency|cost|tokens?|memory|complexity|dependenc|duration|errors?|size)/i;

class CognitiveLawsEngine {
  constructor({ store, bus, controlPlane }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
  }

  async verifyLaw001(tenantId, actorId, evolutionProposal = {}) {
    await this.cp.authorize(tenantId, actorId, 'governance:approve');
    if (!evolutionProposal.name) {
      throw new ValidationError('Evolution proposal name is required');
    }

    const measurements = evolutionProposal.measurements || {};
    const names = Object.keys(measurements);

    // Sem medicao, a lei nao pode atestar melhoria. Veredito honesto: UNVERIFIED.
    if (names.length === 0) {
      return {
        proposalName: String(evolutionProposal.name),
        verdict: 'UNVERIFIED',
        law001Compliant: false,
        improvedMetrics: [],
        regressedMetrics: [],
        pending: 'no before/after measurements were provided; law 001 requires measured improvement',
        verifiedAt: new Date().toISOString(),
      };
    }

    const improved = [];
    const regressed = [];
    for (const name of names) {
      const m = measurements[name] || {};
      if (typeof m.before !== 'number' || typeof m.after !== 'number') continue;
      const delta = m.after - m.before;
      if (delta === 0) continue;
      const isImprovement = LOWER_IS_BETTER.test(name) ? delta < 0 : delta > 0;
      (isImprovement ? improved : regressed).push(name);
    }

    // Qualquer regressao medida reprova a lei, mesmo com outras melhorias.
    const verdict = regressed.length ? 'NON_COMPLIANT' : (improved.length ? 'COMPLIANT' : 'UNVERIFIED');
    return {
      proposalName: String(evolutionProposal.name),
      verdict,
      law001Compliant: verdict === 'COMPLIANT',
      improvedMetrics: improved,
      regressedMetrics: regressed,
      pending: verdict === 'UNVERIFIED' ? 'measurements present but none showed a directional change' : undefined,
      verifiedAt: new Date().toISOString(),
    };
  }
}

module.exports = { CognitiveLawsEngine };
