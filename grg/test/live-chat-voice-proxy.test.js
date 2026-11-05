'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleLiveChat } = require('../src/chat/live-chat-routes');

test('voice proxy rejects empty recordings before contacting the provider', async () => {
  const response = {};
  let contacted = false;
  const ctx = {
    app: { conversations: {} },
    req: { method: 'POST' },
    res: response,
    url: new URL('http://localhost/api/chat/voice/transcribe'),
    tenantId: 'tenant-a', actorId: 'user-a', requestId: 'req-a',
    readJson: async () => ({ data: '' }),
    sendJson: (_res, status, body) => { response.status = status; response.body = body; },
  };
  const originalFetch = global.fetch;
  global.fetch = async () => { contacted = true; throw new Error('should not be called'); };
  try {
    assert.equal(await handleLiveChat(ctx), true);
  } finally {
    global.fetch = originalFetch;
  }
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'INVALID_AUDIO_PAYLOAD');
  assert.equal(contacted, false);
});
