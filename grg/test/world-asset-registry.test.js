'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/kernel/store');
const { EventBus } = require('../src/kernel/event-bus');
const { WorldAssetRegistry } = require('../src/media/world-asset-registry');

test('registers a source asset once, persists it, and emits a real world event', async () => {
  const store = new MemoryStore();
  const bus = new EventBus();
  const events = [];
  bus.on('world.asset.registered', (event) => events.push(event.payload));
  const registry = new WorldAssetRegistry({ store, bus });
  const asset = {
    sourceId: 'wikimedia-commons:image:42',
    type: 'image',
    source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/City.jpg',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/City.jpg/640px-City.jpg',
    metadata: { license: 'CC BY 4.0' },
  };

  const first = await registry.register('tenant-a', 'actor-a', asset);
  const duplicate = await registry.register('tenant-a', 'actor-a', asset);
  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.asset.id, first.asset.id);
  assert.equal((await registry.list('tenant-a')).length, 1);
  assert.equal((await registry.list('tenant-b')).length, 0);
  assert.equal((await store.read()).worldAssets[0].createdBy, 'actor-a');
  assert.equal(events.length, 1);
  assert.equal(events[0].assetId, first.asset.id);
});

test('rejects unsafe URLs, invalid kinds, and non-object metadata', async () => {
  const registry = new WorldAssetRegistry({ store: new MemoryStore(), bus: new EventBus() });
  const base = { sourceId: 'x', type: 'image', source: 'Commons', metadata: {} };
  await assert.rejects(registry.register('tenant-a', 'actor-a', { ...base, url: 'javascript:alert(1)' }), { code: 'INVALID_WORLD_ASSET' });
  await assert.rejects(registry.register('tenant-a', 'actor-a', { ...base, type: 'unknown', url: 'https://upload.wikimedia.org/a' }), { code: 'INVALID_WORLD_ASSET' });
  await assert.rejects(registry.register('tenant-a', 'actor-a', { ...base, url: 'https://upload.wikimedia.org/a', metadata: 'bad' }), { code: 'INVALID_WORLD_ASSET' });
});

test('publishes the registration to the persistent event stream', async () => {
  const calls = [];
  const registry = new WorldAssetRegistry({
    store: new MemoryStore(),
    events: { publish: async (event) => { calls.push(event); return { id: 'event-123' }; } },
  });
  const result = await registry.register('tenant-a', 'actor-a', {
    sourceId: 'commons:image:77', type: 'image', source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/a.jpg', metadata: { license: 'CC BY' },
  });
  assert.equal(result.eventId, 'event-123');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].tenantId, 'tenant-a');
  assert.equal(calls[0].type, 'world.asset.registered');
  assert.equal(calls[0].data.assetId, result.asset.id);
});
