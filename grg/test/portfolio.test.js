const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { LocalGitHostAdapter } = require('../src/repo-intel/ports');

// GitHub connector mock: devolve um portfólio determinístico.
class MockGitHub {
  async listUserRepos(username) {
    return [
      { name: 'ZAPAI-FINAL', url: 'https://github.com/biel0071/ZAPAI-FINAL', private: false, language: 'HTML', sizeKb: 1000, empty: false },
      { name: 'AI-LLM', url: 'https://github.com/biel0071/AI-LLM', private: false, language: 'TypeScript', sizeKb: 500, empty: false },
      { name: 'SC-V1', url: 'https://github.com/biel0071/SC-V1', private: false, language: null, sizeKb: 0, empty: true },
    ];
  }
}

async function bootstrap() {
  const gitHost = new LocalGitHostAdapter()
    .register('https://github.com/biel0071/ZAPAI-FINAL', 'r1', {
      'package.json': JSON.stringify({ dependencies: { '@whiskeysockets/baileys': '^6', openai: '^4' } }), 'a.js': 'jwt rbac',
    })
    .register('https://github.com/biel0071/AI-LLM', 'r2', {
      'package.json': JSON.stringify({ dependencies: { openai: '^4', anthropic: '^1' } }), 'b.ts': 'ai gateway',
    });
  const app = await createApp({ gitHost, github: new MockGitHub() });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('portfolio: ingests all user repos, skips empty, analyzes the rest', async () => {
  const app = await bootstrap();
  const report = await app.portfolio.ingestUser('grg', 'grg-admin', 'biel0071', { analyze: true });
  assert.equal(report.total, 3);
  const byName = Object.fromEntries(report.results.map((r) => [r.name, r]));
  assert.equal(byName['ZAPAI-FINAL'].status, 'analyzed');
  assert.equal(byName['AI-LLM'].status, 'analyzed');
  assert.equal(byName['SC-V1'].status, 'skipped-empty');
  assert.ok(byName['ZAPAI-FINAL'].capabilities.includes('whatsapp-crm'));
});

test('chat: "acoplar todos os projetos do github biel0071" triggers portfolio ingest', async () => {
  const app = await bootstrap();
  const r = await app.chat.handle('grg', 'grg-admin', 'acoplar todos os projetos do meu user github biel0071 e mapear');
  assert.equal(r.intent, 'ingest_portfolio');
  assert.equal(r.action.ok, true);
  assert.equal(r.facts.username, 'biel0071');
  assert.match(r.reply, /Acoplei o portfólio/);
  assert.match(r.reply, /ZAPAI-FINAL/);
});

test('extractUsername handles several phrasings', async () => {
  const app = await bootstrap();
  assert.equal(app.chat.extractUsername('meu user github biel0071'), 'biel0071');
  assert.equal(app.chat.extractUsername('biel0071/ acoplar tudo'), 'biel0071');
  assert.equal(app.chat.extractUsername('https://github.com/Biel0071'), 'Biel0071');
});

test('portfolio ingest populates catalog and evolution learns', async () => {
  const app = await bootstrap();
  await app.portfolio.ingestUser('grg', 'grg-admin', 'biel0071', { analyze: true });
  const state = await app.store.read();
  const caps = state.capabilities.filter((c) => c.tenantId === 'grg');
  assert.ok(caps.length >= 2);
  const insights = await app.evolution.getInsights('grg');
  assert.ok(insights.length > 0);
});
