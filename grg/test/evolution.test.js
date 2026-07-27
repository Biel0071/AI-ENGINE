const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { LocalGitHostAdapter } = require('../src/repo-intel/ports');

const WA_FILES = {
  'package.json': JSON.stringify({ dependencies: { '@whiskeysockets/baileys': '^6', openai: '^4', express: '^4' } }),
  'a.js': 'jwt rbac permission socket.io',
};

async function bootstrap() {
  const gitHost = new LocalGitHostAdapter()
    .register('https://github.com/Biel0071/ZAPAI-FINAL', 'rev1', WA_FILES)
    .register('https://github.com/Biel0071/swift-wa-assist', 'rev2', WA_FILES);
  const app = await createApp({ gitHost }); // evolution LIGADO por padrão
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  return app;
}

test('evolution loop is attached by default and learns on signals', async () => {
  const app = await bootstrap();
  assert.equal(app.evolution.attached, true);
  await app.repoIntel.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL', family: 'whatsapp-crm-core' });
  await app.repoIntel.analyze('grg', 'alice', 'zapai-final');
  const insights = await app.evolution.getInsights('grg');
  assert.ok(insights.length > 0, 'deveria ter aprendido algo após a análise');
  assert.ok(insights.some((i) => i.type === 'catalog-coverage'));
});

test('detects capability reuse across two repos automatically', async () => {
  const app = await bootstrap();
  await app.repoIntel.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL', family: 'whatsapp-crm-core' });
  await app.repoIntel.analyze('grg', 'alice', 'zapai-final');
  await app.repoIntel.connect('grg', 'alice', { url: 'https://github.com/Biel0071/swift-wa-assist', family: 'whatsapp-crm-core' });
  await app.repoIntel.analyze('grg', 'alice', 'swift-wa-assist');

  const insights = await app.evolution.getInsights('grg');
  const reuse = insights.find((i) => i.key === 'reuse:whatsapp-crm');
  assert.ok(reuse, 'deveria detectar whatsapp-crm reutilizada entre 2 repos');
  assert.deepEqual(reuse.detail.repos.sort(), ['swift-wa-assist', 'zapai-final']);

  const family = insights.find((i) => i.key === 'family:whatsapp-crm-core');
  assert.ok(family, 'deveria sugerir consolidação da família');
  assert.equal(family.detail.repos.length, 2);
});

test('insights are idempotent (reprocessing does not duplicate)', async () => {
  const app = await bootstrap();
  await app.repoIntel.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL' });
  await app.repoIntel.analyze('grg', 'alice', 'zapai-final');
  await app.evolution.tick('grg', 'manual');
  await app.evolution.tick('grg', 'manual');
  const insights = await app.evolution.getInsights('grg');
  const keys = insights.map((i) => i.key);
  assert.equal(keys.length, new Set(keys).size, 'não pode haver insight duplicado');
});

test('learning cycles accumulate as history', async () => {
  const app = await bootstrap();
  await app.repoIntel.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL' });
  await app.repoIntel.analyze('grg', 'alice', 'zapai-final');
  const evo = await app.evolution.getEvolution('grg');
  assert.ok(evo.cycles >= 1);
  assert.ok(evo.latest.snapshot.capabilities >= 1);
});

test('evolution memory events carry evidence', async () => {
  const app = await bootstrap();
  await app.repoIntel.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL' });
  await app.repoIntel.analyze('grg', 'alice', 'zapai-final');
  const state = await app.store.read();
  const evoMem = state.memoryEvents.filter((m) => m.actorId === 'evolution-engine');
  assert.ok(evoMem.length > 0);
  assert.ok(evoMem.every((m) => Array.isArray(m.evidence) && m.evidence.length > 0));
});
