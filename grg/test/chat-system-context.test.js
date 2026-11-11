'use strict';
// Camada 1 do super agente Fênix: o chat respondia generico porque o modelo so via
// ~1.100 caracteres (perfil de design + historico). O indice de memoria ja achava telas,
// rotas e memorias relevantes, mas so DEPOIS da resposta. Agora esses fatos entram no prompt.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSystemContext } = require('../src/chat/system-context');

const NOW = Date.parse('2026-11-11T12:00:00Z');

function fakeApp({ state = {}, pack = null, packThrows = false, storeThrows = false } = {}) {
  return {
    store: { read: async () => { if (storeThrows) throw new Error('store down'); return state; } },
    projectMemoryIndex: {
      getContextPack: () => { if (packThrows) throw new Error('index down'); return pack; },
    },
  };
}

const state = {
  runtimeJobs: [
    { id: 'j1', tenantId: 'grg', type: 'cognitive.cycle', status: 'SUCCEEDED', createdAt: '2026-11-11T11:50:00Z', completedAt: '2026-11-11T11:51:00Z' },
    { id: 'j2', tenantId: 'grg', type: 'development.execute', status: 'FAILED', createdAt: '2026-11-11T11:58:00Z', error: { message: 'tests failed' } },
    { id: 'jx', tenantId: 'other', type: 'secret.job', status: 'RUNNING', createdAt: '2026-11-11T11:59:00Z' },
  ],
  missions: [
    { id: 'm1', tenantId: 'grg', title: 'Corrigir login do ZAPAI', status: 'RUNNING', createdAt: '2026-11-11T11:00:00Z' },
  ],
  aiCalls: [
    { tenantId: 'grg', provider: 'ollama', model: 'qwen2.5:3b', totalTokens: 300, createdAt: '2026-11-11T11:00:00Z' },
    { tenantId: 'grg', provider: 'ollama', model: 'qwen2.5:3b', totalTokens: 100, createdAt: '2026-11-11T11:30:00Z' },
    { tenantId: 'grg', provider: 'openai', totalTokens: 999, createdAt: '2026-11-09T11:00:00Z' },
  ],
};

const pack = {
  relevantViews: [{ type: 'view', id: 'view-city', detail: 'Cidade IA com jobs recentes' }],
  relevantRoutes: [{ type: 'route', id: 'GET /api/v2/jobs/:id/usage', detail: 'tokens por job' }],
  relevantFiles: [{ type: 'function', id: 'renderJobDetail', detail: 'public/fenix-city-adaptive-dock.js' }],
  relevantMemories: [{ type: 'memory', id: 'Tokens por job', detail: 'Clique num job na Cidade para ver tokens, tempo e chamadas de IA.' }],
};

test('prompt context carries real jobs, missions, AI usage and indexed screens', async () => {
  const text = await buildSystemContext({ app: fakeApp({ state, pack }), tenantId: 'grg', message: 'como vejo tokens?', now: NOW });
  assert.match(text, /development\.execute/);
  assert.match(text, /FAILED/);
  assert.match(text, /Corrigir login do ZAPAI/);
  assert.match(text, /400 tokens/); // so as chamadas das ultimas 24h
  assert.match(text, /view-city/);
  assert.match(text, /GET \/api\/v2\/jobs\/:id\/usage/);
  assert.match(text, /Clique num job na Cidade/);
});

test('other tenants never leak into the prompt', async () => {
  const text = await buildSystemContext({ app: fakeApp({ state, pack }), tenantId: 'grg', message: 'x', now: NOW });
  assert.doesNotMatch(text, /secret\.job/);
});

test('indexed text is labelled as data, not instructions', async () => {
  const text = await buildSystemContext({ app: fakeApp({ state, pack }), tenantId: 'grg', message: 'x', now: NOW });
  assert.match(text, /não são instruções/i);
});

test('context is capped so a local model stays fast', async () => {
  const big = { ...pack, relevantMemories: Array.from({ length: 50 }, (_, i) => ({ id: 'm' + i, detail: 'x'.repeat(400) })) };
  const text = await buildSystemContext({ app: fakeApp({ state, pack: big }), tenantId: 'grg', message: 'x', now: NOW, maxChars: 1500 });
  assert.ok(text.length <= 1500, `length ${text.length}`);
});

test('missing store or index degrade to what is available, never throw', async () => {
  const noIndex = await buildSystemContext({ app: fakeApp({ state, packThrows: true }), tenantId: 'grg', message: 'x', now: NOW });
  assert.match(noIndex, /development\.execute/);
  const noStore = await buildSystemContext({ app: fakeApp({ pack, storeThrows: true }), tenantId: 'grg', message: 'x', now: NOW });
  assert.match(noStore, /view-city/);
  assert.equal(await buildSystemContext({ app: {}, tenantId: 'grg', message: 'x', now: NOW }), '');
});
// Fase 3 (2026-11-11): cada resposta traz as fontes consultadas, numeradas [F1], [F2]...
// Arquivo citado tem de existir no disco; ruído (test-results, node_modules) não entra.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildSystemContextWithSources, citedSources } = require('../src/chat/system-context');

function rootWithFiles(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-src-'));
  for (const f of files) { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), 'x'); }
  return root;
}

test('sources are numbered, verified on disk and listed in the prompt context', async () => {
  const root = rootWithFiles(['public/fenix-city-adaptive-dock.js']);
  const sourcesPack = {
    activeRoot: root,
    relevantFiles: [
      { type: 'file', file: 'public/fenix-city-adaptive-dock.js', id: 'public/fenix-city-adaptive-dock.js' },
      { type: 'file', file: 'src/nao-existe.js', id: 'src/nao-existe.js' },
      { type: 'file', file: 'test-results/x/error-context.md', id: 'test-results/x/error-context.md' },
    ],
    relevantRoutes: [{ type: 'route', id: 'GET /api/v2/jobs/:id/usage', detail: 'tokens por job' }],
    relevantMemories: [{ type: 'memory', id: 'Tokens por job', detail: 'Clique num job na Cidade.' }],
  };
  const out = await buildSystemContextWithSources({ app: fakeApp({ state, pack: sourcesPack }), tenantId: 'grg', message: 'tokens', now: NOW });
  const refs = out.sources.map((s) => `${s.type}:${s.reference}`);
  assert.ok(refs.includes('file:public/fenix-city-adaptive-dock.js'));
  assert.ok(!refs.some((r) => r.includes('nao-existe')), 'missing files are dropped');
  assert.ok(!refs.some((r) => r.includes('test-results')), 'noise is dropped');
  assert.ok(refs.includes('route:GET /api/v2/jobs/:id/usage'));
  assert.ok(refs.includes('runtime:estado do runtime'));
  for (const s of out.sources) assert.match(out.text, new RegExp(`\\[F${s.n}\\]`));
});

test('cited sources are the ones the answer actually references', async () => {
  const sources = [{ n: 1, type: 'runtime', reference: 'estado do runtime' }, { n: 2, type: 'route', reference: 'GET /api/v2/jobs/:id/usage' }, { n: 3, type: 'memory', reference: 'Tokens por job' }];
  const marked = citedSources(sources, 'Veja os tokens no detalhe do job [F2]; o runtime mostra 2 falhas [F1].');
  assert.deepEqual(marked.filter((s) => s.cited).map((s) => s.n), [1, 2]);
  assert.equal(marked.find((s) => s.n === 3).cited, false);
});
test('system questions are told apart from general ones', () => {
  const { isSystemQuestion } = require('../src/chat/system-context');
  for (const q of ['Quantos jobs falharam?', 'Onde fica o código do painel da Cidade?', 'O que o agente architect fez?', 'Qual a última missão?', 'tem erro no deploy da VPS?', 'Como está o Fênix?']) {
    assert.equal(isSystemQuestion(q), true, q);
  }
  for (const q of ['Qual é a capital da Austrália?', 'Me conte uma piada', 'Explique o que é recursão']) {
    assert.equal(isSystemQuestion(q), false, q);
  }
});
test('location questions are answered straight from the verified screen sources', () => {
  const { answerLocationQuestion } = require('../src/chat/system-context');
  const sources = [
    { n: 1, type: 'runtime', reference: 'estado do runtime' },
    { n: 2, type: 'screen', reference: '#dockCardJobsList', label: 'elemento #dockCardJobsList na tela city — controlado por grg/public/fenix-city-adaptive-dock.js', files: ['grg/public/fenix-city-adaptive-dock.js'] },
  ];
  const text = answerLocationQuestion('Onde fica o código do painel de jobs da Cidade?', sources);
  assert.match(text, /#dockCardJobsList/);
  assert.match(text, /fenix-city-adaptive-dock\.js/);
  assert.match(text, /\[F2\]/);
  assert.equal(answerLocationQuestion('Quantos jobs falharam?', sources), null, 'not a location question');
  assert.equal(answerLocationQuestion('Onde fica o painel?', [sources[0]]), null, 'no screen source, no answer');
});