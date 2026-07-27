const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/kernel/store');
const { EventBus } = require('../src/kernel/event-bus');
const { ControlPlane } = require('../src/control-plane/control-plane');
const { AIGateway } = require('../src/ai-runtime/ai-gateway');
const { EchoProvider } = require('../src/ai-runtime/providers');
const { SoftwareFactory } = require('../src/software-factory/software-factory');
const { Deployer } = require('../src/runtime/deployer');

async function bootstrap() {
  const store = new MemoryStore();
  const bus = new EventBus();
  const cp = await new ControlPlane({ store, bus }).initialize();
  await cp.createTenant({ name: 'GRG' }, 'alice');
  const gw = new AIGateway({ store, bus, controlPlane: cp, providers: { echo: new EchoProvider() } });
  const factory = new SoftwareFactory({ store, bus, controlPlane: cp, aiGateway: gw });
  const deployer = new Deployer({ store, bus, controlPlane: cp });
  await factory.generate('grg', 'alice', { id: 'app', name: 'App', prompt: 'dashboard' });
  return { store, bus, cp, deployer };
}

test('deploys to preview and returns url', async () => {
  const { deployer } = await bootstrap();
  const dep = await deployer.deploy('grg', 'alice', 'app', { environment: 'preview', target: 'node' });
  assert.equal(dep.status, 'deployed');
  assert.match(dep.url, /app\.preview\.node\.local/);
});

test('production deploy requires approval', async () => {
  const { deployer } = await bootstrap();
  await assert.rejects(
    () => deployer.deploy('grg', 'alice', 'app', { environment: 'production' }),
    /approved:true/,
  );
  const ok = await deployer.deploy('grg', 'alice', 'app', { environment: 'production', approved: true });
  assert.equal(ok.approvedBy, 'alice');
});

test('rollback marks deployment rolled-back', async () => {
  const { deployer } = await bootstrap();
  const dep = await deployer.deploy('grg', 'alice', 'app', { environment: 'preview' });
  const rb = await deployer.rollback('grg', 'alice', dep.id);
  assert.equal(rb.status, 'rolled-back');
});

test('unknown target is rejected', async () => {
  const { deployer } = await bootstrap();
  await assert.rejects(() => deployer.deploy('grg', 'alice', 'app', { target: 'quantum' }), /adapter/);
});

test('deployment emits event and records memory', async () => {
  const { deployer, bus, store } = await bootstrap();
  await deployer.deploy('grg', 'alice', 'app', { environment: 'staging' });
  assert.equal(bus.history('deployment.completed').length, 1);
  const state = await store.read();
  assert.ok(state.memoryEvents.some((e) => e.kind === 'deployment'));
});
