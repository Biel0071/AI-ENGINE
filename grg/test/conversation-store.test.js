const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { ConversationStore, SUMMARY_TRIGGER_TURNS } = require('../src/chat/conversation-store');

// FASE 4: persistencia real da conversa. Nenhum numero inventado: as contagens vem do store.
// ASCII-only (lexer Node 18).

async function tenantApp() {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('mensagem gravada sobrevive no store, com origem medida', async () => {
  const app = await tenantApp();
  const conversation = await app.conversations.open('grg', 'grg-admin', {});
  await app.conversations.append('grg', 'grg-admin', conversation.id, { role: 'user', content: 'ola', source: 'voice' });
  await app.conversations.append('grg', 'grg-admin', conversation.id, { role: 'assistant', content: 'oi', source: 'voice', tokens: 2 });

  const state = await app.store.read();
  const rows = state.messages.filter((m) => m.conversationId === conversation.id);
  assert.equal(rows.length, 2, 'as duas mensagens estao no store');
  assert.equal(rows[0].source, 'voice', 'a origem por voz e registrada, nao assumida');
  assert.equal(rows[1].tokens, 2, 'a contagem de tokens vem do provider');
  await app.close?.();
});

test('mensagem interrompida tambem e gravada (o usuario viu aquele texto)', async () => {
  const app = await tenantApp();
  const conversation = await app.conversations.open('grg', 'grg-admin', {});
  await app.conversations.append('grg', 'grg-admin', conversation.id, {
    role: 'assistant', content: 'comecei a responder', interrupted: true,
  });
  const rows = await app.conversations.history('grg', conversation.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].interrupted, true, 'o registro admite a interrupcao');
  assert.equal(rows[0].content, 'comecei a responder', 'o texto parcial e preservado');
  await app.close?.();
});

test('conversa retomada mantem o contexto: o prompt carrega o historico real', async () => {
  const app = await tenantApp();
  const conversation = await app.conversations.open('grg', 'grg-admin', {});
  await app.conversations.append('grg', 'grg-admin', conversation.id, { role: 'user', content: 'meu nome e Rodrigo' });
  await app.conversations.append('grg', 'grg-admin', conversation.id, { role: 'assistant', content: 'ok, Rodrigo' });

  const prompt = await app.conversations.buildPrompt('grg', 'grg-admin', conversation.id, 'qual meu nome?', { system: 'sys' });
  const contents = prompt.messages.map((m) => m.content);
  assert.ok(contents.includes('meu nome e Rodrigo'), 'o turno anterior entrou no prompt');
  assert.ok(contents.includes('qual meu nome?'), 'a pergunta nova entrou no prompt');
  assert.equal(prompt.turnsIncluded, 2, 'contagem real de turnos incluidos');
  assert.equal(prompt.messages[0].role, 'system');
  await app.close?.();
});

test('o titulo da conversa vem da primeira mensagem real do usuario', async () => {
  const app = await tenantApp();
  const conversation = await app.conversations.open('grg', 'grg-admin', {});
  assert.equal(conversation.title, null, 'nasce sem titulo, nao com um placeholder');
  await app.conversations.append('grg', 'grg-admin', conversation.id, { role: 'user', content: 'preciso de um CRM' });
  const [row] = await app.conversations.list('grg');
  assert.equal(row.title, 'preciso de um CRM');
  await app.close?.();
});

test('preferencias de voz persistem por usuario e rejeitam modo invalido', async () => {
  const app = await tenantApp();
  const initial = await app.conversations.preferences('grg', 'grg-admin');
  assert.equal(initial.inputMode, 'text', 'o padrao e texto');
  assert.equal(initial.ttsEnabled, false);

  await app.conversations.savePreferences('grg', 'grg-admin', { inputMode: 'continuous', ttsEnabled: true, ttsRate: 1.5, vadSensitivity: 0.8 });
  const saved = await app.conversations.preferences('grg', 'grg-admin');
  assert.equal(saved.inputMode, 'continuous');
  assert.equal(saved.ttsEnabled, true);
  assert.equal(saved.ttsRate, 1.5);
  assert.equal(saved.vadSensitivity, 0.8);

  await app.conversations.savePreferences('grg', 'grg-admin', { inputMode: 'telepatia' });
  const after = await app.conversations.preferences('grg', 'grg-admin');
  assert.equal(after.inputMode, 'continuous', 'modo invalido e ignorado, nao gravado');

  await app.conversations.savePreferences('grg', 'grg-admin', { ttsRate: 99 });
  const clamped = await app.conversations.preferences('grg', 'grg-admin');
  assert.equal(clamped.ttsRate, 2, 'velocidade e limitada a um intervalo usavel');
  await app.close?.();
});

test('sem llm a sumarizacao NAO inventa resumo: diz o motivo', async () => {
  const app = await tenantApp();
  const store = new ConversationStore({ store: app.store, memory: null, llm: null });
  const conversation = await store.open('grg', 'grg-admin', {});
  for (let i = 0; i < SUMMARY_TRIGGER_TURNS + 4; i += 1) {
    await store.append('grg', 'grg-admin', conversation.id, { role: i % 2 ? 'assistant' : 'user', content: `turno ${i}` });
  }
  const out = await store.summarizeIfNeeded('grg', 'grg-admin', conversation.id);
  assert.equal(out.summarized, false);
  assert.match(out.reason, /sem llm/, 'a razao real e explicita');
  assert.equal(out.turns, SUMMARY_TRIGGER_TURNS + 4, 'a contagem e real');
  await app.close?.();
});

test('com llm a sumarizacao condensa o excedente e entra no prompt seguinte', async () => {
  const app = await tenantApp();
  let sawTranscript = null;
  const llm = {
    name: 'fake',
    async chat({ messages }) { sawTranscript = messages[1].content; return { text: 'Rodrigo pediu um CRM.' }; },
  };
  const store = new ConversationStore({ store: app.store, memory: null, llm });
  const conversation = await store.open('grg', 'grg-admin', {});
  for (let i = 0; i < SUMMARY_TRIGGER_TURNS + 6; i += 1) {
    await store.append('grg', 'grg-admin', conversation.id, { role: i % 2 ? 'assistant' : 'user', content: `turno ${i}` });
  }
  const out = await store.summarizeIfNeeded('grg', 'grg-admin', conversation.id);
  assert.equal(out.summarized, true);
  assert.equal(out.summary, 'Rodrigo pediu um CRM.');
  assert.ok(out.condensed > 0, 'condensou um numero real de turnos');
  assert.match(sawTranscript, /turno 0/, 'o transcript enviado ao llm e o real');

  const prompt = await store.buildPrompt('grg', 'grg-admin', conversation.id, 'e agora?');
  assert.equal(prompt.usedSummary, true, 'o resumo entra no prompt seguinte');
  assert.ok(prompt.messages.some((m) => m.content.includes('Rodrigo pediu um CRM.')));
  await app.close?.();
});

test('o prompt nao cresce sem limite: turnos antigos saem', async () => {
  const app = await tenantApp();
  const store = new ConversationStore({ store: app.store, memory: null, llm: null });
  const conversation = await store.open('grg', 'grg-admin', {});
  for (let i = 0; i < 40; i += 1) {
    await store.append('grg', 'grg-admin', conversation.id, { role: i % 2 ? 'assistant' : 'user', content: `turno ${i}` });
  }
  const prompt = await store.buildPrompt('grg', 'grg-admin', conversation.id, 'ultima');
  assert.ok(prompt.turnsIncluded <= 12, 'o prompt tem teto de turnos');
  assert.equal(prompt.turnsTotal >= 40, true, 'mas o historico total real e maior');
  await app.close?.();
});

test('conversas de outro tenant nunca aparecem no historico', async () => {
  const app = await tenantApp();
  await app.controlPlane.createTenant({ id: 'outro', name: 'Outro' }, 'outro-admin');
  const mine = await app.conversations.open('grg', 'grg-admin', {});
  await app.conversations.append('grg', 'grg-admin', mine.id, { role: 'user', content: 'segredo do grg' });

  const theirs = await app.conversations.list('outro');
  assert.equal(theirs.length, 0, 'o outro tenant nao ve a conversa');
  const leaked = await app.conversations.history('outro', mine.id);
  assert.equal(leaked.length, 0, 'nem lendo pelo id da conversa');
  await app.close?.();
});
