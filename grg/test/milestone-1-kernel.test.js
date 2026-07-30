const test = require('node:test');
const assert = require('node:assert/strict');
const { LiveBootKernel } = require('../src/kernel/live-boot-kernel');
const { RuntimeKernel } = require('../src/kernel/runtime-kernel');
const { EventBus } = require('../src/kernel/event-bus');

test('Milestone 1 — LiveBootKernel executes 17 boot probes', async () => {
  const eventBus = new EventBus();
  const liveBoot = new LiveBootKernel({ eventBus });

  const result = await liveBoot.runBootSequence({ missions: [] });
  assert.equal(result.totalProbes, 17);
  assert.equal(result.successCount, 17);
  assert.equal(result.status, 'READY');

  const status = liveBoot.getBootStatus();
  assert.equal(status.registries.products.length, 10);
  assert.equal(status.registries.capabilities.length, 5);
  assert.equal(status.registries.agents.length, 11);
  assert.equal(status.registries.projects.length, 2);
});

test('Milestone 1 — RuntimeKernel maintains persistent heartbeat loop', async () => {
  const eventBus = new EventBus();
  const liveBoot = new LiveBootKernel({ eventBus });
  const runtime = new RuntimeKernel({ eventBus, liveBootKernel: liveBoot, intervalMs: 50 });

  let heartbeatEmitted = false;
  eventBus.on('runtime.heartbeat', () => {
    heartbeatEmitted = true;
  });

  await runtime.start();
  assert.equal(runtime.state.bootCompleted, true);
  assert.ok(runtime.state.heartbeatCount >= 1);
  assert.ok(heartbeatEmitted);

  await runtime.stop();
  assert.equal(runtime.running, false);
});
