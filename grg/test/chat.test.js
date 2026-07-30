const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { LocalGitHostAdapter } = require('../src/repo-intel/ports');

const FILES = {
  'package.json': JSON.stringify({ dependencies: { '@whiskeysockets/baileys': '^6', openai: '^4', express: '^4' } }),
  'src/server.js': "const app=require('express')(); app.post('/api/messages', h);",
  'db/schema.sql': 'CREATE TABLE contacts (id int);',
  'src/ai.js': 'openai jwt rbac',
};

async function bootstrap() {
  const gitHost = new LocalGitHostAdapter().register('https://github.com/Biel0071/ZAPAI-FINAL', 'rev1', FILES);
  const app = await createApp({ gitHost });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('chat: help intent lists capabilities', async () => {
  const app = await bootstrap();
  const r = await app.chat.handle('grg', 'grg-admin', 'ajuda');
  assert.equal(r.intent, 'help');
  assert.match(r.reply, /Cole uma URL/);
});

test('chat: pasting a github url connects and analyzes for real (via adapter)', async () => {
  const app = await bootstrap();
  const r = await app.chat.handle('grg', 'grg-admin', 'acople https://github.com/Biel0071/ZAPAI-FINAL');
  assert.equal(r.intent, 'connect_repo');
  assert.equal(r.action.ok, true);
  assert.equal(r.action.repoId, 'zapai-final');
  assert.match(r.reply, /Acoplei e analisei/);
  assert.match(r.reply, /whatsapp-crm/);
});

test('chat: asks what it learned after coupling', async () => {
  const app = await bootstrap();
  await app.chat.handle('grg', 'grg-admin', 'https://github.com/Biel0071/ZAPAI-FINAL');
  const r = await app.chat.handle('grg', 'grg-admin', 'o que você aprendeu?');
  assert.equal(r.intent, 'insights');
  assert.ok(r.facts.insights.length > 0);
});

test('chat: twin advice after coupling', async () => {
  const app = await bootstrap();
  await app.chat.handle('grg', 'grg-admin', 'https://github.com/Biel0071/ZAPAI-FINAL');
  const r = await app.chat.handle('grg', 'grg-admin', 'analise o twin');
  assert.equal(r.intent, 'twin');
  assert.ok(Array.isArray(r.facts.advice));
  assert.ok(r.facts.health.score > 0);
});

test('chat: generate a system by conversation', async () => {
  const app = await bootstrap();
  await app.chat.handle('grg', 'grg-admin', 'https://github.com/Biel0071/ZAPAI-FINAL');
  const r = await app.chat.handle('grg', 'grg-admin', 'gerar um sistema CRM de whatsapp com IA');
  assert.equal(r.intent, 'generate');
  assert.equal(r.action.ok, true);
  // O chat migrou do orchestrator legado ('Gerei o projeto') para o Executive Brain: um objetivo
  // de construcao vira um PROGRAMA real decomposto em missoes reais. O teste acompanha o produto.
  assert.equal(r.action.type, 'program');
  assert.ok(r.action.programId);
  assert.match(r.reply, /Programa criado/);
});

test('chat: overview reflects real state', async () => {
  const app = await bootstrap();
  await app.chat.handle('grg', 'grg-admin', 'https://github.com/Biel0071/ZAPAI-FINAL');
  const r = await app.chat.handle('grg', 'grg-admin', 'status');
  assert.equal(r.intent, 'overview');
  assert.ok(r.facts.repos >= 1);
  assert.ok(r.facts.capabilities >= 1);
});

test('chat: every turn is recorded to memory', async () => {
  const app = await bootstrap();
  await app.chat.handle('grg', 'grg-admin', 'status');
  const state = await app.store.read();
  assert.ok(state.memoryEvents.some((m) => m.actorId === 'chat-agent'));
});
