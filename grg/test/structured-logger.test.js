const test = require('node:test');
const assert = require('node:assert/strict');
const { createStructuredLogger } = require('../src/infrastructure/observability/structured-logger');

test('structured exceptions carry stack and operational correlation fields', () => {
  const lines = [];
  createStructuredLogger({ sink: (line) => lines.push(line), clock: () => '2026-07-27T00:00:00.000Z' }).error({
    error: new Error('provider failed'), correlationId: 'corr-1', requestId: 'req-1', capability: 'chat', tenant: 'grg', actor: 'admin', method: 'POST', path: '/api/chat',
  });
  const record = JSON.parse(lines[0]);
  assert.equal(record.correlationId, 'corr-1');
  assert.equal(record.requestId, 'req-1');
  assert.equal(record.capability, 'chat');
  assert.equal(record.tenant, 'grg');
  assert.match(record.stack, /provider failed/);
});
