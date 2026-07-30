const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

// FLUXO 3 — Consumir a API Platform, ponta a ponta.
//
// Prova que o caminho comando -> aiGateway.invoke -> provider -> resposta usa telemetria REAL:
// tokens e custo medidos do provider, refletidos no observability-center (que foi tornado real).
// Injeta um provider fake no lugar do AIPlatformProvider (mesma interface complete()), para
// provar o contrato sem depender de GRG_AIPLATFORM_KEY real no CI. Em producao o provider real
// (aiplatform-provider.js) faz o HTTP; aqui provamos que o Gateway o consome corretamente.

// Provider fake com a MESMA interface do AIPlatformProvider: complete({prompt}) -> {text,tokens}.
class FakePlatformProvider {
  constructor() { this.name = 'aiplatform'; this.calls = 0; }
  async available() { return true; }
  async complete({ prompt }) {
    this.calls += 1;
    const text = `resposta real para: ${prompt.slice(0, 30)}`;
    return { text, model: 'fake-1', promptTokens: 7, completionTokens: 11 };
  }
}

async function boot(provider) {
  // routes: rota unica apontando ao provider 'aiplatform' para o taskType default.
  const app = await createApp({
    dataFile: null,
    providers: { aiplatform: provider },
    routes: { default: { provider: 'aiplatform', model: 'fake-1', maxOutputTokens: 256 } },
  });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('fluxo api-platform: gateway consome o provider e devolve texto REAL', async () => {
  const provider = new FakePlatformProvider();
  const app = await boot(provider);
  const r = await app.aiGateway.invoke('grg', 'grg-admin', { taskType: 'default', prompt: 'gerar um resumo' });
  assert.equal(provider.calls, 1); // o provider foi REALMENTE chamado, nao simulado
  assert.match(r.text, /resposta real para/);
  assert.equal(r.provider, 'aiplatform');
  await app.close();
});

test('fluxo api-platform: telemetria medida aparece no observability (tokens reais)', async () => {
  const provider = new FakePlatformProvider();
  const app = await boot(provider);
  await app.aiGateway.invoke('grg', 'grg-admin', { taskType: 'default', prompt: 'primeira' });
  await app.aiGateway.invoke('grg', 'grg-admin', { taskType: 'default', prompt: 'segunda' });

  const metrics = await app.observabilityCenter.getMetrics('grg', 'grg-admin');
  // O observability foi tornado real: os tokens vem da telemetria do gateway, nao de 48250 fixo.
  assert.equal(metrics.aiRuntime.totalTokensConsumed.state, 'measured');
  assert.equal(metrics.aiRuntime.calls.value, 2); // duas invocacoes reais
  assert.ok(metrics.aiRuntime.totalTokensConsumed.value >= 36); // 2x(7+11), sem cache
  await app.close();
});

test('fluxo api-platform: cache evita segunda chamada ao provider (custo real medido)', async () => {
  const provider = new FakePlatformProvider();
  const app = await boot(provider);
  const a = await app.aiGateway.invoke('grg', 'grg-admin', { taskType: 'default', prompt: 'mesma pergunta' });
  const b = await app.aiGateway.invoke('grg', 'grg-admin', { taskType: 'default', prompt: 'mesma pergunta' });
  assert.equal(provider.calls, 1); // segunda veio do cache: o provider so foi chamado uma vez
  assert.equal(b.cached, true);
  assert.equal(a.text, b.text);
  await app.close();
});
