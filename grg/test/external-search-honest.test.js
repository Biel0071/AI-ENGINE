const test = require('node:test');
const assert = require('node:assert/strict');
const { ExternalSearchService } = require('../src/cognitive/external-search');
const { createResearchSearchClient, ResearchSourceClient } = require('../src/research/source-client');

// A busca web era a unica capacidade que MENTIA: devolvia 2 resultados fabricados com
// reliability fixo, sem requisicao HTTP. Estes testes provam o contrato honesto e falham
// se a ficcao voltar (verificado por mutacao: reintroduzir os resultados fixos quebra tudo).

const cp = { authorize: async () => true };

function service(searchClient) {
  return new ExternalSearchService({ store: null, bus: null, controlPlane: cp, knowledgeGenome: null, searchClient });
}

test('external-search: termo inexistente devolve lista vazia, nunca ficcao', async () => {
  // Cliente que responde como uma fonte real sem correspondencia: array vazio.
  const svc = service({ search: async () => [] });
  const r = await svc.search('t', 'a', { q: 'zzqx-termo-que-nao-existe-9271' });
  assert.equal(r.state, 'measured');
  assert.equal(r.results.length, 0);
  // Nenhum resultado fabricado com dominio grgservices/reliability inventado.
  assert.ok(!JSON.stringify(r).includes('grgservices'));
  assert.ok(!JSON.stringify(r).includes('reliability'));
});

test('external-search: resultado real carrega proveniencia (url, source, fetchedAt)', async () => {
  const fetchedAt = '2026-07-29T00:00:00.000Z';
  const svc = service({
    search: async (q) => [
      { title: `pkg-${q}@1.0.0`, url: 'https://www.npmjs.com/package/pkg', snippet: 'desc real', source: 'registry.npmjs.org', fetchedAt },
    ],
  });
  const r = await svc.search('t', 'a', { q: 'express' });
  assert.equal(r.state, 'measured');
  assert.equal(r.results.length, 1);
  const item = r.results[0];
  assert.equal(item.url, 'https://www.npmjs.com/package/pkg');
  assert.equal(item.source, 'registry.npmjs.org');
  assert.equal(item.fetchedAt, fetchedAt);
  // Sem campo de confianca inventado: a confianca so pode vir de peso de fonte medido.
  assert.equal(item.reliability, undefined);
});

test('external-search: research desligado devolve unknown com motivo, nao resultados', async () => {
  // O adaptador real sobre um cliente DESLIGADO (default) lanca ResearchDisabledError.
  const disabled = new ResearchSourceClient({ store: null, env: {} });
  const svc = service(createResearchSearchClient(disabled));
  const r = await svc.search('t', 'a', { q: 'anything' });
  assert.equal(r.state, 'unknown');
  assert.equal(r.results.length, 0);
  assert.match(r.reason, /unavailable|disabled|RESEARCH_DISABLED/i);
});

test('external-search: sem searchClient devolve unknown, nunca lista fabricada', async () => {
  const svc = service(null);
  const r = await svc.search('t', 'a', { q: 'anything' });
  assert.equal(r.state, 'unknown');
  assert.equal(r.results.length, 0);
  assert.match(r.reason, /no external research source/i);
});

test('external-search: query vazia e rejeitada', async () => {
  const svc = service({ search: async () => [] });
  await assert.rejects(() => svc.search('t', 'a', { q: '   ' }), /query is required/i);
});
