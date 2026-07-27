const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/kernel/store');
const { EventBus } = require('../src/kernel/event-bus');
const { ControlPlane } = require('../src/control-plane/control-plane');
const { AIGateway } = require('../src/ai-runtime/ai-gateway');
const { EchoProvider } = require('../src/ai-runtime/providers');
const { RepositoryIntelligence } = require('../src/repo-intel/repository-intelligence');
const { LocalGitHostAdapter } = require('../src/repo-intel/ports');
const { SoftwareFactory } = require('../src/software-factory/software-factory');

const ZAPAI_FILES = {
  'package.json': JSON.stringify({ dependencies: { express: '^4', '@whiskeysockets/baileys': '^6', openai: '^4' } }),
  'src/ai.js': 'openai jwt rbac permission',
};

async function bootstrap() {
  const store = new MemoryStore();
  const bus = new EventBus();
  const cp = await new ControlPlane({ store, bus }).initialize();
  await cp.createTenant({ name: 'GRG' }, 'alice');
  const gw = new AIGateway({ store, bus, controlPlane: cp, providers: { echo: new EchoProvider() } });
  const gitHost = new LocalGitHostAdapter().register('https://github.com/Biel0071/ZAPAI-FINAL', 'rev1', ZAPAI_FILES);
  const ri = new RepositoryIntelligence({ store, bus, controlPlane: cp, gitHost });
  const factory = new SoftwareFactory({ store, bus, controlPlane: cp, aiGateway: gw });
  // popula catálogo analisando um repo (whatsapp-crm, ai-gateway, auth-rbac)
  await ri.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL' });
  await ri.analyze('grg', 'alice', 'zapai-final');
  return { store, bus, cp, gw, factory };
}

test('plan reuses existing capabilities and marks missing ones to build', async () => {
  const { factory } = await bootstrap();
  const plan = await factory.plan('grg', 'alice', 'Quero um CRM de WhatsApp com IA e checkout PIX');
  assert.ok(plan.capabilities.reused.includes('whatsapp-crm'));
  assert.ok(plan.capabilities.reused.includes('ai-gateway'));
  assert.ok(plan.capabilities.missing.includes('payments-pix')); // não estava no catálogo
});

test('generate creates project, reuses modules, scaffolds only new ones', async () => {
  const { factory } = await bootstrap();
  const out = await factory.generate('grg', 'alice', { name: 'ZapLoja', prompt: 'CRM WhatsApp com IA e PIX' });
  assert.equal(out.project.id, 'zaploja');
  assert.ok(out.project.reusedModules.includes('whatsapp-crm'));
  assert.ok(out.project.generatedModules.includes('payments-pix'));
  // reutilizado NÃO entra na lista de módulos NOVOS a construir
  assert.ok(!out.project.generatedModules.includes('whatsapp-crm'));
  // o app gerado é executável: TODO módulo (reusado ou novo) vira código montável real
  assert.ok(out.files['src/modules/payments-pix/index.js']);
  assert.ok(out.files['src/modules/whatsapp-crm/index.js']);
  // reutilizado é marcado como reused:true no código gerado
  assert.match(out.files['src/modules/whatsapp-crm/index.js'], /reused: true/);
  assert.match(out.files['src/modules/payments-pix/index.js'], /reused: false/);
  // gera app rodável: package.json + entrypoint
  assert.ok(out.files['package.json']);
  assert.match(out.files['src/index.js'], /http\.createServer/);
});

test('generated project passes structural validation', async () => {
  const { factory } = await bootstrap();
  const out = await factory.generate('grg', 'alice', { name: 'App1', prompt: 'dashboard com analytics' });
  assert.equal(out.validation.ok, true);
  assert.equal(out.validation.errors.length, 0);
});

test('generation records memory with reuse-vs-build evidence + emits event', async () => {
  const { factory, store, bus } = await bootstrap();
  await factory.generate('grg', 'alice', { name: 'App2', prompt: 'login com dashboard' });
  const state = await store.read();
  const mem = state.memoryEvents.find((e) => e.kind === 'project-generated');
  assert.ok(mem);
  assert.match(mem.summary, /reused|built/);
  assert.equal(bus.history('project.generated').length, 1);
});

test('duplicate project id is rejected', async () => {
  const { factory } = await bootstrap();
  await factory.generate('grg', 'alice', { id: 'dup', name: 'Dup', prompt: 'x' });
  await assert.rejects(() => factory.generate('grg', 'alice', { id: 'dup', name: 'Dup', prompt: 'x' }), /exists/);
});

test('REAL: generated app is written to disk and actually runs', async () => {
  const os = require('node:os');
  const path = require('node:path');
  const fs = require('node:fs');
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grg-gen-'));

  const store = new MemoryStore();
  const bus = new EventBus();
  const cp = await new ControlPlane({ store, bus }).initialize();
  await cp.createTenant({ name: 'GRG' }, 'alice');
  const gw = new AIGateway({ store, bus, controlPlane: cp, providers: { echo: new EchoProvider() } });
  const factory = new SoftwareFactory({ store, bus, controlPlane: cp, aiGateway: gw, outputDir });

  const out = await factory.generate('grg', 'alice', { id: 'realapp', name: 'RealApp', prompt: 'dashboard com login e analytics' });

  // arquivos existem NO DISCO
  assert.ok(out.outputPath);
  assert.ok(fs.existsSync(path.join(out.outputPath, 'src/index.js')));
  assert.ok(fs.existsSync(path.join(out.outputPath, 'package.json')));

  // o app gerado REALMENTE carrega e expõe um servidor + rotas
  const generated = require(path.join(out.outputPath, 'src/index.js'));
  assert.equal(generated.name, 'RealApp');
  assert.ok(generated.routes.length >= 3);
  assert.ok(generated.routes.find((r) => r.path === '/dashboard/health'));

  // sobe o servidor gerado e faz uma requisição real
  const server = generated.createServer();
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;
  const resp = await fetch(`http://127.0.0.1:${port}/dashboard/health`).then((r) => r.json());
  assert.equal(resp.ok, true);
  assert.equal(resp.module, 'dashboard');
  server.close();

  fs.rmSync(outputDir, { recursive: true, force: true });
});
