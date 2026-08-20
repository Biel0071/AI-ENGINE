const test = require('node:test');
const assert = require('node:assert');
const { BootManager } = require('../src/kernel/boot');
const { SystemModule } = require('../src/kernel/module');
const { ServiceRegistry } = require('../src/kernel/service-registry');
const { CapabilityRegistry } = require('../src/kernel/capability-registry');
const { WorkerScheduler } = require('../src/execution/worker-scheduler');
const { EventBus } = require('../src/eventing/event-bus');

test('SystemModule default properties', () => {
  const mod = new SystemModule('test_mod', '1.0.0');
  assert.strictEqual(mod.id, 'test_mod');
  assert.strictEqual(mod.status, 'stopped');
});

test('BootManager orchestrates 15 steps', async () => {
  const boot = new BootManager();
  boot.registerModule('Service Registry', new ServiceRegistry());
  
  await boot.start();
  
  // Test boot completes
  assert.strictEqual(boot.bootState, 'ready');
  assert.strictEqual(boot.bootLog.length, 15);
  
  const health = await boot.health();
  assert.strictEqual(health.ok, true);
});

test('EventBus publishes and subscribes', async () => {
  const bus = new EventBus();
  await bus.start();
  await new Promise((resolve) => {
    bus.subscribe('TestEvent', (evt) => {
      assert.strictEqual(evt.payload.msg, 'hello');
      resolve();
    });
    bus.publish('TestEvent', { msg: 'hello' });
  });
});

test('WorkerScheduler test runner', async () => {
  const bus = new EventBus();
  await bus.start();
  const worker = new WorkerScheduler(bus);
  await worker.start();
  
  await new Promise((resolve) => {
    bus.subscribe('WorkerFinished', (evt) => {
      assert.strictEqual(evt.payload.jobId, 'job-123');
      resolve();
    });
    bus.publish('WorkerTestRequested', { jobId: 'job-123' });
  });
});
