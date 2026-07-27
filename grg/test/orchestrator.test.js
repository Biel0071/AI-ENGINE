const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, overview } = require('../src/app');
const { LocalGitHostAdapter } = require('../src/repo-intel/ports');

async function bootstrap() {
  const gitHost = new LocalGitHostAdapter().register('https://github.com/Biel0071/ZAPAI-FINAL', 'rev1', {
    'package.json': JSON.stringify({ dependencies: { '@whiskeysockets/baileys': '^6', openai: '^4' } }),
    'a.js': 'jwt rbac',
  });
  const app = await createApp({ gitHost });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  await app.repoIntel.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL' });
  await app.repoIntel.analyze('grg', 'alice', 'zapai-final'); // popula catálogo
  return app;
}

test('app factory builds artifact for a target', async () => {
  const app = await bootstrap();
  await app.factory.generate('grg', 'alice', { id: 'app', name: 'App', prompt: 'dashboard' });
  const art = await app.appFactory.build('grg', 'alice', 'app', { target: 'pwa', version: '1.2.0' });
  assert.match(art.filename, /app-1\.2\.0\.zip/);
  assert.ok(art.checksum);
});

test('app factory rejects unsupported target', async () => {
  const app = await bootstrap();
  await app.factory.generate('grg', 'alice', { id: 'app', name: 'App', prompt: 'x' });
  await assert.rejects(() => app.appFactory.build('grg', 'alice', 'app', { target: 'hologram' }), /Unsupported/);
});

test('orchestrator runs prompt -> generate -> deploy -> build end to end', async () => {
  const app = await bootstrap();
  const res = await app.orchestrator.buildFromPrompt('grg', 'alice', {
    name: 'ZapLoja', prompt: 'CRM WhatsApp com IA e PIX', target: 'node', buildTargets: ['pwa', 'android'],
  });
  assert.ok(res.reused.includes('whatsapp-crm'));
  assert.ok(res.built.includes('payments-pix'));
  assert.match(res.previewUrl, /preview/);
  assert.equal(res.artifacts.length, 2);
  // trace tem todas as etapas
  const steps = res.trace.map((t) => t.step);
  assert.deepEqual(steps.filter((s, i) => steps.indexOf(s) === i).sort(), ['build', 'deploy', 'generate', 'plan']);
});

test('overview aggregates all planes', async () => {
  const app = await bootstrap();
  await app.orchestrator.buildFromPrompt('grg', 'alice', { name: 'X', prompt: 'dashboard analytics', target: 'node' });
  const ov = await overview(app, 'grg', 'alice');
  assert.ok(ov.metrics.projects >= 1);
  assert.ok(ov.metrics.repositories >= 1);
  assert.ok(ov.metrics.capabilities >= 1);
  assert.ok(ov.metrics.deployments >= 1);
  assert.ok(ov.metrics.memoryEvents >= 1);
});
