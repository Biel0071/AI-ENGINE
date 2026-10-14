const { ValidationError } = require('../kernel/errors');
const { measured, unknown } = require('../kernel/measurement');

// Busca externa HONESTA.
//
// MEDIDO EM PRODUCAO (2026-07-29): a versao anterior deste servico devolvia DOIS resultados
// fabricados (`docs.grgservices.com`, `github.com/grg-services/reference-...`) com
// `reliability: 0.98`/`0.92` escritos a mao, SEM fazer uma unica requisicao HTTP. O termo
// discriminador `externalSearch.search('zzqx-termo-que-nao-existe-9271')` devolvia 2 achados.
// Era a unica capacidade do sistema que MENTIA ativamente: um agente que "pesquisa" e recebe
// ficcao decide sobre ficcao. Pior que capacidade ausente, porque quem consome acredita.
//
// O `app.js` ja injetava `searchClient: createResearchSearchClient(app.researchSource)` — o
// adaptador sobre o cliente de fonte real, com allowlist, cache e rate limit. O servico
// simplesmente IGNORAVA o parametro (nem o destruturava). Esta versao consome o cliente real:
//   - fonte externa configurada e habilitada -> resultados com URL/fonte/fetchedAt REAIS;
//   - termo sem correspondencia -> lista vazia (nao ficcao);
//   - research desligado (FENIX_RESEARCH_ENABLED nao setado) -> estado `unknown` com o motivo
//     e a pendencia, jamais um resultado inventado;
//   - cliente ausente -> `unknown`, nunca uma lista fabricada.
class ExternalSearchService {
  constructor({ store, bus, controlPlane, knowledgeGenome, searchClient = null }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.knowledgeGenome = knowledgeGenome;
    // O cliente que faz a requisicao real. Sem ele, a busca nao inventa: declara ausencia.
    this.searchClient = searchClient;
  }

  async search(tenantId, actorId, query = {}) {
    await this.cp.authorize(tenantId, actorId, 'memory:read');
    const q = String(query.q || query.query || '').trim();
    if (!q) {
      throw new ValidationError('Search query is required');
    }

    const startedAt = new Date().toISOString();

    // Sem cliente de fonte real, a resposta honesta e "nao tenho fonte", nao uma lista.
    if (!this.searchClient || typeof this.searchClient.search !== 'function') {
      return this.#report(tenantId, q, startedAt, unknown(
        'no external research source client is configured',
        { action: 'wire a search client (createResearchSearchClient over researchSource)' },
      ), null);
    }

    let outcome;
    let capsule = null;
    try {
      const raw = await this.searchClient.search(q);
      // Cada item ja carrega proveniencia do fetch real: url, source (host) e fetchedAt.
      // Nenhum campo de confianca e inventado aqui — a confianca so pode vir de peso de fonte
      // medido, e isso e trabalho de uma etapa futura (Universal Knowledge Provider).
      const results = (Array.isArray(raw) ? raw : []).map((item) => ({
        title: String(item.title || '').slice(0, 300),
        url: item.url || null,
        snippet: String(item.snippet || '').slice(0, 500),
        source: item.source || null,
        fetchedAt: item.fetchedAt || null,
      }));
      outcome = measured(results, 'research-source-client');

      // So promove a conhecimento quando ha resultado REAL. Salvar ficcao no genoma seria
      // contaminar a memoria com o que a busca nunca encontrou.
      if (this.knowledgeGenome && query.saveAsKnowledge && results.length > 0) {
        capsule = await this.knowledgeGenome.createCapsule(tenantId, actorId, {
          title: `External Knowledge: ${q}`,
          content: results.map((r) => `${r.title}\n${r.snippet}\nSource: ${r.url || 'n/a'}`).join('\n\n'),
          summary: `Search results for query: ${q}`,
          level: 'WORKING',
          source: 'external_search',
        });
      }
    } catch (error) {
      // O adaptador LANCA quando o research esta desligado ou o host esta fora da allowlist —
      // de proposito, para que a falha nunca vire "procurei e nao achei nada" (uma lista vazia
      // seria lida como afirmacao diferente). Aqui a falha vira estado `unknown` com o motivo.
      outcome = unknown(
        `external search unavailable: ${String(error.message || error).slice(0, 200)}`,
        error.code ? { code: error.code } : null,
      );
    }

    return this.#report(tenantId, q, startedAt, outcome, capsule);
  }

  // Monta o relatorio com a cadeia de proveniencia: resultado + fonte + execucao + timestamp.
  // O evento carrega a contagem REAL (0 quando unknown), nunca um numero fixo.
  async #report(tenantId, q, startedAt, outcome, capsule) {
    const results = outcome.state === 'measured' ? outcome.value : [];
    const report = {
      query: q,
      state: outcome.state,
      results,
      reason: outcome.state === 'unknown' ? outcome.reason : null,
      pending: outcome.pending || null,
      source: outcome.source || 'research-source-client',
      savedCapsuleId: capsule ? capsule.id : null,
      startedAt,
      timestamp: new Date().toISOString(),
    };

    if (this.bus?.emit) {
      await this.bus.emit('cognitive.search.completed', { tenantId, query: q, state: report.state, resultsCount: results.length });
    } else if (this.bus?.publish) {
      await this.bus.publish({ tenantId, type: 'cognitive.search.completed', data: { query: q, state: report.state, resultsCount: results.length } });
    }

    return report;
  }
}

module.exports = { ExternalSearchService };
