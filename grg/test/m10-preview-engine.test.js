const test = require('node:test');
const assert = require('node:assert');
const net = require('net');
const { PreviewEngine } = require('../src/execution/preview-engine');
const { UnifiedEventBus } = require('../src/core/UnifiedEventBus');
const { FENIX_EVENTS } = require('../src/core/contracts/event-types');

test('M10: PreviewEngine — Port Probing & Live Preview Registration', async () => {
  const bus = new UnifiedEventBus();
  await bus.start();

  const previewEngine = new PreviewEngine({ eventBus: bus });
  await previewEngine.start();

  // Create a temporary mock HTTP server on an available port
  const server = net.createServer((socket) => socket.end());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const testPort = server.address().port;

  // Test probing the active port
  const isOnline = await previewEngine.probePort(testPort);
  assert.strictEqual(isOnline, true);

  // Test probing an inactive port
  const isOffline = await previewEngine.probePort(59999);
  assert.strictEqual(isOffline, false);

  // Register Preview
  let eventCaptured = false;
  bus.on(FENIX_EVENTS.PREVIEW_STARTED, (evt) => {
    if (evt.payload.port === testPort) eventCaptured = true;
  });

  const preview = await previewEngine.registerPreview('prj_live_test', { port: testPort });
  assert.strictEqual(preview.status, 'ACTIVE');
  assert.strictEqual(preview.url, `http://localhost:${testPort}`);
  assert.strictEqual(eventCaptured, true);

  server.close();
  await previewEngine.stop();
  await bus.stop();
});
