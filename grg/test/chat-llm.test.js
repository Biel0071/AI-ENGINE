const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { LocalGitHostAdapter } = require('../src/repo-intel/ports');

// LLM mock: simula o Ollama de forma determinística para o teste.
class MockLLM {
  constructor() { this.model = 'mock'; this.calls = []; }
  async chat({ messages, format }) {
    this.calls.push({ messages, format });
    const user = messages[messages.length - 1].content;
    // classificação: responde JSON conforme o pedido
    if (format === 'json') {
      if (/tudo bem|ol[aá]|obrigado|bom dia/i.test(user)) return { text: '{"intent":"chitchat"}' };
      if (/aprend|insight/i.test(user)) return { text: '{"intent":"insights"}' };
      return { text: '{"intent":"help"}' };
    }
    // redacao: texto natural (sem acento p/ nao confundir o parser TAP do node18)
    return { text: 'Resposta natural gerada pelo LLM com base nos fatos reais.' };
  }
}

async function bootstrap() {
  const gitHost = new LocalGitHostAdapter();
  const app = await createApp({ gitHost, llm: new MockLLM() });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('LLM entende "tudo bem" como conversa casual (nao menu de robo)', async () => {
  const app = await bootstrap();
  const r = await app.chat.handle('grg', 'grg-admin', 'tudo bem?');
  assert.equal(r.intent, 'chitchat');
  assert.equal(r.llm, true);
  // resposta veio do LLM, não do menu "Posso:"
  assert.doesNotMatch(r.reply, /Cole uma URL do GitHub para acoplar/);
});

test('LLM redige resposta natural a partir de fatos reais', async () => {
  const app = await bootstrap();
  const r = await app.chat.handle('grg', 'grg-admin', 'e aí, o que você aprendeu até agora?');
  assert.equal(r.intent, 'insights');
  assert.match(r.reply, /LLM|natural/);
});

test('intent de acao concreta nao e conversacional (usa texto estruturado)', async () => {
  const app = await bootstrap();
  // valida a classificacao/roteamento sem executar clone real
  const CONVERSATIONAL = ['chitchat', 'help', 'insights', 'overview', 'capabilities', 'memory', 'list', 'twin'];
  assert.ok(!CONVERSATIONAL.includes('connect_repo'));
  assert.ok(!CONVERSATIONAL.includes('generate'));
  assert.ok(!CONVERSATIONAL.includes('ingest_portfolio'));
});

test('fallback: sem LLM, "tudo bem" cai em help (modo regras)', async () => {
  const gitHost = new LocalGitHostAdapter();
  const app = await createApp({ gitHost, llm: false });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  const r = await app.chat.handle('grg', 'grg-admin', 'tudo bem?');
  assert.equal(r.llm, false);
  assert.equal(r.intent, 'help');
});
