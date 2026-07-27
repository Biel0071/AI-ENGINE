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
const { ProductSuite } = require('../src/product/white-label');
const { ForbiddenError } = require('../src/kernel/errors');

async function bootstrap() {
  const store = new MemoryStore();
  const bus = new EventBus();
  const cp = await new ControlPlane({ store, bus }).initialize();
  await cp.createTenant({ name: 'GRG' }, 'alice');
  const customer = await cp.createCustomer('grg', 'alice', { name: 'Cliente X' });
  const gw = new AIGateway({ store, bus, controlPlane: cp, providers: { echo: new EchoProvider() } });
  const gitHost = new LocalGitHostAdapter().register('https://github.com/Biel0071/ZAPAI-FINAL', 'rev1', {
    'package.json': JSON.stringify({ dependencies: { '@whiskeysockets/baileys': '^6', openai: '^4' } }),
    'a.js': 'jwt rbac',
  });
  const ri = new RepositoryIntelligence({ store, bus, controlPlane: cp, gitHost });
  await ri.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL' });
  await ri.analyze('grg', 'alice', 'zapai-final');
  const factory = new SoftwareFactory({ store, bus, controlPlane: cp, aiGateway: gw });
  const proj = await factory.generate('grg', 'alice', { id: 'zaploja', name: 'ZapLoja', prompt: 'CRM whatsapp com IA' });
  const product = new ProductSuite({ store, bus, controlPlane: cp });
  return { store, bus, cp, product, customerId: customer.id, projectId: proj.project.id };
}

test('design system derives dark theme from same tokens', async () => {
  const { product } = await bootstrap();
  const ds = await product.createDesignSystem('grg', 'alice', { name: 'grg', tokens: { primary: '#111', background: '#fff', foreground: '#000' } });
  const theme = product.themeFromTokens(ds.tokens);
  assert.equal(theme.light.background, '#fff');
  assert.equal(theme.dark.background, '#000'); // invertido a partir do mesmo token
});

test('provision white label creates brand, license, moduleSet from plan', async () => {
  const { product, customerId, projectId } = await bootstrap();
  await product.createPlan('grg', 'alice', { name: 'Pro', features: ['whatsapp-crm', 'ai-gateway'], priceUsd: 99 });
  const wl = await product.provisionWhiteLabel('grg', 'alice', {
    customerId, projectId, planId: 'pro', brandName: 'LojaX', domain: 'lojax.com',
  });
  assert.ok(wl.license.status === 'active');
  assert.deepEqual(wl.moduleSet.modules.sort(), ['ai-gateway', 'whatsapp-crm']);
  assert.equal(wl.domain.host, 'lojax.com');
});

test('PlanGate: module enabled only if in plan + active license', async () => {
  const { product, customerId, projectId } = await bootstrap();
  await product.createPlan('grg', 'alice', { name: 'Basic', features: ['whatsapp-crm'], priceUsd: 29 });
  await product.provisionWhiteLabel('grg', 'alice', { customerId, projectId, planId: 'basic' });
  assert.equal(await product.isModuleEnabled('grg', customerId, projectId, 'whatsapp-crm'), true);
  assert.equal(await product.isModuleEnabled('grg', customerId, projectId, 'payments-pix'), false);
  await assert.rejects(() => product.requireModule('grg', customerId, projectId, 'payments-pix'), ForbiddenError);
});

test('marketplace install adds capability to moduleSet', async () => {
  const { product, customerId, projectId } = await bootstrap();
  await product.createPlan('grg', 'alice', { name: 'Basic', features: ['whatsapp-crm'], priceUsd: 29 });
  await product.provisionWhiteLabel('grg', 'alice', { customerId, projectId, planId: 'basic' });
  await product.installModule('grg', 'alice', { customerId, projectId, capabilityId: 'ai-gateway' });
  assert.equal(await product.isModuleEnabled('grg', customerId, projectId, 'ai-gateway'), true);
});

test('marketplace rejects capability not in catalog', async () => {
  const { product, customerId, projectId } = await bootstrap();
  await product.createPlan('grg', 'alice', { name: 'Basic', features: [], priceUsd: 0 });
  await product.provisionWhiteLabel('grg', 'alice', { customerId, projectId, planId: 'basic' });
  await assert.rejects(() => product.installModule('grg', 'alice', { customerId, projectId, capabilityId: 'nonexistent' }), /catalog/);
});

test('billing: subscribe, record usage, issue invoice', async () => {
  const { product, customerId } = await bootstrap();
  await product.createPlan('grg', 'alice', { name: 'Pro', features: [], priceUsd: 100 });
  const sub = await product.subscribe('grg', 'alice', { customerId, planId: 'pro' });
  await product.recordUsage('grg', sub.id, 50);
  const inv = await product.invoice('grg', 'alice', sub.id);
  assert.equal(inv.amountUsd, 100.5); // 100 + 50*0.01
});
