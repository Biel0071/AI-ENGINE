const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/kernel/store');
const { EventBus } = require('../src/kernel/event-bus');
const { ControlPlane } = require('../src/control-plane/control-plane');
const { RepositoryIntelligence } = require('../src/repo-intel/repository-intelligence');
const { LocalGitHostAdapter } = require('../src/repo-intel/ports');

const ZAPAI_FILES = {
  'package.json': JSON.stringify({
    dependencies: { express: '^4', 'socket.io': '^4', '@whiskeysockets/baileys': '^6', openai: '^4' },
    devDependencies: { 'node:test': '*' },
  }),
  'src/server.js': `const app = require('express')();
    app.get('/conversations', h);
    app.post('/messages', h);`,
  'src/pages/Inbox.tsx': 'export default function Inbox() { return null }',
  'db/schema.sql': 'CREATE TABLE contacts (id int); CREATE TABLE messages (id int);',
  'src/ai.js': 'const OpenAI = require("openai"); // jwt rbac permission',
};

async function bootstrap() {
  const store = new MemoryStore();
  const bus = new EventBus();
  const cp = await new ControlPlane({ store, bus }).initialize();
  await cp.createTenant({ name: 'GRG' }, 'alice');
  const gitHost = new LocalGitHostAdapter().register('https://github.com/Biel0071/ZAPAI-FINAL', 'abc123def456', ZAPAI_FILES);
  const ri = new RepositoryIntelligence({ store, bus, controlPlane: cp, gitHost });
  return { store, bus, cp, ri };
}

test('connects a repository and creates graph edges', async () => {
  const { ri } = await bootstrap();
  const repo = await ri.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL', visibility: 'private', role: 'canonical', family: 'whatsapp-crm-core' });
  assert.equal(repo.id, 'zapai-final');
  assert.equal(repo.provider, 'github');
});

test('rejects non-github url', async () => {
  const { ri } = await bootstrap();
  await assert.rejects(() => ri.connect('grg', 'alice', { url: 'git@gitlab.com:x/y' }), /GitHub/);
});

test('analyzes repo: detects stack, endpoints, tables, capabilities', async () => {
  const { ri } = await bootstrap();
  await ri.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL' });
  const { snapshot, reused } = await ri.analyze('grg', 'alice', 'zapai-final');
  assert.equal(reused, false);
  assert.equal(snapshot.revision, 'abc123def456');
  assert.ok(snapshot.dependencies.includes('express'));
  assert.ok(snapshot.endpoints.some((e) => e.path === '/messages' && e.method === 'POST'));
  assert.ok(snapshot.tables.includes('contacts'));
  const capIds = snapshot.capabilities.map((c) => c.id);
  assert.ok(capIds.includes('whatsapp-crm'));
  assert.ok(capIds.includes('ai-gateway'));
  assert.ok(capIds.includes('auth-rbac'));
});

test('analysis is idempotent per commit (delta-aware reuse)', async () => {
  const { ri, bus } = await bootstrap();
  await ri.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL' });
  await ri.analyze('grg', 'alice', 'zapai-final');
  const second = await ri.analyze('grg', 'alice', 'zapai-final');
  assert.equal(second.reused, true);
  assert.equal(bus.history('scan.reused').length, 1);
});

test('registers capabilities in catalog with evidence + appends memory', async () => {
  const { ri, store } = await bootstrap();
  await ri.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL' });
  await ri.analyze('grg', 'alice', 'zapai-final');
  const state = await store.read();
  const wa = state.capabilities.find((c) => c.id === 'whatsapp-crm');
  assert.ok(wa);
  assert.ok(wa.sources.some((s) => s.repoId === 'zapai-final'));
  const mem = state.memoryEvents.find((e) => e.kind === 'repo-analyzed');
  assert.ok(mem.evidence.length > 0);
});

test('graph exposes capability and snapshot relations', async () => {
  const { ri } = await bootstrap();
  await ri.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL' });
  await ri.analyze('grg', 'alice', 'zapai-final');
  const graph = await ri.getGraph('grg', 'alice');
  assert.ok(graph.edges.some((e) => e.type === 'DECLARES_CAPABILITY'));
  assert.ok(graph.edges.some((e) => e.type === 'LEARNED'));
});
