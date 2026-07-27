const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { LocalGitHostAdapter } = require('../src/repo-intel/ports');

const FILES = {
  'package.json': JSON.stringify({ dependencies: { '@whiskeysockets/baileys': '^6', openai: '^4', express: '^4' } }),
  'src/server.js': "const app=require('express')(); app.get('/health', h); app.post('/api/messages', h);",
  'db/schema.sql': 'CREATE TABLE contacts (id int); CREATE TABLE messages (id int);',
  'src/ai.js': 'openai jwt rbac permission socket.io',
};

async function bootstrap() {
  const gitHost = new LocalGitHostAdapter().register('https://github.com/Biel0071/ZAPAI-FINAL', 'rev-twin-1', FILES);
  const app = await createApp({ gitHost });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  await app.controlPlane.addMember('grg', 'alice', { userId: 'grg-admin', role: 'admin' }); // p/ auto-refresh
  await app.repoIntel.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL', visibility: 'public', family: 'whatsapp-crm-core' });
  await app.repoIntel.analyze('grg', 'alice', 'zapai-final');
  return app;
}

test('twin auto-refreshes on scan.completed', async () => {
  const app = await bootstrap();
  const state = await app.store.read();
  const twin = state.digitalTwins.find((t) => t.subjectId === 'zapai-final' && t.current);
  assert.ok(twin, 'twin deveria existir após análise');
  assert.equal(twin.revision, 'rev-twin-1');
});

test('twin composes architecture, apis, database, capabilities', async () => {
  const app = await bootstrap();
  const twin = await app.digitalTwin.get('grg', 'alice', 'zapai-final');
  const m = twin.model;
  assert.equal(m.subject.name, 'ZAPAI-FINAL');
  assert.ok(m.architecture.fileCount > 0);
  assert.ok(m.apis.count >= 2);
  assert.ok(m.database.tables.includes('contacts'));
  assert.ok(m.capabilities.includes('whatsapp-crm'));
});

test('twin computes health score and weakest dimension', async () => {
  const app = await bootstrap();
  const twin = await app.digitalTwin.get('grg', 'alice', 'zapai-final');
  assert.ok(twin.model.health.score > 0);
  assert.ok(typeof twin.model.health.weakest === 'string');
});

test('twin detects risk: public repo with auth', async () => {
  const app = await bootstrap();
  const twin = await app.digitalTwin.get('grg', 'alice', 'zapai-final');
  assert.ok(twin.model.risks.some((r) => /público com auth/.test(r)));
});

test('advise consults twin and returns actionable guidance', async () => {
  const app = await bootstrap();
  const advice = await app.digitalTwin.advise('grg', 'alice', 'zapai-final');
  assert.ok(Array.isArray(advice.advice));
  assert.ok(advice.health.score >= 0);
});

test('twin is versioned: re-analyze new revision creates new current twin', async () => {
  const app = await bootstrap();
  // simula novo commit
  app.repoIntel.gitHost.register('https://github.com/Biel0071/ZAPAI-FINAL', 'rev-twin-2', FILES);
  await app.repoIntel.analyze('grg', 'alice', 'zapai-final');
  const state = await app.store.read();
  const currents = state.digitalTwins.filter((t) => t.subjectId === 'zapai-final' && t.current);
  assert.equal(currents.length, 1, 'só um twin current por vez');
  assert.equal(currents[0].revision, 'rev-twin-2');
  const all = state.digitalTwins.filter((t) => t.subjectId === 'zapai-final');
  assert.ok(all.length >= 2, 'histórico preservado');
});

test('lazy build: get creates twin if none exists', async () => {
  const gitHost = new LocalGitHostAdapter().register('https://github.com/Biel0071/x-repo', 'r1', FILES);
  const app = await createApp({ gitHost, digitalTwin: false }); // auto-refresh desligado
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  await app.repoIntel.connect('grg', 'alice', { url: 'https://github.com/Biel0071/x-repo', visibility: 'public' });
  await app.repoIntel.analyze('grg', 'alice', 'x-repo');
  const twin = await app.digitalTwin.get('grg', 'alice', 'x-repo'); // deve construir on-demand
  assert.ok(twin.model);
});
