const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { LocalGitHostAdapter } = require('../src/repo-intel/ports');

const FILES = {
  'package.json': JSON.stringify({ dependencies: { '@whiskeysockets/baileys': '^6', openai: '^4', express: '^4' } }),
  'src/s.js': 'jwt rbac socket.io checkout pix analytics dashboard seo email',
  'db/schema.sql': 'CREATE TABLE a(id int);',
};

async function bootstrap() {
  const gitHost = new LocalGitHostAdapter().register('https://github.com/Biel0071/ZAPAI-FINAL', 'r1', FILES);
  const app = await createApp({ gitHost });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  await app.repoIntel.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL', family: 'whatsapp-crm-core' });
  await app.repoIntel.analyze('grg', 'alice', 'zapai-final');
  return app;
}

test('discovery classifica capacidades vs GRG (existente/parcial/inexistente)', async () => {
  const app = await bootstrap();
  const r = await app.discovery.discover('grg', 'alice', 'zapai-final');
  assert.ok(r.summary.total > 0);
  const byCap = Object.fromEntries(r.classification.map((c) => [c.capability, c.status]));
  assert.equal(byCap['whatsapp-crm'], 'existing');   // GRG tem estável
  assert.equal(byCap['ecommerce'], 'partial');        // GRG tem parcial
  assert.ok(['existing', 'superior'].includes(byCap['analytics']));
});

test('discovery gera sugestoes de modulo para gaps', async () => {
  const app = await bootstrap();
  const r = await app.discovery.discover('grg', 'alice', 'zapai-final');
  assert.ok(Array.isArray(r.suggestions));
  // ecommerce é parcial → deve sugerir ampliar
  assert.ok(r.suggestions.some((s) => s.capability === 'ecommerce'));
  r.suggestions.forEach((s) => { assert.ok(s.proposal.ports.length); assert.ok(s.proposal.endpoints.length); });
});

test('discovery gera mapa funcional com entidades reais', async () => {
  const app = await bootstrap();
  const r = await app.discovery.discover('grg', 'alice', 'zapai-final');
  assert.equal(r.functionalMap.revision, 'r1');
  assert.ok(Array.isArray(r.functionalMap.modules));
  assert.ok(r.functionalMap.modules.includes('whatsapp-crm'));
});

test('discovery alimenta grafo e memoria com evidencia', async () => {
  const app = await bootstrap();
  await app.discovery.discover('grg', 'alice', 'zapai-final');
  const state = await app.store.read();
  assert.ok(state.graphEdges.some((e) => e.type === 'DISCOVERED'));
  const mem = state.memoryEvents.find((m) => m.kind === 'discovery');
  assert.ok(mem && mem.evidence.length > 0);
  assert.equal(app.bus.history('discovery.completed').length, 1);
});

test('discovery exige analise previa', async () => {
  const gitHost = new LocalGitHostAdapter();
  const app = await createApp({ gitHost });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  await assert.rejects(() => app.discovery.discover('grg', 'alice', 'inexistente'), /analise|Sem/i);
});
